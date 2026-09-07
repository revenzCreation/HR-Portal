import 'dotenv/config';
import crypto from 'node:crypto';
import express from 'express';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { Storage } from 'megajs';

const required = ['HR_API_KEY', 'MEGA_EMAIL', 'MEGA_PASSWORD', 'MEGA_201_FOLDER'];
const missing = required.filter(name => !process.env[name]);
if (missing.length) throw new Error(`Missing environment variables: ${missing.join(', ')}`);

const app = express();
const port = Number(process.env.PORT || 8787);
const allowedOrigin = process.env.ALLOWED_ORIGIN || 'https://hr-portal.yourdevs.workers.dev';
const allowedOrigins = new Set([allowedOrigin, 'null']);
const filesById = new Map();
const sessions = new Map();
const sessionCookie = 'starkson_hr_session';

app.disable('x-powered-by');
app.set('trust proxy', 1);
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(express.json({ limit: '32kb' }));
app.use(rateLimit({ windowMs: 15 * 60 * 1000, limit: 120, standardHeaders: 'draft-8', legacyHeaders: false }));
app.use((req, res, next) => {
  const origin = req.get('origin');
  if (origin && !allowedOrigins.has(origin)) return res.status(403).json({ error: 'Origin not allowed' });
  res.setHeader('Access-Control-Allow-Origin', origin === 'null' ? 'null' : allowedOrigin);
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});

function readCookies(req) {
  return Object.fromEntries((req.get('cookie') || '').split(';').filter(Boolean).map(value => {
    const index = value.indexOf('=');
    return [value.slice(0, index).trim(), decodeURIComponent(value.slice(index + 1).trim())];
  }));
}

function authorize(req, res, next) {
  const header = req.get('authorization') || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : '';
  const expected = Buffer.from(process.env.HR_API_KEY);
  const received = Buffer.from(token);
  const session = readCookies(req)[sessionCookie];
  const sessionValid = session && sessions.has(session) && sessions.get(session) > Date.now();
  const apiKeyValid = token && received.length === expected.length && crypto.timingSafeEqual(received, expected);
  if (!sessionValid && !apiKeyValid) {
    return res.status(401).json({ error: 'HR authorization required' });
  }
  next();
}

function clean(value) {
  return String(value || '').trim().replace(/\s+/g, ' ');
}

function parseEmployeeName(fileName) {
  const base = clean(fileName).replace(/\.[^.]+$/, '').replace(/[_-]+/g, ' ');
  const parts = base.split(',').map(clean).filter(Boolean);
  let surname = parts[0] || '';
  let given = parts.slice(1).join(' ');
  if (!given) {
    const tokens = base.split(' ').filter(Boolean);
    surname = tokens.shift() || '';
    given = tokens.join(' ');
  }

  const suffixMatch = given.match(/\b(JR|SR|II|III|IV|V)\.?\b/i);
  const suffix = suffixMatch ? suffixMatch[1].toUpperCase() + (['II', 'III', 'IV', 'V'].includes(suffixMatch[1].toUpperCase()) ? '' : '.') : '';
  given = given.replace(/\b(JR|SR|II|III|IV|V)\.?\b/i, '').trim();
  const firstName = given.split(' ')[0] || '';

  return { surname: surname.toUpperCase(), firstName: firstName.toUpperCase(), suffix };
}

function recordFromFile(file, apiOrigin) {
  const name = parseEmployeeName(file.name);
  const id = file.nodeId || file.name;
  filesById.set(id, file);
  return { ...name, dateHired: '', directLink: `${apiOrigin}/api/201-files/${encodeURIComponent(id)}` };
}

let mega;
let folder;
async function connectMega() {
  mega = await new Storage({ email: process.env.MEGA_EMAIL, password: process.env.MEGA_PASSWORD }).ready;
  folder = mega.root.children.find(item => item.name === process.env.MEGA_201_FOLDER);
  if (!folder) throw new Error(`MEGA folder not found: ${process.env.MEGA_201_FOLDER}`);
}

app.get('/health', (_req, res) => res.json({ ok: true, service: 'starkson-hr-portal-api' }));

app.get('/auth/session', (req, res) => {
  const session = readCookies(req)[sessionCookie];
  const valid = session && sessions.has(session) && sessions.get(session) > Date.now();
  if (!valid) return res.status(401).json({ authenticated: false });
  res.json({ authenticated: true });
});

app.post('/auth/login', (req, res) => {
  const expectedUser = process.env.HR_LOGIN_USER;
  const expectedPassword = process.env.HR_LOGIN_PASSWORD;
  if (!expectedUser || !expectedPassword) return res.status(503).json({ error: 'HR login is not configured' });

  const user = clean(req.body?.user);
  const password = String(req.body?.password || '');
  const userOk = user.length === expectedUser.length && crypto.timingSafeEqual(Buffer.from(user), Buffer.from(expectedUser));
  const passwordOk = password.length === expectedPassword.length && crypto.timingSafeEqual(Buffer.from(password), Buffer.from(expectedPassword));
  if (!userOk || !passwordOk) return res.status(401).json({ error: 'Invalid HR Staff credentials' });

  const token = crypto.randomBytes(32).toString('hex');
  sessions.set(token, Date.now() + 8 * 60 * 60 * 1000);
  res.setHeader('Set-Cookie', `${sessionCookie}=${token}; HttpOnly; SameSite=Strict; Path=/; Max-Age=28800`);
  res.json({ authenticated: true });
});

app.post('/auth/logout', (req, res) => {
  const session = readCookies(req)[sessionCookie];
  if (session) sessions.delete(session);
  res.setHeader('Set-Cookie', `${sessionCookie}=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0`);
  res.json({ authenticated: false });
});

app.get('/api/201-files', authorize, async (req, res) => {
  try {
    filesById.clear();
    const files = folder.children.filter(item => item.directory !== true);
    const apiOrigin = `${req.protocol}://${req.get('host')}`;
    res.json(files.map(file => recordFromFile(file, apiOrigin)));
  } catch (error) {
    res.status(503).json({ error: '201 Files directory unavailable' });
  }
});

app.get('/api/201-files/:id', authorize, async (req, res) => {
  const file = filesById.get(req.params.id);
  if (!file) return res.status(404).json({ error: 'File not found or directory has not been refreshed' });
  res.type(file.name);
  const download = file.download();
  download.on('error', () => res.destroy());
  download.pipe(res);
});

connectMega().then(() => {
  app.listen(port, () => console.log(`Starkson HR API listening on port ${port}`));
}).catch(error => {
  console.error(`MEGA connection failed: ${error.message}`);
  process.exitCode = 1;
});
