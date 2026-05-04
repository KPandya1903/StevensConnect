# House-Mate — Architecture

A complete walkthrough of how the system is built, how data flows, and why things are structured the way they are.

---

## Table of Contents

1. [Big Picture](#1-big-picture)
2. [Folder Structure](#2-folder-structure)
3. [Frontend Architecture](#3-frontend-architecture)
4. [Backend Architecture](#4-backend-architecture)
5. [Database Schema](#5-database-schema)
6. [Authentication Flow](#6-authentication-flow)
7. [Real-Time Chat](#7-real-time-chat)
8. [Listings & Map](#8-listings--map)
9. [File Uploads](#9-file-uploads)
10. [Shared Types](#10-shared-types)
11. [Deployment](#11-deployment)
12. [Key Rules](#12-key-rules)

---

## 1. Big Picture

```
┌─────────────────────────────────────────────────────────────┐
│                        Browser                              │
│                                                             │
│   React SPA (Vite)           Leaflet Map                    │
│   Zustand state              Socket.io client               │
│   Tailwind CSS                                              │
└────────────────┬───────────────────────┬────────────────────┘
                 │ HTTPS REST             │ WebSocket (wss://)
                 │ /api/*                 │ persistent
                 ▼                        ▼
┌─────────────────────────────────────────────────────────────┐
│                    Express Server (Render)                   │
│                                                             │
│   REST API           Socket.io server                       │
│   Controllers        chatHandlers.ts                        │
│   Services           JWT auth middleware                    │
│   Repositories       Rate limiting                          │
└────────────────┬───────────────────────┬────────────────────┘
                 │ pg (node-postgres)     │ geocoding (fetch)
                 ▼                        ▼
         ┌───────────────┐      ┌──────────────────┐
         │  Neon Postgres │      │ Nominatim (OSM)  │
         │  (hosted)      │      │ free geocoding   │
         └───────────────┘      └──────────────────┘
```

**Deployed on:**
- Frontend → Vercel (CDN, auto-deploys on push to `main`)
- Backend → Render (Node server, auto-deploys on push to `main`)
- Database → Neon (serverless Postgres, always on)

---

## 2. Folder Structure

```
House-Mate/
├── client/                   React + Vite frontend
│   └── src/
│       ├── api/              Axios wrappers — all HTTP calls live here
│       ├── components/       Reusable UI components
│       │   ├── auth/         ProtectedRoute, VerifiedRoute
│       │   ├── layout/       Navbar
│       │   ├── listings/     ListingCard, ListingForm, ListingFilters, …
│       │   ├── map/          ListingMapPin
│       │   └── ui/           Badge, Modal, Spinner, WelcomeModal
│       ├── hooks/            Custom React hooks (data fetching + socket)
│       ├── pages/            One file per route/screen
│       ├── routes/           React Router route definitions
│       ├── store/            Zustand global state
│       └── utils/            format.ts, emojiToImage.ts
│
├── server/                   Express + Socket.io backend
│   └── src/
│       ├── config/           env.ts, upload.ts, sentry.ts
│       ├── controllers/      HTTP layer — parse req, call service, send res
│       ├── db/               pool.ts, migrate.ts, migrations/*.sql
│       ├── middleware/       authenticate, validate, errorHandler, rateLimiter
│       ├── repositories/     All SQL — no SQL anywhere else
│       ├── routes/           Express routers (mount controllers)
│       ├── services/         Business logic — no req/res awareness
│       ├── sockets/          Socket.io event handlers
│       └── utils/            geocode.ts
│
├── shared/                   TypeScript types used by both client and server
│   └── src/types/
│       ├── listing.ts        Listing, CreateListingInput, …
│       ├── user.ts           AuthUser, PublicUser
│       ├── message.ts        Message, Conversation
│       └── index.ts          Re-exports everything
│
└── docs/
    └── superpowers/plans/    Implementation plans
```

---

## 3. Frontend Architecture

### Data flow

```
Page component
  → calls hook  (e.g. useListings)
    → calls api/  (e.g. listingsApi.getAll)
      → axios → REST API
    → updates Zustand store or local state
  → renders components with that data
```

### Layers

**Pages** (`src/pages/`) — One file per route. Each page owns its own loading/error states and composes components. Pages never call `axios` directly.

**Hooks** (`src/hooks/`) — Data fetching and socket logic. They call the API layer and return data + loading/error state.

| Hook | What it does |
|------|-------------|
| `useAuth` | Login, logout, reads auth state from Zustand |
| `useListings` | Fetches paginated listings, applies filters |
| `useMessages` | Fetches messages, sends messages, emits socket events |
| `useConversations` | Fetches conversation list, listens for socket updates |
| `useSocket` | Creates and manages the Socket.io connection |

**API layer** (`src/api/`) — Pure Axios wrappers. No components ever import Axios directly.

```
api/index.ts       — axios instance with base URL + credentials
api/auth.ts        — login, logout, refresh, me
api/listings.ts    — CRUD + save + report
api/conversations.ts — list, start, messages
api/users.ts       — profile, getByUsername
```

**Stores** (`src/store/`) — Zustand for global state that multiple components need.

| Store | What it holds |
|-------|--------------|
| `authStore` | Current user, access token, isLoading |
| `chatStore` | totalUnread count (for navbar badge) |
| `listingStore` | Active filter state for listing pages |

**Route guards** (`src/components/auth/`)

```
ProtectedRoute   — redirects to /login if not authenticated
VerifiedRoute    — redirects to /complete-profile if profile incomplete
```

### State management rule
- **Server state** (listings, messages, users) → fetched in hooks, stored in local component state
- **Global UI state** (auth, unread count, filters) → Zustand
- No Redux, no Context for data — just hooks + Zustand

---

## 4. Backend Architecture

### Request lifecycle

```
HTTP request
  → Express middleware stack
    (helmet, cors, compression, morgan, cookieParser, json body)
  → Route file  (e.g. listingsRouter)
    → authenticate middleware  (verifies JWT)
    → requireVerified middleware  (optional, for write ops)
    → validate middleware  (Zod schema check on req.body)
    → Controller  (parse req → call service → send res)
      → Service  (business logic, throws AppError on errors)
        → Repository  (SQL, returns raw DB rows)
      ← returns typed result
    ← formats and sends JSON response
  ← error falls through to global errorHandler
```

### Layer responsibilities

**Controllers** (`src/controllers/`) — Only HTTP concerns. They read from `req`, call a service, and write to `res`. Zero business logic.

**Services** (`src/services/`) — All business logic. They validate rules (e.g. "only the owner can edit"), orchestrate between repositories, and throw `AppError` for anything that should return a 4xx/5xx. They have no knowledge of `req` or `res`.

**Repositories** (`src/repositories/`) — All SQL. Parameterized queries only. They return typed row objects. Zero business logic.

**Middleware** (`src/middleware/`)

| Middleware | What it does |
|-----------|-------------|
| `authenticate` | Verifies JWT from `Authorization` header, attaches `req.user` |
| `requireVerified` | Blocks unverified users from write operations |
| `validate(schema)` | Runs Zod schema on `req.body`, returns 422 if invalid |
| `rateLimiter` | Express-rate-limit on listing create and report endpoints |
| `errorHandler` | Global catch-all — maps `AppError` to JSON responses |

### Services

| Service | Responsibility |
|---------|---------------|
| `AuthService` | Google OAuth validation, JWT issue, refresh token rotation |
| `TokenService` | JWT sign/verify, refresh token hashing (SHA-256) |
| `ListingService` | Create/update/delete listings, geocode addresses, toggle saves |
| `ConversationService` | Start conversations, send messages, mark delivered/read |
| `StorageService` | Upload images to local disk (dev) or AWS S3 (prod) |
| `EmailService` | Sends transactional email via SMTP (not used in Google-only flow) |

---

## 5. Database Schema

### Tables

```
users
  id, email, password_hash, display_name, username,
  avatar_url, bio, grad_year, major, is_verified,
  is_active, created_at, updated_at

listings
  id, user_id → users.id
  listing_type  ENUM('housing', 'marketplace')
  title, description, price, is_free
  status        ENUM('active', 'sold', 'closed')
  --- housing fields ---
  housing_subtype  ENUM('apartment', 'roommate', 'sublet')
  address, bedrooms, bathrooms, available_from, available_until
  is_furnished, pets_allowed, utilities_included
  --- marketplace fields ---
  marketplace_category  ENUM('textbooks', 'electronics', …)
  condition             ('new' | 'like_new' | 'good' | 'fair' | 'poor')
  --- shared ---
  image_urls TEXT[], location_text, lat, lng
  views_count, search_vector (tsvector, auto-maintained)
  created_at, updated_at

listing_saves
  user_id, listing_id  (composite PK)
  saved_at

conversations
  id, listing_id → listings.id (optional context)
  last_message_at, created_at

conversation_participants
  conversation_id, user_id  (composite PK)
  last_read_at, joined_at

messages
  id, conversation_id → conversations.id
  sender_id → users.id
  content, is_deleted
  delivered_at, read_at
  created_at

reports
  id, reporter_id → users.id
  listing_id → listings.id
  reason, details, resolved_at, created_at

refresh_tokens
  id, user_id → users.id
  token_hash (SHA-256, raw token never stored)
  expires_at, revoked_at, created_at

schema_migrations
  filename, run_at  (migration tracking table)
```

### Key design decisions

- **Unified listings table** — housing and marketplace share one table. Type-specific columns are NULL when not relevant. Avoids joins for the common case.
- **Full-text search** — PostgreSQL `tsvector` generated column on `title + description`. GIN-indexed. Searches happen in SQL, not application code.
- **Soft-delete messages** — `is_deleted = true` renders "This message was deleted" in the UI without breaking conversation integrity.
- **Refresh token hashing** — Raw refresh tokens are never stored. Only the SHA-256 hash is in the DB. A stolen DB dump cannot be used to forge sessions.
- **`last_read_at` for unread counts** — Unread count = messages after `last_read_at`. Simple and fast.
- **`lat` / `lng` on listings** — Populated server-side via Nominatim geocoding when `location_text` is provided. Used by the map page.

### Migrations

Sequential SQL files in `server/src/db/migrations/`. The migration runner (`migrate.ts`) tracks which have run in `schema_migrations`. **Never edit an existing migration** — always add a new one.

```
001_init.sql               — full initial schema
002_add_video_url.sql      — (later removed)
003_remove_video_url.sql
004_clean_local_image_urls.sql
005_google_oauth.sql       — switched from email/password to Google OAuth
006_message_receipts.sql   — delivered_at, read_at on messages
007_add_lat_lng_to_listings.sql  — map feature
```

---

## 6. Authentication Flow

House-Mate uses **Google OAuth only**. There is no email/password login.

### Sign-in

```
1. User clicks "Sign in with Google" (react-oauth/google)
2. Google returns a credential (JWT ID token)
3. Client sends POST /api/auth/google  { credential }
4. Server:
   a. Verifies the Google JWT with google-auth-library
   b. Extracts email from the payload
   c. If user exists → update avatar/name
      If new user   → create user row (is_verified=true, profile_complete=false)
   d. Issues access token (JWT, 15 min, in memory)
   e. Issues refresh token (random bytes, SHA-256 hashed in DB)
      Sets HttpOnly cookie: refresh_token
5. Client stores access token in Zustand (memory only, not localStorage)
6. New user → redirected to /complete-profile to set username + display name
   Returning user → redirected to /marketplace
```

### Token refresh

```
Access token expires every 15 min.
axios interceptor catches 401 → calls POST /api/auth/refresh
  → server reads HttpOnly cookie, verifies token hash, rotates token
  → new access token returned, old refresh token revoked
  → axios retries the original request
```

### Route protection

```
ProtectedRoute  — checks Zustand auth state; if no user → /login
VerifiedRoute   — checks user.profileComplete; if false → /complete-profile
authenticate    — server middleware; verifies JWT on every API call
requireVerified — server middleware; blocks write ops if !user.isVerified
```

---

## 7. Real-Time Chat

Chat is built on **Socket.io** over WebSocket (falls back to long-polling).

### Connection

```
1. useSocket hook creates io() connection on mount
2. Socket sends JWT in auth handshake: io({ auth: { token } })
3. Server middleware verifies JWT, attaches user to socket.data.user
4. Server joins the socket to a personal room: user:{userId}
   (used to deliver receipts to the right user across multiple tabs)
```

### Socket rooms

| Room | Members | Used for |
|------|---------|---------|
| `user:{userId}` | All sockets for one user | Delivery receipts, unread updates |
| `conv:{conversationId}` | Both participants (when viewing chat) | New messages, typing indicators |

### Message lifecycle

```
User types → emits typing → others see "..." indicator
User sends → emits send_message

Server:
  1. Saves message to DB
  2. Emits message:ack back to sender (optimistic confirmation)
  3. Emits message:new to conv room (other participant sees it)
  4. Emits unread:update to recipient's user room (navbar badge)

Recipient opens chat → emits join_conversation
  Server marks messages as delivered → emits message:delivered to sender's user room

Recipient reads → emits messages:read
  Server updates last_read_at → emits message:read to sender's user room
  Server emits unread:cleared to reader's own user room
```

### Message status ticks (WhatsApp-style)

```
sending    → no tick  (optimistic, not yet acked)
sent       → single tick  (ack received from server)
delivered  → double tick gray  (recipient's socket joined the conv)
read       → double tick blue  (recipient emitted messages:read)
```

---

## 8. Listings & Map

### Listing types

All listings share one DB table. `listing_type` determines which fields are relevant:

- **`marketplace`** — item for sale/free. Uses `marketplace_category`, `condition`.
- **`housing`** — place to rent/sublet. Uses `housing_subtype`, `bedrooms`, `bathrooms`, `available_from`, etc.

### Geocoding

When a listing is created or `location_text` changes on update:

```
ListingService.create(input)
  → geocodeAddress(input.locationText)       — calls Nominatim (OSM)
    → GET https://nominatim.openstreetmap.org/search?q=...
    → returns { lat, lng } or null
  → ListingRepository.create({ ...input, lat, lng })
```

Rate limit: Nominatim allows 1 req/sec. Failures are silent (lat/lng stay NULL, listing still saves).

### Map page

`/map` loads all listings with non-null `lat`/`lng`, renders them as custom Leaflet markers on a CartoDB Positron tile layer. Filter chips (All / Housing / Marketplace) filter client-side — no extra API calls.

### Full-text search

Search queries hit a PostgreSQL `tsvector` column on `listings`:

```sql
search_vector tsvector GENERATED ALWAYS AS (
  to_tsvector('english', coalesce(title,'') || ' ' || coalesce(description,''))
) STORED
```

GIN-indexed. The `ListingRepository.findAll` method appends `WHERE search_vector @@ plainto_tsquery($n)` when a search term is present.

---

## 9. File Uploads

Controlled by `UPLOAD_STORAGE` env var.

**Development (`UPLOAD_STORAGE=local`)**
- Files saved to `server/uploads/`
- Served via `express.static`

**Production (`UPLOAD_STORAGE=s3`)**
- `multer-s3` streams directly to AWS S3
- Public bucket policy makes files accessible via CDN URL
- `StorageService.deleteImage` removes from S3 on listing image removal

Max 8 images per listing. Images are validated for mime type (JPEG/PNG/WebP only).

---

## 10. Shared Types

The `shared/` package is symlinked into both `client` and `server` via npm workspaces. Both import from `@stevensconnect/shared`.

This means **a DB schema change always requires updating the shared type** — the TypeScript compiler enforces this. If you add a column to the DB and forget to add it to `shared/src/types/listing.ts`, the server build will fail.

Key types:

```typescript
Listing          — full listing with all fields
CreateListingInput — what the form submits
PublicUser       — safe user profile (no email, no password hash)
AuthUser         — current logged-in user (includes email)
Message          — a chat message with receipt timestamps
Conversation     — conversation with last message + unread count
```

---

## 11. Deployment

### Vercel (frontend)

- Auto-deploys on every push to `main`
- Builds with `cd client && npm run build`
- Serves `client/dist` from CDN
- Environment variable: `VITE_API_URL`, `VITE_GOOGLE_CLIENT_ID`

### Render (backend)

- Auto-deploys on every push to `main`
- Build command: `cd server && npm run build`
- Start command: `node server/dist/server/src/index.js`
- Free tier **sleeps after 15 min idle** — use UptimeRobot to ping `/health` every 5 min
- Environment variables: `DATABASE_URL`, `JWT_SECRET`, `GOOGLE_CLIENT_ID`, `AWS_*`, `CLIENT_ORIGIN`

### Neon (database)

- Serverless PostgreSQL — always on, no sleep
- Connection via `DATABASE_URL` (pooled connection string)
- Run migrations: `cd server && npm run build && npm run migrate`

### Health check

```
GET /health → { status: "ok", env: "production" }
```

UptimeRobot monitors this every 5 min to keep Render warm and alert on downtime.

---

## 12. Key Rules

These are the architectural constraints that keep the codebase consistent:

1. **No SQL outside `server/src/repositories/`** — All database access goes through a Repository. Controllers and Services never import `pool`.

2. **No business logic in controllers** — Controllers only parse `req`, call one service method, and send `res`. All decisions happen in Services.

3. **No raw axios in components or pages** — All HTTP calls go through `client/src/api/`. Components call hooks; hooks call the API layer.

4. **All env vars through `server/src/config/env.ts`** — Never use `process.env.X` directly in server code. `env.ts` validates and exports typed values.

5. **Shared types are the contract** — Any change to the DB schema or API response shape must be reflected in `shared/src/types/`. TypeScript enforces this at build time.

6. **Migrations are append-only** — Never edit an existing `.sql` migration file. Always create a new numbered file. The migration runner only runs files it hasn't seen before.

7. **Services throw `AppError`, not HTTP codes** — `AppError(status, message, code)` is caught by the global `errorHandler` middleware. Services don't know about HTTP.

8. **Refresh tokens are never stored raw** — Only the SHA-256 hash lives in the DB. The raw token is only ever in memory or an HttpOnly cookie.
