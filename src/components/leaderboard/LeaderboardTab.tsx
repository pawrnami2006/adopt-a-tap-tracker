import { Trophy, Medal, Sparkles, ShieldCheck } from 'lucide-react';
import { TierBadge, getTierForPoints, type GuardianTier } from './TierBadge.tsx';

export interface LeaderboardUser {
  id: string;
  display_name: string;
  total_points: number;
  tier: GuardianTier;
  rank?: number;
}

const DEFAULT_MOCK_LEADERBOARD: LeaderboardUser[] = [
  { id: 'u-1', display_name: 'AquaMaster_99', total_points: 1840, tier: 'Aqua Legend', rank: 1 },
  { id: 'u-2', display_name: 'EcoRiverGuardian', total_points: 1290, tier: 'Water Warden', rank: 2 },
  { id: 'u-3', display_name: 'BangaloreSprings', total_points: 940, tier: 'Water Warden', rank: 3 },
  { id: 'u-4', display_name: 'You (Anonymous Guardian)', total_points: 248, tier: 'Tap Guardian', rank: 4 },
  { id: 'u-5', display_name: 'Maya_Waterdrop', total_points: 210, tier: 'Tap Guardian', rank: 5 },
  { id: 'u-6', display_name: 'ArjunK', total_points: 185, tier: 'Tap Guardian', rank: 6 },
  { id: 'u-7', display_name: 'GreenCivic_Blr', total_points: 140, tier: 'Tap Guardian', rank: 7 },
  { id: 'u-8', display_name: 'UrbanOasis', total_points: 95, tier: 'Leak Finder', rank: 8 },
  { id: 'u-9', display_name: 'ClearTapHero', total_points: 65, tier: 'Leak Finder', rank: 9 },
  { id: 'u-10', display_name: 'Scout_Koramangala', total_points: 40, tier: 'Leak Finder', rank: 10 },
];

interface LeaderboardTabProps {
  currentUser?: {
    display_name: string;
    total_points: number;
    tier?: GuardianTier;
    rank?: number;
  };
  leaderboard?: LeaderboardUser[];
  className?: string;
}

export function LeaderboardTab({
  currentUser,
  leaderboard,
  className = '',
}: LeaderboardTabProps) {
  // Read store if available
  let storeLeaderboard: LeaderboardUser[] | null = null;
  let storeProfile: any = null;

  if (typeof window !== 'undefined') {
    try {
      const storeGetter = (window as any).useAppStore;
      if (storeGetter) {
        const store = typeof storeGetter.getState === 'function' ? storeGetter.getState() : storeGetter();
        if (Array.isArray(store?.leaderboard)) storeLeaderboard = store.leaderboard;
        if (store?.profile) storeProfile = store.profile;
      }
    } catch {
      // ignore
    }
  }

  const items = leaderboard || storeLeaderboard || DEFAULT_MOCK_LEADERBOARD;
  const top10 = items.slice(0, 10);

  const myPoints = currentUser?.total_points ?? storeProfile?.total_points ?? 248;
  const myName = currentUser?.display_name ?? storeProfile?.display_name ?? 'You (Anonymous Guardian)';
  const myTier = currentUser?.tier ?? storeProfile?.tier ?? getTierForPoints(myPoints);
  const myRank = currentUser?.rank ?? 4;

  // Next tier threshold
  let nextTierPoints = 500;
  let nextTierName: GuardianTier = 'Water Warden';
  if (myPoints <= 100) {
    nextTierPoints = 100;
    nextTierName = 'Tap Guardian';
  } else if (myPoints <= 500) {
    nextTierPoints = 500;
    nextTierName = 'Water Warden';
  } else if (myPoints <= 1500) {
    nextTierPoints = 1500;
    nextTierName = 'Aqua Legend';
  } else {
    nextTierPoints = myPoints;
    nextTierName = 'Aqua Legend';
  }

  const progressPercent = Math.min(100, Math.round((myPoints / nextTierPoints) * 100));

  return (
    <div className={`w-full flex flex-col gap-4 pb-28 text-[#161D1D] select-none ${className}`}>
      {/* User Hero Score Card */}
      <div
        className="w-full rounded-2xl p-5 text-white flex flex-col gap-3 shadow-lg border border-white/30"
        style={{
          background: 'linear-gradient(145deg, #087E8B 0%, #0B939E 50%, #0E767E 100%)',
          boxShadow: '0 12px 30px rgba(8, 126, 139, 0.35)',
        }}
      >
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-1.5 text-xs text-[#A5F3FC]">
              <Trophy className="w-4 h-4 text-[#53EBD2]" />
              <span className="font-semibold">Rank #{myRank} this week</span>
            </div>
            <h2 className="text-xl font-bold mt-0.5">{myName}</h2>
          </div>
          <div className="flex flex-col items-end">
            <div className="text-2xl font-extrabold text-[#53EBD2] tracking-tight">
              {myPoints} <span className="text-sm font-semibold text-white">PTS</span>
            </div>
            <TierBadge tier={myTier} size="sm" className="mt-1" />
          </div>
        </div>

        {/* Progress Bar to Next Tier */}
        <div className="flex flex-col gap-1.5 pt-1">
          <div className="flex items-center justify-between text-xs text-[#A5F3FC]">
            <span>Next Rank: {nextTierName}</span>
            <span className="font-bold text-[#53EBD2]">
              {myPoints} / {nextTierPoints} PTS
            </span>
          </div>
          <div className="w-full h-2.5 rounded-full bg-black/25 overflow-hidden p-0.5">
            <div
              className="h-full rounded-full bg-gradient-to-r from-[#53EBD2] to-[#41E2BA] transition-all duration-500"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          <p className="text-[11px] text-[#C8F5F0] mt-0.5 flex items-center gap-1">
            <Sparkles className="w-3 h-3 text-[#53EBD2]" />
            <span>Points unlock whenever a report reaches 3 consensus confirmations.</span>
          </p>
        </div>
      </div>

      {/* Top 10 Ranked List */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between px-1">
          <h3 className="font-bold text-sm text-[#00696B] uppercase tracking-wider flex items-center gap-1.5">
            <Medal className="w-4 h-4 text-[#00696B]" />
            Top 10 Civic Guardians
          </h3>
          <span className="text-xs text-[#789092] font-medium">Consensus Leaderboard</span>
        </div>

        <div className="flex flex-col gap-2">
          {top10.map((user, idx) => {
            const rank = user.rank ?? idx + 1;
            const isMe = user.id === 'u-4' || user.display_name.includes('You');

            let rankColor = 'bg-[#F4FBFA] text-[#789092]';
            if (rank === 1) rankColor = 'bg-[#FBBF24] text-[#78350F] font-black';
            else if (rank === 2) rankColor = 'bg-[#E2E8F0] text-[#334155] font-black';
            else if (rank === 3) rankColor = 'bg-[#FED7AA] text-[#7C2D12] font-black';

            return (
              <div
                key={user.id}
                className={`p-3.5 rounded-2xl flex items-center justify-between transition-all border ${
                  isMe
                    ? 'bg-gradient-to-r from-[#087E8B]/10 to-[#53EBD2]/15 border-[#087E8B] shadow-sm'
                    : 'bg-white border-cyan-100/70 shadow-xs'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className={`w-7 h-7 rounded-full flex items-center justify-center text-xs shrink-0 ${rankColor}`}
                  >
                    {rank}
                  </div>
                  <div className="min-w-0">
                    <div className="font-bold text-sm truncate text-[#161D1D] flex items-center gap-1.5">
                      <span>{user.display_name}</span>
                      {isMe && (
                        <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-full bg-[#00696B] text-white">
                          YOU
                        </span>
                      )}
                    </div>
                    <div className="mt-0.5">
                      <TierBadge tier={user.tier || getTierForPoints(user.total_points)} size="sm" />
                    </div>
                  </div>
                </div>

                <div className="flex flex-col items-end shrink-0 pl-2">
                  <span className="font-extrabold text-sm text-[#00696B]">
                    {user.total_points}
                  </span>
                  <span className="text-[10px] text-[#789092] font-semibold">points</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Verification Rule Note */}
      <div className="p-3.5 rounded-2xl bg-[#E8F8EE] border border-[#22C55E]/30 text-xs text-[#065F46] flex items-start gap-2">
        <ShieldCheck className="w-4 h-4 text-[#22C55E] shrink-0 mt-0.5" />
        <p>
          <span className="font-bold">Trust Rule:</span> Adding points is gated by 3 distinct citizens corroborating a pin. Unverified reports collect 0 points.
        </p>
      </div>
    </div>
  );
}
