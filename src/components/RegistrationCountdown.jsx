import React, { useEffect, useState } from 'react';
import { Clock, Sparkles, Shirt, Flame, Lock, Hourglass, ShieldCheck } from 'lucide-react';
import confetti from 'canvas-confetti';
import { calculateRemainingTime } from '../utils/scheduleHelper';

/**
 * RegistrationCountdown Component
 * Renders an animated, high-energy countdown timer for both pre-launch and closing windows.
 * 
 * @param {'launch' | 'closing'} mode - Countdown mode ('launch' = before open, 'closing' = before close)
 * @param {Date} targetDate - The target Date object to count down to
 * @param {Function} [onZero] - Callback fired when countdown reaches zero
 * @param {number} [remainingShirtQuota] - Remaining VIP shirt quota
 * @param {number} [maxShirtQuota] - Total VIP shirt quota
 * @param {string} [formattedDateText] - Formatted Thai date string
 */
export default function RegistrationCountdown({
  mode = 'launch',
  targetDate,
  onZero,
  remainingShirtQuota = 15,
  maxShirtQuota = 15,
  formattedDateText = ''
}) {
  const [time, setTime] = useState(() => calculateRemainingTime(targetDate));

  useEffect(() => {
    if (!targetDate) return;

    const timer = setInterval(() => {
      const remaining = calculateRemainingTime(targetDate);
      setTime(remaining);

      if (remaining.isZero) {
        clearInterval(timer);
        if (onZero) onZero();
        try {
          confetti({
            particleCount: 120,
            spread: 90,
            origin: { y: 0.6 }
          });
        } catch (e) {}
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [targetDate, onZero]);

  if (!targetDate) return null;

  // Format numbers with leading zeros (2 digits)
  const formatDigit = (num) => String(num).padStart(2, '0');

  // -----------------------------------------------------------------------------------------
  // MODE 1: LAUNCH COUNTDOWN (ก่อนถึงเวลาเปิดรับลงทะเบียน)
  // -----------------------------------------------------------------------------------------
  if (mode === 'launch') {
    return (
      <div className="w-full max-w-xl mx-auto my-4 p-5 sm:p-6 rounded-3xl bg-gradient-to-b from-slate-900/95 via-slate-900/90 to-amber-950/40 border-2 border-amber-500/50 shadow-2xl shadow-amber-500/20 backdrop-blur-xl relative overflow-hidden animate-fadeIn">
        {/* Glow ambient background effects */}
        <div className="absolute -top-12 -left-12 w-40 h-40 bg-amber-500/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-12 -right-12 w-40 h-40 bg-rose-500/20 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 space-y-4 text-center">
          
          {/* Top VIP Shirt Urgency Banner */}
          <div className="inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-full bg-gradient-to-r from-amber-500/30 via-rose-500/20 to-amber-500/30 border border-amber-400/50 text-amber-200 text-xs sm:text-sm font-extrabold shadow-lg animate-pulse">
            <Flame className="w-4 h-4 text-amber-400 fill-amber-400 animate-bounce" />
            <span>🔥 สิทธิพิเศษ 15 ท่านแรก รับเสื้อฟรีทันที!</span>
            <Sparkles className="w-4 h-4 text-amber-300" />
          </div>

          {/* Heading */}
          <div className="space-y-1">
            <h3 className="text-xl sm:text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-200 via-yellow-300 to-amber-400 tracking-wide">
              นับถอยหลังเปิดรับลงทะเบียน
            </h3>
            <p className="text-xs sm:text-sm text-slate-300 font-medium">
              ระบบจะเปิดให้กรอกแบบฟอร์มใน:
            </p>
            {formattedDateText && (
              <div className="text-xs sm:text-sm font-bold text-amber-300/90 font-mono">
                {formattedDateText}
              </div>
            )}
          </div>

          {/* 4 Digit Countdown Blocks */}
          <div className="grid grid-cols-4 gap-2 sm:gap-3 max-w-md mx-auto pt-1">
            {/* Days */}
            <div className="p-2 sm:p-3 rounded-2xl bg-slate-950/80 border border-amber-500/40 shadow-inner flex flex-col items-center justify-center">
              <span className="font-mono text-2xl sm:text-4xl font-black text-amber-400 tracking-tight leading-none drop-shadow-[0_0_10px_rgba(245,158,11,0.5)]">
                {formatDigit(time.days)}
              </span>
              <span className="text-[10px] sm:text-xs text-slate-400 font-bold uppercase mt-1">วัน</span>
            </div>

            {/* Hours */}
            <div className="p-2 sm:p-3 rounded-2xl bg-slate-950/80 border border-amber-500/40 shadow-inner flex flex-col items-center justify-center">
              <span className="font-mono text-2xl sm:text-4xl font-black text-amber-300 tracking-tight leading-none drop-shadow-[0_0_10px_rgba(252,211,77,0.5)]">
                {formatDigit(time.hours)}
              </span>
              <span className="text-[10px] sm:text-xs text-slate-400 font-bold uppercase mt-1">ชั่วโมง</span>
            </div>

            {/* Minutes */}
            <div className="p-2 sm:p-3 rounded-2xl bg-slate-950/80 border border-amber-500/40 shadow-inner flex flex-col items-center justify-center">
              <span className="font-mono text-2xl sm:text-4xl font-black text-amber-300 tracking-tight leading-none drop-shadow-[0_0_10px_rgba(252,211,77,0.5)]">
                {formatDigit(time.minutes)}
              </span>
              <span className="text-[10px] sm:text-xs text-slate-400 font-bold uppercase mt-1">นาที</span>
            </div>

            {/* Seconds (Glowing & Ticking) */}
            <div className="p-2 sm:p-3 rounded-2xl bg-amber-500/10 border-2 border-amber-400/70 shadow-lg shadow-amber-500/30 flex flex-col items-center justify-center relative overflow-hidden">
              <span className="font-mono text-2xl sm:text-4xl font-black text-white tracking-tight leading-none drop-shadow-[0_0_12px_rgba(255,255,255,0.8)] animate-pulse">
                {formatDigit(time.seconds)}
              </span>
              <span className="text-[10px] sm:text-xs text-amber-300 font-extrabold uppercase mt-1">วินาที</span>
            </div>
          </div>

          {/* Bottom Footnote Tip */}
          <div className="pt-2 text-[11px] sm:text-xs text-slate-300 flex items-center justify-center space-x-1.5 bg-slate-950/50 p-2.5 rounded-xl border border-white/5">
            <Hourglass className="w-3.5 h-3.5 text-amber-400 animate-spin-slow shrink-0" />
            <span>เมื่อครบกำหนดเวลา ระบบจะเปิดให้ลงทะเบียนทันทีอัตโนมัติ</span>
          </div>

        </div>
      </div>
    );
  }

  // -----------------------------------------------------------------------------------------
  // MODE 2: CLOSING COUNTDOWN (เมื่อระบบกำลังเปิดรับสมัครอยู่ แต่นับถอยหลังสู่เวลาปิด)
  // -----------------------------------------------------------------------------------------
  return (
    <div className="w-full max-w-lg mx-auto my-3 p-3.5 sm:p-4 rounded-2xl bg-gradient-to-r from-emerald-950/50 via-slate-900/90 to-amber-950/50 border border-emerald-500/40 shadow-lg backdrop-blur-md">
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-center sm:text-left">
        
        {/* Left: Status & Thai Date */}
        <div className="space-y-0.5 min-w-0">
          <div className="flex items-center justify-center sm:justify-start space-x-1.5 text-xs font-bold text-emerald-400">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping shrink-0" />
            <span>🟢 กำลังเปิดรับลงทะเบียน</span>
          </div>
          {formattedDateText && (
            <div className="text-[11px] text-slate-400">
              ปิดรับสมัคร: <span className="text-slate-200 font-semibold">{formattedDateText}</span>
            </div>
          )}
        </div>

        {/* Right: Live Ticking Countdown Badge */}
        <div className="flex items-center space-x-1 font-mono text-xs font-black text-amber-300 bg-slate-950/80 px-3 py-1.5 rounded-xl border border-amber-500/30 shadow-inner shrink-0">
          <Clock className="w-3.5 h-3.5 text-amber-400 animate-spin-slow shrink-0" />
          <span>เหลืออีก:</span>
          {time.days > 0 && <span className="text-white">{time.days} วัน</span>}
          <span>{formatDigit(time.hours)}:{formatDigit(time.minutes)}:{formatDigit(time.seconds)}</span>
        </div>

      </div>
    </div>
  );
}
