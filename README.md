# OALS — Online Authorised Location & Safeguarding

Consent-based investigation platform for authorised investigators.

**Domain:** https://mylos.cyou  
**Protected links:** https://mylos.cyou/l/{shortCode}  
(Optional subdomain mode: https://{shortCode}.mylos.cyou when wildcard DNS is configured)

OALS lets investigators create cases, upload evidence images, generate unique subdomain links, and collect **one-time browser location only after explicit user consent**. It does not secretly track people, bypass permissions, or declare criminal status via AI.

---

## Features

- Auth.js (NextAuth) credentials auth with roles: `ADMIN`, `INVESTIGATOR`, `REVIEWER`
- Investigation cases with neutral subject terminology
- Secure image upload (MIME + magic-byte validation, EXIF strip, blur + thumbnail)
- Cryptographically secure short codes on `*.mylos.cyou`
- Public consent flow using the browser Geolocation API (click-to-request only)
- Encrypted location storage, RBAC-gated map view, retention controls
- Audit logging, rate limiting, security headers
- Optional AI assist module (indicators only — requires human review)

---

## Stack

| Layer | Technology |
|-------|------------|
| Frontend | Next.js 16 App Router, TypeScript, Tailwind CSS 4, Lucide |
| Auth | Auth.js / NextAuth v5 |
| Database | MongoDB Atlas + Mongoose |
| Storage | Vercel Blob (local filesystem fallback in development) |
| Maps | Mapbox (configurable) |
| Email | Resend (optional) |
| Deploy | Vercel |

---

## Quick start

```bash
touch .env.local
# Edit MONGODB_URI, AUTH_SECRET, ENCRYPTION_KEY

npm install
npm run dev
```

Open http://localhost:3000

### Local wildcard links

For subdomain testing locally, use:

- `http://{shortCode}.localhost:3000`

Modern browsers resolve `*.localhost` to `127.0.0.1`. The middleware extracts the short code from the hostname and rewrites to the public link page.

---

## Environment variables

Set these in `.env.local`. Critical values:

| Variable | Purpose |
|----------|---------|
| `MONGODB_URI` | MongoDB Atlas connection string |
| `AUTH_SECRET` | Auth.js session secret (≥32 chars) |
| `ENCRYPTION_KEY` | 64-char hex key for AES-256-GCM |
| `NEXT_PUBLIC_ROOT_DOMAIN` | `mylos.cyou` (or `localhost:3000` for local) |
| `NEXT_PUBLIC_APP_URL` | Public app origin, e.g. `https://mylos.cyou` |
| `NEXT_PUBLIC_USE_SUBDOMAIN_LINKS` | `true` only if `*.mylos.cyou` wildcard is live |
| `BLOB_READ_WRITE_TOKEN` | **Required on Vercel** for image upload / link generation |
| `NEXT_PUBLIC_MAPBOX_TOKEN` | Map rendering in dashboard |
| `RESEND_API_KEY` | Transactional email (optional) |
| `STORE_RAW_IP` | `false` by default — hashed IPs only |
| `DEFAULT_RETENTION_DAYS` | Default `7` |

Never commit secrets.

---

## DNS / Vercel domain setup

1. Create a Vercel project and import this repository.
2. Add domain `mylos.cyou`.
3. Add wildcard domain `*.mylos.cyou`.
4. Optionally add `app.mylos.cyou` for the dashboard entrypoint.
5. Configure DNS as prompted by Vercel (typically ALIAS/ANAME/CNAME to Vercel).

One deployment serves all short-code subdomains. Do **not** create a project per link.

---

## Production deployment checklist

1. **MongoDB Atlas** — create cluster, database user, network access, copy URI  
2. **Vercel project** — connect repo, set all env vars  
3. **Object storage** — enable Vercel Blob or S3-compatible store  
4. **Domains** — apex + wildcard + optional `app` subdomain  
5. **Auth** — set `AUTH_SECRET`, `NEXTAUTH_URL=https://mylos.cyou`, `AUTH_TRUST_HOST=true`  
6. **HTTPS** — automatic on Vercel  
7. **Indexes** — Mongoose schemas declare unique indexes (`email`, `caseReference`, `shortCode`)  
8. **Backups** — enable Atlas continuous backup  
9. **Monitoring** — Vercel Analytics / logs; never send location to third-party analytics  
10. **Error tracking** — configure your preferred provider without logging coordinates  
11. **Security** — review CSP, retention, rate limits, disable public registration if needed  

---

## Core flows

### Investigator

1. Sign in → **New Investigation**
2. Upload image → **Generate Protected Link**
3. Share `https://mylos.cyou/l/{code}`
4. View access events and consented locations on the case map

### Recipient

1. Opens protected link
2. Sees blurred image + clear explanation
3. Clicks **Allow Location & View**
4. Browser shows native geolocation prompt
5. On grant → consent recorded, coordinates encrypted, image unlocked via short-lived signed URL  
6. On deny → no bypass, image stays protected (unless investigator allowed optional view)

---

## Security & privacy principles

- No covert GPS, camera, microphone, or fingerprinting for tracking
- Geolocation only after user gesture + browser permission
- Location never in URLs, localStorage, or notification emails
- Coordinates encrypted at rest; raw IP storage off by default
- Generic `UNAVAILABLE` responses for invalid short codes (anti-enumeration)
- AI outputs are indicators requiring human review — never “criminal confirmed”

---

## Scripts

```bash
npm run dev          # development server
npm run build        # production build
npm run start        # start production server
npm run lint         # ESLint
npm run typecheck    # TypeScript
npm test             # Vitest unit/integration
npm run test:e2e     # Playwright
```

---

## Project structure

```
src/
  app/                 # App Router pages + API routes
  components/          # UI, dashboard, public-link, maps
  lib/                 # auth, db, security, storage, links, ai, audit
  models/              # Mongoose models
  middleware.ts        # Wildcard host routing + security headers
tests/
  unit/
  integration/
  e2e/
```

---

## Roles

| Role | Capabilities |
|------|----------------|
| ADMIN | Users, settings, audit, all cases |
| INVESTIGATOR | Create/manage own cases, links, evidence, locations |
| REVIEWER | View assigned cases/evidence; no user admin |

All permission checks are enforced on the server.

---

## Licence / research use

Built as a university/research prototype and production-oriented SaaS foundation. Adapt retention, legal notices, and organisational policies before operational deployment.
