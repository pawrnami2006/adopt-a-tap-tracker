# Adopt-a-Tap Tracker — Team Task Split

Two people, two hours. Full rationale for *why* the split is logic-vs-UI (not taps-vs-bathrooms) is in `ADOPT_A_TAP_TRACKER_MASTER_REFERENCE.md` §7.5 — this doc is the actionable checklist version to work from during the build. Check items off as you go; each phase has a rough time box so you can tell if you're falling behind early enough to do something about it.

---

## Phase 0 — Together, 0:00–0:10 (do not split yet)

- [ ] Create the GitHub repo, both push access
- [ ] `npm create vite@latest adopt-a-tap-tracker -- --template react-ts`, install all packages from master doc §1
- [ ] Create the Supabase project
- [ ] Run the full schema SQL from master doc §2 (taps, bathrooms, status_logs, adoptions, points_ledger, profiles, leaderboard view)
- [ ] Create the `point-photos` Storage bucket (public)
- [ ] Add `.env` and `.env.example` with `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY`
- [ ] Agree out loud on the store contract (master doc §7.5 — `taps`, `bathrooms`, `addTap()`, `addBathroom()`, `reportStatus()`, `adoptPoint()`, `leaderboard`, `syncQueueLength`, `profile`). Both of you should be able to say it back before splitting.
- [ ] Stub `types/index.ts` with `Tap`, `Bathroom`, `Profile`, `StatusLog` types — commit this before splitting, both pull it
- [ ] Push this scaffold to `main`. Create branches `feat/core-logic` and `feat/map-ui`.

**Don't split until this is done and both people have pulled it.** Everything downstream depends on the schema and the contract being settled.

---

## MEMBER 1 — Core & Data
*Branch: `feat/core-logic`. Owns: `lib/*`, `sync/*`, `store/useAppStore.ts`, `types/index.ts`.*

### Phase 1 (0:10–0:50)
- [ ] `lib/supabase.ts` — Supabase client init
- [ ] `lib/deviceId.ts` — get-or-create anonymous `device_id` in localStorage, upsert into `profiles`
- [ ] `lib/timeAgo.ts` — `date-fns` wrapper for "15 mins ago"
- [ ] `lib/verification.ts` — the pending→confirmed state machine (master doc §4.5). This is the hardest, most important file — build and unit-test it standalone (with fake data, no UI) before anything else touches it. Covers: new report matching/not-matching pending state, own-vote protection via `verification_cycle_id`, flip to verified at 3 confirmations, abandoning overturned cycles.
- [ ] `lib/points.ts` — `payoutCycle(cycleId)`. Only function that ever writes to `points_ledger` or `profiles.total_points`. Called only from `verification.ts` at the flip moment.
- [ ] `store/useAppStore.ts` — implement the real contract (taps/bathrooms arrays, `addTap`, `addBathroom`, `reportStatus`, `adoptPoint`, `leaderboard`, `profile`). Start with these hitting Supabase directly (no offline queue yet) so Member 2 has real data to build against ASAP.
- [ ] **Checkpoint with yourself:** can you add a tap, report status on it 3 times from 3 fake profile_ids, and watch it flip to verified with points paid out — all via a scratch script or console, no UI needed? If yes, this phase is done.

### Phase 2 (0:50–1:35)
- [ ] `lib/photoCompress.ts` — canvas resize to ~800px + JPEG compress
- [ ] Wire photo upload into `reportStatus()` — upload after the report syncs, attach URL after
- [ ] `sync/offlineQueue.ts` — the localStorage write-queue (master doc §4): queue shape, `flushQueue()`, retry on reconnect
- [ ] `sync/useNetworkStatus.ts` — online/offline listener hook
- [ ] Retrofit `store/useAppStore.ts`'s write functions (`addTap`, `addBathroom`, `reportStatus`, `adoptPoint`) to go through the queue instead of writing directly — optimistic local update first, then queue, then Supabase
- [ ] Expose `syncQueueLength` on the store for the "Syncing… N pending" pill
- [ ] Handle initial load from localStorage cache (`adoptatap_cache_taps`, `adoptatap_cache_bathrooms`) so the map isn't empty offline

### Phase 3 (1:35–1:50)
- [ ] Test offline: airplane mode → add a tap → see it appear locally with pending sync → reconnect → confirm it lands in Supabase
- [ ] Push, open PR into `main`

### Final (1:50–2:00, together)
- [ ] Merge, resolve conflicts (should be minimal — different folders from Member 2)
- [ ] Smoke-test the full loop end-to-end with real UI: add tap → 3 people report → verified → points show on leaderboard
- [ ] Help with APK wrap (master doc §8)

---

## MEMBER 2 — Map & UI
*Branch: `feat/map-ui`. Owns: `components/*`, `pages/*`.*

### Phase 1 (0:10–0:50)
While Member 1's real store isn't ready yet, stub `useAppStore()` locally with hardcoded fake taps/bathrooms/leaderboard data so you're never blocked — swap to the real store once Member 1 pushes it.
- [ ] `components/layout/BottomNav.tsx` — Map | Leaderboard | Watchlist | Profile
- [ ] `components/layout/TopBar.tsx` — includes sync status pill (wire to `syncQueueLength` once available)
- [ ] `components/map/MapView.tsx` — full-screen Leaflet map, centered on geolocation
- [ ] `components/map/TapPin.tsx`, `components/map/BathroomPin.tsx` — custom `divIcon`s, styled per `design.md`, representing status + verified/pending state
- [ ] `components/map/LocateMeButton.tsx`
- [ ] `components/map/AddPointFAB.tsx` — opens Add Tap / Add Bathroom picker
- [ ] `pages/MapPage.tsx` — assembles the above
- [ ] **Checkpoint with yourself:** map renders, shows fake pins in different states, FAB opens a picker. Done, even with fake data underneath.

### Phase 2 (0:50–1:35)
- [ ] `components/forms/AddTapForm.tsx` — type radio + description + optional photo
- [ ] `components/forms/AddBathroomForm.tsx` — name, free/paid toggle, feature chips (accessible/unisex/baby change), initial cleanliness, optional photo
- [ ] `components/drawer/PointDetailsDrawer.tsx` — bottom sheet shell
- [ ] `components/drawer/StatusButtons.tsx` — Working/Issue/Broken, own-vote disabled state
- [ ] `components/drawer/VerificationBadge.tsx` — verified vs. "X of 3 confirmed" pending state
- [ ] `components/drawer/PhotoStrip.tsx` — thumbnail gallery + add-photo trigger
- [ ] `components/drawer/AdoptButton.tsx` — star/bookmark toggle
- [ ] Swap fake store data for the real `useAppStore()` as soon as Member 1's Phase 1 lands — this is the natural first sync point, doesn't need to wait for the official checkpoint

### Phase 3 (1:35–1:50)
- [ ] `components/leaderboard/LeaderboardTab.tsx`, `components/leaderboard/TierBadge.tsx`
- [ ] `components/dashboard/AdoptedTapsDashboard.tsx`
- [ ] `pages/LeaderboardPage.tsx`, `pages/WatchlistPage.tsx`, `pages/ProfilePage.tsx`
- [ ] Push, open PR into `main`

### Final (1:50–2:00, together)
- [ ] Merge, resolve conflicts
- [ ] Full click-through on a real phone/browser: add a tap, add a bathroom, report status, adopt, check leaderboard
- [ ] Help with APK wrap (master doc §8)

---

## Rules for both, all the way through

- If you're blocked waiting on the other person's file, **stub it and keep moving** — don't sit idle. Fix the stub when the real thing lands.
- Commit small, commit often, push at least every 15–20 minutes so the other person can see where you are.
- Only touch the other track's files if you message first — see master doc §7.5 for the shared-file exceptions (`App.tsx`, `package.json`).
- If something in `lib/verification.ts` or the store contract needs to change shape mid-build, that's Member 1's call — Member 2 requests, doesn't edit directly.
