import { useState, useEffect } from 'react';
import { Droplets, Bath, Sparkles, X } from 'lucide-react';
import { MapView } from '../components/map/MapView.tsx';
import { LocateMeButton } from '../components/map/LocateMeButton.tsx';
import { AddPointFAB } from '../components/map/AddPointFAB.tsx';
import { TopBar } from '../components/layout/TopBar.tsx';
import { BottomNav, type NavTabId } from '../components/layout/BottomNav.tsx';
import { AddTapForm, type AddTapFormData } from '../components/forms/AddTapForm.tsx';
import { AddBathroomForm, type AddBathroomFormData } from '../components/forms/AddBathroomForm.tsx';
import { PointDetailsDrawer, type DrawerPoint } from '../components/drawer/PointDetailsDrawer.tsx';
import {
  INITIAL_MOCK_TAPS,
  INITIAL_MOCK_BATHROOMS,
  type TapItem,
  type BathroomItem,
  type MapFilterType,
  type PointStatus,
  type CleanlinessStatus,
} from '../components/map/types.ts';

export function MapPage() {
  const [activeTab, setActiveTab] = useState<NavTabId>('map');
  const [filter, setFilter] = useState<MapFilterType>('both');
  const [center, setCenter] = useState<[number, number]>([12.9716, 77.5946]); // Default fallback: MG Road / Bangalore
  const [zoom, setZoom] = useState<number>(15);

  const [taps, setTaps] = useState<TapItem[]>(INITIAL_MOCK_TAPS);
  const [bathrooms, setBathrooms] = useState<BathroomItem[]>(INITIAL_MOCK_BATHROOMS);

  const [selectedPoint, setSelectedPoint] = useState<DrawerPoint | null>(null);

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

  const handleReportStatus = (status: PointStatus, cleanliness?: CleanlinessStatus) => {
    if (!selectedPoint) return;

    if (selectedPoint.type === 'tap') {
      const updatedTap: TapItem = {
        ...selectedPoint.data,
        status,
        is_verified: false,
        pending_status: status,
        pending_confirmations: Math.min(3, selectedPoint.data.pending_confirmations + 1),
        last_verified: new Date().toISOString(),
      };
      setTaps((prev) => prev.map((t) => (t.id === selectedPoint.data.id ? updatedTap : t)));
      setSelectedPoint({ type: 'tap', data: updatedTap });
    } else {
      const updatedBath: BathroomItem = {
        ...selectedPoint.data,
        status,
        cleanliness_status: cleanliness || selectedPoint.data.cleanliness_status,
        is_verified: false,
        pending_status: status,
        pending_cleanliness: cleanliness || selectedPoint.data.cleanliness_status,
        pending_confirmations: Math.min(3, selectedPoint.data.pending_confirmations + 1),
        last_verified: new Date().toISOString(),
      };
      setBathrooms((prev) => prev.map((b) => (b.id === selectedPoint.data.id ? updatedBath : b)));
      setSelectedPoint({ type: 'bathroom', data: updatedBath });
    }

    setToastMessage('Condition report submitted! Logged for verification consensus.');
  };

  const handleAddPhotoToSelected = (_file: File, previewUrl: string) => {
    if (!selectedPoint) return;

    if (selectedPoint.type === 'tap') {
      const updated = {
        ...selectedPoint.data,
        photo_urls: [previewUrl, ...selectedPoint.data.photo_urls],
      };
      setTaps((prev) => prev.map((t) => (t.id === selectedPoint.data.id ? updated : t)));
      setSelectedPoint({ type: 'tap', data: updated });
    } else {
      const updated = {
        ...selectedPoint.data,
        photo_urls: [previewUrl, ...selectedPoint.data.photo_urls],
      };
      setBathrooms((prev) => prev.map((b) => (b.id === selectedPoint.data.id ? updated : b)));
      setSelectedPoint({ type: 'bathroom', data: updated });
    }

    setToastMessage('Photo attached to community record!');
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

      {/* Shared Point Details Drawer */}
      <PointDetailsDrawer
        point={selectedPoint}
        onClose={() => setSelectedPoint(null)}
        onReportStatus={handleReportStatus}
        onAdoptPoint={(type, id) => {
          setToastMessage(`Adopted ${type} #${id.slice(-4)}! Guardian stewardship activated.`);
        }}
        onAddPhoto={handleAddPhotoToSelected}
        hasVotedCurrentCycle={false}
      />

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
