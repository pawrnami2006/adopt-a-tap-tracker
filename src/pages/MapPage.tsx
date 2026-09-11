import { useState, useEffect } from 'react';
import { Droplets, Bath, Sparkles, X, User, Edit3, CloudCheck, CheckCircle2, RefreshCw, Shield, Trash2 } from 'lucide-react';
import { MapView } from '../components/map/MapView.tsx';
import { LocateMeButton } from '../components/map/LocateMeButton.tsx';
import { AddPointFAB } from '../components/map/AddPointFAB.tsx';
import { TopBar } from '../components/layout/TopBar.tsx';
import { BottomNav, type NavTabId } from '../components/layout/BottomNav.tsx';
import { AddTapForm, type AddTapFormData } from '../components/forms/AddTapForm.tsx';
import { AddBathroomForm, type AddBathroomFormData } from '../components/forms/AddBathroomForm.tsx';
import { PointDetailsDrawer, type DrawerPoint } from '../components/drawer/PointDetailsDrawer.tsx';
import { LeaderboardTab } from '../components/leaderboard/LeaderboardTab.tsx';
import { AdoptedTapsDashboard } from '../components/dashboard/AdoptedTapsDashboard.tsx';
import { TierBadge, getTierForPoints } from '../components/leaderboard/TierBadge.tsx';
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

  // Profile alias state
  const [displayName, setDisplayName] = useState<string>(() => {
    if (typeof localStorage !== 'undefined') {
      const saved = localStorage.getItem('adoptatap_display_name');
      if (saved) return saved;
    }
    return 'Anonymous Guardian #7492';
  });
  const [isEditingName, setIsEditingName] = useState(false);
  const [nameInput, setNameInput] = useState(displayName);

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

  const handleSaveName = () => {
    const trimmed = nameInput.trim();
    if (trimmed) {
      setDisplayName(trimmed);
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem('adoptatap_display_name', trimmed);
      }
    }
    setIsEditingName(false);
  };

  return (
    <div className="relative w-screen h-screen overflow-hidden flex flex-col bg-[#F4FBFA] select-none">
      {/* Top Bar Floating Header */}
      <div className="absolute top-0 inset-x-0 z-30 pointer-events-none">
        <TopBar syncQueueLength={0} />

        {/* Floating Filter Capsule Bar (Only on Map Tab) */}
        {activeTab === 'map' && (
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
        )}
      </div>

      {/* Main View Area */}
      <main className="flex-1 w-full h-full relative z-0 overflow-y-auto">
        {activeTab === 'map' && (
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
        )}

        {activeTab === 'leaderboard' && (
          <div className="w-full max-w-lg mx-auto px-4 pt-18 pb-24">
            <LeaderboardTab />
          </div>
        )}

        {activeTab === 'watchlist' && (
          <div className="w-full max-w-lg mx-auto px-4 pt-18 pb-24">
            <AdoptedTapsDashboard
              onViewOnMap={(lat, lng) => {
                setCenter([lat, lng]);
                setActiveTab('map');
              }}
            />
          </div>
        )}

        {activeTab === 'profile' && (
          <div className="w-full max-w-lg mx-auto px-4 pt-18 pb-24 flex flex-col gap-4 text-[#161D1D]">
            {/* Identity Hero Card */}
            <div
              className="w-full rounded-2xl p-5 text-white flex flex-col items-center text-center gap-3 shadow-lg border border-white/30"
              style={{
                background: 'linear-gradient(145deg, #087E8B 0%, #0B939E 50%, #0E767E 100%)',
                boxShadow: '0 12px 30px rgba(8, 126, 139, 0.35)',
              }}
            >
              <div className="relative">
                <div className="w-18 h-18 rounded-full bg-[#B5FEFF] flex items-center justify-center text-[#00696B] shadow-md border-2 border-white">
                  <User className="w-9 h-9 text-[#00696B]" />
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setNameInput(displayName);
                    setIsEditingName(true);
                  }}
                  className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-white text-[#00696B] flex items-center justify-center shadow-md active:scale-95"
                >
                  <Edit3 className="w-3.5 h-3.5 text-[#00696B]" />
                </button>
              </div>

              <div>
                <h2 className="text-xl font-bold text-white flex items-center justify-center gap-2">
                  <span>{displayName}</span>
                  <button
                    type="button"
                    onClick={() => {
                      setNameInput(displayName);
                      setIsEditingName(true);
                    }}
                    className="text-[#53EBD2] hover:text-white"
                  >
                    <Edit3 className="w-4 h-4" />
                  </button>
                </h2>
                <div className="mt-1 inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-white/15 text-xs text-[#C8F5F0] border border-white/20">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#53EBD2]" />
                  <span>Guest Identity • Local Storage</span>
                </div>
              </div>

              <div className="w-full pt-2 flex items-center justify-around border-t border-white/20 text-center">
                <div>
                  <div className="text-2xl font-extrabold text-[#53EBD2]">248</div>
                  <div className="text-[11px] text-[#C8F5F0] font-semibold">Total Points</div>
                </div>
                <div className="w-px h-8 bg-white/20" />
                <div className="flex flex-col items-center">
                  <TierBadge tier={getTierForPoints(248)} size="sm" />
                  <div className="text-[11px] text-[#C8F5F0] font-semibold mt-1">Civic Rank</div>
                </div>
              </div>
            </div>

            {/* Sync Engine Card */}
            <div className="p-4 rounded-2xl bg-white border border-cyan-100 shadow-xs flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-sm text-[#00696B] flex items-center gap-2">
                  <CloudCheck className="w-4 h-4 text-[#00696B]" />
                  Offline Sync Status
                </h3>
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#E8F8EE] text-[#10B981]">
                  All synced
                </span>
              </div>
              <div className="flex flex-col gap-2 text-xs text-[#587A7C]">
                <div className="flex items-center justify-between p-2 rounded-xl bg-[#F4FBFA] border border-cyan-100/60">
                  <span className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-[#10B981]" />
                    Connection
                  </span>
                  <span className="font-bold text-[#10B981]">Online</span>
                </div>
                <div className="flex items-center justify-between p-2 rounded-xl bg-[#F4FBFA] border border-cyan-100/60">
                  <span className="flex items-center gap-1.5">
                    <RefreshCw className="w-3.5 h-3.5 text-[#00696B]" />
                    Sync Queue
                  </span>
                  <span className="font-medium">0 actions pending</span>
                </div>
              </div>
            </div>

            {/* Rules Card */}
            <div className="p-4 rounded-2xl bg-white border border-cyan-100 shadow-xs flex flex-col gap-2 text-xs text-[#587A7C]">
              <h3 className="font-bold text-sm text-[#161D1D] flex items-center gap-2">
                <Shield className="w-4 h-4 text-[#00696B]" />
                Civic Verification Rules
              </h3>
              <ul className="list-disc list-inside space-y-1 text-[#587A7C] pt-1">
                <li><span className="font-bold text-[#161D1D]">+50 pts:</span> Add new point (paid upon 3 consensus votes)</li>
                <li><span className="font-bold text-[#161D1D]">+10 pts:</span> Condition report (paid when cycle flips)</li>
                <li><span className="font-bold text-[#161D1D]">+15 pts:</span> Watchlist check-in verification</li>
              </ul>
            </div>

            {/* Clear Cache */}
            <button
              type="button"
              onClick={() => {
                if (confirm('Clear local app cache?')) {
                  localStorage.removeItem('adoptatap_display_name');
                  setDisplayName('Anonymous Guardian #1001');
                }
              }}
              className="w-full py-3 rounded-xl bg-white hover:bg-red-50 text-[#EF4444] border border-red-200 text-xs font-bold flex items-center justify-center gap-2 active:scale-[0.99]"
            >
              <Trash2 className="w-4 h-4" />
              <span>Reset Device Alias & Cache</span>
            </button>
          </div>
        )}
      </main>

      {/* Floating Action Controls on Right (Only on Map Tab) */}
      {activeTab === 'map' && (
        <div className="absolute right-4 bottom-24 z-30 flex flex-col items-end gap-3 pointer-events-none">
          <LocateMeButton onLocate={handleLocate} className="pointer-events-auto" />
          <AddPointFAB
            onAddTap={() => setIsAddTapOpen(true)}
            onAddBathroom={() => setIsAddBathroomOpen(true)}
            className="pointer-events-auto"
          />
        </div>
      )}

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

      {/* Edit Alias Modal */}
      {isEditingName && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-2xl flex flex-col gap-3">
            <h3 className="font-bold text-base text-[#161D1D]">Set Public Alias</h3>
            <p className="text-xs text-[#789092]">
              Choose a friendly name shown on the community leaderboard.
            </p>
            <input
              type="text"
              value={nameInput}
              onChange={(e) => setNameInput(e.target.value)}
              maxLength={40}
              placeholder="e.g. Marina Guardian"
              className="w-full px-3.5 py-2.5 rounded-xl bg-[#F4FBFA] border border-cyan-100 text-sm text-[#161D1D] focus:outline-none focus:ring-2 focus:ring-[#42C6C9]"
            />
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsEditingName(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-[#789092] hover:bg-[#F4FBFA]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveName}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-[#00696B] text-white shadow-sm active:scale-95"
              >
                Save Alias
              </button>
            </div>
          </div>
        </div>
      )}

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
