import { useState } from 'react';
import { Plus, Droplets, Bath } from 'lucide-react';

interface AddPointFABProps {
  onAddTap: () => void;
  onAddBathroom: () => void;
  className?: string;
}

export function AddPointFAB({ onAddTap, onAddBathroom, className = '' }: AddPointFABProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className={`flex flex-col items-end gap-2.5 select-none ${className}`}>
      {/* Speed Dial Actions */}
      {isOpen && (
        <div className="flex flex-col items-end gap-2 animate-in fade-in slide-in-from-bottom-3 duration-200">
          {/* Sub-Action: Add Bathroom */}
          <button
            type="button"
            onClick={() => {
              setIsOpen(false);
              onAddBathroom();
            }}
            className="flex items-center gap-2 px-3.5 py-2 rounded-full bg-white/95 backdrop-blur-xl shadow-[0_8px_20px_rgba(0,105,110,0.22),inset_0_2px_3px_rgba(255,255,255,0.9)] border border-white/80 text-[#161D1D] hover:bg-[#F3FAF9] transition-all active:scale-95 group"
          >
            <span className="font-semibold text-xs tracking-tight text-[#00696E]">
              Add Bathroom
            </span>
            <div className="w-7 h-7 rounded-full bg-[#00696E]/15 flex items-center justify-center text-[#00696E]">
              <Bath className="w-4 h-4" />
            </div>
          </button>

          {/* Sub-Action: Add Tap */}
          <button
            type="button"
            onClick={() => {
              setIsOpen(false);
              onAddTap();
            }}
            className="flex items-center gap-2 px-3.5 py-2 rounded-full bg-white/95 backdrop-blur-xl shadow-[0_8px_20px_rgba(0,105,107,0.22),inset_0_2px_3px_rgba(255,255,255,0.9)] border border-white/80 text-[#161D1D] hover:bg-[#F3FAF9] transition-all active:scale-95 group"
          >
            <span className="font-semibold text-xs tracking-tight text-[#00696B]">
              Add Tap
            </span>
            <div className="w-7 h-7 rounded-full bg-[#00696B]/15 flex items-center justify-center text-[#00696B]">
              <Droplets className="w-4 h-4" />
            </div>
          </button>
        </div>
      )}

      {/* Main Tactile Clay FAB */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-label={isOpen ? 'Close add picker' : 'Add water point or bathroom'}
        className={`w-14 h-14 rounded-full flex items-center justify-center text-white transition-transform duration-200 active:scale-95 shadow-[0_10px_24px_rgba(8,126,139,0.45),inset_0_2px_3px_rgba(255,255,255,0.5)] border border-white/40 ${
          isOpen ? 'rotate-45' : 'rotate-0'
        }`}
        style={{
          background: 'linear-gradient(135deg, #087E8B 0%, #0B939E 100%)',
        }}
      >
        <Plus className="w-7 h-7 stroke-[2.5]" />
      </button>
    </div>
  );
}
