# Security Fixes Design — House-Mate
**Date:** 2026-04-21  
**Approach:** Option A — surgical in-place fixes, no new abstractions  
**Priority:** Security-first

---

## Context

House-Mate is a student housing/marketplace platform. Stack: Express + TypeScript server, React + Vite client, PostgreSQL, Cloudinary images, Google OAuth. The codebase has strong structural patterns (Zod validation, parameterized queries, JWT rotation) but a code review surfaced security gaps to fix before production launch.

---

## Fixes

### 1. SQL Injection — `ListingRepository.findAll`

**File:** `server/src/repositories/ListingRepository.ts`  
**Issue:** `opts.viewerUserId` is interpolated directly into the SQL string in `findAll` (the `savedSubquery` variable), while an `idx` counter and `values` array already exist for parameterized values elsewhere in that same query:
```ts
const savedSubquery = opts.viewerUserId
  ? `, EXISTS(... AND ls.user_id = '${opts.viewerUserId}') AS is_saved`
  : '';
```
**Fix:** Push `opts.viewerUserId` onto the existing `values` array and reference it as `$${idx++}` in the subquery. One-line change — `idx` already tracks the next parameter number.

**Also:** `LIMIT ${limit} OFFSET ${offset}` use template literals but are safe in practice (both are integer-clamped arithmetic). Convert to `$N` parameters as a defense-in-depth improvement for consistency.

---

### 2. Socket.io Skips Account-Active Check

**File:** `server/src/index.ts` (Socket.io auth middleware)  
**Issue:** The socket middleware verifies the JWT but does not fetch the user row to check `is_active`. A deactivated user can still connect and send/receive messages.  
**Fix:** After `TokenService.verifyAccessToken(token)`, call `UserRepository.findById(payload.sub)` and reject the connection (`next(new Error('Account inactive'))`) if `!user || !user.is_active`.

---

### 3. No Rate Limiting on Listing Create + Report

**File:** `server/src/routes/listings.ts`  
**Issue:** Only auth routes use `authLimiter`. Listing creation and report submission are unprotected — a single user can spam both.  
**Fix:** Add a dedicated `listingLimiter` to `server/src/middleware/rateLimiter.ts` — more permissive than `authLimiter` (e.g., 30 requests per 15 minutes) since legitimate users create listings more freely than they authenticate. Apply it to:
- `POST /` (create listing)
- `POST /:id/report`

This requires adding ~5 lines to `rateLimiter.ts` and importing in `routes/listings.ts`.

---

### 4. Unbounded Search Query Length

**File:** `server/src/repositories/ListingRepository.ts` (`findAll`)  
**Issue:** `opts.search` is passed to `plainto_tsquery` with no length cap. A very long string causes unnecessary DB CPU usage.  
**Fix:** At the top of `findAll`, before building the query: if `opts.search && opts.search.length > 500`, throw `AppError(400, 'Search query too long', 'SEARCH_TOO_LONG')`.

---

### 5. Client/Server Image Size Limit Mismatch

**File:** `client/src/components/listings/ImageUploader.tsx`  
**Issue:** The client enforces a 10MB max (`MAX_SIZE_MB = 10`) while the server allows up to 20MB (`UPLOAD_MAX_IMAGE_SIZE_BYTES` default). The server will accept files the client silently rejects — a developer uploading via API curl could upload up to 20MB but the UI never allows it. The client limit should match the server.  
**Fix:** Update `MAX_SIZE_MB = 20` in `ImageUploader.tsx` to match the server's configured limit. The `react-dropzone` `maxSize` constraint and `onDropRejected` handler already work correctly — only the constant value needs to change.

---

## Files Changed

| File | Change |
|------|--------|
| `server/src/repositories/ListingRepository.ts` | Parameterize `viewerUserId` + `LIMIT`/`OFFSET` in `findAll`; add search length guard |
| `server/src/middleware/rateLimiter.ts` | Add `listingLimiter` export |
| `server/src/routes/listings.ts` | Apply `listingLimiter` to create + report routes |
| `server/src/index.ts` | Add `user.is_active` check in Socket.io auth middleware |
| `client/src/components/listings/ImageUploader.tsx` | Update `MAX_SIZE_MB` from 10 to 20 |

---

## What Was Reviewed and Found Already Correct

- `ListingService.removeImage` already verifies ownership before deletion — no change needed
- `ImageUploader.tsx` already uses `react-dropzone` with `accept` + `maxSize` pre-validation — no change needed beyond the size constant
- `ListingRepository.findById` already parameterizes `viewerUserId` correctly — no change needed

---

## Verification

1. **SQL injection:** Grep for template literals in `ListingRepository.findAll` — only string fragments (no user values) should remain in the query string
2. **Socket.io active-check:** Set `is_active = false` for a test user in DB, attempt WebSocket connection with their token → expect connection rejected
3. **Rate limiting:** Send 31+ rapid `POST /api/listings` requests → expect 429 after threshold
4. **Search length:** Send a 600-char search string to `GET /api/listings?search=...` → expect 400
5. **Upload size:** Attempt to drop a 15MB image into the uploader → should now be accepted (was previously rejected by the 10MB client cap)
6. **Type-check:** `npm run type-check` → no errors
