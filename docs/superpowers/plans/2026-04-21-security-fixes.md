# Security Fixes Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Apply 5 surgical security fixes to House-Mate — parameterize raw SQL, add Socket.io account-active check, add listing rate limiter, cap search query length, and align client/server image size limits.

**Architecture:** All fixes are targeted edits to existing files. No new files except `listingLimiter` added to the existing `rateLimiter.ts`. Fixes are independent and can be applied in any order.

**Tech Stack:** Express + TypeScript, PostgreSQL (`pg`), `express-rate-limit`, React + `react-dropzone`, Socket.io, `jsonwebtoken`

---

## Chunk 1: Server-side fixes (ListingRepository + rateLimiter + Socket.io)

### Task 1: Parameterize `viewerUserId`, `LIMIT`, and `OFFSET` in `ListingRepository.findAll` + add search length guard

**Files:**
- Modify: `server/src/repositories/ListingRepository.ts` (lines 200–248)

**Context:** The `findAll` method builds a parameterized query using an `idx` counter and `values` array for all WHERE conditions. But `savedSubquery` uses a template literal for `viewerUserId`, and `LIMIT`/`OFFSET` are also template literals. The fix moves all three into the parameterized system.

- [ ] **Step 1.1: Add search length guard at top of `findAll`'s option processing block**

In `ListingRepository.findAll`, immediately after the options are received (before the `conditions` array is populated), add:

```ts
if (opts.search && opts.search.length > 500) {
  throw new AppError(400, 'Search query too long', 'SEARCH_TOO_LONG');
}
```

Import `AppError` at the top of the file if not already imported:
```ts
import { AppError } from '../middleware/errorHandler';
```

- [ ] **Step 1.2: Parameterize `viewerUserId` in `savedSubquery`**

Replace the current `savedSubquery` block (lines 223–225):

```ts
// BEFORE
const savedSubquery = opts.viewerUserId
  ? `, EXISTS(SELECT 1 FROM listing_saves ls WHERE ls.listing_id = l.id AND ls.user_id = '${opts.viewerUserId}') AS is_saved`
  : '';
```

With:

```ts
// AFTER
let savedSubquery = '';
if (opts.viewerUserId) {
  savedSubquery = `, EXISTS(SELECT 1 FROM listing_saves ls WHERE ls.listing_id = l.id AND ls.user_id = $${idx++}) AS is_saved`;
  values.push(opts.viewerUserId);
}
```

This must be placed **after** all `conditions.push(...)` calls (so `idx` already reflects all WHERE params) but **before** the `dataQuery` string is constructed.

- [ ] **Step 1.3: Parameterize `LIMIT` and `OFFSET`**

The `dataQuery` currently uses:
```ts
LIMIT ${limit} OFFSET ${offset}
```

Replace with parameterized values. The `countQuery` must NOT receive `limit`/`offset` params — snapshot `values` before pushing them. Use this canonical block:

```ts
const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
const orderBy = sortMap[opts.sort ?? 'newest'];
const limit = Math.min(opts.limit ?? 20, 50);
const page  = Math.max(opts.page ?? 1, 1);
const offset = (page - 1) * limit;

// savedSubquery (parameterized viewerUserId)
let savedSubquery = '';
if (opts.viewerUserId) {
  savedSubquery = `, EXISTS(SELECT 1 FROM listing_saves ls WHERE ls.listing_id = l.id AND ls.user_id = $${idx++}) AS is_saved`;
  values.push(opts.viewerUserId);
}

// Snapshot values for COUNT query (no LIMIT/OFFSET)
const countValues = [...values];

// Push LIMIT and OFFSET for data query
const limitIdx = idx++;
const offsetIdx = idx++;
values.push(limit, offset);

const dataQuery = `
  SELECT l.*,
         u.id           AS author_id,
         u.username     AS author_username,
         u.display_name AS author_display_name,
         u.avatar_url   AS author_avatar_url
         ${savedSubquery}
  FROM listings l
  JOIN users u ON u.id = l.user_id
  ${whereClause}
  ORDER BY ${orderBy}
  LIMIT $${limitIdx} OFFSET $${offsetIdx}
`;

const countQuery = `
  SELECT COUNT(*) AS total FROM listings l ${whereClause}
`;

const [dataResult, countResult] = await Promise.all([
  pool.query<ListingRow>(dataQuery, values),
  pool.query<{ total: string }>(countQuery, countValues),
]);
```

- [ ] **Step 1.4: Run type-check**

```bash
cd /Users/enzo/Desktop/Projects/StevensConnect && npm run type-check
```

Expected: no errors.

- [ ] **Step 1.5: Commit**

```bash
git add server/src/repositories/ListingRepository.ts
git commit -m "fix: parameterize SQL in findAll, add search length guard"
```

---

### Task 2: Add `listingLimiter` and apply to create + report routes

**Files:**
- Modify: `server/src/middleware/rateLimiter.ts`
- Modify: `server/src/routes/listings.ts`

- [ ] **Step 2.1: Add `listingLimiter` to `rateLimiter.ts`**

Append after the existing `authLimiter` export:

```ts
// 30 requests per 15 minutes — permissive enough for normal use,
// tight enough to block spam listing creation and report flooding.
export const listingLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: {
      message: 'Too many requests. Please try again later.',
      code: 'RATE_LIMITED',
    },
  },
  skip: () => env.isTest,
});
```

- [ ] **Step 2.2: Wire `listingLimiter` onto `POST /` and `POST /:id/report` in `listings.ts`**

Add the import at the top of `server/src/routes/listings.ts`:

```ts
import { listingLimiter } from '../middleware/rateLimiter';
```

Then update the two routes. For `POST /` (create listing), add `listingLimiter` before `requireVerified`:

```ts
listingsRouter.post('/',
  listingLimiter,
  requireVerified,
  validate(createListingSchema),
  listingsController.create,
);
```

For `POST /:id/report`, find the existing route and add `listingLimiter`:

```ts
listingsRouter.post('/:id/report',
  listingLimiter,
  requireVerified,
  validate(reportSchema),
  listingsController.report,
);
```

- [ ] **Step 2.3: Run type-check**

```bash
npm run type-check
```

Expected: no errors.

- [ ] **Step 2.4: Commit**

```bash
git add server/src/middleware/rateLimiter.ts server/src/routes/listings.ts
git commit -m "fix: add listingLimiter to create and report routes"
```

---

### Task 3: Add `is_active` check in Socket.io auth middleware

**Files:**
- Modify: `server/src/index.ts` (lines 126–148)

**Context:** The current middleware verifies the JWT with `jwt.verify` directly (not via `TokenService`) and sets `socket.data.user` from the payload. It never checks whether the user account is still active in the database.

- [ ] **Step 3.1: Add UserRepository import to `server/src/index.ts`**

At the top of `server/src/index.ts`, add:

```ts
import { UserRepository } from './repositories/UserRepository';
```

- [ ] **Step 3.2: Replace the Socket.io auth middleware block**

The current block (lines 126–148):

```ts
io.use((socket, next) => {
  const token = socket.handshake.auth.token as string | undefined;
  if (!token) {
    next(new Error('Authentication required'));
    return;
  }

  void import('jsonwebtoken').then(({ default: jwt }) => {
    try {
      const payload = jwt.verify(token, env.JWT_SECRET) as { sub: string; email: string; username: string; isVerified: boolean };
      socket.data.user = {
        id: payload.sub,
        email: payload.email,
        username: payload.username,
        isVerified: payload.isVerified,
      };
      next();
    } catch {
      next(new Error('Invalid or expired token'));
    }
  });
});
```

Replace with:

```ts
io.use((socket, next) => {
  const token = socket.handshake.auth.token as string | undefined;
  if (!token) {
    next(new Error('Authentication required'));
    return;
  }

  void import('jsonwebtoken').then(async ({ default: jwt }) => {
    try {
      const payload = jwt.verify(token, env.JWT_SECRET) as { sub: string; email: string; username: string; isVerified: boolean };

      // Verify account is still active in the database
      const user = await UserRepository.findById(payload.sub);
      if (!user || !user.is_active) {
        next(new Error('Account inactive'));
        return;
      }

      socket.data.user = {
        id: payload.sub,
        email: payload.email,
        username: payload.username,
        isVerified: payload.isVerified,
      };
      next();
    } catch {
      next(new Error('Invalid or expired token'));
    }
  });
});
```

- [ ] **Step 3.3: Run type-check**

```bash
npm run type-check
```

Expected: no errors.

- [ ] **Step 3.4: Commit**

```bash
git add server/src/index.ts
git commit -m "fix: reject deactivated accounts in Socket.io auth middleware"
```

---

## Chunk 2: Client-side fix (ImageUploader size constant)

### Task 4: Align client image size limit with server (10MB → 20MB)

**Files:**
- Modify: `client/src/components/listings/ImageUploader.tsx` (line 6)

**Context:** The server accepts images up to 20MB (`UPLOAD_MAX_IMAGE_SIZE_BYTES` default = 20,971,520 bytes). The client's `MAX_SIZE_MB = 10` silently rejects 10–20MB images that the server would accept. One constant change fixes the mismatch.

- [ ] **Step 4.1: Update the constant**

In `client/src/components/listings/ImageUploader.tsx`, change line 6:

```ts
// BEFORE
const MAX_SIZE_MB = 10;

// AFTER
const MAX_SIZE_MB = 20;
```

The `maxSize` prop on the `useDropzone` call (line 65) already reads `MAX_SIZE_MB * 1024 * 1024`, and the help text (line 129) already reads `{MAX_SIZE_MB}MB` — both update automatically.

- [ ] **Step 4.2: Run type-check**

```bash
npm run type-check
```

Expected: no errors.

- [ ] **Step 4.3: Commit**

```bash
git add client/src/components/listings/ImageUploader.tsx
git commit -m "fix: align client image upload limit with server (10MB -> 20MB)"
```

---

## Verification Checklist

Run all of these after completing all tasks:

- [ ] `npm run type-check` — clean pass across all workspaces
- [ ] Grep confirms no `viewerUserId` template literals remain in `ListingRepository.ts`:
  ```bash
  grep "viewerUserId" server/src/repositories/ListingRepository.ts
  ```
  Expected: only variable references, no `'${opts.viewerUserId}'` string interpolation.
- [ ] Confirm `LIMIT` and `OFFSET` are now parameterized:
  ```bash
  grep "LIMIT \$" server/src/repositories/ListingRepository.ts
  ```
  Expected: `LIMIT $N OFFSET $M` pattern found.
- [ ] Search length guard exists:
  ```bash
  grep "SEARCH_TOO_LONG" server/src/repositories/ListingRepository.ts
  ```
  Expected: one match.
- [ ] `listingLimiter` is exported and imported:
  ```bash
  grep "listingLimiter" server/src/middleware/rateLimiter.ts server/src/routes/listings.ts
  ```
  Expected: matches in both files.
- [ ] Socket.io middleware has `is_active` check:
  ```bash
  grep "is_active" server/src/index.ts
  ```
  Expected: one match.
- [ ] Client size limit updated:
  ```bash
  grep "MAX_SIZE_MB = 20" client/src/components/listings/ImageUploader.tsx
  ```
  Expected: one match — `const MAX_SIZE_MB = 20;`
