# Starkson HR Portal API

This service is the server-side boundary for the future 201 Files MEGA connection.

## Why this exists

MEGA credentials and HR access tokens must never be placed in browser-delivered files. The static 201 Files page should call this API only after the HR authentication layer is added.

## Setup

1. Install Node.js 20 LTS or newer.
2. Open a terminal in `HR Portal/server`.
3. Run:

```powershell
npm install
```

4. Copy `.env.example` to `.env`.
5. Set a long random `HR_API_KEY`, the MEGA credentials, and the exact private folder name.
6. Set a separate `HR_LOGIN_USER` and `HR_LOGIN_PASSWORD` for the 201 Files sign-in. Do not reuse the MEGA password.
7. Start the service:

```powershell
npm start
```

## Current endpoints

- `GET /health` - service health check
- `GET /api/201-files` - authorized employee metadata
- `GET /api/201-files/:id` - authorized PDF stream

All 201 endpoints require:

```http
Authorization: Bearer <server-issued-HR-token>
```

The current `HR_API_KEY` is a temporary integration gate. Before production, replace it with authenticated HR Staff / Personnel sessions or an identity provider. Do not give a permanent API key to every browser user.

The 201 Files website opens `login.html` first. Successful login creates an eight-hour HttpOnly server session and redirects to the directory. Direct visits to `index.html` are also checked by the API and redirected to login when unauthenticated.

## MEGA folder convention

Create a private MEGA folder matching `MEGA_201_FOLDER`, for example:

```text
201 Files/
  DELA CRUZ, JUAN P JR.pdf
  SANTOS JR, MARIA L.pdf
```

The API returns names as `SURNAME SUFFIX FIRSTNAME`, ignores middle initials, leaves `dateHired` blank, and generates an internal API link for the file. The PDF is streamed only after authorization; a permanent public MEGA link is not exposed.

## Production requirements

- Use HTTPS.
- Add HR login/session authentication before exposing the endpoints.
- Store `.env` outside source control.
- Enable audit logging for file access.
- Restrict the MEGA account to this private folder and enable strong account security.
- Back up the folder and test account recovery.
- Add malware scanning and file type/size validation before accepting new uploads.
