import { Droplets, Shield, Award, Crown } from 'lucide-react';

export type GuardianTier = 'Leak Finder' | 'Tap Guardian' | 'Water Warden' | 'Aqua Legend';

export function getTierForPoints(points: number): GuardianTier {
  if (points <= 100) return 'Leak Finder';
  if (points <= 500) return 'Tap Guardian';
  if (points <= 1500) return 'Water Warden';
  return 'Aqua Legend';
}

interface TierBadgeProps {
  tier: GuardianTier;
  points?: number;
  showPoints?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function TierBadge({
  tier,
  points,
  showPoints = false,
  size = 'md',
  className = '',
}: TierBadgeProps) {
  let bgGradient = 'linear-gradient(135deg, #00696B 0%, #42C6C9 100%)';
  let textColor = '#ffffff';
  let icon = <Droplets className="w-3.5 h-3.5" />;
  let borderColor = 'rgba(255, 255, 255, 0.4)';

  if (tier === 'Leak Finder') {
    bgGradient = 'linear-gradient(135deg, #436467 0%, #6C7A7A 100%)';
    icon = <Droplets className="w-3.5 h-3.5 text-[#53EBD2]" />;
  } else if (tier === 'Tap Guardian') {
    bgGradient = 'linear-gradient(135deg, #087E8B 0%, #53EBD2 100%)';
    textColor = '#03383a';
    icon = <Shield className="w-3.5 h-3.5 text-[#03383a]" />;
    borderColor = 'rgba(255, 255, 255, 0.7)';
  } else if (tier === 'Water Warden') {
    bgGradient = 'linear-gradient(135deg, #0369A1 0%, #38BDF8 100%)';
    icon = <Award className="w-3.5 h-3.5 text-white" />;
  } else if (tier === 'Aqua Legend') {
    bgGradient = 'linear-gradient(135deg, #D97706 0%, #FBBF24 100%)';
    textColor = '#78350F';
    icon = <Crown className="w-3.5 h-3.5 text-[#78350F]" />;
    borderColor = 'rgba(255, 255, 255, 0.8)';
  }

  const sizeStyles = {
    sm: 'text-[10px] px-2 py-0.5 gap-1',
    md: 'text-xs px-2.5 py-1 gap-1.5',
    lg: 'text-sm px-3.5 py-1.5 gap-2',
  };

  return (
    <span
      className={`inline-flex items-center rounded-full font-bold uppercase tracking-wider shadow-sm border ${sizeStyles[size]} ${className}`}
      style={{
        background: bgGradient,
        color: textColor,
        borderColor,
      }}
    >
      {icon}
      <span>{tier}</span>
      {showPoints && points !== undefined && (
        <span className="opacity-85 font-semibold text-[11px]">• {points} pts</span>
      )}
    </span>
  );
}
