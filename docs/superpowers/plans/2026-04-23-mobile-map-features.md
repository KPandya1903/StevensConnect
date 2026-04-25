# Mobile Responsiveness, Map Feature & Product Improvements — Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix all mobile UX issues app-wide, add a map view for housing/marketplace listings, and surface high-value product feature suggestions.

**Architecture:** Mobile fixes are purely CSS/layout (no new deps). Map feature adds `lat`/`lng` columns to the `listings` table, server-side geocoding via OpenStreetMap Nominatim, and a Leaflet-based map component on the client. Feature suggestions are listed as a backlog for the team to prioritise.

**Tech Stack:** React + TypeScript + Vite, Tailwind CSS, Express + PostgreSQL (Neon), Socket.io, React Router DOM, Leaflet + react-leaflet (free, no API key)

---

## Part 1 — Feature Suggestions (Research Findings)

These are not tasks to implement now — they are a product backlog derived from researching Craigslist, Facebook Marketplace, Roomi, SpareRoom, Roomies.com, iROOMit, and student housing research reports.

### Trust & Safety (highest ROI)
1. **Verified user badges** — ID + selfie verification (like Roomi). Show a blue checkmark on profiles. Reduces fraud, the #1 student housing complaint.
2. **User reviews & ratings** — Past roommates rate each other on cleanliness, communication, reliability. Moderated to prevent abuse.
3. **Background check integration** — Optional third-party background check; display completion status.

### Discovery
4. **Price drop / new listing alerts** — Email/push notification when a listing matching saved search criteria is posted or drops in price.
5. **Roommate compatibility questionnaire** — Survey on sleep schedule, cleanliness, guests, noise. Show a compatibility % score (SpareRoom model).
6. **Advanced filters** — Add pet policy, lease length, furnished/unfurnished, move-in window to existing filter panel.

### Communication
7. **In-app video chat / interview scheduling** — Quick 15–30 min video call scheduling with potential roommates (iROOMit model). Reduces need to share phone numbers early.
8. **Listing Q&A** — Public questions and answers on listing pages, visible to all viewers (Facebook Marketplace model).

### Listings & Management
9. **Move-in checklist** — Shared, signable photo checklist for documenting room condition at move-in. Prevents deposit disputes.
10. **Expense splitting** — Built-in tracker (or Splitwise integration) for rent, utilities, groceries between roommates.
11. **Virtual tour uploads** — Support 360° image links (Matterport embed) or ordered photo galleries on listing detail pages.

### Community
12. **Campus/neighbourhood hub** — Community forum grouped by university or zip code. Questions, tips, local recommendations.
13. **Gamified profile completion** — Progress bar + badges for verified email, profile photo, bio, reviews received. Encourages richer profiles.

---

## Part 2 — Mobile Responsiveness Fixes

### File Map

| File | Change |
|------|--------|
| `client/src/components/layout/Navbar.tsx` | Add hamburger menu + mobile drawer |
| `client/src/pages/ChatPage.tsx` | Replace `h-screen` with `h-dvh`; add safe-area padding |
| `client/src/pages/ListingDetailPage.tsx` | Ensure `grid-cols-1` on mobile |
| `client/src/components/listings/ListingFilters.tsx` | Stack filters vertically on mobile |
| `client/src/components/listings/ListingForm.tsx` | Break `grid-cols-2` to `grid-cols-1` on mobile |
| `client/src/components/ui/Modal.tsx` | Full-width on phones (`max-w-full sm:max-w-lg`) |
| `client/src/components/ui/EmojiPicker.tsx` (if it exists) | Reduce grid cols on small screens |
| Various touch targets | Bump interactive elements to ≥ 44px |

---

### Task 1: Navbar — Mobile hamburger menu

**Files:**
- Modify: `client/src/components/layout/Navbar.tsx`

The entire nav (`hidden sm:flex` links, post button, profile) is invisible on mobile. We need a hamburger icon that opens a slide-down or drawer menu.

- [ ] **Step 1: Add hamburger state and mobile menu HTML**

In `Navbar.tsx`, add `const [menuOpen, setMenuOpen] = useState(false)` and a hamburger button that is `sm:hidden`:

```tsx
// Top-right of header, sm:hidden
<button
  onClick={() => setMenuOpen(o => !o)}
  className="sm:hidden flex h-10 w-10 items-center justify-center rounded-full hover:bg-gray-100 transition"
  aria-label="Menu"
>
  {menuOpen ? (
    <svg className="h-5 w-5 text-gray-700" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
    </svg>
  ) : (
    <svg className="h-5 w-5 text-gray-700" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
    </svg>
  )}
</button>
```

- [ ] **Step 2: Add mobile dropdown panel**

Below the `<header>` content, add a conditional panel:

```tsx
{menuOpen && (
  <div className="sm:hidden border-t border-gray-200/80 bg-white/95 backdrop-blur-sm px-4 py-3 space-y-1">
    <NavLink to="/marketplace" onClick={() => setMenuOpen(false)} className="...">Marketplace</NavLink>
    <NavLink to="/listings" onClick={() => setMenuOpen(false)} className="...">Listings</NavLink>
    <NavLink to="/roommates" onClick={() => setMenuOpen(false)} className="...">Roommates</NavLink>
    <NavLink to="/messages" onClick={() => setMenuOpen(false)} className="...">Messages</NavLink>
    <hr className="border-gray-100 my-2" />
    <NavLink to="/listings/new" onClick={() => setMenuOpen(false)} className="flex items-center gap-2 px-3 py-2 rounded-xl bg-brand-600 text-white text-sm font-semibold">
      + Post listing
    </NavLink>
    <NavLink to="/profile" onClick={() => setMenuOpen(false)} className="...">Profile</NavLink>
  </div>
)}
```

- [ ] **Step 3: Keep `unreadCount` badge visible on mobile**

In the messages link, ensure the unread count badge renders inside the mobile menu link the same way it does in the desktop nav.

- [ ] **Step 4: Close menu on outside click / route change**

Add a `useEffect` that calls `setMenuOpen(false)` on `location.pathname` change (import `useLocation`).

- [ ] **Step 5: Verify in browser at 390px width (iPhone 14 viewport)**

Open DevTools → mobile viewport. Confirm hamburger appears, all nav items accessible, badge shows, menu closes on navigation.

- [ ] **Step 6: Commit**

```bash
git add client/src/components/layout/Navbar.tsx
git commit -m "feat(mobile): add hamburger menu and mobile nav drawer"
```

---

### Task 2: ChatPage — iOS Safari viewport fix

**Files:**
- Modify: `client/src/pages/ChatPage.tsx`

`h-screen` (100vh) on iOS Safari clips below the address bar. The fix is `min-h-dvh` (dynamic viewport height) + safe-area insets.

- [ ] **Step 1: Replace `h-screen` with `h-dvh`**

In `ChatPage.tsx` line 111, change:
```tsx
// Before
<div className="flex h-screen flex-col bg-gray-50">
// After
<div className="flex h-dvh flex-col bg-gray-50">
```

- [ ] **Step 2: Add safe-area padding to composer**

The send bar should stay above the iOS home indicator:
```tsx
// Before
<div className="border-t border-gray-200/80 bg-white/90 px-4 py-3 backdrop-blur-sm">
// After
<div className="border-t border-gray-200/80 bg-white/90 px-4 py-3 pb-safe backdrop-blur-sm">
```

Add to `tailwind.config.ts` (if not already):
```ts
// In theme.extend
padding: {
  'safe': 'env(safe-area-inset-bottom)',
},
```

- [ ] **Step 3: Test on iOS Safari or Chrome DevTools with "iPhone 14 Pro" preset**

Confirm the composer is not hidden behind the home indicator bar and the messages area scrolls correctly.

- [ ] **Step 4: Commit**

```bash
git add client/src/pages/ChatPage.tsx client/tailwind.config.ts
git commit -m "fix(mobile): use h-dvh and safe-area inset on ChatPage for iOS Safari"
```

---

### Task 3: ListingDetailPage — mobile layout

**Files:**
- Modify: `client/src/pages/ListingDetailPage.tsx`

The `grid lg:grid-cols-[1fr_360px]` has no `grid-cols-1` default, so columns collapse to their minimum width on mobile.

- [ ] **Step 1: Add `grid-cols-1` base class**

Find the grid container (search for `lg:grid-cols`) and update:
```tsx
// Before (example)
className="grid gap-8 lg:grid-cols-[1fr_360px]"
// After
className="grid grid-cols-1 gap-8 lg:grid-cols-[1fr_360px]"
```

- [ ] **Step 2: Make the image gallery full-width on mobile**

Ensure any image container uses `w-full` without a fixed pixel width.

- [ ] **Step 3: Check the "Contact" / sidebar card**

On mobile the sidebar should render below the main content, not side-by-side. Confirm the grid stacking achieves this.

- [ ] **Step 4: Commit**

```bash
git add client/src/pages/ListingDetailPage.tsx
git commit -m "fix(mobile): stack ListingDetailPage columns on mobile"
```

---

### Task 4: ListingFilters — mobile stacking

**Files:**
- Modify: `client/src/components/listings/ListingFilters.tsx`

Price inputs have `w-20` fixed width and the filter row uses `flex flex-wrap` without enough breakpoint control, causing overflow on narrow viewports.

- [ ] **Step 1: Stack filter controls vertically on mobile**

Change the outer container to:
```tsx
className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center"
```

- [ ] **Step 2: Remove fixed `w-20` from price inputs**

Replace `w-20` with `w-full sm:w-24` on min/max price inputs.

- [ ] **Step 3: Make the category/type select full-width on mobile**

```tsx
className="w-full sm:w-auto rounded-xl border ..."
```

- [ ] **Step 4: Commit**

```bash
git add client/src/components/listings/ListingFilters.tsx
git commit -m "fix(mobile): stack ListingFilters vertically on small screens"
```

---

### Task 5: ListingForm — mobile grid

**Files:**
- Modify: `client/src/components/listings/ListingForm.tsx`

Two-column grid `grid-cols-2` causes cramped fields on phones.

- [ ] **Step 1: Add `grid-cols-1` base and break at sm**

```tsx
// Before
className="grid grid-cols-2 gap-4"
// After
className="grid grid-cols-1 gap-4 sm:grid-cols-2"
```

Apply to every `grid-cols-2` occurrence in the file.

- [ ] **Step 2: Verify textarea and image upload areas are full-width**

Any `col-span-2` field should become `sm:col-span-2` (default full in 1-col layout).

- [ ] **Step 3: Commit**

```bash
git add client/src/components/listings/ListingForm.tsx
git commit -m "fix(mobile): single-column ListingForm on mobile"
```

---

### Task 6: Modal — full-width on phones

**Files:**
- Modify: `client/src/components/ui/Modal.tsx`

Default `max-w-lg` is fine on desktop but needs `w-full` and small horizontal margin on phones.

- [ ] **Step 1: Update modal panel sizing**

```tsx
// Before (rough)
className={`relative bg-white rounded-2xl shadow-xl p-6 ${size ?? 'max-w-lg'} w-full`}
// After: ensure mx-4 on mobile, no margin on sm+
className={`relative bg-white rounded-2xl shadow-xl p-6 mx-4 sm:mx-0 ${size ?? 'max-w-lg'} w-full`}
```

- [ ] **Step 2: Commit**

```bash
git add client/src/components/ui/Modal.tsx
git commit -m "fix(mobile): add horizontal margin to Modal on small screens"
```

---

### Task 7: Touch target audit — bump small buttons to 44px

**Files:**
- Modify: `client/src/pages/ChatPage.tsx`, `client/src/pages/ConversationsPage.tsx`, `client/src/components/listings/MarketplaceListingRow.tsx`, `client/src/components/listings/ListingCard.tsx`

Apple HIG minimum touch target is 44×44pt.

- [ ] **Step 1: Save/heart button in ListingCard and MarketplaceListingRow**

Change `p-1.5` (≈ 30px) to `p-2.5` (≈ 42px) and add `min-h-[44px] min-w-[44px]` to save buttons.

- [ ] **Step 2: Back button in ChatPage header**

The back button `px-3 py-1.5` is about 32px tall. Update to `py-2.5` or ensure `min-h-[44px]`.

- [ ] **Step 3: Send button in ChatPage composer**

Already `h-10 w-10` (40px). Bump to `h-11 w-11` (44px).

- [ ] **Step 4: New message button and conversation rows in ConversationsPage**

Conversation list items should have `min-h-[64px]` for comfortable tapping.

- [ ] **Step 5: Commit**

```bash
git add client/src/pages/ChatPage.tsx client/src/pages/ConversationsPage.tsx \
  client/src/components/listings/MarketplaceListingRow.tsx \
  client/src/components/listings/ListingCard.tsx
git commit -m "fix(mobile): increase touch targets to 44px minimum"
```

---

### Task 8: Remaining small mobile fixes

**Files:** Various

- [ ] **Step 1: ConversationsPage — full-width list on mobile**

Ensure `max-w-2xl` container has `px-4` not `px-6` on mobile so list items don't overflow. Already uses `px-4 py-8` — verify it renders correctly at 375px.

- [ ] **Step 2: MarketplacePage / ListingsPage — `px-4` on mobile**

Check each page's outer `<main>` uses `px-4 sm:px-6` not a fixed larger value.

- [ ] **Step 3: EmojiPicker (if exists)**

If `grid-cols-8` is used, change to `grid-cols-6 sm:grid-cols-8`.

- [ ] **Step 4: Textarea auto-grow on mobile**

The ChatPage textarea `rows={1}` with `maxHeight: 120px` may feel cramped. Consider a slightly taller minimum row height on mobile with `min-h-[44px]`.

- [ ] **Step 5: Commit**

```bash
git add -p  # stage only relevant small fixes
git commit -m "fix(mobile): misc small responsive fixes across pages"
```

---

## Part 3 — Map Feature

### Overview

Show housing listings and marketplace items as pins on an interactive map. Clicking a pin opens a mini card linking to the listing detail page.

**Chosen library:** [Leaflet](https://leafletjs.com/) + [react-leaflet](https://react-leaflet.js.org/) + OpenStreetMap tiles. Free, no API key, MIT license.

**Geocoding:** OpenStreetMap Nominatim REST API (free, no key for low volume). Geocode `locationText` when a listing is created/updated on the server.

### File Map

| File | Change |
|------|--------|
| `server/src/db/schema.ts` (or migration file) | Add `lat DOUBLE PRECISION`, `lng DOUBLE PRECISION` to listings table |
| `server/src/routes/listings.ts` | Geocode `locationText` on create/update, store lat/lng |
| `packages/shared/src/types/index.ts` | Add `lat: number \| null`, `lng: number \| null` to `Listing` type |
| `client/src/pages/MapPage.tsx` | NEW — full-screen map with listing pins |
| `client/src/components/map/ListingMapPin.tsx` | NEW — popup card component |
| `client/src/components/layout/Navbar.tsx` | Add "Map" nav link |
| `client/package.json` | Add `leaflet`, `react-leaflet`, `@types/leaflet` |

---

### Task 9: DB migration — add lat/lng to listings

**Files:**
- Modify: `server/src/db/schema.ts` or create a new migration file

- [ ] **Step 1: Add columns to schema**

If using Drizzle ORM:
```ts
lat: doublePrecision('lat'),
lng: doublePrecision('lng'),
```

If using raw SQL migration, create `migrations/add_lat_lng_to_listings.sql`:
```sql
ALTER TABLE listings
  ADD COLUMN lat DOUBLE PRECISION,
  ADD COLUMN lng DOUBLE PRECISION;
```

- [ ] **Step 2: Run migration against Neon dev database**

```bash
# Drizzle
npx drizzle-kit push

# or raw SQL via psql/neon CLI
psql $DATABASE_URL -f migrations/add_lat_lng_to_listings.sql
```

- [ ] **Step 3: Update shared Listing type**

In `packages/shared/src/types/index.ts`:
```ts
export interface Listing {
  // ... existing fields
  lat: number | null;
  lng: number | null;
}
```

- [ ] **Step 4: Commit**

```bash
git add packages/shared/src/types/index.ts server/src/db/ migrations/
git commit -m "feat(map): add lat/lng columns to listings, update shared type"
```

---

### Task 10: Server-side geocoding on listing create/update

**Files:**
- Modify: `server/src/routes/listings.ts`

- [ ] **Step 1: Create geocoding utility**

Create `server/src/utils/geocode.ts`:
```ts
export async function geocodeAddress(address: string): Promise<{ lat: number; lng: number } | null> {
  if (!address) return null;
  const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(address)}&format=json&limit=1`;
  const res = await fetch(url, {
    headers: { 'User-Agent': 'HouseMate/1.0 (contact@housemate.app)' }
  });
  const data = await res.json() as Array<{ lat: string; lon: string }>;
  if (!data.length) return null;
  return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
}
```

Note: Nominatim requires a non-empty `User-Agent` header and rate-limits to 1 req/sec. For higher volume, consider caching results.

- [ ] **Step 2: Call geocoder on POST /listings (create)**

After validating and inserting the listing, if `locationText` is provided:
```ts
const coords = await geocodeAddress(locationText);
if (coords) {
  await db.update(listings).set(coords).where(eq(listings.id, newListing.id));
}
```

- [ ] **Step 3: Call geocoder on PATCH /listings/:id (update) when locationText changes**

Check if `locationText` changed; if so, re-geocode and update `lat`/`lng`.

- [ ] **Step 4: Confirm listings GET routes return lat/lng**

The `SELECT *` (or explicit column list) in listing fetch queries must include `lat` and `lng`.

- [ ] **Step 5: Commit**

```bash
git add server/src/utils/geocode.ts server/src/routes/listings.ts
git commit -m "feat(map): geocode locationText to lat/lng on listing create/update"
```

---

### Task 11: Install Leaflet on client

**Files:**
- Modify: `client/package.json`

- [ ] **Step 1: Install packages**

```bash
cd client
npm install leaflet react-leaflet
npm install --save-dev @types/leaflet
```

- [ ] **Step 2: Import Leaflet CSS globally**

In `client/src/main.tsx` (or `client/src/index.css`):
```ts
import 'leaflet/dist/leaflet.css';
```

- [ ] **Step 3: Fix Leaflet default marker icon path (Vite/Webpack issue)**

In `client/src/main.tsx` (before React renders), add:
```ts
import L from 'leaflet';
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconUrl: markerIcon,
  iconRetinaUrl: markerIcon2x,
  shadowUrl: markerShadow,
});
```

- [ ] **Step 4: Commit**

```bash
git add client/package.json client/package-lock.json client/src/main.tsx
git commit -m "feat(map): install leaflet + react-leaflet, fix default icon paths"
```

---

### Task 12: ListingMapPin popup component

**Files:**
- Create: `client/src/components/map/ListingMapPin.tsx`

- [ ] **Step 1: Create the popup card**

```tsx
import { Link } from 'react-router-dom';
import type { Listing } from '@stevensconnect/shared';
import { formatPrice } from '../../utils/format';

interface Props {
  listing: Listing;
}

export function ListingMapPin({ listing }: Props) {
  return (
    <div className="w-52 text-sm">
      {listing.imageUrls?.[0] && (
        <img
          src={listing.imageUrls[0]}
          alt={listing.title}
          className="w-full h-28 object-cover rounded-t-lg"
        />
      )}
      <div className="p-2.5">
        <p className="font-semibold text-gray-900 truncate">{listing.title}</p>
        <p className="text-brand-600 font-bold mt-0.5">{formatPrice(listing.price, listing.isFree)}</p>
        {listing.locationText && (
          <p className="text-xs text-gray-400 truncate mt-0.5">{listing.locationText}</p>
        )}
        <Link
          to={`/listings/${listing.id}`}
          className="mt-2 block text-center text-xs font-semibold text-brand-600 hover:underline"
        >
          View listing →
        </Link>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add client/src/components/map/ListingMapPin.tsx
git commit -m "feat(map): add ListingMapPin popup card component"
```

---

### Task 13: MapPage — full-screen map with pins

**Files:**
- Create: `client/src/pages/MapPage.tsx`

- [ ] **Step 1: Create MapPage**

```tsx
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import { useEffect, useState } from 'react';
import { Navbar } from '../components/layout/Navbar';
import { Spinner } from '../components/ui/Spinner';
import { ListingMapPin } from '../components/map/ListingMapPin';
import { listingsApi } from '../api/listings';
import type { Listing } from '@stevensconnect/shared';

export function MapPage() {
  const [listings, setListings] = useState<Listing[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    listingsApi.getAll({ limit: 200 }).then(res => {
      setListings(res.data.data.filter((l: Listing) => l.lat && l.lng));
    }).finally(() => setIsLoading(false));
  }, []);

  const center: [number, number] = [40.7451, -74.0248]; // Stevens Institute of Technology default

  return (
    <div className="flex h-dvh flex-col">
      <Navbar />
      {isLoading ? (
        <div className="flex flex-1 items-center justify-center">
          <Spinner size="lg" />
        </div>
      ) : (
        <MapContainer
          center={center}
          zoom={14}
          className="flex-1 z-0"
          scrollWheelZoom
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          {listings.map(listing => (
            <Marker
              key={listing.id}
              position={[listing.lat!, listing.lng!]}
            >
              <Popup>
                <ListingMapPin listing={listing} />
              </Popup>
            </Marker>
          ))}
        </MapContainer>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Register route in `client/src/App.tsx` (or router file)**

Add:
```tsx
import { MapPage } from './pages/MapPage';
// ...
<Route path="/map" element={<PrivateRoute><MapPage /></PrivateRoute>} />
```

- [ ] **Step 3: Add "Map" link to Navbar**

In `Navbar.tsx`, add a map pin SVG nav link to both desktop and mobile menus:
```tsx
<NavLink to="/map">
  <svg className="h-4 w-4" ...> {/* map pin icon */} </svg>
  Map
</NavLink>
```

- [ ] **Step 4: Commit**

```bash
git add client/src/pages/MapPage.tsx client/src/App.tsx client/src/components/layout/Navbar.tsx
git commit -m "feat(map): add MapPage with Leaflet pins for all geocoded listings"
```

---

### Task 14: Backfill existing listings with lat/lng

Existing listings have `locationText` but `lat`/`lng` will be NULL after migration.

- [ ] **Step 1: Create a one-off backfill script**

Create `server/scripts/backfill-geocode.ts`:
```ts
import { db } from '../src/db';
import { listings } from '../src/db/schema';
import { geocodeAddress } from '../src/utils/geocode';
import { isNull, isNotNull, eq } from 'drizzle-orm';

async function main() {
  const rows = await db.select().from(listings)
    .where(isNull(listings.lat))
    .where(isNotNull(listings.locationText));

  for (const row of rows) {
    const coords = await geocodeAddress(row.locationText!);
    if (coords) {
      await db.update(listings).set(coords).where(eq(listings.id, row.id));
      console.log(`✓ ${row.id} → ${coords.lat},${coords.lng}`);
    }
    // Nominatim rate limit: 1 req/sec
    await new Promise(r => setTimeout(r, 1100));
  }
  console.log('Backfill complete');
}

main().catch(console.error);
```

- [ ] **Step 2: Run backfill (dev only)**

```bash
cd server
npx ts-node scripts/backfill-geocode.ts
```

- [ ] **Step 3: Commit script (don't run in CI)**

```bash
git add server/scripts/backfill-geocode.ts
git commit -m "chore(map): add one-time geocode backfill script for existing listings"
```

---

## Verification Checklist

### Mobile
- [ ] Open app on iPhone 14 viewport (390px) in Chrome DevTools
- [ ] Hamburger appears; all 5 nav links accessible; unread badge visible
- [ ] Menu closes on navigation
- [ ] ChatPage: composer not hidden behind iOS home indicator; messages scroll
- [ ] ListingDetailPage: image and content stack vertically
- [ ] ListingFilters: all inputs stack vertically, no horizontal overflow
- [ ] ListingForm: fields stack single-column
- [ ] Modals: no overflow beyond screen edges
- [ ] All buttons/icons ≥ 44px tap target

### Map
- [ ] Create a new listing with a `locationText` address → lat/lng populated in DB
- [ ] Navigate to `/map` → map loads, pins visible for geocoded listings
- [ ] Click a pin → popup card shows title, price, location, "View listing" link
- [ ] "View listing" link navigates to correct listing detail page
- [ ] Map is usable on mobile (touch scroll, pinch zoom)
- [ ] Listings without `locationText` (no lat/lng) are silently excluded from map
