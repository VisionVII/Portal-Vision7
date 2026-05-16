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
  // audioRef points to the <audio> element rendered in JSX below.
  // React-rendered element is more reliable on Android WebView than new Audio().
  const audioRef    = useRef<HTMLAudioElement | null>(null);
  const unlockedRef = useRef(false);
  // Tracks the pending canplay handler so we can cancel it on rapid track switches
  const pendingCanplayRef = useRef<(() => void) | null>(null);

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

  // ── Attach event listeners once the <audio> ref is available ─────────────
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    audio.volume = 0.8;

    // ── Pre-unlock on first user gesture (iOS + Android) ─────────────────
    // Calling play() in a user-gesture context activates the element so that
    // later play() calls (e.g. from the canplay handler) are never blocked by
    // the autoplay policy, even when outside gesture context.
    const unlock = () => {
      if (unlockedRef.current) return;
      unlockedRef.current = true;
      const p = audio.play();
      if (p) p.then(() => { audio.pause(); audio.currentTime = 0; }).catch(() => {});
    };
    document.addEventListener('touchstart', unlock, { once: true, passive: true });
    document.addEventListener('click',      unlock, { once: true });

    // ── Throttled time update (1 s resolution) ────────────────────────────
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
    const onCanPlayState = () => setState(s => ({ ...s, isLoading: false }));

    // Sync React state with real audio state (handles phone calls, headphone
    // unplug, OS media controls interrupting playback)
    const onPlay  = () => {
      setState(s => ({ ...s, isPlaying: true, isLoading: false }));
      if ('mediaSession' in navigator)
        navigator.mediaSession.playbackState = 'playing';
    };
    const onPause = () => {
      setState(s => ({ ...s, isPlaying: false }));
      if ('mediaSession' in navigator)
        navigator.mediaSession.playbackState = 'paused';
    };

    // MediaError codes: 1=ABORTED 2=NETWORK 3=DECODE 4=SRC_NOT_SUPPORTED
    const onError = () => {
      const code = audio.error?.code ?? 0;
      console.error('[AudioPlayer] MediaError', code, audio.error?.message ?? '');
      setState(s => ({ ...s, isPlaying: false, isLoading: false }));
    };

    audio.addEventListener('timeupdate',     onTimeUpdate);
    audio.addEventListener('loadedmetadata', onLoadedMetadata);
    audio.addEventListener('ended',          onEnded);
    audio.addEventListener('waiting',        onWaiting);
    audio.addEventListener('canplay',        onCanPlayState);
    audio.addEventListener('play',           onPlay);
    audio.addEventListener('pause',          onPause);
    audio.addEventListener('error',          onError);

    return () => {
      document.removeEventListener('touchstart', unlock);
      document.removeEventListener('click',      unlock);
      audio.removeEventListener('timeupdate',     onTimeUpdate);
      audio.removeEventListener('loadedmetadata', onLoadedMetadata);
      audio.removeEventListener('ended',          onEnded);
      audio.removeEventListener('waiting',        onWaiting);
      audio.removeEventListener('canplay',        onCanPlayState);
      audio.removeEventListener('play',           onPlay);
      audio.removeEventListener('pause',          onPause);
      audio.removeEventListener('error',          onError);
      audio.pause();
      audio.src = '';
    };
  }, []);

  // ── MediaSession action handlers ──────────────────────────────────────────
  useEffect(() => {
    if (!('mediaSession' in navigator) || !state.track) return;

    const audio = audioRef.current;
    if (!audio) return;

    navigator.mediaSession.setActionHandler('play',  () => { audio.play().catch(() => {}); });
    navigator.mediaSession.setActionHandler('pause', () => { audio.pause(); });
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
      setState(s => ({ ...s, isMinimized: true }));
      return;
    }

    // Cancel any pending canplay listener from a previous in-flight load
    if (pendingCanplayRef.current) {
      audio.removeEventListener('canplay', pendingCanplayRef.current);
      pendingCanplayRef.current = null;
    }

    audio.pause();
    audio.currentTime = 0;

    setState(s => ({
      ...s,
      track,
      isPlaying: false,   // onPlay event drives this to true
      currentTime: 0,
      isMinimized: true,
      isLoading: true,
    }));

    setMediaSessionMetadata(track);

    // Register canplay listener BEFORE changing src so we never miss the event,
    // even on fast CDN connections where canplay fires almost immediately.
    const onReady = () => {
      pendingCanplayRef.current = null;
      audio.play().catch(err => {
        console.error('[AudioPlayer] play() from canplay:', err.name, err.message);
        setState(s => ({ ...s, isPlaying: false, isLoading: false }));
      });
    };
    pendingCanplayRef.current = onReady;
    audio.addEventListener('canplay', onReady, { once: true });

    audio.src = track.audio_url;
    audio.load(); // Explicitly start buffering — required on some Android WebViews

    // Also call play() immediately (in user-gesture context) as iOS activation
    // insurance. Almost always throws AbortError (load in progress) — that's
    // expected and ignored; the canplay handler above handles actual playback.
    audio.play().catch(err => {
      if (err.name !== 'AbortError') {
        // Unexpected error (e.g. NotAllowedError, NotSupportedError) — abort
        audio.removeEventListener('canplay', onReady);
        pendingCanplayRef.current = null;
        console.error('[AudioPlayer] immediate play():', err.name, err.message);
        setState(s => ({ ...s, isPlaying: false, isLoading: false }));
      }
      // AbortError is expected when load() is in progress — ignore
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
      {/*
        Hidden <audio> element rendered by React — more reliable than new Audio()
        on Android WebView. React guarantees it is in the real DOM tree before
        any effect runs, so audioRef.current is always valid in useEffect.
        preload="auto" starts buffering immediately when src is set, reducing
        the delay before the first sound on slow mobile connections.
      */}
      <audio
        ref={audioRef}
        preload="auto"
        style={{ position: 'absolute', width: 0, height: 0, opacity: 0, pointerEvents: 'none' }}
      />
    </AudioPlayerContext.Provider>
  );
};
