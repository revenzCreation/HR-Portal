# Starkson HR Portal

Static HR Portal website for Starkson Paper and Plastic Corporation.

## Pages

- `index.html` - HR Portal home
- `tools.html` - HR tools directory
- `support.html` - HR support page
- `Directory Websites/referral-portal/` - employee referral workflow
- `Directory Websites/mrf-monitor/` - manpower request monitor
- `Directory Websites/201-files/` - authenticated employee 201 Files directory
- `cloudflare-api/` - Cloudflare Worker API boundary for private MEGA 201 Files storage
- `server/` - local Node.js development API for private MEGA 201 Files storage

## Local website

Serve the repository root with a static web server. Do not open the pages directly with `file://` when testing API-backed features.

For example, with VS Code Live Server use port `5500`, matching `server/.env`.

## 201 Files API

The local Node API reads MEGA credentials only from the ignored `server/.env` file. The production Cloudflare Worker reads the same values from encrypted Worker secrets. Never commit either set of credentials.

```powershell
cd server
npm install
npm start
```

The production frontend uses the deployed Cloudflare Worker API. Local development uses `http://localhost:8787`.

## GitHub and Cloudflare

Push the repository to GitHub, then connect the repository to Cloudflare Pages for the static website. Deploy `cloudflare-api/` as the `starkson-hr-api` Worker and keep its MEGA and HR values in Worker secrets.
