import { useState } from 'react';
import { Star } from 'lucide-react';

interface AdoptButtonProps {
  pointType: 'tap' | 'bathroom';
  pointId: string;
  initialAdopted?: boolean;
  onAdopt?: (pointType: 'tap' | 'bathroom', pointId: string) => void;
  className?: string;
}

export function AdoptButton({
  pointType,
  pointId,
  initialAdopted = false,
  onAdopt,
  className = '',
}: AdoptButtonProps) {
  const [isAdopted, setIsAdopted] = useState(initialAdopted);

  const handleToggle = () => {
    const nextState = !isAdopted;
    setIsAdopted(nextState);

    // Call useAppStore().adoptPoint if available
    if (typeof window !== 'undefined') {
      try {
        const storeGetter = (window as any).useAppStore;
        if (storeGetter) {
          const store = typeof storeGetter.getState === 'function' ? storeGetter.getState() : storeGetter();
          if (typeof store?.adoptPoint === 'function') {
            store.adoptPoint(pointType, pointId);
          }
        }
      } catch (err) {
        console.warn('Could not call useAppStore.adoptPoint:', err);
      }
    }

    onAdopt?.(pointType, pointId);
  };

  return (
    <button
      type="button"
      onClick={handleToggle}
      aria-label={isAdopted ? 'Unadopt point' : 'Adopt point as Guardian'}
      className={`min-h-[46px] px-4 rounded-2xl flex items-center justify-center gap-2 font-bold text-xs transition-all active:scale-95 ${
        isAdopted
          ? 'bg-gradient-to-r from-[#FBBF24] to-[#F59E0B] text-[#78350F] shadow-[0_4px_14px_rgba(245,158,11,0.35)] border border-white/60'
          : 'bg-white/20 hover:bg-white/30 text-white border border-white/40 shadow-xs'
      } ${className}`}
    >
      <Star
        className={`w-4 h-4 ${
          isAdopted ? 'fill-[#78350F] text-[#78350F]' : 'text-white'
        }`}
      />
      <span>{isAdopted ? 'Adopted (Guardian)' : 'Adopt Point'}</span>
    </button>
  );
}
