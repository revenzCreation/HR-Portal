import { Storage } from 'megajs';

const sessions = new Map();
let storagePromise;

function origin(env) {
  return String(env.ALLOWED_ORIGIN || 'https://hr-portal.yourdevs.workers.dev').replace(/\/+$/, '');
}

function cors(request, env) {
  const requestOrigin = request.headers.get('Origin');
  const allowed = origin(env);
  if (requestOrigin && requestOrigin !== allowed && requestOrigin !== 'null') return null;
  return {
    'Access-Control-Allow-Origin': requestOrigin === 'null' ? 'null' : allowed,
    'Access-Control-Allow-Credentials': 'true',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS'
  };
}

function response(body, status, headers) {
  return new Response(body, { status, headers });
}

function json(value, status, headers) {
  return response(JSON.stringify(value), status, { ...headers, 'Content-Type': 'application/json' });
}

function cookies(request) {
  return Object.fromEntries((request.headers.get('Cookie') || '').split(';').filter(Boolean).map(value => {
    const index = value.indexOf('=');
    return [value.slice(0, index).trim(), decodeURIComponent(value.slice(index + 1).trim())];
  }));
}

function clean(value) {
  return String(value || '').trim().replace(/\s+/g, ' ');
}

function authorized(request, env) {
  const session = cookies(request).starkson_hr_session;
  const sessionValid = session && sessions.has(session) && sessions.get(session) > Date.now();
  const apiKey = request.headers.get('Authorization')?.replace(/^Bearer /, '') || '';
  return sessionValid || (apiKey && apiKey === env.HR_API_KEY);
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
  return { surname: surname.toUpperCase(), firstName: (given.split(' ')[0] || '').toUpperCase(), suffix };
}

async function getFolder(env) {
  if (!storagePromise) {
    storagePromise = new Storage({ email: env.MEGA_EMAIL, password: env.MEGA_PASSWORD }).ready.then(storage => {
      const folder = storage.root.children.find(item => item.name === env.MEGA_201_FOLDER);
      if (!folder) throw new Error(`MEGA folder not found: ${env.MEGA_201_FOLDER}`);
      return folder;
    });
  }
  return storagePromise;
}

async function getFile(env, id) {
  const folder = await getFolder(env);
  return folder.children.find(file => file.directory !== true && (file.nodeId || file.name) === id);
}

function download(file) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    const stream = file.download({ maxConnections: 1 });
    stream.on('data', chunk => chunks.push(new Uint8Array(chunk)));
    stream.on('error', reject);
    stream.on('end', () => {
      const size = chunks.reduce((total, chunk) => total + chunk.byteLength, 0);
      const result = new Uint8Array(size);
      let offset = 0;
      for (const chunk of chunks) {
        result.set(chunk, offset);
        offset += chunk.byteLength;
      }
      resolve(result);
    });
  });
}

export default {
  async fetch(request, env) {
    const headers = cors(request, env);
    if (!headers) return json({ error: 'Origin not allowed' }, 403, {});
    if (request.method === 'OPTIONS') return response(null, 204, headers);
    const url = new URL(request.url);

    try {
      if (url.pathname === '/health') return json({ ok: true, service: 'starkson-hr-portal-cloudflare-api' }, 200, headers);
      if (url.pathname === '/auth/session') {
        return authorized(request, env) ? json({ authenticated: true }, 200, headers) : json({ authenticated: false }, 401, headers);
      }
      if (url.pathname === '/auth/login' && request.method === 'POST') {
        const body = await request.json();
        if (clean(body.user) !== env.HR_LOGIN_USER || String(body.password || '') !== env.HR_LOGIN_PASSWORD) {
          return json({ error: 'Invalid HR Staff credentials' }, 401, headers);
        }
        const token = crypto.randomUUID().replaceAll('-', '') + crypto.randomUUID().replaceAll('-', '');
        sessions.set(token, Date.now() + 8 * 60 * 60 * 1000);
        return json({ authenticated: true }, 200, { ...headers, 'Set-Cookie': `starkson_hr_session=${token}; HttpOnly; Secure; SameSite=None; Path=/; Max-Age=28800` });
      }
      if (url.pathname === '/auth/logout' && request.method === 'POST') {
        const token = cookies(request).starkson_hr_session;
        if (token) sessions.delete(token);
        return json({ authenticated: false }, 200, { ...headers, 'Set-Cookie': 'starkson_hr_session=; HttpOnly; Secure; SameSite=None; Path=/; Max-Age=0' });
      }
      if (!authorized(request, env)) return json({ error: 'HR authorization required' }, 401, headers);

      if (url.pathname === '/api/201-files' && request.method === 'GET') {
        const folder = await getFolder(env);
        const apiOrigin = url.origin;
        const records = folder.children.filter(item => item.directory !== true).map(file => {
          const id = file.nodeId || file.name;
          return { ...parseEmployeeName(file.name), dateHired: '', directLink: `${apiOrigin}/api/201-files/${encodeURIComponent(id)}` };
        });
        return json(records, 200, headers);
      }

      const match = url.pathname.match(/^\/api\/201-files\/([^/]+)$/);
      if (match && request.method === 'GET') {
        const file = await getFile(env, decodeURIComponent(match[1]));
        if (!file) return json({ error: 'File not found or directory has not been refreshed' }, 404, headers);
        const data = await download(file);
        return new Response(data, { status: 200, headers: { ...headers, 'Content-Type': 'application/pdf', 'Content-Disposition': `inline; filename="${file.name.replaceAll('"', '')}"` } });
      }
      return json({ error: 'Not found' }, 404, headers);
    } catch (error) {
      return json({ error: error.message || 'Internal server error' }, 503, headers);
    }
  }
};
