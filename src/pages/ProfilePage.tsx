import { useState } from 'react';
import { User, Edit3, Shield, CloudCheck, RefreshCw, CheckCircle2, Trash2 } from 'lucide-react';
import { TopBar } from '../components/layout/TopBar.tsx';
import { BottomNav, type NavTabId } from '../components/layout/BottomNav.tsx';
import { TierBadge, getTierForPoints, type GuardianTier } from '../components/leaderboard/TierBadge.tsx';

interface ProfilePageProps {
  onTabChange?: (tab: NavTabId) => void;
}

export function ProfilePage({ onTabChange }: ProfilePageProps) {
  const [activeTab, setActiveTab] = useState<NavTabId>('profile');

  // Read store if available
  let storeProfile: any = null;
  let storeQueueLength = 0;

  if (typeof window !== 'undefined') {
    try {
      const storeGetter = (window as any).useAppStore;
      if (storeGetter) {
        const store = typeof storeGetter.getState === 'function' ? storeGetter.getState() : storeGetter();
        if (store?.profile) storeProfile = store.profile;
        if (typeof store?.syncQueueLength === 'number') storeQueueLength = store.syncQueueLength;
      }
    } catch {
      // ignore
    }
  }

  const [displayName, setDisplayName] = useState<string>(() => {
    if (storeProfile?.display_name) return storeProfile.display_name;
    if (typeof localStorage !== 'undefined') {
      const saved = localStorage.getItem('adoptatap_display_name');
      if (saved) return saved;
    }
    return 'Anonymous Guardian #7492';
  });

  const [isEditingName, setIsEditingName] = useState(false);
  const [nameInput, setNameInput] = useState(displayName);

  const points = storeProfile?.total_points ?? 248;
  const tier: GuardianTier = storeProfile?.tier ?? getTierForPoints(points);

  const handleSaveName = () => {
    const trimmed = nameInput.trim();
    if (trimmed) {
      setDisplayName(trimmed);
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem('adoptatap_display_name', trimmed);
      }
    }
    setIsEditingName(false);
  };

  const handleClearCache = () => {
    if (confirm('Clear local app cache and reset anonymous device alias?')) {
      if (typeof localStorage !== 'undefined') {
        localStorage.removeItem('adoptatap_display_name');
      }
      setDisplayName('Anonymous Guardian #1001');
      alert('Local cache reset.');
    }
  };

  const handleNav = (tab: NavTabId) => {
    setActiveTab(tab);
    onTabChange?.(tab);
  };

  return (
    <div className="min-h-screen bg-[#F4FBFA] flex flex-col relative select-none">
      {/* Top Bar Header */}
      <TopBar syncQueueLength={storeQueueLength} />

      {/* Main Profile Container */}
      <main className="flex-1 w-full max-w-lg mx-auto px-4 pt-4 pb-24 flex flex-col gap-4 text-[#161D1D]">
        {/* Profile Identity Card */}
        <div
          className="w-full rounded-2xl p-5 text-white flex flex-col items-center text-center gap-3 shadow-lg border border-white/30 relative overflow-hidden"
          style={{
            background: 'linear-gradient(145deg, #087E8B 0%, #0B939E 50%, #0E767E 100%)',
            boxShadow: '0 12px 30px rgba(8, 126, 139, 0.35)',
          }}
        >
          {/* Avatar Icon */}
          <div className="relative">
            <div className="w-18 h-18 rounded-full bg-[#B5FEFF] flex items-center justify-center text-[#00696B] shadow-md border-2 border-white">
              <User className="w-9 h-9 text-[#00696B]" />
            </div>
            <button
              type="button"
              onClick={() => {
                setNameInput(displayName);
                setIsEditingName(true);
              }}
              aria-label="Edit display name"
              className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-white text-[#00696B] flex items-center justify-center shadow-md hover:scale-105 active:scale-95 transition-all"
            >
              <Edit3 className="w-3.5 h-3.5 text-[#00696B]" />
            </button>
          </div>

          {/* User Name & Anonymous Device Tag */}
          <div>
            <h2 className="text-xl font-bold text-white flex items-center justify-center gap-2">
              <span>{displayName}</span>
              <button
                type="button"
                onClick={() => {
                  setNameInput(displayName);
                  setIsEditingName(true);
                }}
                className="text-[#53EBD2] hover:text-white"
              >
                <Edit3 className="w-4 h-4" />
              </button>
            </h2>
            <div className="mt-1 inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-white/15 text-xs text-[#C8F5F0] border border-white/20">
              <span className="w-1.5 h-1.5 rounded-full bg-[#53EBD2]" />
              <span>Guest Identity • Device Storage</span>
            </div>
          </div>

          {/* Tier & Score Row */}
          <div className="w-full pt-2 flex items-center justify-around border-t border-white/20 text-center">
            <div>
              <div className="text-2xl font-extrabold text-[#53EBD2]">{points}</div>
              <div className="text-[11px] text-[#C8F5F0] font-semibold">Total Points</div>
            </div>
            <div className="w-px h-8 bg-white/20" />
            <div className="flex flex-col items-center">
              <TierBadge tier={tier} size="sm" />
              <div className="text-[11px] text-[#C8F5F0] font-semibold mt-1">Civic Rank</div>
            </div>
          </div>
        </div>

        {/* Sync & Offline Engine Status Card */}
        <div className="p-4 rounded-2xl bg-white border border-cyan-100 shadow-xs flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-sm text-[#00696B] flex items-center gap-2">
              <CloudCheck className="w-4 h-4 text-[#00696B]" />
              Offline Sync Engine
            </h3>
            <span
              className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                storeQueueLength === 0
                  ? 'bg-[#E8F8EE] text-[#10B981]'
                  : 'bg-[#FEF3C7] text-[#D97706]'
              }`}
            >
              {storeQueueLength === 0 ? 'All synced' : `${storeQueueLength} pending`}
            </span>
          </div>

          <div className="flex flex-col gap-2 text-xs text-[#587A7C]">
            <div className="flex items-center justify-between p-2 rounded-xl bg-[#F4FBFA] border border-cyan-100/60">
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-[#10B981]" />
                Connectivity
              </span>
              <span className="font-bold text-[#10B981]">Online</span>
            </div>

            <div className="flex items-center justify-between p-2 rounded-xl bg-[#F4FBFA] border border-cyan-100/60">
              <span className="flex items-center gap-1.5">
                <RefreshCw className="w-3.5 h-3.5 text-[#00696B]" />
                Write Queue
              </span>
              <span className="font-medium">{storeQueueLength} local actions</span>
            </div>
          </div>
        </div>

        {/* Reputation Rules Card */}
        <div className="p-4 rounded-2xl bg-white border border-cyan-100 shadow-xs flex flex-col gap-2 text-xs text-[#587A7C]">
          <h3 className="font-bold text-sm text-[#161D1D] flex items-center gap-2">
            <Shield className="w-4 h-4 text-[#00696B]" />
            Reputation & Points Breakdown
          </h3>
          <ul className="list-disc list-inside space-y-1 text-[#587A7C] pt-1">
            <li><span className="font-bold text-[#161D1D]">+50 points:</span> Add new tap or bathroom (paid on 3 consensus verifications)</li>
            <li><span className="font-bold text-[#161D1D]">+10 points:</span> Confirm condition report (paid when cycle flips)</li>
            <li><span className="font-bold text-[#161D1D]">+15 points:</span> Weekly check-in on an adopted point</li>
          </ul>
        </div>

        {/* Clear Local Cache / Debug */}
        <button
          type="button"
          onClick={handleClearCache}
          className="w-full py-3 rounded-xl bg-white hover:bg-red-50 text-[#EF4444] border border-red-200 text-xs font-bold flex items-center justify-center gap-2 active:scale-[0.99] transition-all"
        >
          <Trash2 className="w-4 h-4" />
          <span>Reset Device Alias & Local Cache</span>
        </button>
      </main>

      {/* Edit Alias Modal */}
      {isEditingName && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-2xl flex flex-col gap-3">
            <h3 className="font-bold text-base text-[#161D1D]">Set Public Alias</h3>
            <p className="text-xs text-[#789092]">
              Choose a friendly name shown on the community leaderboard.
            </p>
            <input
              type="text"
              value={nameInput}
              onChange={(e) => setNameInput(e.target.value)}
              maxLength={40}
              placeholder="e.g. Marina Guardian"
              className="w-full px-3.5 py-2.5 rounded-xl bg-[#F4FBFA] border border-cyan-100 text-sm text-[#161D1D] focus:outline-none focus:ring-2 focus:ring-[#42C6C9]"
            />
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsEditingName(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-[#789092] hover:bg-[#F4FBFA]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveName}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-[#00696B] text-white shadow-sm active:scale-95"
              >
                Save Alias
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bottom Floating Navigation */}
      <BottomNav activeTab={activeTab} onTabChange={handleNav} />
    </div>
  );
}

export default ProfilePage;
