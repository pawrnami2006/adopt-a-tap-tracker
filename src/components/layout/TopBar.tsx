import { Droplets } from 'lucide-react';

interface TopBarProps {
  syncQueueLength?: number;
  onSyncClick?: () => void;
  className?: string;
}

export function TopBar({ syncQueueLength = 0, onSyncClick, className = '' }: TopBarProps) {
  const isSyncing = syncQueueLength > 0;

  return (
    <header className={`w-full px-4 pt-3 flex items-center justify-between pointer-events-none select-none ${className}`}>
      {/* Brand Glass Capsule */}
      <div className="pointer-events-auto flex items-center gap-2.5 px-3.5 py-2 rounded-full bg-white/90 backdrop-blur-xl shadow-[0_8px_24px_rgba(22,125,131,0.18),inset_0_2px_3px_rgba(255,255,255,0.9)] border border-white/80">
        <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-[#00696B] to-[#42C6C9] flex items-center justify-center text-white shadow-sm shrink-0">
          <Droplets className="w-4 h-4 fill-white stroke-none" />
        </div>
        <div className="flex flex-col">
          <div className="flex items-center gap-1.5 leading-none">
            <span className="font-bold text-sm tracking-tight text-[#161D1D]">
              Adopt-a-Tap
            </span>
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-[#42C6C9] animate-pulse" />
          </div>
          <span className="text-[10px] font-medium text-[#789092] mt-0.5">
            Civic Water & Restroom Map
          </span>
        </div>
      </div>

      {/* Sync Status Pill */}
      <button
        type="button"
        onClick={onSyncClick}
        aria-label="Cloud sync status"
        className="pointer-events-auto flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/90 backdrop-blur-xl shadow-[0_8px_20px_rgba(22,125,131,0.16),inset_0_2px_3px_rgba(255,255,255,0.85)] border border-white/80 active:scale-95 transition-transform"
      >
        <span className="relative flex h-2.5 w-2.5">
          <span
            className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
              isSyncing ? 'bg-[#F59E0B]' : 'bg-[#10B981]'
            }`}
          />
          <span
            className={`relative inline-flex rounded-full h-2.5 w-2.5 ${
              isSyncing ? 'bg-[#F59E0B]' : 'bg-[#10B981]'
            }`}
          />
        </span>
        <span
          className={`text-xs font-semibold tracking-tight ${
            isSyncing ? 'text-[#D97706]' : 'text-[#00696E]'
          }`}
        >
          {isSyncing ? `Syncing… ${syncQueueLength} pending` : 'All synced'}
        </span>
      </button>
    </header>
  );
}
