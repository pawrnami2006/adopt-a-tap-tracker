/**
 * useNetworkStatus.ts
 *
 * Exposes the current online/offline state and triggers queue flushing on reconnect.
 * Uses navigator.onLine + browser online/offline events.
 * A single 30-second retry interval runs while online (master reference §4).
 */

import { useEffect, useState } from 'react'

/** Callback type for flush-on-reconnect. Injected by the store to avoid circular imports. */
type FlushFn = () => Promise<void>

// Module-level flush registry — set once by the store on bootstrap.
let registeredFlush: FlushFn | null = null
let retryIntervalId: ReturnType<typeof setInterval> | null = null

/** Called by the store during _init to register the flush function. */
export function registerFlush(fn: FlushFn): void {
  registeredFlush = fn
  startRetryInterval()
}

function startRetryInterval(): void {
  if (retryIntervalId !== null) return // already running
  retryIntervalId = setInterval(() => {
    if (navigator.onLine && registeredFlush) {
      registeredFlush().catch(console.error)
    }
  }, 30_000)
}

// Wire global online/offline events once at module load
if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    if (registeredFlush) {
      registeredFlush().catch(console.error)
    }
  })
}

// ─── React hook ───────────────────────────────────────────────────────────────

/**
 * useNetworkStatus()
 *
 * Returns `{ isOnline }`.
 * Components can use this to show the "Syncing… N pending" pill.
 */
export function useNetworkStatus(): { isOnline: boolean } {
  const [isOnline, setIsOnline] = useState<boolean>(
    typeof navigator !== 'undefined' ? navigator.onLine : true,
  )

  useEffect(() => {
    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  return { isOnline }
}
