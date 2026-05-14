import React, { useState, useRef, useCallback, useEffect, useMemo } from 'react';

import { AudioPlayerContext, AudioPlayerContextType, AudioTrack } from '@/contexts/audio-player';

// ─── MediaSession helpers ────────────────────────────────────────────────────

function setMediaSessionMetadata(track: AudioTrack) {
  if (!('mediaSession' in navigator)) return;
  navigator.mediaSession.metadata = new MediaMetadata({
    title: track.title,
    artist: 'Vision7',
    artwork: track.cover_url
      ? [
          { src: track.cover_url, sizes: '96x96',   type: 'image/jpeg' },
          { src: track.cover_url, sizes: '256x256',  type: 'image/jpeg' },
          { src: track.cover_url, sizes: '512x512',  type: 'image/jpeg' },
        ]
      : [],
  });
}

function clearMediaSession() {
  if (!('mediaSession' in navigator)) return;
  navigator.mediaSession.metadata = null;
}

// ─── Provider ────────────────────────────────────────────────────────────────

export const AudioPlayerProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const audioRef  = useRef<HTMLAudioElement | null>(null);
  const unlockedRef = useRef(false);

  const [state, setState] = useState<Omit<AudioPlayerContextType,
    | 'play' | 'pause' | 'resume' | 'toggle' | 'seek'
    | 'setVolume' | 'toggleMute' | 'skipForward' | 'skipBackward'
    | 'setPlaybackRate' | 'minimize' | 'maximize' | 'close'
  >>({
    track: null,
    isPlaying: false,
    currentTime: 0,
    duration: 0,
    volume: 0.8,
    isMuted: false,
    isMinimized: true,
    isLoading: false,
    playbackRate: 1,
  });

  // ── Init audio element + all event listeners ──────────────────────────────
  useEffect(() => {
    if (!audioRef.current) {
      const audio = new Audio();
      audio.volume   = 0.8;
      audio.preload  = 'metadata';
      // Attach to DOM — required by some Android WebView/Chrome for audio output
      audio.style.cssText =
        'position:absolute;width:0;height:0;opacity:0;pointer-events:none;';
      document.body.appendChild(audio);
      audioRef.current = audio;
    }
    const audio = audioRef.current;

    // ── Pre-unlock on first user gesture (iOS + Android) ──────────────────
    // iOS Safari: the audio element must be "activated" by a play() call
    // that originates from a user gesture BEFORE the real play() occurs.
    // We silently unlock on the very first touch/click anywhere on the page,
    // so subsequent play() calls (even from canplay event) always succeed.
    const unlock = () => {
      if (unlockedRef.current) return;
      unlockedRef.current = true;
      const p = audio.play();
      if (p) p.then(() => { audio.pause(); audio.currentTime = 0; }).catch(() => {});
    };
    document.addEventListener('touchstart', unlock, { once: true, passive: true });
    document.addEventListener('click',      unlock, { once: true });

    // ── Throttled time update (1 s resolution) ─────────────────────────────
    let lastReported = 0;
    const onTimeUpdate = () => {
      const now = audio.currentTime;
      if (Math.abs(now - lastReported) >= 1) {
        lastReported = now;
        setState(s => (Math.abs(s.currentTime - now) < 1 ? s : { ...s, currentTime: now }));
      }
    };

    const onLoadedMetadata = () =>
      setState(s => ({ ...s, duration: audio.duration, isLoading: false }));

    const onEnded = () => {
      setState(s => ({ ...s, isPlaying: false, currentTime: 0 }));
      if ('mediaSession' in navigator)
        navigator.mediaSession.playbackState = 'none';
    };

    const onWaiting  = () => setState(s => ({ ...s, isLoading: true  }));
    const onCanPlay  = () => setState(s => ({ ...s, isLoading: false }));

    // Sync React state with real audio state (handles external interruptions
    // like phone calls, headphone unplug, OS media controls)
    const onPlay  = () => {
      setState(s => ({ ...s, isPlaying: true,  isLoading: false }));
      if ('mediaSession' in navigator)
        navigator.mediaSession.playbackState = 'playing';
    };
    const onPause = () => {
      setState(s => ({ ...s, isPlaying: false }));
      if ('mediaSession' in navigator)
        navigator.mediaSession.playbackState = 'paused';
    };

    // ── Error handler — surfaces MediaError codes for debugging ───────────
    const onError = () => {
      const code = audio.error?.code ?? 0;
      // MediaError codes: 1=ABORTED 2=NETWORK 3=DECODE 4=SRC_NOT_SUPPORTED
      console.error('[AudioPlayer] MediaError', code, audio.error?.message ?? '');
      setState(s => ({ ...s, isPlaying: false, isLoading: false }));
    };

    audio.addEventListener('timeupdate',    onTimeUpdate);
    audio.addEventListener('loadedmetadata', onLoadedMetadata);
    audio.addEventListener('ended',          onEnded);
    audio.addEventListener('waiting',        onWaiting);
    audio.addEventListener('canplay',        onCanPlay);
    audio.addEventListener('play',           onPlay);
    audio.addEventListener('pause',          onPause);
    audio.addEventListener('error',          onError);

    return () => {
      document.removeEventListener('touchstart', unlock);
      document.removeEventListener('click',      unlock);
      audio.removeEventListener('timeupdate',    onTimeUpdate);
      audio.removeEventListener('loadedmetadata', onLoadedMetadata);
      audio.removeEventListener('ended',          onEnded);
      audio.removeEventListener('waiting',        onWaiting);
      audio.removeEventListener('canplay',        onCanPlay);
      audio.removeEventListener('play',           onPlay);
      audio.removeEventListener('pause',          onPause);
      audio.removeEventListener('error',          onError);
      audio.pause();
      audio.src = '';
      audio.remove();
    };
  }, []);

  // ── MediaSession action handlers (lock screen, headphones, notifications) ─
  useEffect(() => {
    if (!('mediaSession' in navigator) || !state.track) return;

    const audio = audioRef.current;
    if (!audio) return;

    navigator.mediaSession.setActionHandler('play',  () => {
      audio.play().catch(() => {});
    });
    navigator.mediaSession.setActionHandler('pause', () => {
      audio.pause();
    });
    navigator.mediaSession.setActionHandler('seekbackward', (details) => {
      audio.currentTime = Math.max(0, audio.currentTime - (details.seekOffset ?? 15));
    });
    navigator.mediaSession.setActionHandler('seekforward', (details) => {
      audio.currentTime = Math.min(audio.duration || 0, audio.currentTime + (details.seekOffset ?? 15));
    });
    navigator.mediaSession.setActionHandler('stop', () => {
      audio.pause();
      audio.src = '';
      setState(s => ({ ...s, track: null, isPlaying: false, currentTime: 0, duration: 0 }));
      clearMediaSession();
    });
  }, [state.track]);

  // ── play ──────────────────────────────────────────────────────────────────
  const play = useCallback((track: AudioTrack) => {
    const audio = audioRef.current;
    if (!audio) return;

    // Same track already loaded — just resume
    if (state.track?.id === track.id && audio.src) {
      audio.play().catch(() => {});
      setState(s => ({ ...s, isPlaying: true, isMinimized: true }));
      return;
    }

    audio.pause();
    audio.currentTime = 0;
    audio.src = track.audio_url;
    // Do NOT call audio.load() — it causes an AbortError race:
    // load() → play() immediately → AbortError → canplay retry added, but canplay
    // may already have fired on fast CDN (Supabase), so the retry never runs.
    // play() alone starts buffering AND playing; the browser queues play until
    // readyState >= HAVE_FUTURE_DATA without the competing load() abort.

    setState(s => ({
      ...s,
      track,
      isPlaying: true,
      currentTime: 0,
      isMinimized: true,
      isLoading: true,
    }));

    setMediaSessionMetadata(track);

    const tryPlay = () =>
      audio.play().catch(() => setState(s => ({ ...s, isPlaying: false, isLoading: false })));

    audio.play().catch((err) => {
      if (err.name === 'AbortError') {
        // Rare: a previous load() from pause/src-change is still in flight.
        // readyState check avoids missing canplay if it already fired.
        if (audio.readyState >= 3) {
          tryPlay();
        } else {
          audio.addEventListener('canplay', tryPlay, { once: true });
        }
      } else {
        console.error('[AudioPlayer] play() rejected:', err.name, err.message);
        setState(s => ({ ...s, isPlaying: false, isLoading: false }));
      }
    });
  }, [state.track?.id]);

  const pause = useCallback(() => {
    audioRef.current?.pause();
    setState(s => ({ ...s, isPlaying: false }));
  }, []);

  const resume = useCallback(() => {
    audioRef.current?.play().catch(() => {});
    setState(s => ({ ...s, isPlaying: true }));
  }, []);

  const toggle = useCallback(() => {
    if (state.isPlaying) pause();
    else resume();
  }, [state.isPlaying, pause, resume]);

  const seek = useCallback((time: number) => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.currentTime = time;
    setState(s => ({ ...s, currentTime: time }));
  }, []);

  const setVolumeAction = useCallback((vol: number) => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.volume = vol;
    setState(s => ({ ...s, volume: vol, isMuted: vol === 0 }));
  }, []);

  const toggleMute = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    if (state.isMuted) {
      audio.volume = state.volume || 0.8;
      setState(s => ({ ...s, isMuted: false }));
    } else {
      audio.volume = 0;
      setState(s => ({ ...s, isMuted: true }));
    }
  }, [state.isMuted, state.volume]);

  const skipForward = useCallback((seconds = 15) => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.currentTime = Math.min(audio.duration || 0, audio.currentTime + seconds);
  }, []);

  const skipBackward = useCallback((seconds = 15) => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.currentTime = Math.max(0, audio.currentTime - seconds);
  }, []);

  const setPlaybackRate = useCallback((rate: number) => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.playbackRate = rate;
    setState(s => ({ ...s, playbackRate: rate }));
  }, []);

  const minimize = useCallback(() => setState(s => ({ ...s, isMinimized: true  })), []);
  const maximize = useCallback(() => setState(s => ({ ...s, isMinimized: false })), []);

  const close = useCallback(() => {
    const audio = audioRef.current;
    if (audio) { audio.pause(); audio.src = ''; }
    setState(s => ({ ...s, track: null, isPlaying: false, currentTime: 0, duration: 0, isMinimized: true }));
    clearMediaSession();
  }, []);

  const value: AudioPlayerContextType = useMemo(() => ({
    ...state,
    play,
    pause,
    resume,
    toggle,
    seek,
    setVolume: setVolumeAction,
    toggleMute,
    skipForward,
    skipBackward,
    setPlaybackRate,
    minimize,
    maximize,
    close,
  }), [state, play, pause, resume, toggle, seek, setVolumeAction, toggleMute,
      skipForward, skipBackward, setPlaybackRate, minimize, maximize, close]);

  return (
    <AudioPlayerContext.Provider value={value}>
      {children}
    </AudioPlayerContext.Provider>
  );
};
