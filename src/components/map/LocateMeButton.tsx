import { useState } from 'react';
import { Crosshair, Loader2 } from 'lucide-react';

interface LocateMeButtonProps {
  onLocate: (lat: number, lng: number) => void;
  className?: string;
}

export function LocateMeButton({ onLocate, className = '' }: LocateMeButtonProps) {
  const [isLocating, setIsLocating] = useState(false);

  const handleLocate = () => {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your browser.');
      return;
    }

    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setIsLocating(false);
        onLocate(pos.coords.latitude, pos.coords.longitude);
      },
      (err) => {
        setIsLocating(false);
        console.warn('Geolocation failed or denied, using default center:', err.message);
        alert('Could not access your location. Centering on default city center.');
        onLocate(12.9716, 77.5946); // Default fallback: Bangalore center
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  };

  return (
    <button
      type="button"
      onClick={handleLocate}
      disabled={isLocating}
      aria-label="Locate my position"
      className={`w-12 h-12 rounded-full flex items-center justify-center transition-all duration-200 active:scale-95 bg-white/95 text-[#00696B] shadow-[0_6px_20px_rgba(22,125,131,0.22),inset_0_2px_3px_rgba(255,255,255,0.9)] border border-white/80 hover:bg-[#F3FAF9] ${className}`}
    >
      {isLocating ? (
        <Loader2 className="w-5 h-5 animate-spin text-[#00696B]" />
      ) : (
        <Crosshair className="w-5 h-5 text-[#00696B]" />
      )}
    </button>
  );
}
