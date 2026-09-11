import { supabase } from './supabase'

// ─── Point values (master reference §4.5 payout table) ───────────────────────

const POINTS_BY_SOURCE: Record<string, number> = {
  creation: 50,       // add_point
  status_update: 10,  // verify_update
  checkin: 15,        // adopted_checkin
}

const LEDGER_ACTION_BY_SOURCE: Record<string, string> = {
  creation: 'add_point',
  status_update: 'verify_update',
  checkin: 'adopted_checkin',
}

/**
 * payoutCycle(cycleId)
 *
 * THE ONLY function that writes to points_ledger or updates profiles.total_points.
 * Called exclusively from verification.ts at the exact moment pending_confirmations
 * reaches 3. Must never be called from anywhere else.
 *
 * For every status_logs row in this cycle that:
 *   - counted_as_confirmation = true
 *   - points_awarded = false
 *   - has a non-null profile_id
 *
 * This function:
 *   1. Inserts a points_ledger row
 *   2. Increments profiles.total_points by the appropriate amount
 *   3. Marks the status_logs row points_awarded = true (idempotency guard)
 */
export async function payoutCycle(cycleId: string): Promise<void> {
  // Fetch all unpaid confirming rows for this cycle
  const { data: rows, error: fetchError } = await supabase
    .from('status_logs')
    .select('id, profile_id, source, point_type, point_id')
    .eq('verification_cycle_id', cycleId)
    .eq('counted_as_confirmation', true)
    .eq('points_awarded', false)

  if (fetchError) {
    throw new Error(`payoutCycle: failed to fetch status_logs — ${fetchError.message}`)
  }

  if (!rows || rows.length === 0) return

  for (const row of rows) {
    if (!row.profile_id) continue

    const points = POINTS_BY_SOURCE[row.source] ?? 0
    if (points === 0) continue

    const action = LEDGER_ACTION_BY_SOURCE[row.source]

    // 1. Insert ledger entry
    const { error: ledgerError } = await supabase
      .from('points_ledger')
      .insert({
        profile_id: row.profile_id,
        action,
        points,
        point_type: row.point_type,
        point_id: row.point_id,
      })

    if (ledgerError) {
      throw new Error(
        `payoutCycle: failed to insert points_ledger for profile ${row.profile_id} — ${ledgerError.message}`,
      )
    }

    // 2. Increment profiles.total_points
    const { error: profileError } = await supabase.rpc('increment_points', {
      p_profile_id: row.profile_id,
      p_amount: points,
    })

    // Fallback: if the RPC doesn't exist yet, use a manual read-increment-write.
    // This is safe for MVP (low concurrency); the RPC is the correct long-term path.
    if (profileError) {
      const { data: profile, error: readError } = await supabase
        .from('profiles')
        .select('total_points')
        .eq('id', row.profile_id)
        .single()

      if (readError) {
        throw new Error(
          `payoutCycle: failed to read profile ${row.profile_id} — ${readError.message}`,
        )
      }

      const { error: updateError } = await supabase
        .from('profiles')
        .update({ total_points: (profile.total_points ?? 0) + points })
        .eq('id', row.profile_id)

      if (updateError) {
        throw new Error(
          `payoutCycle: failed to update total_points for profile ${row.profile_id} — ${updateError.message}`,
        )
      }
    }

    // 3. Mark this log row as paid (idempotency guard — prevents double payout)
    const { error: markError } = await supabase
      .from('status_logs')
      .update({ points_awarded: true })
      .eq('id', row.id)

    if (markError) {
      throw new Error(
        `payoutCycle: failed to mark status_log ${row.id} as paid — ${markError.message}`,
      )
    }
  }
}
