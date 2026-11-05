import React, { useState, useEffect, useRef } from 'react';
import { Volume2, VolumeX, Music } from 'lucide-react';

/**
 * BackgroundMusicPlayer
 * Plays soft ambient New Year Ranad Ek music continuously across the app.
 * Provides a floating speaker toggle button at the bottom-right corner.
 */
export default function BackgroundMusicPlayer() {
  const audioRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [showToast, setShowToast] = useState(false);

  // Cloudinary primary CDN with local public fallback
  const primaryAudioUrl = "https://res.cloudinary.com/dx2asgfo7/video/upload/v1793901001/triple_t_forms/sme_fan_2026/audio/new_year_ranad_bgm.mp4";
  const fallbackAudioUrl = "/audio/new_year_ranad.mp4";

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    // Set initial gentle background volume (25%)
    audio.volume = 0.25;

    // Attempt autoplay immediately
    const startAudio = () => {
      audio.play().then(() => {
        setIsPlaying(true);
      }).catch(() => {
        // Autoplay blocked by browser policy until user gesture
        setIsPlaying(false);
      });
    };

    startAudio();

    // Browser Autoplay Policy Fallback:
    // Once user taps or clicks anywhere on the page, start the music automatically!
    const handleFirstUserInteraction = () => {
      if (audio && audio.paused) {
        audio.play().then(() => {
          setIsPlaying(true);
        }).catch(() => {});
      }
      // Clean up interaction listeners once triggered
      window.removeEventListener('click', handleFirstUserInteraction);
      window.removeEventListener('touchstart', handleFirstUserInteraction);
      window.removeEventListener('keydown', handleFirstUserInteraction);
    };

    window.addEventListener('click', handleFirstUserInteraction, { once: true });
    window.addEventListener('touchstart', handleFirstUserInteraction, { once: true });
    window.addEventListener('keydown', handleFirstUserInteraction, { once: true });

    return () => {
      window.removeEventListener('click', handleFirstUserInteraction);
      window.removeEventListener('touchstart', handleFirstUserInteraction);
      window.removeEventListener('keydown', handleFirstUserInteraction);
    };
  }, []);

  const togglePlayback = (e) => {
    e.stopPropagation();
    const audio = audioRef.current;
    if (!audio) return;

    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
      setShowToast(true);
      setTimeout(() => setShowToast(false), 2000);
    } else {
      audio.play().then(() => {
        setIsPlaying(true);
        setShowToast(true);
        setTimeout(() => setShowToast(false), 2000);
      }).catch((err) => {
        console.warn('Playback error:', err);
      });
    }
  };

  return (
    <>
      {/* Hidden Native Audio Element */}
      <audio
        ref={audioRef}
        loop
        preload="auto"
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
      >
        <source src={primaryAudioUrl} type="video/mp4" />
        <source src={fallbackAudioUrl} type="video/mp4" />
      </audio>

      {/* Floating Speaker Control Button (Fixed Bottom-Right) */}
      <div className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-50 flex items-center gap-2 select-none">
        
        {/* Quick Feedback Toast Badge */}
        {showToast && (
          <div className="hidden sm:flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-900/95 border border-white/20 text-xs font-medium text-white shadow-xl animate-fade-in backdrop-blur-md">
            <Music className="w-3.5 h-3.5 text-emerald-400 animate-bounce" />
            <span>{isPlaying ? 'เปิดเพลง พรปีใหม่ 🎶' : 'ปิดเสียงเพลง 🔇'}</span>
          </div>
        )}

        {/* Floating Speaker Action Button */}
        <button
          type="button"
          onClick={togglePlayback}
          className={`relative p-3 sm:p-3.5 rounded-full backdrop-blur-md shadow-2xl transition-all duration-300 hover:scale-110 active:scale-90 flex items-center justify-center cursor-pointer ${
            isPlaying
              ? 'bg-gradient-to-br from-emerald-900/90 via-slate-900/95 to-teal-950/90 border-2 border-emerald-400/80 text-emerald-300 shadow-emerald-500/30'
              : 'bg-slate-950/90 border-2 border-rose-500/50 text-rose-400 hover:border-emerald-500/50 hover:text-emerald-400 shadow-slate-950/60'
          }`}
          title={isPlaying ? "กดเพื่อหยุดเพลง (พรปีใหม่ ระนาดเอก)" : "กดเพื่อเปิดเพลง (พรปีใหม่ ระนาดเอก)"}
          aria-label={isPlaying ? "Mute Background Music" : "Play Background Music"}
        >
          {/* Animated sound wave pulses when playing */}
          {isPlaying && (
            <span className="absolute -inset-1 rounded-full bg-emerald-400/20 animate-ping pointer-events-none" />
          )}

          {isPlaying ? (
            <div className="relative flex items-center justify-center">
              <Volume2 className="w-5 h-5 sm:w-6 sm:h-6 text-emerald-300 transition-transform" />
              {/* Equalizer animation beacon */}
              <span className="absolute -top-1 -right-1 flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400"></span>
              </span>
            </div>
          ) : (
            <VolumeX className="w-5 h-5 sm:w-6 sm:h-6 text-rose-400 transition-transform" />
          )}
        </button>
      </div>
    </>
  );
}
