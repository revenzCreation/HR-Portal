# Starkson HR Portal

Static HR Portal website for Starkson Paper and Plastic Corporation.

## Pages

- `index.html` - HR Portal home
- `tools.html` - HR tools directory
- `support.html` - HR support page
- `Directory Websites/referral-portal/` - employee referral workflow
- `Directory Websites/mrf-monitor/` - manpower request monitor
- `Directory Websites/201-files/` - authenticated employee 201 Files directory
- `server/` - Node.js API boundary for private MEGA 201 Files storage

## Local website

Serve the repository root with a static web server. Do not open the pages directly with `file://` when testing API-backed features.

For example, with VS Code Live Server use port `5500`, matching `server/.env`.

## 201 Files API

The Node API reads MEGA credentials only from the ignored `server/.env` file. Never commit that file. Configure a deployment secret store on Cloudflare or the selected API host instead.

```powershell
cd server
npm install
npm start
```

The frontend should use the deployed API URL in production rather than `http://localhost:8787`.

## GitHub and Cloudflare

Push the repository to GitHub, then connect the repository to Cloudflare Pages for the static website. The `server/` API must be deployed separately as a private server or Cloudflare Worker; Cloudflare Pages alone cannot run this Node.js process.
