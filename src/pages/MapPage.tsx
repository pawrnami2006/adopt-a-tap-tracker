import { useState, useEffect } from 'react';
import { Droplets, Bath, Sparkles, X, CheckCircle, AlertTriangle, XCircle, ShieldCheck } from 'lucide-react';
import { MapView } from '../components/map/MapView.tsx';
import { LocateMeButton } from '../components/map/LocateMeButton.tsx';
import { AddPointFAB } from '../components/map/AddPointFAB.tsx';
import { TopBar } from '../components/layout/TopBar.tsx';
import { BottomNav, type NavTabId } from '../components/layout/BottomNav.tsx';
import { AddTapForm, type AddTapFormData } from '../components/forms/AddTapForm.tsx';
import { AddBathroomForm, type AddBathroomFormData } from '../components/forms/AddBathroomForm.tsx';
import {
  INITIAL_MOCK_TAPS,
  INITIAL_MOCK_BATHROOMS,
  type TapItem,
  type BathroomItem,
  type MapFilterType,
} from '../components/map/types.ts';

export function MapPage() {
  const [activeTab, setActiveTab] = useState<NavTabId>('map');
  const [filter, setFilter] = useState<MapFilterType>('both');
  const [center, setCenter] = useState<[number, number]>([12.9716, 77.5946]); // Default fallback: MG Road / Bangalore
  const [zoom, setZoom] = useState<number>(15);

  const [taps, setTaps] = useState<TapItem[]>(INITIAL_MOCK_TAPS);
  const [bathrooms, setBathrooms] = useState<BathroomItem[]>(INITIAL_MOCK_BATHROOMS);

  const [selectedPoint, setSelectedPoint] = useState<
    { type: 'tap'; data: TapItem } | { type: 'bathroom'; data: BathroomItem } | null
  >(null);

  const [isAddTapOpen, setIsAddTapOpen] = useState(false);
  const [isAddBathroomOpen, setIsAddBathroomOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Initialize geolocation on mount
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const userLat = pos.coords.latitude;
          const userLng = pos.coords.longitude;
          setCenter([userLat, userLng]);
          setZoom(16);
        },
        (err) => {
          console.warn('Geolocation denied or timed out, keeping default center:', err.message);
        },
        { enableHighAccuracy: true, timeout: 6000 }
      );
    }
  }, []);

  const handleLocate = (lat: number, lng: number) => {
    setCenter([lat, lng]);
    setZoom(16);
  };

  const handleCreateTap = (data: AddTapFormData) => {
    const newTap: TapItem = {
      id: `tap-${Date.now()}`,
      lat: data.lat,
      lng: data.lng,
      tap_type: data.tap_type,
      description: data.description || 'Public Water Tap',
      status: 'working',
      last_verified: new Date().toISOString(),
      is_verified: false,
      pending_status: 'working',
      pending_confirmations: 1,
      photo_urls: data.photoPreview ? [data.photoPreview] : [],
      created_at: new Date().toISOString(),
      synced: true,
    };

    setTaps((prev) => [newTap, ...prev]);
    setSelectedPoint({ type: 'tap', data: newTap });
    setToastMessage('New water tap added! 1 of 3 confirmations collected. +50 points held pending verification.');
  };

  const handleCreateBathroom = (data: AddBathroomFormData) => {
    const newBathroom: BathroomItem = {
      id: `bath-${Date.now()}`,
      lat: data.lat,
      lng: data.lng,
      name: data.name || 'Public Restroom',
      is_free: data.is_free,
      price_note: data.price_note,
      is_accessible: data.is_accessible,
      is_unisex: data.is_unisex,
      has_baby_change: data.has_baby_change,
      status: 'working',
      cleanliness_status: data.cleanliness_status,
      last_verified: new Date().toISOString(),
      is_verified: false,
      pending_status: 'working',
      pending_cleanliness: data.cleanliness_status,
      pending_confirmations: 1,
      photo_urls: data.photoPreview ? [data.photoPreview] : [],
      created_at: new Date().toISOString(),
      synced: true,
    };

    setBathrooms((prev) => [newBathroom, ...prev]);
    setSelectedPoint({ type: 'bathroom', data: newBathroom });
    setToastMessage('New public restroom mapped! 1 of 3 confirmations collected. +50 points held pending verification.');
  };

  const handleReportStatus = (status: 'working' | 'issue' | 'broken') => {
    if (!selectedPoint) return;

    if (selectedPoint.type === 'tap') {
      setTaps((prev) =>
        prev.map((t) =>
          t.id === selectedPoint.data.id
            ? {
                ...t,
                status,
                is_verified: false,
                pending_status: status,
                pending_confirmations: Math.min(3, t.pending_confirmations + 1),
                last_verified: new Date().toISOString(),
              }
            : t
        )
      );
      setSelectedPoint((prev) =>
        prev && prev.type === 'tap'
          ? {
              ...prev,
              data: {
                ...prev.data,
                status,
                is_verified: false,
                pending_status: status,
                pending_confirmations: Math.min(3, prev.data.pending_confirmations + 1),
                last_verified: new Date().toISOString(),
              },
            }
          : prev
      );
    } else {
      setBathrooms((prev) =>
        prev.map((b) =>
          b.id === selectedPoint.data.id
            ? {
                ...b,
                status,
                is_verified: false,
                pending_status: status,
                pending_confirmations: Math.min(3, b.pending_confirmations + 1),
                last_verified: new Date().toISOString(),
              }
            : b
        )
      );
      setSelectedPoint((prev) =>
        prev && prev.type === 'bathroom'
          ? {
              ...prev,
              data: {
                ...prev.data,
                status,
                is_verified: false,
                pending_status: status,
                pending_confirmations: Math.min(3, prev.data.pending_confirmations + 1),
                last_verified: new Date().toISOString(),
              },
            }
          : prev
      );
    }
  };

  return (
    <div className="relative w-screen h-screen overflow-hidden flex flex-col bg-[#F4FBFA] select-none">
      {/* Top Bar Floating Header */}
      <div className="absolute top-0 inset-x-0 z-30 pointer-events-none">
        <TopBar syncQueueLength={0} />

        {/* Floating Filter Capsule Bar */}
        <div className="flex items-center justify-center mt-2.5 px-4 pointer-events-none">
          <div
            role="tablist"
            aria-label="Filter points by type"
            className="pointer-events-auto p-1 rounded-full bg-white/95 backdrop-blur-xl shadow-[0_10px_28px_rgba(24,58,61,0.14)] border border-white/90 flex items-center gap-1"
          >
            {/* Taps Filter Button */}
            <button
              type="button"
              role="tab"
              aria-selected={filter === 'taps'}
              onClick={() => setFilter('taps')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all ${
                filter === 'taps'
                  ? 'bg-gradient-to-r from-[#42C6C9] to-[#00696B] text-white shadow-[0_3px_8px_rgba(0,105,107,0.3),inset_0_1px_2px_rgba(255,255,255,0.4)]'
                  : 'text-[#3C4949] hover:text-[#161D1D] hover:bg-black/5'
              }`}
            >
              <Droplets className="w-3.5 h-3.5" />
              <span>Taps ({taps.length})</span>
            </button>

            {/* Bathrooms Filter Button */}
            <button
              type="button"
              role="tab"
              aria-selected={filter === 'bathrooms'}
              onClick={() => setFilter('bathrooms')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all ${
                filter === 'bathrooms'
                  ? 'bg-gradient-to-r from-[#42C6C9] to-[#00696B] text-white shadow-[0_3px_8px_rgba(0,105,107,0.3),inset_0_1px_2px_rgba(255,255,255,0.4)]'
                  : 'text-[#3C4949] hover:text-[#161D1D] hover:bg-black/5'
              }`}
            >
              <Bath className="w-3.5 h-3.5" />
              <span>Bathrooms ({bathrooms.length})</span>
            </button>

            {/* Both Filter Button */}
            <button
              type="button"
              role="tab"
              aria-selected={filter === 'both'}
              onClick={() => setFilter('both')}
              className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
                filter === 'both'
                  ? 'bg-gradient-to-r from-[#42C6C9] to-[#00696B] text-white shadow-[0_3px_8px_rgba(0,105,107,0.3),inset_0_1px_2px_rgba(255,255,255,0.4)]'
                  : 'text-[#3C4949] hover:text-[#161D1D] hover:bg-black/5'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Both</span>
            </button>
          </div>
        </div>
      </div>

      {/* Full-Screen Interactive Leaflet Map */}
      <main className="flex-1 w-full h-full relative z-0">
        <MapView
          taps={taps}
          bathrooms={bathrooms}
          filter={filter}
          center={center}
          zoom={zoom}
          selectedPointId={selectedPoint?.data.id}
          onSelectTap={(tap) => setSelectedPoint({ type: 'tap', data: tap })}
          onSelectBathroom={(bath) => setSelectedPoint({ type: 'bathroom', data: bath })}
        />
      </main>

      {/* Floating Action Controls on Right */}
      <div className="absolute right-4 bottom-24 z-30 flex flex-col items-end gap-3 pointer-events-none">
        <LocateMeButton onLocate={handleLocate} className="pointer-events-auto" />
        <AddPointFAB
          onAddTap={() => setIsAddTapOpen(true)}
          onAddBathroom={() => setIsAddBathroomOpen(true)}
          className="pointer-events-auto"
        />
      </div>

      {/* Selected Point Bottom Sheet / Drawer */}
      {selectedPoint && (
        <div className="absolute bottom-20 inset-x-3 z-40 max-w-md mx-auto pointer-events-auto animate-in slide-in-from-bottom-5 duration-200">
          <div
            className="rounded-[28px] p-5 shadow-[0_-10px_36px_rgba(8,126,139,0.35)] text-white flex flex-col gap-3.5 border border-white/40"
            style={{
              background: 'linear-gradient(145deg, #087E8B 0%, #0B939E 50%, #0E767E 100%)',
            }}
          >
            {/* Drag Handle & Close */}
            <div className="flex items-center justify-between">
              <div className="w-10 h-1 rounded-full bg-white/40 mx-auto" />
              <button
                type="button"
                onClick={() => setSelectedPoint(null)}
                className="w-7 h-7 rounded-full bg-white/15 hover:bg-white/25 flex items-center justify-center text-white transition-colors"
                aria-label="Close details"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Header: Title, Category & Status */}
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center text-[#53EBD2] border border-white/30 shrink-0">
                  {selectedPoint.type === 'tap' ? (
                    <Droplets className="w-6 h-6" />
                  ) : (
                    <Bath className="w-6 h-6" />
                  )}
                </div>
                <div>
                  <div className="flex items-center gap-1.5 text-xs text-[#A5F3FC] font-semibold uppercase tracking-wider">
                    <span>
                      {selectedPoint.type === 'tap'
                        ? selectedPoint.data.tap_type.replace('_', ' ')
                        : selectedPoint.data.is_free
                        ? 'Free Restroom'
                        : `Paid (${selectedPoint.data.price_note || 'Fee'})`}
                    </span>
                  </div>
                  <h2 className="font-bold text-base leading-snug">
                    {selectedPoint.type === 'tap'
                      ? selectedPoint.data.description || 'Public Water Tap'
                      : selectedPoint.data.name || 'Public Restroom'}
                  </h2>
                </div>
              </div>

              {/* Status Badge */}
              <span
                className={`px-2.5 py-1 rounded-full text-[11px] font-bold tracking-wide flex items-center gap-1 shadow-sm ${
                  selectedPoint.data.status === 'working'
                    ? 'bg-[#10B981] text-white'
                    : selectedPoint.data.status === 'issue'
                    ? 'bg-[#F59E0B] text-white'
                    : 'bg-[#EF4444] text-white'
                }`}
              >
                {selectedPoint.data.status.toUpperCase()}
              </span>
            </div>

            {/* Verification Trust Badge */}
            <div className="p-3 rounded-2xl bg-white/15 backdrop-blur-md border border-white/25 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-[#53EBD2]" />
                <span className="font-semibold">
                  {selectedPoint.data.is_verified
                    ? 'Community Verified (3/3 consensus)'
                    : `Pending Verification (${selectedPoint.data.pending_confirmations}/3)`}
                </span>
              </div>
              <span className="text-[#A5F3FC] text-[11px]">
                {selectedPoint.data.is_verified ? 'Verified' : 'Votes in progress'}
              </span>
            </div>

            {/* Condition Reporting Buttons */}
            <div className="flex flex-col gap-1.5">
              <span className="text-xs text-white/90 font-medium">Quick Condition Update:</span>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => handleReportStatus('working')}
                  className="py-2.5 rounded-xl bg-gradient-to-r from-[#53EBD2] to-[#41E2BA] text-[#03383a] text-xs font-bold flex items-center justify-center gap-1 shadow-sm active:scale-95 transition-all"
                >
                  <CheckCircle className="w-3.5 h-3.5" />
                  Working
                </button>
                <button
                  type="button"
                  onClick={() => handleReportStatus('issue')}
                  className="py-2.5 rounded-xl bg-white/20 hover:bg-white/30 text-white text-xs font-bold flex items-center justify-center gap-1 border border-white/30 active:scale-95 transition-all"
                >
                  <AlertTriangle className="w-3.5 h-3.5 text-[#FBBF24]" />
                  Issue
                </button>
                <button
                  type="button"
                  onClick={() => handleReportStatus('broken')}
                  className="py-2.5 rounded-xl bg-white/20 hover:bg-white/30 text-white text-xs font-bold flex items-center justify-center gap-1 border border-white/30 active:scale-95 transition-all"
                >
                  <XCircle className="w-3.5 h-3.5 text-[#F87171]" />
                  Broken
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add Tap Modal Form */}
      <AddTapForm
        isOpen={isAddTapOpen}
        onClose={() => setIsAddTapOpen(false)}
        onSubmit={handleCreateTap}
        coords={{ lat: center[0], lng: center[1] }}
      />

      {/* Add Bathroom Modal Form */}
      <AddBathroomForm
        isOpen={isAddBathroomOpen}
        onClose={() => setIsAddBathroomOpen(false)}
        onSubmit={handleCreateBathroom}
        coords={{ lat: center[0], lng: center[1] }}
      />

      {/* Success Notification Toast */}
      {toastMessage && (
        <div className="fixed top-20 inset-x-4 z-50 max-w-sm mx-auto p-4 rounded-2xl bg-[#00696B] text-white shadow-2xl border border-[#42C6C9]/50 flex items-center justify-between gap-3 animate-in fade-in zoom-in-95 duration-150">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-[#53EBD2] shrink-0" />
            <p className="text-xs leading-relaxed font-medium">{toastMessage}</p>
          </div>
          <button
            type="button"
            onClick={() => setToastMessage(null)}
            className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center text-white shrink-0 hover:bg-white/30"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Bottom Floating Navigation */}
      <BottomNav activeTab={activeTab} onTabChange={setActiveTab} />
    </div>
  );
}

export default MapPage;
