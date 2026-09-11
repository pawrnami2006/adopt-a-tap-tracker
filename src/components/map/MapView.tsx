import { useEffect } from 'react';
import { MapContainer, TileLayer, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { TapPin } from './TapPin.tsx';
import { BathroomPin } from './BathroomPin.tsx';
import type { TapItem, BathroomItem, MapFilterType } from './types.ts';

// Helper to smoothly fly/pan when coordinates change
function MapCenterController({ center, zoom }: { center: [number, number]; zoom?: number }) {
  const map = useMap();

  useEffect(() => {
    map.setView(center, zoom ?? map.getZoom(), { animate: true });
  }, [center, zoom, map]);

  return null;
}

interface MapViewProps {
  taps: TapItem[];
  bathrooms: BathroomItem[];
  filter: MapFilterType;
  center: [number, number];
  zoom?: number;
  selectedPointId?: string | null;
  onSelectTap?: (tap: TapItem) => void;
  onSelectBathroom?: (bathroom: BathroomItem) => void;
  className?: string;
}

export function MapView({
  taps,
  bathrooms,
  filter,
  center,
  zoom = 15,
  selectedPointId = null,
  onSelectTap,
  onSelectBathroom,
  className = '',
}: MapViewProps) {
  const showTaps = filter === 'both' || filter === 'taps';
  const showBathrooms = filter === 'both' || filter === 'bathrooms';

  return (
    <div className={`relative w-full h-full overflow-hidden bg-[#eaf3f2] ${className}`}>
      <MapContainer
        center={center}
        zoom={zoom}
        zoomControl={false}
        scrollWheelZoom={true}
        style={{ width: '100%', height: '100%', zIndex: 0 }}
      >
        {/* OpenStreetMap Tile Layer */}
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          maxZoom={19}
        />

        {/* Viewport Panning Controller */}
        <MapCenterController center={center} zoom={zoom} />

        {/* Tap Markers */}
        {showTaps &&
          taps.map((tap) => (
            <TapPin
              key={tap.id}
              tap={tap}
              isSelected={selectedPointId === tap.id}
              onClick={onSelectTap}
            />
          ))}

        {/* Bathroom Markers */}
        {showBathrooms &&
          bathrooms.map((bathroom) => (
            <BathroomPin
              key={bathroom.id}
              bathroom={bathroom}
              isSelected={selectedPointId === bathroom.id}
              onClick={onSelectBathroom}
            />
          ))}
      </MapContainer>
    </div>
  );
}
