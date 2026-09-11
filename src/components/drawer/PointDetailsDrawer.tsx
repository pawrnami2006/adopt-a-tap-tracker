import { X, Droplets, Bath, Navigation, Accessibility, Users, Baby, DollarSign, Check } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { VerificationBadge } from './VerificationBadge.tsx';
import { StatusButtons } from './StatusButtons.tsx';
import { PhotoStrip } from './PhotoStrip.tsx';
import { AdoptButton } from './AdoptButton.tsx';
import type { TapItem, BathroomItem, PointStatus, CleanlinessStatus } from '../map/types.ts';

export type DrawerPoint =
  | { type: 'tap'; data: TapItem }
  | { type: 'bathroom'; data: BathroomItem };

interface PointDetailsDrawerProps {
  point: DrawerPoint | null;
  onClose: () => void;
  onReportStatus?: (status: PointStatus, cleanliness?: CleanlinessStatus) => void;
  onAdoptPoint?: (pointType: 'tap' | 'bathroom', pointId: string) => void;
  onAddPhoto?: (file: File, previewUrl: string) => void;
  isAdopted?: boolean;
  hasVotedCurrentCycle?: boolean;
  userCurrentVote?: PointStatus | null;
  className?: string;
}

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

export function PointDetailsDrawer({
  point,
  onClose,
  onReportStatus,
  onAdoptPoint,
  onAddPhoto,
  isAdopted = false,
  hasVotedCurrentCycle = false,
  userCurrentVote = null,
  className = '',
}: PointDetailsDrawerProps) {
  if (!point) return null;

  const isTap = point.type === 'tap';
  const tap = isTap ? (point.data as TapItem) : null;
  const bathroom = !isTap ? (point.data as BathroomItem) : null;

  const title = isTap
    ? tap?.description || 'Public Water Tap'
    : bathroom?.name || 'Public Restroom';

  const categoryLabel = isTap
    ? tap?.tap_type.replace('_', ' ')
    : bathroom?.is_free
    ? 'Free Restroom'
    : `Paid Restroom (${bathroom?.price_note || 'Fee'})`;

  const status = point.data.status;
  const isVerified = point.data.is_verified;
  const pendingConfirmations = point.data.pending_confirmations;
  const lastVerified = point.data.last_verified;
  const photos = point.data.photo_urls || [];

  const handleDirections = () => {
    const lat = point.data.lat;
    const lng = point.data.lng;
    window.open(
      `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`,
      '_blank',
      'noopener,noreferrer'
    );
  };

  return (
    <div
      className={`fixed bottom-20 inset-x-3 z-40 max-w-md mx-auto pointer-events-auto animate-in slide-in-from-bottom-5 duration-200 select-none ${className}`}
    >
      <div
        className="max-h-[75vh] overflow-y-auto rounded-[32px] p-5 shadow-[0_-12px_40px_rgba(8,126,139,0.38)] text-white flex flex-col gap-4 border border-white/40"
        style={{
          background: 'linear-gradient(145deg, #087E8B 0%, #0B939E 50%, #0E767E 100%)',
        }}
      >
        {/* Top Handle & Close Row */}
        <div className="flex items-center justify-between">
          <div className="w-12 h-1.5 rounded-full bg-white/40 mx-auto" />
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/15 hover:bg-white/25 flex items-center justify-center text-white transition-colors shrink-0 -mr-1"
            aria-label="Close details"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Header: Icon, Type, Title & Last Verified */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center text-[#53EBD2] border border-white/30 shrink-0 shadow-inner">
              {isTap ? <Droplets className="w-6 h-6" /> : <Bath className="w-6 h-6" />}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 text-xs text-[#A5F3FC] font-semibold uppercase tracking-wider truncate">
                <span>{categoryLabel}</span>
                <span className="w-1 h-1 rounded-full bg-white/40" />
                <span>{point.data.lat.toFixed(4)}, {point.data.lng.toFixed(4)}</span>
              </div>
              <h2 className="font-bold text-base leading-snug truncate text-white">
                {title}
              </h2>
              <div className="text-[11px] text-[#C8F5F0] mt-0.5">
                Last verified: {formatTimeAgo(lastVerified)}
              </div>
            </div>
          </div>

          {/* Current Official Status Badge */}
          <span
            className={`px-3 py-1 rounded-full text-xs font-bold tracking-wide shrink-0 shadow-sm capitalize ${
              status === 'working'
                ? 'bg-[#10B981] text-white'
                : status === 'issue'
                ? 'bg-[#F59E0B] text-white'
                : 'bg-[#EF4444] text-white'
            }`}
          >
            {status}
          </span>
        </div>

        {/* Bathroom Feature Chips (if bathroom) */}
        {!isTap && bathroom && (
          <div className="flex flex-wrap items-center gap-1.5 text-xs">
            {bathroom.is_accessible && (
              <span className="px-2.5 py-1 rounded-full bg-white/15 border border-white/25 flex items-center gap-1 font-semibold text-white">
                <Accessibility className="w-3.5 h-3.5 text-[#53EBD2]" />
                Accessible
              </span>
            )}
            {bathroom.is_unisex && (
              <span className="px-2.5 py-1 rounded-full bg-white/15 border border-white/25 flex items-center gap-1 font-semibold text-white">
                <Users className="w-3.5 h-3.5 text-[#53EBD2]" />
                Unisex
              </span>
            )}
            {bathroom.has_baby_change && (
              <span className="px-2.5 py-1 rounded-full bg-white/15 border border-white/25 flex items-center gap-1 font-semibold text-white">
                <Baby className="w-3.5 h-3.5 text-[#53EBD2]" />
                Baby Change
              </span>
            )}
            <span className="px-2.5 py-1 rounded-full bg-white/15 border border-white/25 flex items-center gap-1 font-semibold text-white">
              {bathroom.is_free ? (
                <>
                  <Check className="w-3.5 h-3.5 text-[#10B981]" />
                  Free Entry
                </>
              ) : (
                <>
                  <DollarSign className="w-3.5 h-3.5 text-[#FBBF24]" />
                  {bathroom.price_note || 'Paid'}
                </>
              )}
            </span>
          </div>
        )}

        {/* Verification Engine Trust Badge */}
        <VerificationBadge
          isVerified={isVerified}
          pendingConfirmations={pendingConfirmations}
        />

        {/* Condition Reporting Buttons */}
        <StatusButtons
          key={point.data.id}
          pointType={point.type}
          pointId={point.data.id}
          currentStatus={status}
          currentCleanliness={bathroom?.cleanliness_status}
          hasVotedCurrentCycle={hasVotedCurrentCycle}
          userCurrentVote={userCurrentVote}
          onReportStatus={onReportStatus}
        />

        {/* Community Photo Strip */}
        <PhotoStrip photos={photos} onAddPhoto={onAddPhoto} />

        {/* Bottom Actions Row: Adopt + Directions */}
        <div className="flex items-center gap-2.5 pt-1">
          <AdoptButton
            key={point.data.id}
            pointType={point.type}
            pointId={point.data.id}
            initialAdopted={isAdopted}
            onAdopt={onAdoptPoint}
            className="flex-1"
          />

          <button
            type="button"
            onClick={handleDirections}
            className="flex-1 min-h-[46px] rounded-2xl bg-gradient-to-r from-[#53EBD2] to-[#41E2BA] text-[#03383a] flex items-center justify-center gap-1.5 font-bold text-xs shadow-[0_6px_18px_rgba(8,126,139,0.35),inset_0_1px_2px_rgba(255,255,255,0.85)] border border-white/60 active:scale-95 transition-all"
          >
            <Navigation className="w-4 h-4" />
            <span>Directions</span>
          </button>
        </div>
      </div>
    </div>
  );
}
