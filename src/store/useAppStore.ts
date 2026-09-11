/**
 * useAppStore.ts — Zustand store (Track A implementation)
 *
 * Public contract is fixed — Track B only ever calls the exported methods.
 * All verification routes through lib/verification.ts.
 * All point payouts route through lib/points.ts via verification.ts.
 * All writes go optimistic-first, then online→Supabase or offline→queue.
 */

import { v4 as uuidv4 } from 'uuid'
import { create } from 'zustand'
import { getOrCreateProfile } from '../lib/deviceId'
import { base64ToBlob, compressPhoto } from '../lib/photoCompress'
import { supabase } from '../lib/supabase'
import { processReport } from '../lib/verification'
import {
  enqueue,
  flushQueue,
  getQueueLength,
  type AdoptPayload,
  type CreateBathroomPayload,
  type CreateTapPayload,
  type UpdateStatusPayload,
} from '../sync/offlineQueue'
import { registerFlush } from '../sync/useNetworkStatus'
import type {
  AddBathroomInput,
  AddTapInput,
  Bathroom,
  Cleanliness,
  LeaderboardEntry,
  PointType,
  Profile,
  QueuedAction,
  ReportSource,
  Status,
  Tap,
} from '../types'

// ─── Cache keys ───────────────────────────────────────────────────────────────

const CACHE_TAPS_KEY = 'adoptatap_cache_taps'
const CACHE_BATHROOMS_KEY = 'adoptatap_cache_bathrooms'
const PHOTO_MAX_URLS = 5

// ─── Cache helpers ────────────────────────────────────────────────────────────

function loadCachedTaps(): Tap[] {
  try {
    const raw = localStorage.getItem(CACHE_TAPS_KEY)
    return raw ? (JSON.parse(raw) as Tap[]) : []
  } catch { return [] }
}

function loadCachedBathrooms(): Bathroom[] {
  try {
    const raw = localStorage.getItem(CACHE_BATHROOMS_KEY)
    return raw ? (JSON.parse(raw) as Bathroom[]) : []
  } catch { return [] }
}

function saveCachedTaps(taps: Tap[]): void {
  try { localStorage.setItem(CACHE_TAPS_KEY, JSON.stringify(taps)) } catch { /* storage full */ }
}

function saveCachedBathrooms(bathrooms: Bathroom[]): void {
  try { localStorage.setItem(CACHE_BATHROOMS_KEY, JSON.stringify(bathrooms)) } catch { /* storage full */ }
}

// ─── Store shape (public contract) ───────────────────────────────────────────

interface AppState {
  taps: Tap[]
  bathrooms: Bathroom[]
  leaderboard: LeaderboardEntry[]
  profile: Profile | null
  syncQueueLength: number

  _init: () => Promise<void>

  addTap: (input: AddTapInput) => Promise<string>
  addBathroom: (input: AddBathroomInput) => Promise<string>
  reportStatus: (
    pointType: PointType,
    pointId: string,
    status: Status,
    cleanliness?: Cleanliness,
    photoFile?: File,
    source?: ReportSource,
  ) => Promise<void>
  adoptPoint: (pointType: PointType, pointId: string) => Promise<void>
}

// ─── Module-level helpers ─────────────────────────────────────────────────────

function mapLeaderboardRow(row: Record<string, unknown>): LeaderboardEntry {
  return {
    id: row.id as string,
    display_name: (row.display_name as string) ?? 'Anonymous Guardian',
    total_points: (row.total_points as number) ?? 0,
    tier: (row.tier as LeaderboardEntry['tier']) ?? 'Leak Finder',
  }
}

async function ensureProfile(get: () => AppState): Promise<Profile> {
  const cached = get().profile
  if (cached) return cached
  const profile = await getOrCreateProfile()
  useAppStore.setState({ profile })
  return profile
}

/** Prepend a URL to photo_urls, capping at PHOTO_MAX_URLS, newest first. */
function prependPhotoUrl(existing: string[], newUrl: string): string[] {
  return [newUrl, ...existing].slice(0, PHOTO_MAX_URLS)
}

// ─── Photo upload ─────────────────────────────────────────────────────────────

/**
 * Upload a compressed photo Blob to Supabase Storage and return its public URL.
 * Path: point-photos/{pointType}/{pointId}/{uuid}.jpg
 * Photos are NOT gated by verification — upload regardless of cycle state.
 */
async function uploadPhoto(
  blob: Blob,
  pointType: PointType,
  pointId: string,
): Promise<string | null> {
  const filename = `${uuidv4()}.jpg`
  const path = `${pointType}/${pointId}/${filename}`

  const { error } = await supabase.storage
    .from('point-photos')
    .upload(path, blob, { contentType: 'image/jpeg', upsert: false })

  if (error) {
    console.error('uploadPhoto: storage upload failed:', error.message)
    return null
  }

  const { data } = supabase.storage.from('point-photos').getPublicUrl(path)
  return data.publicUrl ?? null
}

/**
 * After upload succeeds, prepend the URL to the point's photo_urls array in
 * Supabase (capped at PHOTO_MAX_URLS, newest first) and update local store.
 */
async function attachPhotoUrl(
  pointType: PointType,
  pointId: string,
  photoUrl: string,
): Promise<void> {
  const table = pointType === 'tap' ? 'taps' : 'bathrooms'

  // Read current photo_urls
  const { data: row } = await supabase
    .from(table)
    .select('photo_urls')
    .eq('id', pointId)
    .single()

  const existing: string[] = (row as { photo_urls?: string[] } | null)?.photo_urls ?? []
  const updated = prependPhotoUrl(existing, photoUrl)

  await supabase.from(table).update({ photo_urls: updated }).eq('id', pointId)

  // Sync local store
  if (pointType === 'tap') {
    useAppStore.setState((s) => ({
      taps: s.taps.map((t) =>
        t.id === pointId ? { ...t, photo_urls: updated } : t,
      ),
    }))
  } else {
    useAppStore.setState((s) => ({
      bathrooms: s.bathrooms.map((b) =>
        b.id === pointId ? { ...b, photo_urls: updated } : b,
      ),
    }))
  }
}

// ─── Queue action handler ─────────────────────────────────────────────────────

/**
 * Processes a single queued action against the live Supabase backend.
 * Called by flushQueue() — business logic (verification, points) is in lib/.
 */
async function handleQueuedAction(action: QueuedAction): Promise<void> {
  switch (action.type) {
    case 'CREATE_TAP': {
      const p = action.payload as CreateTapPayload
      const now = new Date().toISOString()

      // Insert the tap row
      const { error: tapError } = await supabase.from('taps').insert({
        id: p.clientId,
        created_by: p.profileId,
        lat: p.lat,
        lng: p.lng,
        tap_type: p.tap_type,
        description: p.description ?? null,
        status: 'working',
        is_verified: false,
        pending_status: 'working',
        pending_confirmations: 1,
        pending_started_at: now,
        pending_cycle_id: p.cycleId,
        photo_urls: [],
        synced: true,
      })
      if (tapError) throw new Error(`CREATE_TAP insert failed: ${tapError.message}`)

      // Seed creation status_log
      const { error: logError } = await supabase.from('status_logs').insert({
        point_type: 'tap',
        point_id: p.clientId,
        profile_id: p.profileId,
        reported_status: 'working',
        source: 'creation',
        verification_cycle_id: p.cycleId,
        counted_as_confirmation: true,
        points_awarded: false,
      })
      if (logError) throw new Error(`CREATE_TAP status_log failed: ${logError.message}`)

      // Upload queued photo if present
      if (p.photoBase64) {
        const blob = base64ToBlob(p.photoBase64)
        const url = await uploadPhoto(blob, 'tap', p.clientId)
        if (url) await attachPhotoUrl('tap', p.clientId, url)
      }

      // Mark synced in local store
      useAppStore.setState((s) => ({
        taps: s.taps.map((t) =>
          t.id === p.clientId ? { ...t, synced: true } : t,
        ),
      }))
      break
    }

    case 'CREATE_BATHROOM': {
      const p = action.payload as CreateBathroomPayload
      const now = new Date().toISOString()

      const { error: bathError } = await supabase.from('bathrooms').insert({
        id: p.clientId,
        created_by: p.profileId,
        lat: p.lat,
        lng: p.lng,
        name: p.name ?? null,
        is_free: p.is_free,
        price_note: p.price_note ?? null,
        is_accessible: p.is_accessible,
        is_unisex: p.is_unisex,
        has_baby_change: p.has_baby_change,
        status: 'working',
        cleanliness_status: p.cleanliness,
        is_verified: false,
        pending_status: 'working',
        pending_cleanliness: p.cleanliness,
        pending_confirmations: 1,
        pending_started_at: now,
        pending_cycle_id: p.cycleId,
        photo_urls: [],
        synced: true,
      })
      if (bathError) throw new Error(`CREATE_BATHROOM insert failed: ${bathError.message}`)

      const { error: logError } = await supabase.from('status_logs').insert({
        point_type: 'bathroom',
        point_id: p.clientId,
        profile_id: p.profileId,
        reported_status: 'working',
        reported_cleanliness: p.cleanliness,
        source: 'creation',
        verification_cycle_id: p.cycleId,
        counted_as_confirmation: true,
        points_awarded: false,
      })
      if (logError) throw new Error(`CREATE_BATHROOM status_log failed: ${logError.message}`)

      if (p.photoBase64) {
        const blob = base64ToBlob(p.photoBase64)
        const url = await uploadPhoto(blob, 'bathroom', p.clientId)
        if (url) await attachPhotoUrl('bathroom', p.clientId, url)
      }

      useAppStore.setState((s) => ({
        bathrooms: s.bathrooms.map((b) =>
          b.id === p.clientId ? { ...b, synced: true } : b,
        ),
      }))
      break
    }

    case 'UPDATE_STATUS':
    case 'CHECKIN': {
      const p = action.payload as UpdateStatusPayload

      // All reports go through verification.ts — never bypass it
      const result = await processReport({
        pointType: p.pointType,
        pointId: p.pointId,
        profileId: p.profileId,
        reportedStatus: p.status as Status,
        reportedCleanliness: p.cleanliness as Cleanliness | undefined,
        source: p.source as ReportSource,
      })

      if (p.photoBase64) {
        const blob = base64ToBlob(p.photoBase64)
        const url = await uploadPhoto(blob, p.pointType, p.pointId)
        if (url) await attachPhotoUrl(p.pointType, p.pointId, url)
      }

      // Re-fetch point if cycle flipped to capture authoritative server state
      if (result.flipped) {
        const table = p.pointType === 'tap' ? 'taps' : 'bathrooms'
        const { data: updated } = await supabase
          .from(table)
          .select('*')
          .eq('id', p.pointId)
          .single()

        if (updated) {
          if (p.pointType === 'tap') {
            useAppStore.setState((s) => ({
              taps: s.taps.map((t) =>
                t.id === p.pointId ? (updated as Tap) : t,
              ),
            }))
          } else {
            useAppStore.setState((s) => ({
              bathrooms: s.bathrooms.map((b) =>
                b.id === p.pointId ? (updated as Bathroom) : b,
              ),
            }))
          }
        }
      }
      break
    }

    case 'ADOPT': {
      const p = action.payload as AdoptPayload
      const { error } = await supabase.from('adoptions').upsert(
        { profile_id: p.profileId, point_type: p.pointType, point_id: p.pointId },
        { onConflict: 'profile_id,point_type,point_id', ignoreDuplicates: true },
      )
      if (error) throw new Error(`ADOPT upsert failed: ${error.message}`)
      break
    }

    default:
      console.warn(`offlineQueue: unknown action type "${action.type}" — skipping`)
  }
}

/** Run flushQueue and update syncQueueLength reactively after each item. */
async function runFlush(): Promise<void> {
  await flushQueue(async (action) => {
    await handleQueuedAction(action)
    // Update length after each successful removal
    useAppStore.setState({ syncQueueLength: getQueueLength() })
  })
  useAppStore.setState({ syncQueueLength: getQueueLength() })
}

// ─── Store ────────────────────────────────────────────────────────────────────

export const useAppStore = create<AppState>()((set, get) => ({
  taps: [],
  bathrooms: [],
  leaderboard: [],
  profile: null,
  syncQueueLength: 0,

  // ── Bootstrap ─────────────────────────────────────────────────────────────

  _init: async () => {
    // 1. Load cache immediately so map isn't empty offline
    const cachedTaps = loadCachedTaps()
    const cachedBathrooms = loadCachedBathrooms()
    if (cachedTaps.length > 0 || cachedBathrooms.length > 0) {
      set({ taps: cachedTaps, bathrooms: cachedBathrooms })
    }

    // 2. Resolve anonymous profile
    const profile = await getOrCreateProfile()
    set({ profile, syncQueueLength: getQueueLength() })

    // 3. Register the flush function with useNetworkStatus so reconnect triggers it
    registerFlush(runFlush)

    // 4. If online, fetch fresh data from Supabase (server wins)
    if (navigator.onLine) {
      const [tapsRes, bathroomsRes, lbRes] = await Promise.all([
        supabase.from('taps').select('*').order('created_at', { ascending: false }),
        supabase.from('bathrooms').select('*').order('created_at', { ascending: false }),
        supabase.from('leaderboard').select('*').limit(10),
      ])

      const freshTaps = (tapsRes.data ?? cachedTaps) as Tap[]
      const freshBathrooms = (bathroomsRes.data ?? cachedBathrooms) as Bathroom[]

      set({
        taps: freshTaps,
        bathrooms: freshBathrooms,
        leaderboard: (lbRes.data ?? []).map(mapLeaderboardRow),
      })

      // Update cache with server data
      saveCachedTaps(freshTaps)
      saveCachedBathrooms(freshBathrooms)

      // 5. Flush any pending queue items now that we're online
      await runFlush()
    }
  },

  // ── addTap ────────────────────────────────────────────────────────────────

  addTap: async (input: AddTapInput): Promise<string> => {
    const profile = await ensureProfile(get)
    const clientId = uuidv4()
    const now = new Date().toISOString()
    const cycleId = uuidv4()

    // Compress photo if present
    let photoBase64: string | undefined
    let photoBlob: Blob | undefined
    if (input.photoFile) {
      try {
        const compressed = await compressPhoto(input.photoFile)
        photoBase64 = compressed.base64
        photoBlob = compressed.blob
      } catch (e) {
        console.error('addTap: photo compression failed', e)
      }
    }

    // Optimistic local insert
    const optimisticTap: Tap = {
      id: clientId,
      created_by: profile.id,
      lat: input.lat,
      lng: input.lng,
      tap_type: input.tap_type,
      description: input.description ?? null,
      status: 'working',
      last_verified: now,
      is_verified: false,
      pending_status: 'working',
      pending_confirmations: 1,
      pending_started_at: now,
      pending_cycle_id: cycleId,
      photo_urls: [],
      created_at: now,
      synced: false,
    }

    set((s) => {
      const taps = [optimisticTap, ...s.taps]
      saveCachedTaps(taps)
      return { taps }
    })

    if (!navigator.onLine) {
      // Queue for later — store compressed photo in payload
      enqueue('CREATE_TAP', {
        clientId,
        cycleId,
        profileId: profile.id,
        lat: input.lat,
        lng: input.lng,
        tap_type: input.tap_type,
        description: input.description,
        photoBase64,
      } satisfies CreateTapPayload)
      set({ syncQueueLength: getQueueLength() })
      return clientId
    }

    // Online path
    const { data: insertedTap, error: insertError } = await supabase
      .from('taps')
      .insert({
        id: clientId,
        created_by: profile.id,
        lat: input.lat,
        lng: input.lng,
        tap_type: input.tap_type,
        description: input.description ?? null,
        status: 'working',
        is_verified: false,
        pending_status: 'working',
        pending_confirmations: 1,
        pending_started_at: now,
        pending_cycle_id: cycleId,
        photo_urls: [],
        synced: true,
      })
      .select()
      .single()

    if (insertError) {
      console.error('addTap: Supabase insert failed, queuing:', insertError.message)
      enqueue('CREATE_TAP', {
        clientId, cycleId, profileId: profile.id,
        lat: input.lat, lng: input.lng, tap_type: input.tap_type,
        description: input.description, photoBase64,
      } satisfies CreateTapPayload)
      set({ syncQueueLength: getQueueLength() })
      return clientId
    }

    // Seed creation status_logs row (1/3)
    await supabase.from('status_logs').insert({
      point_type: 'tap',
      point_id: clientId,
      profile_id: profile.id,
      reported_status: 'working',
      source: 'creation',
      verification_cycle_id: cycleId,
      counted_as_confirmation: true,
      points_awarded: false,
    })

    // Upload photo (not gated by verification)
    let photoUrls: string[] = []
    if (photoBlob) {
      const url = await uploadPhoto(photoBlob, 'tap', clientId)
      if (url) {
        photoUrls = [url]
        await supabase.from('taps').update({ photo_urls: photoUrls }).eq('id', clientId)
      }
    }

    const confirmedTap: Tap = { ...(insertedTap as Tap), synced: true, photo_urls: photoUrls }
    set((s) => {
      const taps = s.taps.map((t) => (t.id === clientId ? confirmedTap : t))
      saveCachedTaps(taps)
      return { taps }
    })

    return clientId
  },

  // ── addBathroom ───────────────────────────────────────────────────────────

  addBathroom: async (input: AddBathroomInput): Promise<string> => {
    const profile = await ensureProfile(get)
    const clientId = uuidv4()
    const now = new Date().toISOString()
    const cycleId = uuidv4()

    let photoBase64: string | undefined
    let photoBlob: Blob | undefined
    if (input.photoFile) {
      try {
        const compressed = await compressPhoto(input.photoFile)
        photoBase64 = compressed.base64
        photoBlob = compressed.blob
      } catch (e) {
        console.error('addBathroom: photo compression failed', e)
      }
    }

    const optimisticBathroom: Bathroom = {
      id: clientId,
      created_by: profile.id,
      lat: input.lat,
      lng: input.lng,
      name: input.name ?? null,
      is_free: input.is_free,
      price_note: input.price_note ?? null,
      is_accessible: input.is_accessible,
      is_unisex: input.is_unisex,
      has_baby_change: input.has_baby_change,
      status: 'working',
      cleanliness_status: input.cleanliness,
      last_verified: now,
      is_verified: false,
      pending_status: 'working',
      pending_cleanliness: input.cleanliness,
      pending_confirmations: 1,
      pending_started_at: now,
      pending_cycle_id: cycleId,
      photo_urls: [],
      created_at: now,
      synced: false,
    }

    set((s) => {
      const bathrooms = [optimisticBathroom, ...s.bathrooms]
      saveCachedBathrooms(bathrooms)
      return { bathrooms }
    })

    if (!navigator.onLine) {
      enqueue('CREATE_BATHROOM', {
        clientId, cycleId, profileId: profile.id,
        lat: input.lat, lng: input.lng,
        name: input.name, is_free: input.is_free, price_note: input.price_note,
        is_accessible: input.is_accessible, is_unisex: input.is_unisex,
        has_baby_change: input.has_baby_change, cleanliness: input.cleanliness,
        photoBase64,
      } satisfies CreateBathroomPayload)
      set({ syncQueueLength: getQueueLength() })
      return clientId
    }

    const { data: insertedBathroom, error: insertError } = await supabase
      .from('bathrooms')
      .insert({
        id: clientId,
        created_by: profile.id,
        lat: input.lat, lng: input.lng,
        name: input.name ?? null,
        is_free: input.is_free,
        price_note: input.price_note ?? null,
        is_accessible: input.is_accessible,
        is_unisex: input.is_unisex,
        has_baby_change: input.has_baby_change,
        status: 'working',
        cleanliness_status: input.cleanliness,
        is_verified: false,
        pending_status: 'working',
        pending_cleanliness: input.cleanliness,
        pending_confirmations: 1,
        pending_started_at: now,
        pending_cycle_id: cycleId,
        photo_urls: [],
        synced: true,
      })
      .select()
      .single()

    if (insertError) {
      console.error('addBathroom: Supabase insert failed, queuing:', insertError.message)
      enqueue('CREATE_BATHROOM', {
        clientId, cycleId, profileId: profile.id,
        lat: input.lat, lng: input.lng,
        name: input.name, is_free: input.is_free, price_note: input.price_note,
        is_accessible: input.is_accessible, is_unisex: input.is_unisex,
        has_baby_change: input.has_baby_change, cleanliness: input.cleanliness,
        photoBase64,
      } satisfies CreateBathroomPayload)
      set({ syncQueueLength: getQueueLength() })
      return clientId
    }

    await supabase.from('status_logs').insert({
      point_type: 'bathroom',
      point_id: clientId,
      profile_id: profile.id,
      reported_status: 'working',
      reported_cleanliness: input.cleanliness,
      source: 'creation',
      verification_cycle_id: cycleId,
      counted_as_confirmation: true,
      points_awarded: false,
    })

    let photoUrls: string[] = []
    if (photoBlob) {
      const url = await uploadPhoto(photoBlob, 'bathroom', clientId)
      if (url) {
        photoUrls = [url]
        await supabase.from('bathrooms').update({ photo_urls: photoUrls }).eq('id', clientId)
      }
    }

    const confirmedBathroom: Bathroom = {
      ...(insertedBathroom as Bathroom),
      synced: true,
      photo_urls: photoUrls,
    }
    set((s) => {
      const bathrooms = s.bathrooms.map((b) =>
        b.id === clientId ? confirmedBathroom : b,
      )
      saveCachedBathrooms(bathrooms)
      return { bathrooms }
    })

    return clientId
  },

  // ── reportStatus ──────────────────────────────────────────────────────────

  reportStatus: async (
    pointType: PointType,
    pointId: string,
    status: Status,
    cleanliness?: Cleanliness,
    photoFile?: File,
    source: ReportSource = 'status_update',
  ): Promise<void> => {
    const profile = await ensureProfile(get)

    // Compress photo if provided
    let photoBase64: string | undefined
    let photoBlob: Blob | undefined
    if (photoFile) {
      try {
        const compressed = await compressPhoto(photoFile)
        photoBase64 = compressed.base64
        photoBlob = compressed.blob
      } catch (e) {
        console.error('reportStatus: photo compression failed', e)
      }
    }

    // Optimistic pending state update
    const optimisticUpdate = (newConfirmations: number, cycleId: string) => {
      if (pointType === 'tap') {
        set((s) => ({
          taps: s.taps.map((t) =>
            t.id === pointId
              ? { ...t, pending_status: status, pending_confirmations: newConfirmations, pending_cycle_id: cycleId }
              : t,
          ),
        }))
      } else {
        set((s) => ({
          bathrooms: s.bathrooms.map((b) =>
            b.id === pointId
              ? { ...b, pending_status: status, pending_cleanliness: cleanliness ?? b.pending_cleanliness, pending_confirmations: newConfirmations, pending_cycle_id: cycleId }
              : b,
          ),
        }))
      }
    }

    if (!navigator.onLine) {
      // Optimistic: increment local pending counter (server will reconcile on sync)
      const current = pointType === 'tap'
        ? get().taps.find((t) => t.id === pointId)
        : get().bathrooms.find((b) => b.id === pointId)

      const optimisticCount = (current?.pending_confirmations ?? 0) + 1
      const tempCycleId = current?.pending_cycle_id ?? uuidv4()
      optimisticUpdate(Math.min(optimisticCount, 3), tempCycleId)

      const actionType = source === 'checkin' ? 'CHECKIN' : 'UPDATE_STATUS'
      enqueue(actionType, {
        pointType, pointId, profileId: profile.id,
        status, cleanliness, source, photoBase64,
      } satisfies UpdateStatusPayload)
      set({ syncQueueLength: getQueueLength() })
      return
    }

    // Online: delegate to verification state machine (the ONLY correct path)
    const result = await processReport({
      pointType,
      pointId,
      profileId: profile.id,
      reportedStatus: status,
      reportedCleanliness: cleanliness,
      source,
    })

    // Upload photo regardless of verification outcome (photos are not gated)
    if (photoBlob) {
      const url = await uploadPhoto(photoBlob, pointType, pointId)
      if (url) await attachPhotoUrl(pointType, pointId, url)
    }

    if (result.flipped) {
      // Cycle reached 3/3 — re-fetch authoritative server row
      const table = pointType === 'tap' ? 'taps' : 'bathrooms'
      const { data: updated } = await supabase
        .from(table).select('*').eq('id', pointId).single()

      if (updated) {
        if (pointType === 'tap') {
          set((s) => {
            const taps = s.taps.map((t) => t.id === pointId ? (updated as Tap) : t)
            saveCachedTaps(taps)
            return { taps }
          })
        } else {
          set((s) => {
            const bathrooms = s.bathrooms.map((b) =>
              b.id === pointId ? (updated as Bathroom) : b,
            )
            saveCachedBathrooms(bathrooms)
            return { bathrooms }
          })
        }

        // Refresh leaderboard + own profile after points payout
        const [lbRes, profileRes] = await Promise.all([
          supabase.from('leaderboard').select('*').limit(10),
          supabase.from('profiles').select('*').eq('id', profile.id).single(),
        ])
        if (lbRes.data) set({ leaderboard: lbRes.data.map(mapLeaderboardRow) })
        if (profileRes.data) set({ profile: profileRes.data as Profile })
      }
    } else if (!result.alreadyVoted) {
      optimisticUpdate(result.pendingConfirmations, result.cycleId)
    }
  },

  // ── adoptPoint ────────────────────────────────────────────────────────────

  adoptPoint: async (pointType: PointType, pointId: string): Promise<void> => {
    const profile = await ensureProfile(get)

    if (!navigator.onLine) {
      enqueue('ADOPT', {
        profileId: profile.id, pointType, pointId,
      } satisfies AdoptPayload)
      set({ syncQueueLength: getQueueLength() })
      return
    }

    const { error } = await supabase.from('adoptions').upsert(
      { profile_id: profile.id, point_type: pointType, point_id: pointId },
      { onConflict: 'profile_id,point_type,point_id', ignoreDuplicates: true },
    )

    if (error) {
      // Queue as fallback on transient failure
      enqueue('ADOPT', { profileId: profile.id, pointType, pointId } satisfies AdoptPayload)
      set({ syncQueueLength: getQueueLength() })
    }
    // Adoption does NOT award +15 — check-ins via reportStatus(source='checkin') do
  },
}))

// ─── Bootstrap on first import ────────────────────────────────────────────────
useAppStore.getState()._init().catch(console.error)
