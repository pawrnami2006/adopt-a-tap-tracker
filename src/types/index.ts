// ─── Primitive unions ────────────────────────────────────────────────────────

export type TapType = 'drinking_fountain' | 'community_tap' | 'restroom_sink'

export type Status = 'working' | 'issue' | 'broken'

export type Cleanliness = 'clean' | 'average' | 'dirty'

export type ReportSource = 'creation' | 'status_update' | 'checkin'

export type PointType = 'tap' | 'bathroom'

export type QueueActionType =
  | 'CREATE_TAP'
  | 'CREATE_BATHROOM'
  | 'UPDATE_STATUS'
  | 'ADOPT'
  | 'CHECKIN'

export type Tier =
  | 'Leak Finder'
  | 'Tap Guardian'
  | 'Water Warden'
  | 'Aqua Legend'

// ─── Domain entities (mirror Supabase schema) ────────────────────────────────

export interface Profile {
  id: string
  device_id: string
  auth_user_id: string | null
  display_name: string
  total_points: number
  created_at: string
}

export interface Tap {
  id: string
  created_by: string | null
  lat: number
  lng: number
  tap_type: TapType
  description: string | null

  // Official (verified) state
  status: Status
  last_verified: string
  is_verified: boolean

  // Pending state
  pending_status: Status | null
  pending_confirmations: number
  pending_started_at: string | null
  pending_cycle_id: string | null

  photo_urls: string[]
  created_at: string
  synced: boolean
}

export interface Bathroom {
  id: string
  created_by: string | null
  lat: number
  lng: number
  name: string | null
  is_free: boolean
  price_note: string | null
  is_accessible: boolean
  is_unisex: boolean
  has_baby_change: boolean

  // Official (verified) state
  status: Status
  cleanliness_status: Cleanliness
  last_verified: string
  is_verified: boolean

  // Pending state
  pending_status: Status | null
  pending_cleanliness: Cleanliness | null
  pending_confirmations: number
  pending_started_at: string | null
  pending_cycle_id: string | null

  photo_urls: string[]
  created_at: string
  synced: boolean
}

export interface StatusLog {
  id: string
  point_type: PointType
  point_id: string
  profile_id: string | null
  reported_status: string
  reported_cleanliness: Cleanliness | null
  note: string | null
  photo_url: string | null
  source: ReportSource
  verification_cycle_id: string
  counted_as_confirmation: boolean
  points_awarded: boolean
  created_at: string
}

// ─── Offline sync queue ───────────────────────────────────────────────────────

export interface QueuedAction {
  id: string
  type: QueueActionType
  payload: unknown
  createdAt: string
  attempts: number
}

// ─── Leaderboard ─────────────────────────────────────────────────────────────

export interface LeaderboardEntry {
  id: string
  display_name: string
  total_points: number
  tier: Tier
}

// ─── Form input types ─────────────────────────────────────────────────────────

export interface AddTapInput {
  lat: number
  lng: number
  tap_type: TapType
  description?: string
  photoFile?: File
}

export interface AddBathroomInput {
  lat: number
  lng: number
  name?: string
  is_free: boolean
  price_note?: string
  is_accessible: boolean
  is_unisex: boolean
  has_baby_change: boolean
  cleanliness: Cleanliness
  photoFile?: File
}

export interface ReportStatusInput {
  pointType: PointType
  pointId: string
  status: Status
  cleanliness?: Cleanliness
  photoFile?: File
  source: ReportSource
}
