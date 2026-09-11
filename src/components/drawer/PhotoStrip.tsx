import { useRef, type ChangeEvent } from 'react';
import { Camera, Image as ImageIcon } from 'lucide-react';

interface PhotoStripProps {
  photos: string[];
  onAddPhoto?: (file: File, previewUrl: string) => void;
  className?: string;
}

export function PhotoStrip({ photos, onAddPhoto, className = '' }: PhotoStripProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && onAddPhoto) {
      const reader = new FileReader();
      reader.onload = () => {
        onAddPhoto(file, reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className={`flex flex-col gap-2 text-white ${className}`}>
      <div className="flex items-center justify-between text-xs">
        <span className="font-semibold text-white">Community Photos</span>
        <span className="text-[#A5F3FC] text-[11px] font-medium">
          {photos.length} photo{photos.length === 1 ? '' : 's'}
        </span>
      </div>

      <div className="flex items-center gap-2.5 overflow-x-auto pb-1 select-none no-scrollbar">
        {/* Add Photo Trigger */}
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          aria-label="Upload photo"
          className="w-20 h-16 rounded-xl flex flex-col items-center justify-center gap-1 shrink-0 bg-white/10 hover:bg-white/20 border-2 border-dashed border-white/40 text-white transition-all active:scale-95"
        >
          <Camera className="w-5 h-5 text-[#53EBD2]" />
          <span className="text-[10px] font-bold">Add Photo</span>
        </button>

        {/* Existing Thumbnails */}
        {photos.map((url, idx) => (
          <div
            key={`${url}-${idx}`}
            className="relative w-20 h-16 rounded-xl overflow-hidden shrink-0 border-2 border-white/70 shadow-sm"
          >
            <img
              src={url}
              alt={`Point photo ${idx + 1}`}
              className="w-full h-full object-cover"
              onError={(e) => {
                // Fallback placeholder on broken image URL
                (e.target as HTMLElement).style.display = 'none';
              }}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent pointer-events-none" />
          </div>
        ))}

        {/* Empty placeholder banner if zero photos */}
        {photos.length === 0 && (
          <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/10 border border-white/15 text-xs text-[#C8F5F0] italic">
            <ImageIcon className="w-4 h-4 text-[#53EBD2] shrink-0" />
            <span>No community photos yet</span>
          </div>
        )}

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={handleFileChange}
          className="hidden"
        />
      </div>
    </div>
  );
}
