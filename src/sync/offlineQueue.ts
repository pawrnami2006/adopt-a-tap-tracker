/**
 * offlineQueue.ts
 *
 * localStorage-backed write queue for offline-first sync.
 * Master reference §4.
 *
 * Key: adoptatap_sync_queue
 * Processing: oldest-first, sequential, server-wins on conflict.
 * Business logic (verification, points) lives in lib/ — NOT here.
 */

import { v4 as uuidv4 } from 'uuid'
import type { QueuedAction, QueueActionType } from '../types'

const QUEUE_KEY = 'adoptatap_sync_queue'

// ─── Persistence helpers ──────────────────────────────────────────────────────

function loadQueue(): QueuedAction[] {
  try {
    const raw = localStorage.getItem(QUEUE_KEY)
    return raw ? (JSON.parse(raw) as QueuedAction[]) : []
  } catch {
    return []
  }
}

function saveQueue(queue: QueuedAction[]): void {
  localStorage.setItem(QUEUE_KEY, JSON.stringify(queue))
}

// ─── Public API ───────────────────────────────────────────────────────────────

/** Add an action to the back of the queue. Returns the generated action id. */
export function enqueue(type: QueueActionType, payload: unknown): string {
  const queue = loadQueue()
  const action: QueuedAction = {
    id: uuidv4(),
    type,
    payload,
    createdAt: new Date().toISOString(),
    attempts: 0,
  }
  queue.push(action)
  saveQueue(queue)
  return action.id
}

/** Return a snapshot of the current queue (oldest first). */
export function getQueue(): QueuedAction[] {
  return loadQueue()
}

/** Return the number of items currently in the queue. */
export function getQueueLength(): number {
  return loadQueue().length
}

/** Remove a specific action from the queue (call on success). */
export function removeFromQueue(id: string): void {
  const queue = loadQueue().filter((a) => a.id !== id)
  saveQueue(queue)
}

/** Increment the attempt counter for a queued action (call on transient failure). */
export function incrementAttempts(id: string): void {
  const queue = loadQueue().map((a) =>
    a.id === id ? { ...a, attempts: a.attempts + 1 } : a,
  )
  saveQueue(queue)
}

// ─── Flush ────────────────────────────────────────────────────────────────────

/**
 * Flush payload type definitions.
 * Kept minimal — only fields each handler needs.
 */
export interface CreateTapPayload {
  clientId: string
  cycleId: string
  profileId: string
  lat: number
  lng: number
  tap_type: string
  description?: string
  photoBase64?: string
}

export interface CreateBathroomPayload {
  clientId: string
  cycleId: string
  profileId: string
  lat: number
  lng: number
  name?: string
  is_free: boolean
  price_note?: string
  is_accessible: boolean
  is_unisex: boolean
  has_baby_change: boolean
  cleanliness: string
  photoBase64?: string
}

export interface UpdateStatusPayload {
  pointType: 'tap' | 'bathroom'
  pointId: string
  profileId: string
  status: string
  cleanliness?: string
  source: string
  photoBase64?: string
}

export interface AdoptPayload {
  profileId: string
  pointType: 'tap' | 'bathroom'
  pointId: string
}

/**
 * flushQueue(handler)
 *
 * Processes the queue oldest-first.
 * Calls `handler(action)` for each item:
 *   - resolved → remove from queue
 *   - rejected → increment attempts, leave in queue for next retry
 *
 * The handler is provided by the store so that all business logic
 * (verification, points, Supabase calls) remains in its correct home.
 * This function has zero knowledge of what the actions do.
 */
export async function flushQueue(
  handler: (action: QueuedAction) => Promise<void>,
): Promise<void> {
  const queue = loadQueue()
  if (queue.length === 0) return

  for (const action of queue) {
    try {
      await handler(action)
      removeFromQueue(action.id)
    } catch (err) {
      console.warn(`offlineQueue: action ${action.id} (${action.type}) failed, will retry.`, err)
      incrementAttempts(action.id)
    }
  }
}
