/**
 * Global Background Audio Controller for SME FAN 2026
 * Plays soft ambient New Year Ranad Ek music continuously across the app.
 */
class BackgroundAudioManager {
  constructor() {
    this.audio = null;
    this.isPlaying = false;
    this.listeners = new Set();
    this.isInitialized = false;
    this.userPaused = false;
    this.removeGestureListeners = null;

    // Primary: Cloudinary Raw Audio CDN; Fallback: Local public asset
    this.primaryUrl = "https://res.cloudinary.com/dx2asgfo7/raw/upload/v1793902349/triple_t_forms/sme_fan_2026/audio/new_year_ranad.m4a";
    this.fallbackUrl = "/audio/new_year_ranad.m4a";
  }

  init() {
    if (typeof window === 'undefined' || this.isInitialized) return;
    this.isInitialized = true;

    try {
      const isUserMuted = typeof window !== 'undefined' && localStorage.getItem('sme_fan_bg_audio_muted') === 'true';
      if (isUserMuted) {
        this.userPaused = true;
      }

      this.audio = new Audio();
      this.audio.loop = true;
      this.audio.preload = 'auto';
      // Volume ~20% (soft ambient background music as requested)
      this.audio.volume = 0.20;

      this.audio.src = this.primaryUrl;

      this.audio.onerror = () => {
        if (this.audio && this.audio.src !== this.fallbackUrl) {
          console.warn('Switching to local audio fallback...');
          this.audio.src = this.fallbackUrl;
          if (this.isPlaying && !this.userPaused) {
            this.audio.play().catch(() => {});
          }
        }
      };

      this.audio.onplay = () => {
        this.isPlaying = true;
        this.notify();
      };

      this.audio.onpause = () => {
        this.isPlaying = false;
        this.notify();
      };

      const cleanupGestures = () => {
        if (this.removeGestureListeners) {
          this.removeGestureListeners();
          this.removeGestureListeners = null;
        }
      };

      // 1. Attempt immediate autoplay on mount (only if user hasn't explicitly paused)
      if (!this.userPaused) {
        this.tryAutoplay(cleanupGestures);
      }

      // 2. Gesture fallback: Browser Autoplay Policy requires first user gesture
      const onFirstGesture = () => {
        if (!this.userPaused && this.audio && this.audio.paused) {
          this.play();
        }
        cleanupGestures();
      };

      const removeGestureListeners = () => {
        window.removeEventListener('click', onFirstGesture, true);
        window.removeEventListener('touchstart', onFirstGesture, true);
        window.removeEventListener('pointerdown', onFirstGesture, true);
        window.removeEventListener('scroll', onFirstGesture, true);
        window.removeEventListener('keydown', onFirstGesture, true);
      };

      this.removeGestureListeners = removeGestureListeners;

      window.addEventListener('click', onFirstGesture, true);
      window.addEventListener('touchstart', onFirstGesture, true);
      window.addEventListener('pointerdown', onFirstGesture, true);
      window.addEventListener('scroll', onFirstGesture, true);
      window.addEventListener('keydown', onFirstGesture, true);

    } catch (e) {
      console.warn('Error initializing BackgroundAudioManager:', e);
    }
  }

  tryAutoplay(onSuccess) {
    if (!this.audio || this.userPaused) return;
    const promise = this.audio.play();
    if (promise !== undefined) {
      promise.then(() => {
        this.isPlaying = true;
        if (onSuccess) onSuccess();
        this.notify();
      }).catch(() => {
        // Autoplay blocked by browser until user gesture
        this.isPlaying = false;
        this.notify();
      });
    }
  }

  play() {
    this.userPaused = false;
    try {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('sme_fan_bg_audio_muted');
      }
    } catch (e) {}

    if (!this.audio) this.init();
    if (this.audio) {
      const promise = this.audio.play();
      if (promise !== undefined) {
        promise.then(() => {
          this.isPlaying = true;
          this.notify();
        }).catch((e) => {
          console.warn('Play blocked:', e);
        });
      }
    }
  }

  pause() {
    this.userPaused = true;
    try {
      if (typeof window !== 'undefined') {
        localStorage.setItem('sme_fan_bg_audio_muted', 'true');
      }
    } catch (e) {}

    if (this.audio) {
      this.audio.pause();
      this.isPlaying = false;
      this.notify();
    }
  }

  toggle() {
    if (!this.audio) {
      this.init();
    }
    if (this.audio && !this.audio.paused) {
      this.pause();
    } else {
      this.play();
    }
  }

  subscribe(listener) {
    this.listeners.add(listener);
    // Notify immediate state upon subscription
    listener(this.isPlaying);
    return () => this.listeners.delete(listener);
  }

  notify() {
    this.listeners.forEach((fn) => {
      try {
        fn(this.isPlaying);
      } catch (e) {
        console.warn('Error in audio subscriber:', e);
      }
    });
  }
}

export const bgAudio = new BackgroundAudioManager();
