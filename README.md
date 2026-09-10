# Starkson HR Portal

Static HR Portal website for Starkson Paper and Plastic Corporation.

## Pages

- `index.html` - HR Portal home
- `tools.html` - HR tools directory
- `support.html` - HR support page
- `Directory Websites/referral-portal/` - employee referral workflow
- `Directory Websites/mrf-monitor/` - manpower request monitor
- `Directory Websites/201-files/` - authenticated employee 201 Files directory

## Local website

Serve the repository root with a static web server. Do not open the pages directly with `file://` when testing API-backed features.

For example, with VS Code Live Server use port `5500`.

## 201 Files API

The 201 Files directory uses the shared Google Apps Script deployment and a `201 Files` sheet. Employee files are stored in Google Drive; each row uses a Drive URL in `directLink` or a Drive file ID in `driveFileId`.

## GitHub and Cloudflare

Push the repository to GitHub, then connect the repository to Cloudflare Pages for the static website.
