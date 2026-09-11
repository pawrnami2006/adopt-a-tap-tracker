import { MapPin, Trophy, Bookmark, User } from 'lucide-react';

export type NavTabId = 'map' | 'leaderboard' | 'watchlist' | 'profile';

interface BottomNavProps {
  activeTab: NavTabId;
  onTabChange: (tab: NavTabId) => void;
  className?: string;
}

export function BottomNav({ activeTab, onTabChange, className = '' }: BottomNavProps) {
  const tabs: { id: NavTabId; label: string; icon: typeof MapPin }[] = [
    { id: 'map', label: 'Map', icon: MapPin },
    { id: 'leaderboard', label: 'Rank', icon: Trophy },
    { id: 'watchlist', label: 'Watchlist', icon: Bookmark },
    { id: 'profile', label: 'Profile', icon: User },
  ];

  return (
    <div className={`fixed bottom-4 inset-x-0 z-40 px-4 pointer-events-none select-none ${className}`}>
      <nav
        aria-label="Bottom Navigation"
        className="pointer-events-auto max-w-sm mx-auto backdrop-blur-xl bg-white/95 shadow-[0_12px_32px_rgba(24,58,61,0.16)] border border-cyan-100/90 rounded-full py-1.5 px-2 flex items-center justify-around"
      >
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;

          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => onTabChange(tab.id)}
              aria-current={isActive ? 'page' : undefined}
              className={`min-w-[48px] min-h-[44px] transition-all duration-200 flex items-center justify-center gap-1.5 ${
                isActive
                  ? 'bg-gradient-to-r from-[#087E8B]/15 to-[#53EBD2]/30 text-[#087E8B] shadow-sm rounded-full px-4 py-1.5 font-bold text-xs border border-[#087E8B]/20'
                  : 'px-2.5 py-1.5 text-[#789092] hover:text-[#161D1D] flex-col text-[10px] font-medium'
              }`}
            >
              <Icon className={`w-4 h-4 ${isActive ? 'stroke-[2.5]' : 'stroke-2'}`} />
              <span className={isActive ? 'inline' : 'inline mt-0.5'}>{tab.label}</span>
            </button>
          );
        })}
      </nav>
    </div>
  );
}
