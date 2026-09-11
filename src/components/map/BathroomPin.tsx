import L from 'leaflet';
import { Marker } from 'react-leaflet';
import type { BathroomItem } from './types.ts';

export function createBathroomDivIcon(bathroom: BathroomItem, isSelected = false): L.DivIcon {
  let bgGradient = 'linear-gradient(135deg, #0B939E 0%, #00696E 100%)';
  let badgeBg = '#10B981';
  let badgeText = '3/3';
  let auraColor = 'rgba(11, 147, 158, 0.35)';

  if (bathroom.status === 'issue' || bathroom.cleanliness_status === 'average') {
    bgGradient = 'linear-gradient(135deg, #FBBF24 0%, #D97706 100%)';
    auraColor = 'rgba(245, 158, 11, 0.35)';
  } else if (bathroom.status === 'broken' || bathroom.cleanliness_status === 'dirty') {
    bgGradient = 'linear-gradient(135deg, #F87171 0%, #DC2626 100%)';
    auraColor = 'rgba(239, 68, 68, 0.35)';
  }

  if (!bathroom.is_verified) {
    badgeBg = '#8B5CF6';
    badgeText = `${bathroom.pending_confirmations}/3`;
  }

  const rippleHtml = isSelected
    ? `<div style="position: absolute; inset: -10px; border-radius: 9999px; background: ${auraColor}; animation: ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite; pointer-events: none;"></div>`
    : '';

  const labelText = bathroom.name || 'Public Restroom';

  // Wheelchair accessible badge at bottom-right
  const accessibleBadge = bathroom.is_accessible
    ? `
      <span style="
        position: absolute;
        bottom: -3px;
        right: -5px;
        width: 16px;
        height: 16px;
        border-radius: 9999px;
        background: #00696E;
        color: #ffffff;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 10px;
        box-shadow: 0 2px 4px rgba(0,0,0,0.25);
        border: 1px solid #ffffff;
      ">
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
          <circle cx="12" cy="4" r="2"/>
          <path d="M12 8v6l5 3M9 13a4 4 0 1 0 4 4"/>
        </svg>
      </span>
    `
    : '';

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
        box-shadow: 0 8px 18px rgba(0, 105, 110, 0.35), inset 0 2px 2px rgba(255, 255, 255, 0.6);
        border: 2px solid #ffffff;
        transition: transform 0.15s ease;
      ">
        <!-- WC / Restroom silhouette SVG -->
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M7 21v-4a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v4"/>
          <path d="M10 9a2 2 0 1 0 4 0 2 2 0 0 0-4 0z"/>
          <path d="M5 21V9a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v12"/>
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
          border: 1px solid rgba(255,255,255,0.8);
          line-height: 1.2;
        ">
          ${badgeText}
        </span>

        ${accessibleBadge}
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
        <span style="display: inline-block; width: 6px; height: 6px; border-radius: 9999px; background: ${bathroom.status === 'working' ? '#10B981' : bathroom.status === 'issue' ? '#F59E0B' : '#EF4444'};"></span>
        <span>${labelText}</span>
      </div>
    </div>
  `;

  return L.divIcon({
    className: 'adopt-bathroom-pin',
    html,
    iconSize: [42, 64],
    iconAnchor: [21, 32],
    popupAnchor: [0, -32],
  });
}

interface BathroomPinProps {
  bathroom: BathroomItem;
  isSelected?: boolean;
  onClick?: (bathroom: BathroomItem) => void;
}

export function BathroomPin({ bathroom, isSelected = false, onClick }: BathroomPinProps) {
  const icon = createBathroomDivIcon(bathroom, isSelected);

  return (
    <Marker
      position={[bathroom.lat, bathroom.lng]}
      icon={icon}
      eventHandlers={{
        click: () => onClick?.(bathroom),
      }}
    />
  );
}
