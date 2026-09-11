import { CheckCircle2, Clock, ShieldCheck } from 'lucide-react';

interface VerificationBadgeProps {
  isVerified: boolean;
  pendingConfirmations: number;
  className?: string;
}

export function VerificationBadge({
  isVerified,
  pendingConfirmations,
  className = '',
}: VerificationBadgeProps) {
  const count = Math.min(3, Math.max(0, pendingConfirmations));

  if (isVerified) {
    return (
      <div
        className={`p-3 rounded-2xl flex flex-col gap-1.5 border border-white/25 shadow-sm text-white ${className}`}
        style={{
          background: 'rgba(255, 255, 255, 0.15)',
          boxShadow: '0 4px 12px rgba(8, 126, 139, 0.2), inset 0 1px 2px rgba(255, 255, 255, 0.3)',
        }}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#10B981]/25 text-[#53EBD2] text-xs font-bold border border-[#10B981]/40">
            <ShieldCheck className="w-3.5 h-3.5 text-[#53EBD2]" />
            <span>COMMUNITY VERIFIED</span>
          </div>
          <span className="text-[11px] font-semibold text-[#A5F3FC]">3 of 3 confirmed</span>
        </div>

        <div className="flex items-center gap-2 pt-1">
          <div className="flex-1 h-1.5 rounded-full bg-[#10B981] shadow-xs" />
          <div className="flex-1 h-1.5 rounded-full bg-[#10B981] shadow-xs" />
          <div className="flex-1 h-1.5 rounded-full bg-[#10B981] shadow-xs" />
        </div>
        <p className="text-[11px] text-[#C8F5F0] leading-tight">
          Status consensus confirmed by 3 independent community members.
        </p>
      </div>
    );
  }

  return (
    <div
      className={`p-3 rounded-2xl flex flex-col gap-1.5 border border-white/25 shadow-sm text-white ${className}`}
      style={{
        background: 'rgba(255, 255, 255, 0.15)',
        boxShadow: '0 4px 12px rgba(8, 126, 139, 0.2), inset 0 1px 2px rgba(255, 255, 255, 0.3)',
      }}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#8B5CF6]/25 text-[#EDE9FE] text-xs font-bold border border-[#8B5CF6]/40">
          <Clock className="w-3.5 h-3.5 text-[#C4B5FD]" />
          <span>PENDING VERIFICATION</span>
        </div>
        <span className="text-[11px] font-bold text-[#FED7AA]">
          {count} of 3 confirmed
        </span>
      </div>

      <div className="flex items-center gap-2 pt-1">
        <div className={`flex-1 h-1.5 rounded-full ${count >= 1 ? 'bg-[#53EBD2]' : 'bg-white/20'}`} />
        <div className={`flex-1 h-1.5 rounded-full ${count >= 2 ? 'bg-[#53EBD2]' : 'bg-white/20'}`} />
        <div className={`flex-1 h-1.5 rounded-full ${count >= 3 ? 'bg-[#10B981]' : 'bg-white/20'}`} />
      </div>

      <p className="text-[11px] text-[#A5F3FC] flex items-center gap-1">
        <CheckCircle2 className="w-3 h-3 text-[#53EBD2] shrink-0" />
        <span>
          {3 - count} more independent report{3 - count === 1 ? '' : 's'} needed to flip to Verified.
        </span>
      </p>
    </div>
  );
}
