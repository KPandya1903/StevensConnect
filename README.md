# StevensConnect

A marketplace and networking platform for Stevens Institute of Technology students — find housing, buy and sell items, and connect with other students in real time.

**Access is restricted to @stevens.edu email addresses.**

---

## Stack

| Layer | Technology |
|---|---|
| Frontend | React 18 + Vite + TypeScript + Tailwind CSS |
| Backend | Node.js + Express + TypeScript |
| Database | PostgreSQL 16 |
| Real-time | Socket.io |
| Auth | JWT (memory) + HttpOnly refresh cookie |
| Storage | Local disk (dev) / AWS S3 (prod) |
| Error tracking | Sentry (optional) |
| CI | GitHub Actions |

---

## Prerequisites

- [Node.js](https://nodejs.org/) 20+
- [Docker Desktop](https://www.docker.com/products/docker-desktop/)
- npm 9+

---

## Start in 3 commands

```bash
# 1. Start databases (PostgreSQL dev + test, Redis)
docker compose up -d

# 2. Install dependencies
npm install

# 3. Copy env, run migrations, and start
cp server/.env.example server/.env
# Edit server/.env — set JWT_SECRET and SMTP credentials
cd server && npm run migrate && npm run dev
```

The API server runs on `http://localhost:4000`.  
The React dev server runs on `http://localhost:3000` (via `cd client && npm run dev`).

---

## Environment Variables

Copy `server/.env.example` to `server/.env` and fill in values.

**Required for basic operation:**
| Variable | How to get it |
|---|---|
| `JWT_SECRET` | `node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"` |
| `SMTP_HOST/USER/PASS` | [Mailtrap](https://mailtrap.io) for dev, Resend/SendGrid for prod |
| `DATABASE_URL` | Automatic when using `docker compose up -d` |

**Required for S3 uploads (prod):**
| Variable | Value |
|---|---|
| `UPLOAD_STORAGE` | `s3` |
| `AWS_REGION` | e.g. `us-east-1` |
| `AWS_ACCESS_KEY_ID` | IAM key with `s3:PutObject` + `s3:DeleteObject` on your bucket |
| `AWS_SECRET_ACCESS_KEY` | IAM secret |
| `AWS_S3_BUCKET` | Your bucket name |

**Optional:**
| Variable | Purpose |
|---|---|
| `SENTRY_DSN` | Server-side error tracking |
| `VITE_SENTRY_DSN` | Client-side error tracking (set in `client/.env`) |

---

## Development

```bash
# Run everything (from project root)
docker compose up -d        # start DBs
cd server && npm run dev    # API on :4000
cd client && npm run dev    # React on :3000

# Tests (server integration tests — require Docker DBs running)
cd server && npm test

# Type-check
cd server && npx tsc --noEmit
cd client && npx tsc --noEmit

# Add a new DB migration
# 1. Create server/src/db/migrations/00N_description.sql
# 2. Run: cd server && npm run migrate
```

---

## Production Deployment

1. **Build the client:**
   ```bash
   cd client && npm run build
   # Output: client/dist — serve via nginx or a CDN
   ```

2. **Build the server:**
   ```bash
   cd server && npm run build
   # Output: server/dist — run with: node dist/index.js
   ```

3. **Required environment changes for prod:**
   - `NODE_ENV=production`
   - `UPLOAD_STORAGE=s3` + all `AWS_*` vars
   - `CLIENT_ORIGIN=https://yourdomain.com`
   - `SENTRY_DSN=<your dsn>`

4. **S3 bucket policy** — make uploaded objects publicly readable:
   ```json
   {
     "Version": "2012-10-17",
     "Statement": [{
       "Effect": "Allow",
       "Principal": "*",
       "Action": "s3:GetObject",
       "Resource": "arn:aws:s3:::stevensconnect-assets/*"
     }]
   }
   ```

---

## CI

GitHub Actions runs on every push/PR to `main` and `develop`:
- **Server job:** type-check → migrate test DB → 66 integration tests
- **Client job:** type-check + Vite production build

See [`.github/workflows/ci.yml`](.github/workflows/ci.yml).

---

## Project Structure

```
stevensconnect/
├── .github/workflows/ci.yml   GitHub Actions CI
├── client/                    React + Vite frontend
│   └── src/
│       ├── api/               All axios calls (never raw axios in components)
│       ├── components/        Shared UI components
│       ├── hooks/             useAuth, useListings, useSocket, useMessages, …
│       ├── pages/             One file per route
│       └── store/             Zustand stores (auth, chat)
├── server/                    Express + Socket.io backend
│   └── src/
│       ├── config/            env.ts, upload.ts, sentry.ts
│       ├── controllers/       Parse req → call service → send res
│       ├── db/                pool.ts, migrate.ts, migrations/
│       ├── middleware/         auth, validate, errorHandler, rateLimiter
│       ├── repositories/      All SQL (UserRepository, ListingRepository, …)
│       ├── routes/            Express routers
│       ├── services/          Business logic (AuthService, ListingService, …)
│       └── sockets/           Socket.io event handlers
├── shared/                    TypeScript types shared by client + server
└── docker-compose.yml
```

---

## Architecture Rules

1. **No SQL outside `server/src/repositories/`**
2. **No business logic in controllers** — controllers parse req → call service → send res
3. **All env vars through `server/src/config/env.ts`** — never `process.env.X` elsewhere
4. **All API calls through `client/src/api/`** — no raw axios in components
5. **Migrations are append-only** — never edit an existing migration file
6. **Tests run against a real test DB** — no mocked databases

---

## Build Phases

- [x] **Phase 1** — Foundation (monorepo, Docker, DB, Express, test scaffolding)
- [x] **Phase 2** — Authentication (register, verify @stevens.edu, login, JWT, refresh) — 33 tests
- [x] **Phase 3** — Listings (housing + marketplace, images, full-text search, filters) — 54 tests
- [x] **Phase 4** — Real-time Chat (Socket.io, conversations, messages) — 66 tests
- [x] **Phase 5** — Profile & Polish (user profiles, avatar upload, saves, Navbar)
- [x] **Phase 6** — Production Readiness (S3, GitHub Actions CI, Sentry, README)
