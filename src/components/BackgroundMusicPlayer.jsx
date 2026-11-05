import React, { useState, useEffect } from 'react';
import { Volume2, VolumeX } from 'lucide-react';
import { bgAudio } from '../utils/backgroundAudio';

/**
 * BackgroundMusicPlayer
 * Initializes global background music lifecycle.
 * Renders NO floating UI (floating button removed as requested).
 */
export default function BackgroundMusicPlayer() {
  useEffect(() => {
    bgAudio.init();
  }, []);

  return null;
}

/**
 * MusicFooterToggle
 * Compact mini speaker button (50% smaller than previous size, non-floating)
 * Positioned cleanly under "จัดการระบบในนาม: คุณทีป์ชลิต ทองจันทร์ (ผอ.โต๊ด)"
 */
export function MusicFooterToggle() {
  const [isPlaying, setIsPlaying] = useState(false);

  useEffect(() => {
    bgAudio.init();
    const unsubscribe = bgAudio.subscribe((playing) => {
      setIsPlaying(playing);
    });
    return () => unsubscribe();
  }, []);

  const handleToggle = (e) => {
    e.preventDefault();
    e.stopPropagation();
    bgAudio.toggle();
  };

  return (
    <div className="pt-2 flex items-center justify-center select-none">
      <button
        type="button"
        onClick={handleToggle}
        className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-medium border transition-all hover:scale-105 active:scale-95 cursor-pointer shadow-sm ${
          isPlaying
            ? 'bg-emerald-950/60 border-emerald-500/50 text-emerald-300 hover:bg-emerald-900/60 shadow-emerald-500/20'
            : 'bg-slate-900/70 border-slate-700/60 text-slate-400 hover:text-rose-300 hover:border-rose-500/40'
        }`}
        title={isPlaying ? "กดเพื่อปิดเสียงเพลง (พรปีใหม่ ระนาดเอก)" : "กดเพื่อเปิดเพลง (พรปีใหม่ ระนาดเอก)"}
        aria-label={isPlaying ? "ปิดเสียงเพลงบรรเลง" : "เปิดเสียงเพลงบรรเลง"}
      >
        {isPlaying ? (
          <>
            <span className="relative flex h-2 w-2 shrink-0">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400"></span>
            </span>
            <Volume2 className="w-3.5 h-3.5 text-emerald-300 shrink-0" />
            <span className="text-[11px] font-semibold text-emerald-300 tracking-wide">
              เพลงปีใหม่: เปิด 🎶
            </span>
          </>
        ) : (
          <>
            <VolumeX className="w-3.5 h-3.5 text-rose-400 shrink-0" />
            <span className="text-[11px] font-semibold text-slate-400 tracking-wide">
              เพลงปีใหม่: ปิด 🔇
            </span>
          </>
        )}
      </button>
    </div>
  );
}
