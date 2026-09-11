import { useState } from 'react';
import { Star, Droplets, Bath, CheckCircle2, MapPin, Sparkles, Navigation } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import type { PointStatus } from '../map/types.ts';

export interface AdoptedPointItem {
  id: string;
  point_type: 'tap' | 'bathroom';
  name: string;
  location_desc: string;
  status: PointStatus;
  is_verified: boolean;
  pending_confirmations: number;
  last_verified: string;
  photo_url?: string;
  lat: number;
  lng: number;
}

const DEFAULT_MOCK_WATCHLIST: AdoptedPointItem[] = [
  {
    id: 'tap-1',
    point_type: 'tap',
    name: 'MG Road Central Park Fountain',
    location_desc: 'Sector 4, Central Promenade',
    status: 'working',
    is_verified: true,
    pending_confirmations: 3,
    last_verified: new Date(Date.now() - 14 * 60 * 1000).toISOString(),
    photo_url:
      'https://images.unsplash.com/photo-1541888946425-d0fbb186c5f7?auto=format&fit=crop&w=400&q=80',
    lat: 12.9716,
    lng: 77.5946,
  },
  {
    id: 'bath-1',
    point_type: 'bathroom',
    name: 'City Center Civic Restroom',
    location_desc: 'Commercial Street Entrance',
    status: 'working',
    is_verified: true,
    pending_confirmations: 3,
    last_verified: new Date(Date.now() - 25 * 60 * 1000).toISOString(),
    photo_url:
      'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?auto=format&fit=crop&w=400&q=80',
    lat: 12.9735,
    lng: 77.5975,
  },
  {
    id: 'tap-2',
    point_type: 'tap',
    name: 'Library Plaza Dispenser',
    location_desc: 'Opposite State Central Library',
    status: 'working',
    is_verified: false,
    pending_confirmations: 2,
    last_verified: new Date(Date.now() - 45 * 60 * 1000).toISOString(),
    lat: 12.9752,
    lng: 77.5912,
  },
];

function formatTimeAgo(isoString?: string): string {
  if (!isoString) return 'Recently';
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return 'Recently';
    return `${formatDistanceToNow(d)} ago`;
  } catch {
    return 'Recently';
  }
}

interface AdoptedTapsDashboardProps {
  items?: AdoptedPointItem[];
  onViewOnMap?: (lat: number, lng: number) => void;
  onCheckIn?: (pointType: 'tap' | 'bathroom', pointId: string) => void;
  className?: string;
}

export function AdoptedTapsDashboard({
  items = DEFAULT_MOCK_WATCHLIST,
  onViewOnMap,
  onCheckIn,
  className = '',
}: AdoptedTapsDashboardProps) {
  const [filter, setFilter] = useState<'all' | 'taps' | 'bathrooms'>('all');
  const [checkedInIds, setCheckedInIds] = useState<Set<string>>(new Set());
  const [feedback, setFeedback] = useState<string | null>(null);

  // Check if store contract supports reportStatus with source='checkin'
  let storeSupportsCheckIn = false;
  if (typeof window !== 'undefined') {
    try {
      const storeGetter = (window as any).useAppStore;
      if (storeGetter) {
        const store = typeof storeGetter.getState === 'function' ? storeGetter.getState() : storeGetter();
        if (typeof store?.reportStatus === 'function') {
          storeSupportsCheckIn = true;
        }
      }
    } catch {
      // ignore
    }
  }

  // Also support checkin if parent passed callback
  const canCheckIn = storeSupportsCheckIn || Boolean(onCheckIn);

  const filteredItems = items.filter((item) => {
    if (filter === 'taps') return item.point_type === 'tap';
    if (filter === 'bathrooms') return item.point_type === 'bathroom';
    return true;
  });

  const handleCheckInClick = (item: AdoptedPointItem) => {
    if (checkedInIds.has(item.id)) return;

    if (typeof window !== 'undefined') {
      try {
        const storeGetter = (window as any).useAppStore;
        if (storeGetter) {
          const store = typeof storeGetter.getState === 'function' ? storeGetter.getState() : storeGetter();
          if (typeof store?.reportStatus === 'function') {
            store.reportStatus(item.point_type, item.id, item.status, undefined, undefined, 'checkin');
          }
        }
      } catch (err) {
        console.warn('Could not call reportStatus for checkin:', err);
      }
    }

    onCheckIn?.(item.point_type, item.id);
    setCheckedInIds((prev) => new Set(prev).add(item.id));
    setFeedback(`Check-in recorded for "${item.name}"! +15 points queued for cycle verification.`);
  };

  return (
    <div className={`w-full flex flex-col gap-4 pb-28 text-[#161D1D] select-none ${className}`}>
      {/* Header Banner */}
      <div
        className="w-full rounded-2xl p-5 text-white flex flex-col gap-2 shadow-lg border border-white/30"
        style={{
          background: 'linear-gradient(145deg, #087E8B 0%, #0B939E 50%, #0E767E 100%)',
          boxShadow: '0 12px 30px rgba(8, 126, 139, 0.35)',
        }}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Star className="w-5 h-5 text-[#FBBF24] fill-[#FBBF24]" />
            <h2 className="text-xl font-bold">My Watchlist</h2>
          </div>
          <span className="px-3 py-1 rounded-full text-xs font-bold bg-[#2CEAA3]/20 text-[#53EBD2] border border-[#2CEAA3]/40">
            {items.length} Adopted
          </span>
        </div>
        <p className="text-xs text-[#C8F5F0] leading-relaxed">
          Guardians steward local public water points & restrooms to ensure they remain clean and working.
        </p>
      </div>

      {/* Feedback Toast */}
      {feedback && (
        <div className="p-3.5 rounded-2xl bg-[#00696B] text-white text-xs flex items-center justify-between gap-2 shadow-md">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-[#53EBD2] shrink-0" />
            <span>{feedback}</span>
          </div>
          <button
            type="button"
            onClick={() => setFeedback(null)}
            className="text-white/80 hover:text-white text-xs font-bold"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Filter Tabs */}
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => setFilter('all')}
          className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all border ${
            filter === 'all'
              ? 'bg-[#00696B] text-white border-[#00696B] shadow-sm'
              : 'bg-white text-[#587A7C] border-cyan-100'
          }`}
        >
          All ({items.length})
        </button>
        <button
          type="button"
          onClick={() => setFilter('taps')}
          className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all flex items-center gap-1.5 border ${
            filter === 'taps'
              ? 'bg-[#00696B] text-white border-[#00696B] shadow-sm'
              : 'bg-white text-[#587A7C] border-cyan-100'
          }`}
        >
          <Droplets className="w-3.5 h-3.5" />
          Taps ({items.filter((i) => i.point_type === 'tap').length})
        </button>
        <button
          type="button"
          onClick={() => setFilter('bathrooms')}
          className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all flex items-center gap-1.5 border ${
            filter === 'bathrooms'
              ? 'bg-[#00696B] text-white border-[#00696B] shadow-sm'
              : 'bg-white text-[#587A7C] border-cyan-100'
          }`}
        >
          <Bath className="w-3.5 h-3.5" />
          Restrooms ({items.filter((i) => i.point_type === 'bathroom').length})
        </button>
      </div>

      {/* Adopted Points List */}
      <div className="flex flex-col gap-3">
        {filteredItems.map((item) => {
          const isTap = item.point_type === 'tap';
          const isCheckedIn = checkedInIds.has(item.id);

          return (
            <div
              key={item.id}
              className="p-4 rounded-2xl bg-white border border-cyan-100 shadow-xs flex flex-col gap-3"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-[#F4FBFA] flex items-center justify-center text-[#00696B] border border-cyan-100 shrink-0">
                    {isTap ? <Droplets className="w-5 h-5" /> : <Bath className="w-5 h-5" />}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 text-[11px] font-semibold text-[#00696B]">
                      <Star className="w-3 h-3 text-[#F59E0B] fill-[#F59E0B]" />
                      <span>Adopted Guardian</span>
                    </div>
                    <h3 className="font-bold text-sm text-[#161D1D] truncate leading-tight mt-0.5">
                      {item.name}
                    </h3>
                    <p className="text-[11px] text-[#789092] flex items-center gap-1 mt-0.5 truncate">
                      <MapPin className="w-3 h-3 text-[#789092]" />
                      {item.location_desc}
                    </p>
                  </div>
                </div>

                {/* Status Indicator */}
                <span
                  className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider shrink-0 ${
                    item.status === 'working'
                      ? 'bg-[#E8F8EE] text-[#10B981]'
                      : item.status === 'issue'
                      ? 'bg-[#FEF3C7] text-[#D97706]'
                      : 'bg-[#FEE2E2] text-[#EF4444]'
                  }`}
                >
                  {item.status}
                </span>
              </div>

              {/* Verification and Last Verified */}
              <div className="flex items-center justify-between text-xs text-[#587A7C] px-1 pt-1 border-t border-slate-100">
                <span className="flex items-center gap-1 font-semibold text-[#00696B]">
                  <CheckCircle2 className="w-3.5 h-3.5 text-[#10B981]" />
                  {item.is_verified ? 'Consensus 3/3' : `Pending ${item.pending_confirmations}/3`}
                </span>
                <span className="text-[11px]">Last verified {formatTimeAgo(item.last_verified)}</span>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2 pt-1">
                {canCheckIn && (
                  <button
                    type="button"
                    disabled={isCheckedIn}
                    onClick={() => handleCheckInClick(item)}
                    className={`flex-1 min-h-[42px] rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all active:scale-95 shadow-xs ${
                      isCheckedIn
                        ? 'bg-[#E8F8EE] text-[#065F46] border border-[#22C55E]/40'
                        : 'bg-gradient-to-r from-[#53EBD2] to-[#41E2BA] text-[#03383a] shadow-[0_4px_12px_rgba(8,126,139,0.25)] border border-white/60'
                    }`}
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>{isCheckedIn ? 'Checked In Today' : 'Check In (+15 pts)'}</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => onViewOnMap?.(item.lat, item.lng)}
                  className="px-3.5 min-h-[42px] rounded-xl bg-[#F4FBFA] hover:bg-cyan-50 text-[#00696B] font-bold text-xs flex items-center justify-center gap-1 border border-cyan-200 active:scale-95 transition-all"
                >
                  <Navigation className="w-3.5 h-3.5" />
                  <span>Map</span>
                </button>
              </div>
            </div>
          );
        })}

        {filteredItems.length === 0 && (
          <div className="p-8 rounded-2xl bg-white border border-cyan-100 text-center flex flex-col items-center gap-2 text-[#789092]">
            <Star className="w-8 h-8 text-cyan-200" />
            <p className="text-sm font-semibold">No adopted points in this category</p>
            <p className="text-xs">Browse the map and tap "Adopt Point" to steward water sources.</p>
          </div>
        )}
      </div>
    </div>
  );
}
