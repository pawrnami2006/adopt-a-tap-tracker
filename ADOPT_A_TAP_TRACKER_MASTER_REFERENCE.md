# Adopt-a-Tap Tracker — Master Build Reference
**Crowdsourced Public Water Taps + Bathrooms Mapping App**
Target: 2-hour build → static web app → wrapped as APK (Capacitor or Appilix)

This doc is the single source of truth for the coding agent. Every decision below is FINAL for this build — no "either/or" left open, because ambiguity is what kills 2-hour builds. If something isn't specified, default to the simplest option that ships.

---

## 0. Locked Decisions (read this first)

| Question | Decision | Why |
|---|---|---|
| Next.js or Vite? | **Vite + React (JS/TS)**, NOT Next.js | Next.js SSR/routing adds build complexity Capacitor doesn't need. Vite → static `dist/` → drop straight into Capacitor's `webDir`. If you truly must use Next.js, set `output: 'export'` in `next.config.js` and treat `out/` as the static dir — but Vite is faster to ship in 2 hrs. |
| Map library | **Leaflet.js + OpenStreetMap tiles** | Free, no API key, no billing surprises mid-demo. Mapbox is a stretch goal only. |
| Backend | **Supabase** (Postgres + Auth + Realtime + Storage, all free tier) | One SDK gives you DB, auth, realtime subscriptions, and row-level security without writing a backend. Toilet Hunter itself runs on Supabase. |
| Auth | **Anonymous/guest-first**, optional Google sign-in via Supabase Auth | Don't gate the core loop behind signup. Every guest gets a persistent `device_id` (UUID in localStorage) that becomes their identity until/unless they sign in. |
| Offline strategy | **localStorage write-queue + optimistic UI**, synced on reconnect | Detailed in §4. This is the feature you explicitly called out as critical — treat it as P0, not polish. |
| Verification model | **Consensus-based: 3 distinct users must corroborate a status before it's "Verified"** | A single report only creates a *pending* status. Prevents one person (or a bot) from flipping a pin's state. Detailed in §4.5. |
| Points timing | **Points are only paid out when the cycle they belong to reaches 3 confirmations** — never at the moment of reporting | Closes the incentive to spam unverified reports/pins for points. A new tap's +50 is held until 2 more people confirm it. Detailed in §4.5. |
| Photos | **Optional photo per report, stored in Supabase Storage**, shown as a small gallery on the pin drawer | Adds trust signal alongside the verification count. Compressed client-side before upload/queue. |
| Single app or two? | **One app, two data types** (`taps` and `bathrooms` tables, shared UI shell, shared leaderboard) | Reuse the map, the pin drawer, the status buttons, the points engine. Only the classification form and filter chips differ. |
| Styling | **Tailwind CSS** (as a utility toolset — actual colors/spacing/typography come from `design.md`) | Fastest to theme, fastest for an agent to generate consistent UI in 2 hrs. |
| State | **Zustand** (not Redux) | One tiny store for: user, taps[], bathrooms[], syncQueue[], leaderboard[]. |

---

## 1. Tech Stack (exact packages)

```
npm create vite@latest adopt-a-tap-tracker -- --template react-ts
cd adopt-a-tap-tracker

npm install leaflet react-leaflet
npm install @supabase/supabase-js
npm install zustand
npm install -D tailwindcss postcss autoprefixer
npx tailwindcss init -p
npm install uuid
npm install lucide-react        # icons
npm install date-fns            # "15 mins ago" formatting
```

For APK wrapping later:
```
npm install -D @capacitor/core @capacitor/cli
npx cap init adopt-a-tap-tracker com.yourteam.adoptatap
npm install @capacitor/geolocation @capacitor/network
```

---

## 2. Supabase Schema (run in SQL editor)

```sql
-- USERS (mirrors Supabase auth.users, extended with points/profile)
create table profiles (
  id uuid primary key default gen_random_uuid(),
  device_id text unique not null,       -- localStorage anon id, always present
  auth_user_id uuid references auth.users(id) null, -- null until they sign in
  display_name text default 'Anonymous Guardian',
  total_points int default 0,
  created_at timestamptz default now()
);

-- WATER TAPS
create table taps (
  id uuid primary key default gen_random_uuid(),
  created_by uuid references profiles(id),
  lat double precision not null,
  lng double precision not null,
  tap_type text check (tap_type in ('drinking_fountain','community_tap','restroom_sink')) not null,
  description text,

  -- OFFICIAL (verified) state — only changes when a pending report hits 3 confirmations
  status text check (status in ('working','issue','broken')) default 'working',
  last_verified timestamptz default now(),   -- timestamp of the 3rd confirming report
  is_verified boolean default false,          -- true once >=3 people have ever confirmed current status

  -- PENDING state — the report currently collecting confirmations
  pending_status text check (pending_status in ('working','issue','broken')),
  pending_confirmations int default 0,
  pending_started_at timestamptz,
  pending_cycle_id uuid,                      -- matches status_logs.verification_cycle_id for the active cycle

  photo_urls text[] default '{}',            -- latest few photos, denormalized for fast pin display (cap 5, newest first)
  created_at timestamptz default now(),
  synced boolean default true          -- false = came from offline queue, used client-side only
);

-- BATHROOMS
create table bathrooms (
  id uuid primary key default gen_random_uuid(),
  created_by uuid references profiles(id),
  lat double precision not null,
  lng double precision not null,
  name text,                            -- e.g. "McDonald's - MG Road"
  is_free boolean default true,
  price_note text,                      -- e.g. "₹5" if paid
  is_accessible boolean default false,  -- wheelchair
  is_unisex boolean default false,
  has_baby_change boolean default false,

  -- OFFICIAL (verified) state
  status text check (status in ('working','issue','broken')) default 'working',
  cleanliness_status text check (cleanliness_status in ('clean','average','dirty')) default 'clean',
  last_verified timestamptz default now(),
  is_verified boolean default false,

  -- PENDING state (tracks status + cleanliness together as one "report" — see §4.5)
  pending_status text check (pending_status in ('working','issue','broken')),
  pending_cleanliness text check (pending_cleanliness in ('clean','average','dirty')),
  pending_confirmations int default 0,
  pending_started_at timestamptz,
  pending_cycle_id uuid,

  photo_urls text[] default '{}',
  created_at timestamptz default now(),
  synced boolean default true
);

-- STATUS/VERIFICATION LOG (every individual report — powers the pending/confirm math, audit trail, and points)
create table status_logs (
  id uuid primary key default gen_random_uuid(),
  point_type text check (point_type in ('tap','bathroom')) not null,
  point_id uuid not null,               -- references taps.id or bathrooms.id
  profile_id uuid references profiles(id),
  reported_status text not null,
  reported_cleanliness text,            -- only for bathrooms
  note text,
  photo_url text,                       -- optional single photo attached to this specific report
  source text check (source in ('creation','status_update','checkin')) not null,  -- determines point value on payout
  verification_cycle_id uuid not null,  -- groups the reports that together form one pending→confirmed cycle
  counted_as_confirmation boolean default false,  -- true if this report matched pending_status and incremented the counter
  points_awarded boolean default false, -- flips true only when this row's cycle reaches 3 confirmations and payout runs
  created_at timestamptz default now()
);

-- ADOPTIONS (watchlist)
create table adoptions (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid references profiles(id),
  point_type text check (point_type in ('tap','bathroom')) not null,
  point_id uuid not null,
  created_at timestamptz default now(),
  unique(profile_id, point_type, point_id)
);

-- POINTS LEDGER (append-only, sum = profiles.total_points, keeps it auditable)
create table points_ledger (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid references profiles(id),
  action text check (action in ('add_point','verify_update','adopted_checkin')) not null,
  points int not null,
  point_type text,
  point_id uuid,
  created_at timestamptz default now()
);

-- Enable RLS, allow public read + insert (MVP: no auth wall on writes, guest-friendly)
alter table taps enable row level security;
alter table bathrooms enable row level security;
alter table status_logs enable row level security;
alter table adoptions enable row level security;
alter table points_ledger enable row level security;
alter table profiles enable row level security;

create policy "public read" on taps for select using (true);
create policy "public insert" on taps for insert with check (true);
create policy "public update" on taps for update using (true);
create policy "public read" on bathrooms for select using (true);
create policy "public insert" on bathrooms for insert with check (true);
create policy "public update" on bathrooms for update using (true);
create policy "public read" on status_logs for select using (true);
create policy "public insert" on status_logs for insert with check (true);
create policy "public read/write adoptions" on adoptions for all using (true) with check (true);
create policy "public read/write points" on points_ledger for all using (true) with check (true);
create policy "public read/write profiles" on profiles for all using (true) with check (true);

-- Leaderboard view
create view leaderboard as
select id, display_name, total_points,
  case
    when total_points between 0 and 100 then 'Leak Finder'
    when total_points between 101 and 500 then 'Tap Guardian'
    when total_points between 501 and 1500 then 'Water Warden'
    else 'Aqua Legend'
  end as tier
from profiles
order by total_points desc;
```

> Skip real RLS hardening for the 2-hr build (public policies above are intentionally open). Tighten post-demo if this goes further.

### Storage bucket for photos
```sql
-- Run in Supabase dashboard: Storage → New bucket → "point-photos" → Public bucket = ON
```
Public bucket keeps this simple (no signed URLs needed for a 2-hr demo). Upload path convention: `point-photos/{point_type}/{point_id}/{uuid}.jpg`.

---

## 3. Folder Structure

```
src/
  main.tsx
  App.tsx
  lib/
    supabase.ts          # supabase client init
    deviceId.ts           # get-or-create anon device_id in localStorage
    points.ts             # payoutCycle(cycleId) — ONLY place points are ever written, called from verification.ts on flip
    timeAgo.ts             # date-fns wrapper for "15 mins ago"
    verification.ts       # pending/confirm state machine — §4.5, single source of truth for the flip logic
    photoCompress.ts      # canvas resize + JPEG compress before upload/queue
  store/
    useAppStore.ts        # zustand: user, taps, bathrooms, filters, syncQueue
  sync/
    offlineQueue.ts       # queue read/write to localStorage, replay on reconnect
    useNetworkStatus.ts   # online/offline listener hook
  components/
    map/
      MapView.tsx
      TapPin.tsx
      BathroomPin.tsx
      LocateMeButton.tsx
      AddPointFAB.tsx
    drawer/
      PointDetailsDrawer.tsx   # bottom sheet, shared for tap + bathroom
      StatusButtons.tsx        # disables own-vote per §4.5
      VerificationBadge.tsx    # shows verified vs. pending + confirmation count (X of 3) — styling per design.md
      PhotoStrip.tsx           # thumbnail gallery + "add photo" trigger
      AdoptButton.tsx
    forms/
      AddTapForm.tsx
      AddBathroomForm.tsx
    leaderboard/
      LeaderboardTab.tsx
      TierBadge.tsx
    dashboard/
      AdoptedTapsDashboard.tsx
    layout/
      BottomNav.tsx        # Map | Leaderboard | Watchlist | Profile
      TopBar.tsx           # sync status indicator lives here
  pages/
    MapPage.tsx
    LeaderboardPage.tsx
    WatchlistPage.tsx
    ProfilePage.tsx
  types/
    index.ts               # Tap, Bathroom, Profile, StatusLog types
```

---

## 4. Offline-First Sync Engine (P0 — build this early)

### Principle
Every write (new pin, status update, adoption, check-in) is:
1. Applied **optimistically** to the Zustand store immediately (UI updates instantly, no spinner).
2. Written to a **localStorage queue** (`adoptatap_sync_queue`) as a pending action.
3. If online → immediately attempt Supabase write; on success, remove from queue.
4. If offline → stays queued, marked `synced: false` in UI (small dot/icon on the pin).
5. A `useNetworkStatus` hook listens to `window.addEventListener('online', ...)` and triggers `flushQueue()` on reconnect.

### Queue item shape
```ts
type QueuedAction = {
  id: string;              // uuid, client-generated
  type: 'CREATE_TAP' | 'CREATE_BATHROOM' | 'UPDATE_STATUS' | 'ADOPT' | 'CHECKIN';
  payload: any;
  createdAt: string;
  attempts: number;
};
```

### Key behaviors
- **New pins created offline** get a **client-generated UUID** immediately (via `uuid` package) so they can be rendered on the map right away and referenced by later actions (e.g., adopting a tap you just added offline) even before the server confirms.
- `flushQueue()` processes the queue **in order**, oldest first. On each success, remove from queue + update local store's `synced: true`.
- On failure (e.g., Supabase reachable but write rejected), leave in queue, increment `attempts`, retry with backoff (simple: retry on next `online` event or every 30s while online).
- Store the queue as JSON in `localStorage.setItem('adoptatap_sync_queue', JSON.stringify(queue))` — persists across app restarts even offline.
- **Initial map load**: on app boot, first render from `localStorage` cache of taps/bathrooms (`adoptatap_cache_taps`, `adoptatap_cache_bathrooms`) so the map isn't empty offline, then fetch fresh data from Supabase if online and merge/replace cache.
- Show a small **"Syncing… 3 pending"** pill in the TopBar whenever `queue.length > 0`, and a green "All synced" state when empty.

### Points on offline actions
Award points **locally immediately** (optimistic total shown to user), but the authoritative `points_ledger` insert also goes through the same queue — so the leaderboard is eventually consistent, not instant, for offline users. This is fine for MVP; don't over-engineer conflict resolution.

---

## 4.5 Verification Engine (P0 — this is the trust layer, don't skip it)

### The problem this solves
One person tapping "Broken" shouldn't be able to flip a pin red for everyone. Status is only "official" once **3 different people** have independently said the same thing. This applies to **status updates**, **cleanliness ratings**, and **new pin submissions alike** — everything shown on the map should be backed by corroboration, not a single report.

### Core rule: pending → confirmed
Every point (tap or bathroom) carries two states at once:
- **Official state** (`status`, `cleanliness_status`, `last_verified`, `is_verified`) — what's shown on the map by default.
- **Pending state** (`pending_status`, `pending_confirmations`, `pending_started_at`, `pending_cycle_id`) — the report currently trying to gather 3 matching confirmations.

**On every new report (creation, status update, cleanliness rate, or check-in):**
1. Insert a `status_logs` row immediately for audit trail, tagged with a `source` (`creation` / `status_update` / `checkin`).
2. Look up the point's current `pending_status` and `pending_cycle_id`.
3. **If the new report matches `pending_status`:**
   - Check `status_logs` to confirm this `profile_id` hasn't already reported within the current `pending_cycle_id` (one person = one vote, no double-counting even if they tap the button five times).
   - If it's a genuinely new confirming voice → tag this row with the existing `pending_cycle_id`, set `counted_as_confirmation = true`, increment `pending_confirmations`.
   - **If `pending_confirmations` reaches 3** → this is the flip moment:
     - `status = pending_status`, `cleanliness_status = pending_cleanliness` (bathrooms only)
     - `last_verified = now()` (timestamp of this, the 3rd, confirming report)
     - `is_verified = true`
     - **Run points payout for this cycle** (see "Points are earned on verification, not on reporting" below).
     - Reset `pending_status = null`, `pending_confirmations = 0`, `pending_started_at = null`, `pending_cycle_id = null` — ready to collect the *next* change.
4. **If the new report does NOT match `pending_status`** (someone disagrees, or there was no pending report yet):
   - Generate a **new `verification_cycle_id`**. This report becomes the new pending state: `pending_status = <new value>`, `pending_confirmations = 1`, `pending_started_at = now()`, `pending_cycle_id = <new id>`. Tag this row `counted_as_confirmation = true` (it's 1 of 3 for its own new cycle).
   - The old pending cycle (if any) is abandoned — it didn't reach consensus before someone contradicted it. **No points are ever paid out for an abandoned cycle**; its `status_logs` rows stay in the audit trail with `points_awarded = false` permanently.

This means: if 2 people say "Broken" and a 3rd person says "Working," the pending state resets to "Working: 1/3" and the two "Broken" reports never earn points — it does **not** average the votes, and it does **not** retroactively pay out a cycle that got overturned. Simple majority-of-recent-agreement, not a weighted score. Good enough for MVP; don't build anything fancier in 2 hours.

### Points are earned on verification, not on reporting
**No points are awarded at the moment someone taps a button or submits a form.** A report only pays out once the cycle it belongs to reaches 3 confirmations. This is deliberate: it means an added tap/bathroom only earns its creator points once **2 additional people** confirm it (3 total, counting the creator) — a single unverified submission earns nothing.

When a cycle flips to verified (step 3 above), payout runs once, over every `status_logs` row carrying that `verification_cycle_id` (there will be exactly 3, one per distinct confirming profile):

| Row's `source` | Points on payout | Ledger action |
|---|---|---|
| `creation` | +50 | `add_point` |
| `status_update` | +10 | `verify_update` |
| `checkin` | +15 | `adopted_checkin` |

For each of the 3 rows: insert one `points_ledger` entry, add to `profiles.total_points`, and set `points_awarded = true` on that row so it can never be paid out twice. This is the only place points are ever written — `lib/points.ts` should expose a single `payoutCycle(cycleId)` function called from `lib/verification.ts` at the exact moment `pending_confirmations` hits 3, nowhere else.

**Known trade-off, worth knowing about:** a genuine, accurate report that nobody happens to pass by and confirm will sit at 1/3 or 2/3 forever and never earn its reporter points. That's an accepted cost of "no single-person point-farming" for this MVP — not a bug. A future improvement (not in scope for the 2-hour build) would be auto-expiring stale pending cycles after N days so contributors aren't left in permanent limbo, or partial/delayed credit — skip that entirely here.

### New pin submissions
A newly created tap/bathroom starts with `is_verified = false` and its own creation is the seed `status_logs` row (`source = 'creation'`) that opens `pending_cycle_id` at 1/3. It shows on the map immediately (don't hide unverified pins — that kills the "add and see it" satisfaction) with whatever "unverified" treatment design.md specifies, and its creator's +50 points are **held, not granted**, until 2 more people independently confirm it.

### What the user sees
The drawer must clearly communicate, at minimum: (a) whether the point is currently verified or pending, (b) how many confirmations the pending report has (e.g. "2 of 3"), and (c) if the current user has already confirmed this pending report themselves, so their matching status button is disabled rather than letting them vote twice. **Visual treatment (colors, pin styles, badges, layout) is defined in design.md — this doc only specifies the states that need representing, not how they should look.**

`last_verified` timestamp **only ever updates on a flip to verified** — not on every single tap of a button. This is what stops the timestamp from looking "freshly updated" off the back of one unverified report.

### Photos
- "Add photo" is optional on every report (creation, status update, cleanliness rate, or check-in) — a camera/gallery picker (`<input type="file" accept="image/*" capture="environment">` works in both browser and Capacitor WebView).
- Compress client-side before upload: draw to a `<canvas>`, resize longest edge to ~800px, export as JPEG ~0.7 quality — keeps uploads fast on mobile data and keeps offline-queued photos small enough for localStorage/IndexedDB.
- Photo uploads to Supabase Storage happen **after** the point/report record syncs (photo is attached by URL once available) — don't block the status update itself on a slow photo upload.
- Denormalize the **3 most recent photos** onto the tap/bathroom row (`photo_urls`) so the drawer can show a small thumbnail strip without an extra query; full history stays queryable via `status_logs.photo_url`.
- Photos do **not** need their own verification and are **not** gated by `points_awarded` — showing a photo is itself the trust signal, independent of whether the report it came from ever reaches 3 confirmations. Someone photographing an obviously broken pipe should be visible right away, even as unverified/unpaid evidence.

### Offline handling for verification + photos
- Confirmation counting logic (§ above) runs **client-side first** against the locally cached point state for instant optimistic UI (e.g. show "2 of 3 confirmed" right after tapping, even offline), then the queued write reconciles with the server's real count on sync. If the local optimistic count and server count disagree after sync (e.g. two offline users both were "the 3rd confirmer"), **server wins** — client re-fetches the point and overwrites local state. Don't try to merge/resolve this in the client; keep it simple.
- Photos captured offline: store the compressed base64 JPEG string directly inside the queued action's payload (not a separate binary store) — simplest path for a 2-hour build. On sync, decode and upload to Storage, then attach the resulting URL to the report.

---

## 5. Core Features — Build Spec

### 5.1 Interactive Map (shared for taps + bathrooms)
- Full-screen Leaflet map, centered on `navigator.geolocation.getCurrentPosition()`, fallback to a default city center if permission denied.
- Toggle chip at top: **Taps | Bathrooms | Both** — filters which pins render.
- Pins are custom Leaflet `divIcon`s (not default markers) so they're stylable per design.md rather than locked to Leaflet's default marker.
- Functionally, each pin must be able to represent: current status (working/issue/broken, or clean/average/dirty for bathrooms), and verified vs. pending state — plus, for bathrooms, whether it's accessible and free/paid. **All colors, icons, and pin styling come from design.md** — this doc only defines which states exist and need to be distinguishable.

### 5.2 Add a Point ("+" FAB)
- Floating `+` button, bottom-right, opens a mode picker: **Add Tap** or **Add Bathroom**.
- Captures `navigator.geolocation.getCurrentPosition()` at time of tap (don't let them drag a pin in MVP — keep it one-click).
- **Add Tap form (2 fields):**
  1. Type: Drinking Fountain / Community Tap / Restroom Sink (radio/chips)
  2. Description (optional, short text)
- **Add Bathroom form** (modeled on Toilet Hunter, trimmed for speed):
  1. Name (optional text, e.g. "Cafe Coffee Day - Station Road")
  2. Free or Paid (toggle; if Paid, optional price note text)
  3. Feature chips (multi-select, tap to toggle): ♿ Accessible · ⚧ Unisex · 🍼 Baby Change
  4. Initial cleanliness: Clean / Average / Dirty (defaults to Clean)
- Both forms include an **optional "Add photo"** step (camera/gallery, compressed client-side per §4.5) — attaches to the point's `photo_urls` and to the seed `status_logs` row.
- On submit → optimistic pin drop (marked `is_verified = false`, treatment defined in design.md) + queued write. This seeds a `verification_cycle_id` at 1/3 confirmations. **No points are granted yet** — the creator's +50 is held until 2 more people confirm the pin (see §4.5, "Points are earned on verification, not on reporting").

### 5.3 Status Reporting, Verification & "Last Verified"
- Pin drawer (bottom sheet on tap-click) shows: type/name, verification state (verified vs. pending + confirmation count — states defined in §4.5, visuals in design.md), "Last verified {timeAgo}" (only moves on an actual flip, not every tap), photo thumbnail strip, feature chips (bathrooms), and 3 buttons: **Working / Issue / Broken**.
- Bathrooms also get a quick cleanliness re-rate (Clean/Average/Dirty) alongside the status buttons — mirrors Toilet Hunter's separate "rate" vs "status" split, but collapsed into one drawer for MVP speed. Both travel together as one "report" through the same pending/confirm logic.
- An optional **"Add photo"** control sits in the same report action (camera/gallery picker, compressed client-side — see §4.5).
- Tapping any status button runs the **pending → confirmed logic from §4.5**, not a direct overwrite:
  - Inserts a `status_logs` row (`source = 'status_update'`) — always, matched or not.
  - If it matches the current pending cycle and is a new confirming voice → joins that `verification_cycle_id`, increments `pending_confirmations`; on hitting 3, flips `status`/`cleanliness_status`, sets `last_verified = now()`, `is_verified = true`, and **triggers payout** for all 3 rows in that cycle.
  - If it doesn't match → opens a new `verification_cycle_id` at 1/3, abandoning the old one (its rows never get paid out).
  - Own-vote protection: if this profile already reported within the current cycle, their matching status button is disabled.
  - **Points (+10) are only credited once this specific report's cycle reaches 3 confirmations** — not at the moment of tapping. See §4.5 payout table.
- "Last Verified" is computed client-side with `date-fns` `formatDistanceToNow`, re-rendered on an interval (every 60s) so it stays live without refetching.

### 5.4 Adopt-a-Tap / Adopt-a-Bathroom (Watchlist)
- Star/bookmark icon in the drawer → inserts into `adoptions` (queued if offline).
- **Watchlist tab**: list of all adopted taps + bathrooms, each row shows name/type, current status dot, last verified.
- "Check in" on a watchlist item runs the same §4.5 report flow, tagged `source = 'checkin'`. It's still just a report — it only joins/starts a `verification_cycle_id` like any other status update, and only pays out **+15 points** once that cycle reaches 3 confirmations (see §4.5 payout table). Checking in on your own adopted tap doesn't fast-track verification; it's one vote like anyone else's.

### 5.5 Leaderboard ("Water Guardian")
- Tab showing:
  - Sticky header: your rank, name, total points, current tier badge.
  - Top 10 list (from the `leaderboard` view, `order by total_points desc limit 10`).
  - Realtime-ish: refetch on tab focus (Supabase realtime subscription is a stretch goal, not required for 2 hrs).
- **Tiers** (drive both the badge and a progress bar to next tier):
  | Points | Tier |
  |---|---|
  | 0–100 | Leak Finder |
  | 101–500 | Tap Guardian |
  | 501–1500 | Water Warden |
  | 1500+ | Aqua Legend |
- Points awarding logic lives in one function `payoutCycle(cycleId)` in `lib/points.ts` (called only from `lib/verification.ts` at the moment a cycle hits 3 confirmations — see §4.5) so point math is never duplicated across map-create, status-update, and check-in flows, and can never fire before verification.

### 5.6 Profile / Guest Identity
- On first load: generate `device_id = uuid()`, store in `localStorage.adoptatap_device_id`, upsert into `profiles` table (queued if offline).
- Optional "Set display name" field, no login wall.
- Optional stretch: Supabase Google OAuth to persist identity across devices — skip in the 2-hr version unless time remains.

---

## 6. Screens (4 total, bottom nav)

1. **Map** (default/home) — the core interactive map + FAB + filter chips + drawer.
2. **Leaderboard** — ranked list + tier badge.
3. **Watchlist** — adopted taps/bathrooms dashboard.
4. **Profile** — display name, points total, sync status, "Clear local data" debug button.

---

## 7. Design & Styling

**Not covered here.** Visual design — colors, typography, pin/badge styling, spacing, layout — is specified separately in `design.md`. This doc defines *what states and data* need to be shown (verified/pending, status values, photo strips, tier badges, etc.); `design.md` defines *how they look*. Build components against the state/data contracts in §4.5 and §5, and style them per design.md rather than inventing styling decisions here.

---

## 7.5 Team Split (2 people) & Git Workflow

The split is **logic vs. UI**, not **taps vs. bathrooms** — taps and bathrooms share nearly all their verification/points/offline logic (§4, §4.5), so dividing by data type would have both people editing the same files all night. Dividing by folder means you can work in parallel almost the entire two hours and only truly integrate twice.

### Track A — Core & Data (owns everything non-visual)
**Files:** `lib/*`, `sync/*`, `store/useAppStore.ts`, `types/index.ts`, the Supabase project itself (schema, Storage bucket, RLS).
**Responsible for:**
- Running the schema SQL (§2) and creating the `point-photos` Storage bucket
- `lib/supabase.ts`, `lib/deviceId.ts`, `lib/timeAgo.ts`, `lib/photoCompress.ts`
- `lib/verification.ts` — the pending→confirmed state machine (§4.5) — **this is the highest-risk file, build and test it in isolation before UI depends on it**
- `lib/points.ts` — `payoutCycle(cycleId)`, the only place points are ever written
- `sync/offlineQueue.ts`, `sync/useNetworkStatus.ts` (§4)
- `store/useAppStore.ts` — exposes the state and actions Track B will call (see contract below)
- `types/index.ts` — shared TypeScript types, written first so both tracks can import from it immediately

### Track B — Map & UI (owns everything visual)
**Files:** `components/*`, `pages/*`.
**Responsible for:**
- `components/map/*` — MapView, TapPin, BathroomPin, LocateMeButton, AddPointFAB
- `components/drawer/*` — PointDetailsDrawer, StatusButtons, VerificationBadge, PhotoStrip, AdoptButton
- `components/forms/*` — AddTapForm, AddBathroomForm
- `components/leaderboard/*`, `components/dashboard/*`, `components/layout/*`
- `pages/*` — wiring the above to the store
- Applying `design.md` styling throughout

### The contract (agree on this together in the first 10 minutes, before splitting)
Track B codes against these without needing Track A's implementation finished — agree on the shapes, then both start immediately:
```ts
// store/useAppStore.ts — Track A implements, Track B only ever imports and calls
useAppStore().taps            // Tap[]
useAppStore().bathrooms       // Bathroom[]
useAppStore().addTap(input)         // optimistic add + queues write, returns local id immediately
useAppStore().addBathroom(input)
useAppStore().reportStatus(pointType, pointId, status, cleanliness?, photoFile?, source)  // runs §4.5 logic
useAppStore().adoptPoint(pointType, pointId)
useAppStore().leaderboard      // {id, display_name, total_points, tier}[]
useAppStore().syncQueueLength  // number, for the "Syncing… N pending" pill
useAppStore().profile          // {id, display_name, total_points, tier}
```
If Track A hasn't finished the real implementation yet, stub these in the store returning fake/hardcoded data so Track B is never blocked. Whoever finishes their piece first should stub or unblock the other, not go idle.

### Git workflow
- One repo, `main` as the integration branch.
- **First commit (joint, ~5 min):** Vite scaffold, `package.json` with all dependencies from §1 already installed, Tailwind configured, `.env.example`, `types/index.ts` stubbed, the store contract above stubbed with fake data. Both pull this before splitting.
- Branches: `feat/core-logic` (Track A), `feat/map-ui` (Track B). Commit small and often, push regularly — don't sit on one giant local commit for an hour.
- **Checkpoint merge #1 (~50 min mark):** merge both branches into `main`, resolve conflicts (should be minimal — different folders), smoke-test the full Add Tap → verify → points loop end-to-end together for 5 minutes.
- **Checkpoint merge #2 (~1:50 mark):** final merge, both present, resolve anything outstanding, then wrap the APK together (§8) — don't let one person do the final merge alone while the other keeps coding, you'll diverge again.
- **Files likely to conflict** (both may need to touch): `App.tsx` (routing/mount), `package.json` (new deps). Keep changes to these tiny and message each other before editing — first person to need a change there just does it and pushes immediately rather than batching it in.
- If `store/useAppStore.ts` needs a shape change mid-build, that's Track A's call — Track B should not edit it directly, only request changes, to avoid two people race-editing the shared contract file.

---

## 8. Wrapping as APK

### Option A — Capacitor
```
npm run build                          # produces dist/
npx cap add android
npx cap sync
npx cap open android                   # opens Android Studio, build APK from there
```
- Add to `capacitor.config.ts`: `webDir: 'dist'`.
- Use `@capacitor/geolocation` instead of raw `navigator.geolocation` if GPS permission issues appear in the native shell — fallback pattern: try Capacitor plugin first, fall back to browser API if plugin unavailable (keeps the same code working in browser preview too).
- Use `@capacitor/network` to detect connectivity in the wrapped app (more reliable than `navigator.onLine` inside a WebView).

### Option B — Appilix
- Deploy the Vite build to any static host (Vercel/Netlify — push `dist/` or connect the repo).
- Point Appilix at the deployed URL; it wraps it as a WebView APK.
- **Caveat:** geolocation and localStorage both need to work reliably inside a generic WebView wrapper — test the deployed URL in mobile Chrome first before handing to Appilix, since Appilix gives you less control over permissions prompts than Capacitor does.

---

## 9. Build Order for the 2-Hour Window

| Time | Task |
|---|---|
| 0:00–0:15 | Vite scaffold, Tailwind, Supabase project + run schema SQL + Storage bucket, `.env` with `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` |
| 0:15–0:35 | Map page: Leaflet centered on geolocation, static markers first (hardcoded), device_id/profile bootstrap |
| 0:35–0:55 | Add Tap flow: FAB → form → optimistic unverified pin (style per design.md) → Supabase insert, seed `status_logs` row (no offline queue yet, assume online) |
| 0:55–1:25 | **Verification engine** (`lib/verification.ts`): pending/confirm state machine, `VerificationBadge`, own-vote disable, flip-to-verified logic + `last_verified` update. This is the part worth protecting time for — everything else is straightforward CRUD by comparison. |
| 1:25–1:40 | Add Bathroom flow (reuse drawer/status/verification logic, new form with feature chips) |
| 1:40–1:50 | Photo capture + compression + Storage upload, thumbnail strip in drawer |
| 1:50–2:00 | Leaderboard tab + tiers. **Offline queue** is the first thing to cut if you're out of time — ship online-only with a visible "Offline mode: coming soon" note rather than a half-working sync bug. |

> Priority order if the clock runs out, highest to lowest: **1) verification engine (this is the trust feature you asked for by name), 2) core map + add/report flow, 3) leaderboard, 4) photos, 5) offline queue, 6) bathrooms as a fully separate polished flow (it can visually reuse 90% of taps).** Offline sync moved down the priority list this round because verification logic is now the harder, more novel piece — cut whichever is genuinely least finished 20 minutes before the deadline rather than half-shipping both.

---

## 10. MVP Cut List (say no to these if time runs short)

- Multiple photos per report — one photo per report is enough; don't build a gallery uploader.
- Weighted/reputation-based verification (e.g. trusted users count double) — flat "3 distinct people" rule only.
- Real user auth (Google/Apple sign-in) — guest-only is fine.
- Realtime live pin updates across users — polling/refetch-on-focus is enough.
- Admin/moderation panel — skip.
- Distance-based sorting / list view toggle — map-only is fine for MVP.
- Emergency mode, contests, prizes (Toilet Hunter has these) — nice stretch ideas, not MVP.
- Turn-by-turn navigation handoff to Google/Apple Maps — "Get Directions" deep link is a 10-minute add if time allows (`https://www.google.com/maps/dir/?api=1&destination=lat,lng`), otherwise skip.

## 11. Stretch Goals (only if under time)
- Deep-link "Get Directions" button in drawer.
- Supabase Realtime subscription so pins update live across devices during the demo.
- Neighborhood-scoped leaderboard (filter by rough geohash/radius) instead of global only.
- Simple "report a problem" flow on a pin (mirrors Toilet Hunter's Problem Reports), logged to a `reports` table for later triage.
