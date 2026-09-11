import { useState } from 'react';
import { CheckCircle, AlertTriangle, XCircle, Sparkles } from 'lucide-react';
import type { PointStatus, CleanlinessStatus } from '../map/types.ts';

interface StatusButtonsProps {
  pointType: 'tap' | 'bathroom';
  pointId: string;
  currentStatus: PointStatus;
  currentCleanliness?: CleanlinessStatus;
  hasVotedCurrentCycle?: boolean;
  userCurrentVote?: PointStatus | null;
  onReportStatus?: (status: PointStatus, cleanliness?: CleanlinessStatus) => void;
  className?: string;
}

export function StatusButtons({
  pointType,
  pointId,
  currentStatus,
  currentCleanliness = 'clean',
  hasVotedCurrentCycle = false,
  userCurrentVote = null,
  onReportStatus,
  className = '',
}: StatusButtonsProps) {
  const [selectedCleanliness, setSelectedCleanliness] = useState<CleanlinessStatus>(currentCleanliness);
  const [justVoted, setJustVoted] = useState<PointStatus | null>(null);

  const handleVote = (status: PointStatus) => {
    // Call useAppStore().reportStatus if available on window/global store bridge
    if (typeof window !== 'undefined') {
      try {
        const storeGetter = (window as any).useAppStore;
        if (storeGetter) {
          const store = typeof storeGetter.getState === 'function' ? storeGetter.getState() : storeGetter();
          if (typeof store?.reportStatus === 'function') {
            store.reportStatus(
              pointType,
              pointId,
              status,
              pointType === 'bathroom' ? selectedCleanliness : undefined,
              undefined,
              'status_update'
            );
          }
        }
      } catch (err) {
        console.warn('Could not call useAppStore.reportStatus:', err);
      }
    }

    // Call callback
    onReportStatus?.(status, pointType === 'bathroom' ? selectedCleanliness : undefined);
    setJustVoted(status);
  };

  const isWorkingDisabled = (hasVotedCurrentCycle && userCurrentVote === 'working') || justVoted === 'working';
  const isIssueDisabled = (hasVotedCurrentCycle && userCurrentVote === 'issue') || justVoted === 'issue';
  const isBrokenDisabled = (hasVotedCurrentCycle && userCurrentVote === 'broken') || justVoted === 'broken';

  return (
    <div className={`flex flex-col gap-2.5 text-white ${className}`}>
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold tracking-tight">Report Condition</span>
        {(hasVotedCurrentCycle || justVoted) && (
          <span className="text-[11px] font-medium text-[#FED7AA]">
            Vote logged for this cycle
          </span>
        )}
      </div>

      {/* Primary Status Buttons */}
      <div className="grid grid-cols-3 gap-2">
        {/* Working */}
        <button
          type="button"
          disabled={isWorkingDisabled}
          onClick={() => handleVote('working')}
          className={`min-h-[46px] rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all shadow-sm ${
            isWorkingDisabled
              ? 'opacity-40 cursor-not-allowed bg-white/10 text-white/50 border border-white/20'
              : currentStatus === 'working'
              ? 'bg-gradient-to-r from-[#53EBD2] to-[#41E2BA] text-[#03383a] active:scale-95 shadow-[0_4px_12px_rgba(8,126,139,0.3)]'
              : 'bg-white/15 hover:bg-white/25 text-white border border-white/30 active:scale-95'
          }`}
        >
          <CheckCircle className="w-4 h-4 text-[#10B981]" />
          <span>Working</span>
        </button>

        {/* Issue */}
        <button
          type="button"
          disabled={isIssueDisabled}
          onClick={() => handleVote('issue')}
          className={`min-h-[46px] rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all shadow-sm ${
            isIssueDisabled
              ? 'opacity-40 cursor-not-allowed bg-white/10 text-white/50 border border-white/20'
              : currentStatus === 'issue'
              ? 'bg-gradient-to-r from-[#FBBF24] to-[#F59E0B] text-[#78350F] active:scale-95 shadow-[0_4px_12px_rgba(245,158,11,0.3)]'
              : 'bg-white/15 hover:bg-white/25 text-white border border-white/30 active:scale-95'
          }`}
        >
          <AlertTriangle className="w-4 h-4 text-[#FBBF24]" />
          <span>Issue</span>
        </button>

        {/* Broken */}
        <button
          type="button"
          disabled={isBrokenDisabled}
          onClick={() => handleVote('broken')}
          className={`min-h-[46px] rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all shadow-sm ${
            isBrokenDisabled
              ? 'opacity-40 cursor-not-allowed bg-white/10 text-white/50 border border-white/20'
              : currentStatus === 'broken'
              ? 'bg-gradient-to-r from-[#F87171] to-[#EF4444] text-white active:scale-95 shadow-[0_4px_12px_rgba(239,68,68,0.3)]'
              : 'bg-white/15 hover:bg-white/25 text-white border border-white/30 active:scale-95'
          }`}
        >
          <XCircle className="w-4 h-4 text-[#F87171]" />
          <span>Broken</span>
        </button>
      </div>

      {/* Bathroom Cleanliness Sub-Selector */}
      {pointType === 'bathroom' && (
        <div className="flex flex-col gap-1.5 pt-1.5">
          <div className="flex items-center justify-between text-xs text-[#A5F3FC]">
            <span>Cleanliness Rating:</span>
            <span className="capitalize font-bold text-white flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-[#53EBD2]" />
              {selectedCleanliness}
            </span>
          </div>

          <div className="grid grid-cols-3 gap-2">
            {(['clean', 'average', 'dirty'] as CleanlinessStatus[]).map((level) => {
              const isSelected = selectedCleanliness === level;
              return (
                <button
                  key={level}
                  type="button"
                  onClick={() => setSelectedCleanliness(level)}
                  className={`py-2 rounded-xl text-xs font-semibold capitalize transition-all border ${
                    isSelected
                      ? 'bg-white text-[#00696E] border-white shadow-sm font-bold'
                      : 'bg-white/10 hover:bg-white/20 text-white border-white/20'
                  }`}
                >
                  {level}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
