import { create } from 'zustand'
import type {
  AddBathroomInput,
  AddTapInput,
  Bathroom,
  Cleanliness,
  LeaderboardEntry,
  PointType,
  Profile,
  ReportSource,
  Status,
  Tap,
} from '../types'

// ─── Store shape ──────────────────────────────────────────────────────────────

interface AppState {
  // ── State ──────────────────────────────────────────────────────────────────
  taps: Tap[]
  bathrooms: Bathroom[]
  leaderboard: LeaderboardEntry[]
  profile: Profile | null
  syncQueueLength: number

  // ── Actions ────────────────────────────────────────────────────────────────

  /** Optimistically add a new tap and queue the write. Returns the client-generated id. */
  addTap: (input: AddTapInput) => string

  /** Optimistically add a new bathroom and queue the write. Returns the client-generated id. */
  addBathroom: (input: AddBathroomInput) => string

  /**
   * Run the pending→confirmed state machine for a status report.
   * Always writes a status_logs row; routes through the offline queue.
   */
  reportStatus: (
    pointType: PointType,
    pointId: string,
    status: Status,
    cleanliness?: Cleanliness,
    photoFile?: File,
    source?: ReportSource,
  ) => void

  /** Toggle adoption (watchlist) for a point. Queued if offline. */
  adoptPoint: (pointType: PointType, pointId: string) => void
}

// ─── Store implementation (Phase 0 stub — no business logic yet) ──────────────

export const useAppStore = create<AppState>()(() => ({
  // ── Initial state ──────────────────────────────────────────────────────────
  taps: [],
  bathrooms: [],
  leaderboard: [],
  profile: null,
  syncQueueLength: 0,

  // ── Stub actions ──────────────────────────────────────────────────────────
  // These will be implemented by Track A (feat/core-logic).
  // Track B may call these safely; they are no-ops until Track A lands.

  addTap: (_input: AddTapInput): string => {
    // TODO (Track A): optimistic store update + offline queue + Supabase insert
    return ''
  },

  addBathroom: (_input: AddBathroomInput): string => {
    // TODO (Track A): optimistic store update + offline queue + Supabase insert
    return ''
  },

  reportStatus: (
    _pointType: PointType,
    _pointId: string,
    _status: Status,
    _cleanliness?: Cleanliness,
    _photoFile?: File,
    _source?: ReportSource,
  ): void => {
    // TODO (Track A): verification state machine (§4.5) + offline queue
  },

  adoptPoint: (_pointType: PointType, _pointId: string): void => {
    // TODO (Track A): adoptions insert + offline queue
  },
}))
