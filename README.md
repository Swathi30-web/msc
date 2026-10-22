# Mobile Service Center Management System

React + TypeScript + Vite + Tailwind CSS + React Router + Axios, with JSON Server as the only backend.

## Run locally
```bash
npm install
npm start        # JSON Server on :3001 + Vite on :5173
```
(or run `npm run api` and `npm run dev` in two terminals)

## Demo logins
| Role | Username | Password |
|---|---|---|
| Admin | admin | admin123 |
| Receptionist | reception | recep123 |
| Technician | tech | tech123 |
| Customer | customer | cust123 |

## Deploy (Netlify / Vercel)
JSON Server needs a Node host, so deploy it separately (e.g. Render/Railway: `json-server db.json --host 0.0.0.0 --port $PORT`).
Deploy the frontend to Netlify/Vercel with env var `VITE_API_URL=<your json-server URL>`.
SPA rewrites are included (`public/_redirects`, `vercel.json`).

## Notes
- Workflow transitions are enforced in `src/lib.ts` (`NEXT`); max 3 active jobs per technician.
- Adding parts to a job decrements stock and logs an inventory transaction; low-stock alerts show on Inventory and Dashboard.
- Auth is demo-grade (plain-text passwords in db.json, client-side role guards) — not for production.
