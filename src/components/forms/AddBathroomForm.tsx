import { useState, useRef, type ChangeEvent } from 'react';
import { X, Bath, Camera, MapPin, Sparkles, Accessibility, Users, Baby, DollarSign, Check } from 'lucide-react';
import type { CleanlinessStatus } from '../map/types.ts';

export interface AddBathroomFormData {
  name?: string;
  is_free: boolean;
  price_note?: string;
  is_accessible: boolean;
  is_unisex: boolean;
  has_baby_change: boolean;
  cleanliness_status: CleanlinessStatus;
  photoFile?: File;
  photoPreview?: string;
  lat: number;
  lng: number;
}

interface AddBathroomFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: AddBathroomFormData) => void;
  coords: { lat: number; lng: number };
}

export function AddBathroomForm({ isOpen, onClose, onSubmit, coords }: AddBathroomFormProps) {
  const [name, setName] = useState('');
  const [isFree, setIsFree] = useState(true);
  const [priceNote, setPriceNote] = useState('');
  const [isAccessible, setIsAccessible] = useState(false);
  const [isUnisex, setIsUnisex] = useState(false);
  const [hasBabyChange, setHasBabyChange] = useState(false);
  const [cleanliness, setCleanliness] = useState<CleanlinessStatus>('clean');

  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handlePhotoChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setPhotoFile(file);
      const reader = new FileReader();
      reader.onload = () => {
        setPhotoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemovePhoto = () => {
    setPhotoFile(null);
    setPhotoPreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    onSubmit({
      name: name.trim() || undefined,
      is_free: isFree,
      price_note: !isFree ? priceNote.trim() || undefined : undefined,
      is_accessible: isAccessible,
      is_unisex: isUnisex,
      has_baby_change: hasBabyChange,
      cleanliness_status: cleanliness,
      photoFile: photoFile || undefined,
      photoPreview: photoPreview || undefined,
      lat: coords.lat,
      lng: coords.lng,
    });

    setIsSubmitting(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className="w-full max-w-lg max-h-[92vh] overflow-y-auto rounded-t-[32px] sm:rounded-3xl bg-white shadow-2xl flex flex-col animate-in slide-in-from-bottom-5 duration-200 border border-white/60"
        style={{
          boxShadow: '0 -10px 40px rgba(0, 105, 110, 0.25)',
        }}
      >
        {/* Header Bar */}
        <div
          className="px-5 pt-5 pb-4 rounded-t-[32px] sm:rounded-t-3xl text-white flex items-center justify-between select-none"
          style={{
            background: 'linear-gradient(135deg, #00696E 0%, #0B939E 50%, #087E8B 100%)',
          }}
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center text-[#53EBD2] border border-white/30 shadow-inner">
              <Bath className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-bold text-lg leading-tight tracking-tight">Add Public Restroom</h2>
              <p className="text-xs text-[#A5F3FC]">Map a clean civic sanitation facility</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/15 hover:bg-white/25 flex items-center justify-center text-white transition-colors"
            aria-label="Close form"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Content */}
        <form onSubmit={handleSubmit} className="p-5 flex flex-col gap-4 text-[#161D1D]">
          {/* Location Geo-pill */}
          <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-[#F3FAF9] border border-cyan-100/80 text-xs text-[#587A7C]">
            <MapPin className="w-4 h-4 text-[#00696E] shrink-0" />
            <span className="font-medium truncate">
              Coordinates: {coords.lat.toFixed(5)}, {coords.lng.toFixed(5)}
            </span>
            <span className="ml-auto text-[10px] font-bold text-[#00696E] uppercase tracking-wider bg-[#00696E]/10 px-2 py-0.5 rounded-full">
              GPS Locked
            </span>
          </div>

          {/* Restroom Name / Facility */}
          <div className="flex flex-col gap-1.5">
            <label htmlFor="bathroom-name" className="text-xs font-bold uppercase tracking-wider text-[#587A7C]">
              Restroom Name / Venue <span className="text-[11px] font-normal text-[#789092]">(Optional)</span>
            </label>
            <input
              id="bathroom-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Central Station Public Restroom"
              maxLength={80}
              className="w-full px-3.5 py-3 rounded-xl bg-[#F4FBFA] border border-cyan-100 text-sm text-[#161D1D] placeholder-[#789092]/60 focus:outline-none focus:ring-2 focus:ring-[#42C6C9] focus:bg-white transition-all"
            />
          </div>

          {/* Pricing Toggle (Free vs Paid) */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold uppercase tracking-wider text-[#587A7C]">
              Access Pricing
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setIsFree(true)}
                className={`min-h-[46px] rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-all active:scale-[0.98] border ${
                  isFree
                    ? 'bg-gradient-to-r from-[#00696E] to-[#0B939E] text-white shadow-sm border-transparent'
                    : 'bg-[#F4FBFA] text-[#587A7C] border-cyan-100'
                }`}
              >
                <Check className={`w-4 h-4 ${isFree ? 'opacity-100' : 'opacity-0'}`} />
                Free Access
              </button>
              <button
                type="button"
                onClick={() => setIsFree(false)}
                className={`min-h-[46px] rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-all active:scale-[0.98] border ${
                  !isFree
                    ? 'bg-gradient-to-r from-[#00696E] to-[#0B939E] text-white shadow-sm border-transparent'
                    : 'bg-[#F4FBFA] text-[#587A7C] border-cyan-100'
                }`}
              >
                <DollarSign className="w-4 h-4" />
                Paid Entry
              </button>
            </div>

            {/* Optional Price Note when Paid */}
            {!isFree && (
              <div className="mt-1 animate-in fade-in duration-150">
                <input
                  type="text"
                  value={priceNote}
                  onChange={(e) => setPriceNote(e.target.value)}
                  placeholder="Price note (e.g. ₹5 or Customers Only)"
                  maxLength={30}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#F4FBFA] border border-cyan-100 text-xs text-[#161D1D] placeholder-[#789092]/60 focus:outline-none focus:ring-2 focus:ring-[#42C6C9] focus:bg-white"
                />
              </div>
            )}
          </div>

          {/* Feature Chips (Multi-Select) */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold uppercase tracking-wider text-[#587A7C]">
              Accessibility & Features
            </label>
            <div className="flex flex-wrap gap-2">
              {/* Accessible */}
              <button
                type="button"
                onClick={() => setIsAccessible((prev) => !prev)}
                className={`min-h-[44px] px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 border transition-all active:scale-95 ${
                  isAccessible
                    ? 'bg-[#00696E] text-white border-[#00696E] shadow-sm'
                    : 'bg-[#F4FBFA] text-[#587A7C] border-cyan-100'
                }`}
              >
                <Accessibility className="w-4 h-4" />
                <span>Wheelchair Accessible</span>
              </button>

              {/* Unisex */}
              <button
                type="button"
                onClick={() => setIsUnisex((prev) => !prev)}
                className={`min-h-[44px] px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 border transition-all active:scale-95 ${
                  isUnisex
                    ? 'bg-[#00696E] text-white border-[#00696E] shadow-sm'
                    : 'bg-[#F4FBFA] text-[#587A7C] border-cyan-100'
                }`}
              >
                <Users className="w-4 h-4" />
                <span>Unisex / All-Gender</span>
              </button>

              {/* Baby Change */}
              <button
                type="button"
                onClick={() => setHasBabyChange((prev) => !prev)}
                className={`min-h-[44px] px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 border transition-all active:scale-95 ${
                  hasBabyChange
                    ? 'bg-[#00696E] text-white border-[#00696E] shadow-sm'
                    : 'bg-[#F4FBFA] text-[#587A7C] border-cyan-100'
                }`}
              >
                <Baby className="w-4 h-4" />
                <span>Baby Changing Station</span>
              </button>
            </div>
          </div>

          {/* Cleanliness Status Selector */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold uppercase tracking-wider text-[#587A7C]">
              Initial Cleanliness
            </label>
            <div className="grid grid-cols-3 gap-2">
              {(['clean', 'average', 'dirty'] as CleanlinessStatus[]).map((level) => {
                const isSelected = cleanliness === level;
                let colorClass = 'text-[#10B981]';
                let activeBg = 'bg-[#10B981] text-white';
                if (level === 'average') {
                  colorClass = 'text-[#F59E0B]';
                  activeBg = 'bg-[#F59E0B] text-white';
                } else if (level === 'dirty') {
                  colorClass = 'text-[#EF4444]';
                  activeBg = 'bg-[#EF4444] text-white';
                }

                return (
                  <button
                    key={level}
                    type="button"
                    onClick={() => setCleanliness(level)}
                    className={`min-h-[46px] rounded-xl font-bold text-xs capitalize transition-all active:scale-95 border ${
                      isSelected
                        ? `${activeBg} shadow-sm border-transparent`
                        : `bg-[#F4FBFA] ${colorClass} border-cyan-100`
                    }`}
                  >
                    {level}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Photo Capture */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold uppercase tracking-wider text-[#587A7C]">
              Photo Verification <span className="text-[11px] font-normal text-[#789092]">(Optional)</span>
            </label>

            {photoPreview ? (
              <div className="relative w-full h-36 rounded-2xl overflow-hidden border-2 border-[#42C6C9] shadow-sm group">
                <img src={photoPreview} alt="Bathroom preview" className="w-full h-full object-cover" />
                <button
                  type="button"
                  onClick={handleRemovePhoto}
                  className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-black/80 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
                <div className="absolute bottom-2 left-2 px-2.5 py-1 rounded-full bg-white/90 text-xs font-bold text-[#00696E]">
                  Photo attached
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="w-full h-24 rounded-2xl border-2 border-dashed border-cyan-200 hover:border-[#42C6C9] bg-[#F4FBFA] flex flex-col items-center justify-center gap-1 text-[#00696E] transition-colors active:scale-[0.99]"
              >
                <div className="w-9 h-9 rounded-full bg-[#42C6C9]/15 flex items-center justify-center">
                  <Camera className="w-5 h-5" />
                </div>
                <span className="text-xs font-semibold">Take photo or upload image</span>
              </button>
            )}

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handlePhotoChange}
              className="hidden"
            />
          </div>

          {/* Notice Banner */}
          <div className="p-3 rounded-2xl bg-[#E8F8EE] border border-[#22C55E]/30 flex items-start gap-2.5 text-xs text-[#065F46]">
            <Sparkles className="w-4 h-4 text-[#22C55E] shrink-0 mt-0.5" />
            <div>
              <span className="font-bold">+50 community points</span> unlocked once 2 more citizens corroborate this restroom.
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2.5 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 min-h-[48px] rounded-xl font-bold text-sm text-[#587A7C] hover:bg-[#F4FBFA] transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-2 min-h-[48px] rounded-xl text-white font-bold text-sm flex items-center justify-center gap-2 shadow-[0_6px_20px_rgba(0,105,110,0.35),inset_0_1px_2px_rgba(255,255,255,0.4)] transition-all active:scale-[0.98]"
              style={{
                background: 'linear-gradient(135deg, #00696E 0%, #0B939E 100%)',
              }}
            >
              <Bath className="w-4 h-4" />
              <span>Submit Restroom</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
