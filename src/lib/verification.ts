/**
 * verification.ts — Pending → Confirmed state machine
 *
 * Master reference §4.5. This is the ONLY module that:
 *   - reads/writes pending_* fields on taps/bathrooms
 *   - updates official status / cleanliness_status / last_verified / is_verified
 *   - calls payoutCycle()
 *
 * Invariants enforced here:
 *   1. Every report always inserts a status_logs row.
 *   2. Three DISTINCT profiles are required to confirm a cycle.
 *   3. One profile counts at most once per pending_cycle_id.
 *   4. last_verified only updates on an actual flip to verified (3/3).
 *   5. A conflicting report abandons the old cycle (no payout) and opens a new one at 1/3.
 *   6. payoutCycle() is called exactly once, at the flip moment, nowhere else.
 *   7. Creation reports seed a pending cycle at 1/3 (creator is first confirmation).
 */

import { v4 as uuidv4 } from 'uuid'
import { payoutCycle } from './points'
import { supabase } from './supabase'
import type { Cleanliness, PointType, ReportSource, Status } from '../types'

// ─── Public API ───────────────────────────────────────────────────────────────

export interface ProcessReportParams {
  pointType: PointType
  pointId: string
  profileId: string
  reportedStatus: Status
  reportedCleanliness?: Cleanliness   // bathrooms only
  source: ReportSource
  note?: string
  photoUrl?: string
}

/**
 * Result returned after processing a report so the store can apply an
 * optimistic update without knowing the internals of the state machine.
 */
export interface VerificationResult {
  /** The verification_cycle_id that was used / created for this report */
  cycleId: string
  /** true if this report was the 3rd confirmation and flipped the point to verified */
  flipped: boolean
  /** Current pending confirmation count after this report (1, 2, or 3) */
  pendingConfirmations: number
  /** true if this profile had already voted in the current cycle (own-vote protection) */
  alreadyVoted: boolean
}

/**
 * Process a single report through the pending→confirmed state machine.
 *
 * Steps (master reference §4.5):
 *   1. Fetch the current point row (tap or bathroom).
 *   2. Determine whether the report matches the current pending_status.
 *   3a. Matching report + new voice → increment pending_confirmations.
 *       If confirmations reach 3 → flip to verified + payoutCycle().
 *   3b. Conflicting report (or no pending state yet) → abandon old cycle,
 *       open new cycle at 1/3. Old cycle never gets paid out.
 *   4. Always insert a status_logs row.
 */
export async function processReport(
  params: ProcessReportParams,
): Promise<VerificationResult> {
  const {
    pointType,
    pointId,
    profileId,
    reportedStatus,
    reportedCleanliness,
    source,
    note,
    photoUrl,
  } = params

  const table = pointType === 'tap' ? 'taps' : 'bathrooms'

  // ── 1. Fetch current point row ────────────────────────────────────────────
  interface PointRow {
    id: string
    status: Status
    pending_status: Status | null
    pending_confirmations: number
    pending_cycle_id: string | null
    pending_started_at: string | null
    cleanliness_status?: Cleanliness
    pending_cleanliness?: Cleanliness | null
  }

  const { data: rawPoint, error: fetchError } = await supabase
    .from(table)
    .select('*')
    .eq('id', pointId)
    .single()

  if (fetchError || !rawPoint) {
    throw new Error(
      `verification: failed to fetch ${pointType} ${pointId} — ${fetchError?.message ?? 'not found'}`,
    )
  }

  const point = rawPoint as unknown as PointRow

  const now = new Date().toISOString()

  // ── 2. Decide: matching or conflicting report ─────────────────────────────
  const hasPendingCycle =
    point.pending_cycle_id !== null && point.pending_status !== null

  const isMatching =
    hasPendingCycle && point.pending_status === reportedStatus

  // ── 3a. Matching report ───────────────────────────────────────────────────
  if (isMatching) {
    const existingCycleId = point.pending_cycle_id as string

    // Own-vote protection: has this profile already contributed to this cycle?
    const { data: existingVote, error: voteCheckError } = await supabase
      .from('status_logs')
      .select('id')
      .eq('verification_cycle_id', existingCycleId)
      .eq('profile_id', profileId)
      .eq('counted_as_confirmation', true)
      .maybeSingle()

    if (voteCheckError) {
      throw new Error(
        `verification: own-vote check failed — ${voteCheckError.message}`,
      )
    }

    if (existingVote) {
      // Profile already voted in this cycle — insert audit log but do NOT
      // increment confirmations (own-vote protection, §4.5 rule 4).
      await insertStatusLog({
        pointType,
        pointId,
        profileId,
        reportedStatus,
        reportedCleanliness,
        source,
        note,
        photoUrl,
        cycleId: existingCycleId,
        countedAsConfirmation: false,
      })

      return {
        cycleId: existingCycleId,
        flipped: false,
        pendingConfirmations: point.pending_confirmations as number,
        alreadyVoted: true,
      }
    }

    // New confirming voice — increment counter
    const newConfirmations = (point.pending_confirmations as number) + 1

    // Insert audit log row first (always, before any point updates)
    await insertStatusLog({
      pointType,
      pointId,
      profileId,
      reportedStatus,
      reportedCleanliness,
      source,
      note,
      photoUrl,
      cycleId: existingCycleId,
      countedAsConfirmation: true,
    })

    if (newConfirmations >= 3) {
      // ── FLIP TO VERIFIED ─────────────────────────────────────────────────
      const flipUpdate: Record<string, unknown> = {
        status: reportedStatus,
        is_verified: true,
        last_verified: now,
        pending_status: null,
        pending_confirmations: 0,
        pending_started_at: null,
        pending_cycle_id: null,
      }

      if (pointType === 'bathroom' && reportedCleanliness) {
        flipUpdate.cleanliness_status = reportedCleanliness
        flipUpdate.pending_cleanliness = null
      }

      const { error: flipError } = await supabase
        .from(table)
        .update(flipUpdate)
        .eq('id', pointId)

      if (flipError) {
        throw new Error(
          `verification: failed to flip ${pointType} ${pointId} to verified — ${flipError.message}`,
        )
      }

      // payoutCycle is the ONLY place points are awarded — called exactly here
      await payoutCycle(existingCycleId)

      return {
        cycleId: existingCycleId,
        flipped: true,
        pendingConfirmations: 3,
        alreadyVoted: false,
      }
    }

    // Not yet at 3 — update pending counter only (do NOT touch official state)
    const { error: updateError } = await supabase
      .from(table)
      .update({ pending_confirmations: newConfirmations })
      .eq('id', pointId)

    if (updateError) {
      throw new Error(
        `verification: failed to increment pending_confirmations — ${updateError.message}`,
      )
    }

    return {
      cycleId: existingCycleId,
      flipped: false,
      pendingConfirmations: newConfirmations,
      alreadyVoted: false,
    }
  }

  // ── 3b. Conflicting report (or no pending cycle) ──────────────────────────
  // Open a new cycle at 1/3. Old cycle (if any) is abandoned — no payout.
  const newCycleId = uuidv4()

  const newPendingUpdate: Record<string, unknown> = {
    pending_status: reportedStatus,
    pending_confirmations: 1,
    pending_started_at: now,
    pending_cycle_id: newCycleId,
  }

  if (pointType === 'bathroom') {
    newPendingUpdate.pending_cleanliness = reportedCleanliness ?? null
  }

  const { error: newCycleError } = await supabase
    .from(table)
    .update(newPendingUpdate)
    .eq('id', pointId)

  if (newCycleError) {
    throw new Error(
      `verification: failed to open new pending cycle — ${newCycleError.message}`,
    )
  }

  // Insert audit log row (this is the 1/3 seed)
  await insertStatusLog({
    pointType,
    pointId,
    profileId,
    reportedStatus,
    reportedCleanliness,
    source,
    note,
    photoUrl,
    cycleId: newCycleId,
    countedAsConfirmation: true,
  })

  return {
    cycleId: newCycleId,
    flipped: false,
    pendingConfirmations: 1,
    alreadyVoted: false,
  }
}

// ─── Internal helper ──────────────────────────────────────────────────────────

interface InsertStatusLogParams {
  pointType: PointType
  pointId: string
  profileId: string
  reportedStatus: Status
  reportedCleanliness?: Cleanliness
  source: ReportSource
  note?: string
  photoUrl?: string
  cycleId: string
  countedAsConfirmation: boolean
}

/**
 * Always inserts a status_logs row — invariant §4.5 rule 1 and AGENTS.md rule 5.
 * Every report path (matching, conflicting, own-vote) calls this exactly once.
 */
async function insertStatusLog(params: InsertStatusLogParams): Promise<void> {
  const {
    pointType,
    pointId,
    profileId,
    reportedStatus,
    reportedCleanliness,
    source,
    note,
    photoUrl,
    cycleId,
    countedAsConfirmation,
  } = params

  const { error } = await supabase.from('status_logs').insert({
    point_type: pointType,
    point_id: pointId,
    profile_id: profileId,
    reported_status: reportedStatus,
    reported_cleanliness: reportedCleanliness ?? null,
    note: note ?? null,
    photo_url: photoUrl ?? null,
    source,
    verification_cycle_id: cycleId,
    counted_as_confirmation: countedAsConfirmation,
    points_awarded: false, // always false at insert time; payoutCycle flips to true
  })

  if (error) {
    throw new Error(`verification: failed to insert status_log — ${error.message}`)
  }
}
