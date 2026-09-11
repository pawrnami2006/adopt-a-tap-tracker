export type PointStatus = 'working' | 'issue' | 'broken';
export type CleanlinessStatus = 'clean' | 'average' | 'dirty';
export type TapType = 'drinking_fountain' | 'community_tap' | 'restroom_sink';
export type MapFilterType = 'both' | 'taps' | 'bathrooms';

export interface TapItem {
  id: string;
  created_by?: string;
  lat: number;
  lng: number;
  tap_type: TapType;
  description?: string | null;
  status: PointStatus;
  last_verified: string;
  is_verified: boolean;
  pending_status?: PointStatus | null;
  pending_confirmations: number;
  pending_started_at?: string | null;
  pending_cycle_id?: string | null;
  photo_urls: string[];
  created_at: string;
  synced?: boolean;
}

export interface BathroomItem {
  id: string;
  created_by?: string;
  lat: number;
  lng: number;
  name?: string | null;
  is_free: boolean;
  price_note?: string | null;
  is_accessible: boolean;
  is_unisex: boolean;
  has_baby_change: boolean;
  status: PointStatus;
  cleanliness_status: CleanlinessStatus;
  last_verified: string;
  is_verified: boolean;
  pending_status?: PointStatus | null;
  pending_cleanliness?: CleanlinessStatus | null;
  pending_confirmations: number;
  pending_started_at?: string | null;
  pending_cycle_id?: string | null;
  photo_urls: string[];
  created_at: string;
  synced?: boolean;
}

// Initial realistic mock data near city center promenade
export const INITIAL_MOCK_TAPS: TapItem[] = [
  {
    id: 'tap-1',
    lat: 12.9716,
    lng: 77.5946,
    tap_type: 'drinking_fountain',
    description: 'MG Road Central Park Fountain',
    status: 'working',
    last_verified: new Date(Date.now() - 14 * 60 * 1000).toISOString(),
    is_verified: true,
    pending_confirmations: 3,
    photo_urls: [],
    created_at: new Date(Date.now() - 3600 * 1000).toISOString(),
    synced: true,
  },
  {
    id: 'tap-2',
    lat: 12.9752,
    lng: 77.5912,
    tap_type: 'community_tap',
    description: 'Library Plaza Water Dispenser',
    status: 'working',
    last_verified: new Date(Date.now() - 45 * 60 * 1000).toISOString(),
    is_verified: false,
    pending_status: 'working',
    pending_confirmations: 2,
    photo_urls: [],
    created_at: new Date(Date.now() - 7200 * 1000).toISOString(),
    synced: true,
  },
  {
    id: 'tap-3',
    lat: 12.9685,
    lng: 77.5998,
    tap_type: 'restroom_sink',
    description: 'Metro Station North Sink',
    status: 'issue',
    last_verified: new Date(Date.now() - 90 * 60 * 1000).toISOString(),
    is_verified: false,
    pending_status: 'issue',
    pending_confirmations: 1,
    photo_urls: [],
    created_at: new Date(Date.now() - 10800 * 1000).toISOString(),
    synced: true,
  },
  {
    id: 'tap-4',
    lat: 12.9741,
    lng: 77.6025,
    tap_type: 'drinking_fountain',
    description: 'Cubbon Park East Jogger Tap',
    status: 'broken',
    last_verified: new Date(Date.now() - 120 * 60 * 1000).toISOString(),
    is_verified: true,
    pending_confirmations: 3,
    photo_urls: [],
    created_at: new Date(Date.now() - 14400 * 1000).toISOString(),
    synced: true,
  },
];

export const INITIAL_MOCK_BATHROOMS: BathroomItem[] = [
  {
    id: 'bath-1',
    lat: 12.9735,
    lng: 77.5975,
    name: 'City Center Civic Restroom',
    is_free: true,
    is_accessible: true,
    is_unisex: true,
    has_baby_change: true,
    status: 'working',
    cleanliness_status: 'clean',
    last_verified: new Date(Date.now() - 25 * 60 * 1000).toISOString(),
    is_verified: true,
    pending_confirmations: 3,
    photo_urls: [],
    created_at: new Date(Date.now() - 8000 * 1000).toISOString(),
    synced: true,
  },
  {
    id: 'bath-2',
    lat: 12.9692,
    lng: 77.5935,
    name: 'South Bus Terminal Restrooms',
    is_free: false,
    price_note: '₹5',
    is_accessible: true,
    is_unisex: false,
    has_baby_change: false,
    status: 'broken',
    cleanliness_status: 'dirty',
    last_verified: new Date(Date.now() - 180 * 60 * 1000).toISOString(),
    is_verified: true,
    pending_confirmations: 3,
    photo_urls: [],
    created_at: new Date(Date.now() - 20000 * 1000).toISOString(),
    synced: true,
  },
  {
    id: 'bath-3',
    lat: 12.9765,
    lng: 77.5982,
    name: 'Botanical Pavilion Restroom',
    is_free: true,
    is_accessible: false,
    is_unisex: true,
    has_baby_change: true,
    status: 'working',
    cleanliness_status: 'average',
    last_verified: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
    is_verified: false,
    pending_status: 'working',
    pending_confirmations: 1,
    photo_urls: [],
    created_at: new Date(Date.now() - 5000 * 1000).toISOString(),
    synced: true,
  },
];
