import { useState } from 'react';
import { TopBar } from '../components/layout/TopBar.tsx';
import { BottomNav, type NavTabId } from '../components/layout/BottomNav.tsx';
import { AdoptedTapsDashboard } from '../components/dashboard/AdoptedTapsDashboard.tsx';

interface WatchlistPageProps {
  onTabChange?: (tab: NavTabId) => void;
  onViewOnMap?: (lat: number, lng: number) => void;
}

export function WatchlistPage({ onTabChange, onViewOnMap }: WatchlistPageProps) {
  const [activeTab, setActiveTab] = useState<NavTabId>('watchlist');

  const handleNav = (tab: NavTabId) => {
    setActiveTab(tab);
    onTabChange?.(tab);
  };

  return (
    <div className="min-h-screen bg-[#F4FBFA] flex flex-col relative select-none">
      {/* Top Bar Header */}
      <TopBar />

      {/* Main Content Area */}
      <main className="flex-1 w-full max-w-lg mx-auto px-4 pt-4 pb-24">
        <AdoptedTapsDashboard onViewOnMap={onViewOnMap} />
      </main>

      {/* Bottom Floating Navigation */}
      <BottomNav activeTab={activeTab} onTabChange={handleNav} />
    </div>
  );
}

export default WatchlistPage;
