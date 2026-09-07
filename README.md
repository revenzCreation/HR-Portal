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

The 201 Files interface is currently paused while a replacement secure storage provider is selected. No storage credentials or backend connections are included in this project.

## GitHub and Cloudflare

Push the repository to GitHub, then connect the repository to Cloudflare Pages for the static website.
