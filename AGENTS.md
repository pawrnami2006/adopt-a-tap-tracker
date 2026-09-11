# AGENTS.md

Instructions for any AI coding agent (Claude Code, Codex, Cursor, etc.) working in this repository. Read this before making changes. For full feature/architecture detail, see `ADOPT_A_TAP_TRACKER_MASTER_REFERENCE.md`. For visual/styling rules, see `design.md`. This file is the short version — those two are the source of truth when anything here is ambiguous.

## Project

Adopt-a-Tap Tracker — a crowdsourced map of public water taps and public bathrooms, with community verification and a points leaderboard. Built in a 2-hour hackathon window by a 2-person team, deployed as a static web app and wrapped as an Android APK (Capacitor or Appilix).

## Stack

- React + Vite (TypeScript) — **not** Next.js
- Tailwind CSS for styling (utility layer only — tokens/colors come from `design.md`)
- Zustand for state
- Supabase (Postgres + Auth + Storage) as the only backend
- Leaflet.js + OpenStreetMap tiles for the map — no Mapbox, no API key needed
- `date-fns`, `uuid`, `lucide-react`

## Setup / commands

```
npm install
npm run dev          # local dev server
npm run build         # production build → dist/
```

Environment variables (`.env`, see `.env.example`):
```
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
```

Supabase schema and Storage bucket setup: run the SQL in `ADOPT_A_TAP_TRACKER_MASTER_REFERENCE.md` §2 in the Supabase SQL editor before anything else will work. Create the `point-photos` Storage bucket (public) as described there too.

APK wrapping (only after the web app works):
```
npm run build
npx cap sync
npx cap open android
```

## Non-negotiable architectural rules

These are the rules most likely to get silently violated by a well-meaning edit — check against them before changing related code.

1. **Points are only ever awarded inside `lib/points.ts`'s `payoutCycle(cycleId)`, called only from `lib/verification.ts` at the moment a `pending_confirmations` count reaches 3.** Never award points at the moment a user submits a report, adds a pin, or checks in. If you find yourself adding a `+points` anywhere else, stop — that's the exact incentive bug this architecture exists to prevent.
2. **A tap/bathroom's official `status` only changes via the pending→confirmed state machine in `lib/verification.ts`** (3 distinct users must corroborate). Never write directly to `taps.status` or `bathrooms.status` from a UI event handler — always go through `reportStatus()` in the store, which calls into `verification.ts`.
3. **`last_verified` only updates on an actual flip to verified — never on every report.** If a report doesn't complete a cycle, don't touch `last_verified`.
4. **One profile can only count once per verification cycle.** Check `status_logs` for an existing row from that `profile_id` within the current `verification_cycle_id` before incrementing `pending_confirmations`.
5. **Every report (creation, status update, cleanliness rate, check-in) writes a `status_logs` row, no exceptions** — this is the audit trail and the only way points can later be paid out correctly.
6. **All writes are optimistic-first, then queued.** UI updates immediately from local state; the actual Supabase write goes through `sync/offlineQueue.ts`. Don't call `supabase.from(...).insert()` directly from a component — always through the store, which routes through the queue.
7. **Photos are not gated by verification.** A photo attaches and displays as soon as it uploads, regardless of whether its report's cycle ever reaches 3 confirmations.
8. **No visual/design decisions belong in logic files.** Colors, spacing, and pin styling live in `design.md`-driven Tailwind classes in `components/`, never hardcoded in `lib/` or `store/`.

## File ownership (2-person team — see master doc §7.5 for full rationale)

| Owns | Person / Track | Don't edit unless you own it |
|---|---|---|
| `lib/*`, `sync/*`, `store/useAppStore.ts`, `types/index.ts` | Track A — Core & Data | Track B should only *call* `useAppStore()`, never edit its implementation directly |
| `components/*`, `pages/*` | Track B — Map & UI | Track A should not restyle or restructure components |

If you're an agent working on behalf of one track, stay inside that track's files. If a change requires touching the other track's files (e.g. the store contract needs a new field), flag it explicitly rather than making the edit silently.

## Data model quick reference

- `taps`, `bathrooms` — each has an **official state** (`status`, `last_verified`, `is_verified`) and a **pending state** (`pending_status`, `pending_confirmations`, `pending_cycle_id`). See master doc §2 and §4.5.
- `status_logs` — append-only report history, tagged with `source` (`creation` / `status_update` / `checkin`), `verification_cycle_id`, `counted_as_confirmation`, `points_awarded`.
- `points_ledger` — append-only, only ever written by `payoutCycle()`.
- `profiles` — one per `device_id` (anonymous by default, no login wall).
- `adoptions` — watchlist join table.

## Commit conventions

- Small, frequent commits. Prefix with track area when useful: `core: ...` / `ui: ...`.
- Branch names: `feat/core-logic` (Track A), `feat/map-ui` (Track B), merge into `main` at the two checkpoints described in master doc §7.5.
- Don't batch unrelated changes into one commit — this is a 2-hour build, small commits are what make a late merge survivable.

## Known, accepted limitations (do not "fix" these without discussion)

- A genuinely accurate report that nobody else confirms sits at 1/3 or 2/3 forever and never pays out points. This is intentional (see master doc §4.5), not a bug.
- No auth wall, no real user accounts, no RLS hardening — guest-only by design for this build.
- Offline conflict resolution is "server wins on reconnect" — no merge logic. Don't add any.
