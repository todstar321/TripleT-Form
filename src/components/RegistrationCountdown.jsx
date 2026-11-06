import React, { useEffect, useState } from 'react';
import { Clock, Sparkles, Shirt, Flame, Lock, Hourglass, ShieldCheck, User, Users } from 'lucide-react';
import confetti from 'canvas-confetti';
import { calculateRemainingTime } from '../utils/scheduleHelper';

/**
 * RegistrationCountdown Component
 * Renders an animated, high-energy countdown timer for both pre-launch and closing windows,
 * with twin matched badges for time remaining and remaining attendee quota.
 * 
 * @param {'launch' | 'closing'} mode - Countdown mode ('launch' = before open, 'closing' = before close)
 * @param {Date} targetDate - The target Date object to count down to
 * @param {Function} [onZero] - Callback fired when countdown reaches zero
 * @param {number} [remainingShirtQuota] - Remaining VIP shirt quota
 * @param {number} [maxShirtQuota] - Total VIP shirt quota
 * @param {string} [formattedDateText] - Formatted Thai date string
 * @param {number} [maxSeats] - Total capacity limit (default: 70)
 * @param {number} [remainingSeats] - Remaining available seats
 * @param {boolean} [enableCapacityLimit] - Whether capacity limit is enabled
 * @param {boolean} [isCapacityFull] - Whether capacity has reached max
 */
export default function RegistrationCountdown({
  mode = 'launch',
  targetDate,
  onZero,
  remainingShirtQuota = 15,
  maxShirtQuota = 15,
  formattedDateText = '',
  maxSeats = 70,
  remainingSeats = 49,
  enableCapacityLimit = true,
  isCapacityFull = false
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
          
          {/* Top Badges */}
          <div className="flex flex-wrap items-center justify-center gap-2">
            <div className="inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-full bg-gradient-to-r from-amber-500/30 via-rose-500/20 to-amber-500/30 border border-amber-400/50 text-amber-200 text-xs sm:text-sm font-extrabold shadow-lg animate-pulse">
              <Flame className="w-4 h-4 text-amber-400 fill-amber-400 animate-bounce" />
              <span>🔥 สิทธิพิเศษ 15 ท่านแรก รับเสื้อฟรีทันที!</span>
              <Sparkles className="w-4 h-4 text-amber-300" />
            </div>

            {enableCapacityLimit && (
              <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-cyan-950/60 border border-cyan-400/50 text-cyan-200 text-xs font-bold shadow-md">
                <User className="w-3.5 h-3.5 text-cyan-400" />
                <span>จำกัดเพียง {maxSeats} ท่านเท่านั้น</span>
              </div>
            )}
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
    <div className="w-full max-w-xl mx-auto my-3 p-3.5 sm:p-4 rounded-2xl bg-gradient-to-b from-slate-900/95 via-slate-900/90 to-slate-950/95 border border-emerald-500/40 shadow-xl backdrop-blur-md space-y-2.5">
      
      {/* Top Status & Thai Closing Schedule */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-1.5 text-center sm:text-left">
        <div className="flex items-center justify-center sm:justify-start space-x-2 text-xs font-bold text-emerald-400">
          <span className="relative flex h-2.5 w-2.5 shrink-0">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-400"></span>
          </span>
          <span>กำลังเปิดรับลงทะเบียน</span>
        </div>
        {formattedDateText && (
          <div className="text-[11px] text-slate-300">
            ปิดรับสมัคร: <span className="text-amber-200 font-semibold">{formattedDateText}</span>
          </div>
        )}
      </div>

      {/* Twin Counter Badges (สองป้ายขนาดเท่ากัน ติดกัน และใช้คนละสีอย่างสวยงาม) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-0.5">
        
        {/* ป้ายที่ 1: นับเวลาถอยหลัง (โทนทอง-อำพัน Amber) */}
        <div className="flex items-center justify-center space-x-1.5 font-mono text-xs font-black text-amber-300 bg-slate-950/90 px-3 py-2 rounded-xl border border-amber-500/40 shadow-inner min-h-[42px] transition-all hover:border-amber-400/80">
          <Clock className="w-4 h-4 text-amber-400 animate-spin-slow shrink-0" />
          <span className="text-slate-300 font-bold">เหลืออีก:</span>
          {time.days > 0 && <span className="text-white font-extrabold">{time.days} วัน</span>}
          <span className="text-amber-300 font-black tracking-wide">
            {formatDigit(time.hours)}:{formatDigit(time.minutes)}:{formatDigit(time.seconds)}
          </span>
        </div>

        {/* ป้ายที่ 2: นับจำนวนที่นั่งคงเหลือ (โทนฟ้าคราม-ไซแอน Cyan พร้อมไอคอนคน) */}
        {enableCapacityLimit ? (
          <div className={`flex items-center justify-center space-x-1.5 font-mono text-xs font-black px-3 py-2 rounded-xl border shadow-inner min-h-[42px] transition-all ${
            isCapacityFull || remainingSeats <= 0
              ? 'bg-rose-950/70 border-rose-500/50 text-rose-300'
              : 'bg-slate-950/90 border-cyan-500/40 text-cyan-300 hover:border-cyan-400/80'
          }`}>
            <User className={`w-4 h-4 shrink-0 ${isCapacityFull || remainingSeats <= 0 ? 'text-rose-400' : 'text-cyan-400'}`} />
            {isCapacityFull || remainingSeats <= 0 ? (
              <span className="text-rose-300 font-black">ที่นั่งเต็มแล้ว ({maxSeats} ท่าน)</span>
            ) : (
              <div className="flex items-center space-x-1">
                <span className="text-slate-300 font-bold">เหลืออีก</span>
                <span className="text-white font-black text-sm px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-200">
                  {remainingSeats}
                </span>
                <span className="text-slate-300 font-bold">ท่านสุดท้าย</span>
                <span className="text-cyan-300/80 text-[11px] font-medium">({`จาก ${maxSeats} ท่าน`})</span>
              </div>
            )}
          </div>
        ) : (
          <div className="flex items-center justify-center space-x-1.5 font-mono text-xs font-black text-emerald-300 bg-slate-950/90 px-3 py-2 rounded-xl border border-emerald-500/40 shadow-inner min-h-[42px]">
            <Users className="w-4 h-4 text-emerald-400 shrink-0" />
            <span className="text-slate-300">เปิดรับลงทะเบียนทั่วไป (ไม่จำกัดจำนวน)</span>
          </div>
        )}

      </div>

    </div>
  );
}
