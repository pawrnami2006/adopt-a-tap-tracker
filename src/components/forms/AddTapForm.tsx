import { useState, useRef, type ChangeEvent } from 'react';
import { X, Droplets, Camera, MapPin, Sparkles } from 'lucide-react';
import type { TapType } from '../map/types.ts';

export interface AddTapFormData {
  tap_type: TapType;
  description?: string;
  photoFile?: File;
  photoPreview?: string;
  lat: number;
  lng: number;
}

interface AddTapFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: AddTapFormData) => void;
  coords: { lat: number; lng: number };
}

export function AddTapForm({ isOpen, onClose, onSubmit, coords }: AddTapFormProps) {
  const [tapType, setTapType] = useState<TapType>('drinking_fountain');
  const [description, setDescription] = useState('');
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
      tap_type: tapType,
      description: description.trim() || undefined,
      photoFile: photoFile || undefined,
      photoPreview: photoPreview || undefined,
      lat: coords.lat,
      lng: coords.lng,
    });

    setIsSubmitting(false);
    onClose();
  };

  const tapTypes: { id: TapType; label: string; desc: string }[] = [
    {
      id: 'drinking_fountain',
      label: 'Drinking Fountain',
      desc: 'Outdoor bubbler / water dispenser',
    },
    {
      id: 'community_tap',
      label: 'Community Tap',
      desc: 'Municipal tap / public filtered station',
    },
    {
      id: 'restroom_sink',
      label: 'Restroom Sink',
      desc: 'Handwash tap / potable sink',
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className="w-full max-w-lg max-h-[92vh] overflow-y-auto rounded-t-[32px] sm:rounded-3xl bg-white shadow-2xl flex flex-col animate-in slide-in-from-bottom-5 duration-200 border border-white/60"
        style={{
          boxShadow: '0 -10px 40px rgba(0, 105, 107, 0.25)',
        }}
      >
        {/* Header Bar */}
        <div
          className="px-5 pt-5 pb-4 rounded-t-[32px] sm:rounded-t-3xl text-white flex items-center justify-between select-none"
          style={{
            background: 'linear-gradient(135deg, #087E8B 0%, #0B939E 50%, #0E767E 100%)',
          }}
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center text-[#53EBD2] border border-white/30 shadow-inner">
              <Droplets className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-bold text-lg leading-tight tracking-tight">Add Water Tap</h2>
              <p className="text-xs text-[#A5F3FC]">Register a public water source</p>
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
        <form onSubmit={handleSubmit} className="p-5 flex flex-col gap-4.5 text-[#161D1D]">
          {/* Location Geo-pill */}
          <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-[#F3FAF9] border border-cyan-100/80 text-xs text-[#587A7C]">
            <MapPin className="w-4 h-4 text-[#00696B] shrink-0" />
            <span className="font-medium truncate">
              Coordinates: {coords.lat.toFixed(5)}, {coords.lng.toFixed(5)}
            </span>
            <span className="ml-auto text-[10px] font-bold text-[#00696B] uppercase tracking-wider bg-[#00696B]/10 px-2 py-0.5 rounded-full">
              GPS Locked
            </span>
          </div>

          {/* Tap Type Selection */}
          <div className="flex flex-col gap-2">
            <label className="text-xs font-bold uppercase tracking-wider text-[#587A7C]">
              Tap Type <span className="text-[#EF4444]">*</span>
            </label>
            <div className="grid grid-cols-1 gap-2">
              {tapTypes.map((type) => {
                const isSelected = tapType === type.id;
                return (
                  <button
                    key={type.id}
                    type="button"
                    onClick={() => setTapType(type.id)}
                    className={`min-h-[52px] p-3 rounded-2xl flex items-center justify-between text-left transition-all active:scale-[0.99] border ${
                      isSelected
                        ? 'bg-gradient-to-r from-[#087E8B]/10 to-[#53EBD2]/20 border-[#087E8B] shadow-sm'
                        : 'bg-[#F4FBFA] border-transparent hover:border-cyan-200'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-8 h-8 rounded-xl flex items-center justify-center text-xs font-bold ${
                          isSelected ? 'bg-[#00696B] text-white' : 'bg-white text-[#789092] border border-cyan-100'
                        }`}
                      >
                        <Droplets className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="font-bold text-sm text-[#161D1D]">{type.label}</div>
                        <div className="text-[11px] text-[#789092]">{type.desc}</div>
                      </div>
                    </div>
                    <div
                      className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                        isSelected ? 'border-[#00696B] bg-[#00696B]' : 'border-[#6C7A7A]/40'
                      }`}
                    >
                      {isSelected && <div className="w-2 h-2 rounded-full bg-white" />}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Description Input */}
          <div className="flex flex-col gap-1.5">
            <label htmlFor="tap-description" className="text-xs font-bold uppercase tracking-wider text-[#587A7C]">
              Description / Landmark <span className="text-[11px] font-normal text-[#789092]">(Optional)</span>
            </label>
            <input
              id="tap-description"
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g. Near park entrance bench, stainless bubbler"
              maxLength={120}
              className="w-full px-3.5 py-3 rounded-xl bg-[#F4FBFA] border border-cyan-100 text-sm text-[#161D1D] placeholder-[#789092]/60 focus:outline-none focus:ring-2 focus:ring-[#42C6C9] focus:bg-white transition-all"
            />
          </div>

          {/* Photo Capture */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold uppercase tracking-wider text-[#587A7C]">
              Photo Verification <span className="text-[11px] font-normal text-[#789092]">(Optional)</span>
            </label>

            {photoPreview ? (
              <div className="relative w-full h-36 rounded-2xl overflow-hidden border-2 border-[#42C6C9] shadow-sm group">
                <img src={photoPreview} alt="Tap preview" className="w-full h-full object-cover" />
                <button
                  type="button"
                  onClick={handleRemovePhoto}
                  className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-black/80 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
                <div className="absolute bottom-2 left-2 px-2.5 py-1 rounded-full bg-white/90 text-xs font-bold text-[#00696B]">
                  Photo attached
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="w-full h-24 rounded-2xl border-2 border-dashed border-cyan-200 hover:border-[#42C6C9] bg-[#F4FBFA] flex flex-col items-center justify-center gap-1 text-[#00696B] transition-colors active:scale-[0.99]"
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
              <span className="font-bold">+50 community points</span> unlocked once 2 more citizens corroborate this tap.
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
              className="flex-2 min-h-[48px] rounded-xl text-white font-bold text-sm flex items-center justify-center gap-2 shadow-[0_6px_20px_rgba(0,105,107,0.35),inset_0_1px_2px_rgba(255,255,255,0.4)] transition-all active:scale-[0.98]"
              style={{
                background: 'linear-gradient(135deg, #087E8B 0%, #0B939E 100%)',
              }}
            >
              <Droplets className="w-4 h-4" />
              <span>Submit Tap</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
