import L from 'leaflet';
import { Marker } from 'react-leaflet';
import type { TapItem } from './types.ts';

export function createTapDivIcon(tap: TapItem, isSelected = false): L.DivIcon {
  // Status background & border colors per design.md
  let bgGradient = 'linear-gradient(135deg, #42c6c9 0%, #00696b 100%)';
  let badgeBg = '#10B981';
  let badgeText = '3/3';
  let badgeBorder = 'rgba(255,255,255,0.8)';
  let auraColor = 'rgba(66, 198, 201, 0.35)';

  if (tap.status === 'issue') {
    bgGradient = 'linear-gradient(135deg, #FBBF24 0%, #D97706 100%)';
    auraColor = 'rgba(245, 158, 11, 0.35)';
  } else if (tap.status === 'broken') {
    bgGradient = 'linear-gradient(135deg, #F87171 0%, #DC2626 100%)';
    auraColor = 'rgba(239, 68, 68, 0.35)';
  }

  // Pending vs Verified badge
  if (!tap.is_verified) {
    badgeBg = '#8B5CF6';
    badgeText = `${tap.pending_confirmations}/3`;
  }

  const rippleHtml = isSelected
    ? `<div style="position: absolute; inset: -10px; border-radius: 9999px; background: ${auraColor}; animation: ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite; pointer-events: none;"></div>`
    : '';

  const labelText = tap.description || 'Water Tap';

  const html = `
    <div style="position: relative; display: flex; flex-direction: column; align-items: center; cursor: pointer; user-select: none;">
      ${rippleHtml}
      <div style="
        position: relative;
        z-index: 10;
        width: 42px;
        height: 42px;
        border-radius: 9999px;
        background: ${bgGradient};
        color: #ffffff;
        display: flex;
        align-items: center;
        justify-content: center;
        box-shadow: 0 8px 18px rgba(0, 105, 107, 0.35), inset 0 2px 2px rgba(255, 255, 255, 0.6);
        border: 2px solid #ffffff;
        transition: transform 0.15s ease;
      ">
        <!-- Droplet SVG Icon -->
        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" stroke="none">
          <path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z" />
        </svg>

        <!-- Verification Pill Tag -->
        <span style="
          position: absolute;
          top: -4px;
          right: -6px;
          padding: 1px 4px;
          border-radius: 9999px;
          background: ${badgeBg};
          color: #ffffff;
          font-size: 10px;
          font-weight: 700;
          font-family: Inter, system-ui, sans-serif;
          box-shadow: 0 2px 5px rgba(0,0,0,0.25);
          border: 1px solid ${badgeBorder};
          line-height: 1.2;
        ">
          ${badgeText}
        </span>
      </div>

      <!-- Label Chip -->
      <div style="
        margin-top: 4px;
        padding: 2px 8px;
        border-radius: 9999px;
        background: rgba(255, 255, 255, 0.95);
        backdrop-filter: blur(8px);
        box-shadow: 0 4px 10px rgba(24, 58, 61, 0.12);
        white-space: nowrap;
        font-size: 11px;
        font-weight: 600;
        color: #161D1D;
        font-family: Inter, system-ui, sans-serif;
        border: 1px solid rgba(255, 255, 255, 0.8);
        display: flex;
        align-items: center;
        gap: 4px;
      ">
        <span style="display: inline-block; width: 6px; height: 6px; border-radius: 9999px; background: ${tap.status === 'working' ? '#10B981' : tap.status === 'issue' ? '#F59E0B' : '#EF4444'};"></span>
        <span>${labelText}</span>
      </div>
    </div>
  `;

  return L.divIcon({
    className: 'adopt-tap-pin',
    html,
    iconSize: [42, 64],
    iconAnchor: [21, 32],
    popupAnchor: [0, -32],
  });
}

interface TapPinProps {
  tap: TapItem;
  isSelected?: boolean;
  onClick?: (tap: TapItem) => void;
}

export function TapPin({ tap, isSelected = false, onClick }: TapPinProps) {
  const icon = createTapDivIcon(tap, isSelected);

  return (
    <Marker
      position={[tap.lat, tap.lng]}
      icon={icon}
      eventHandlers={{
        click: () => onClick?.(tap),
      }}
    />
  );
}
