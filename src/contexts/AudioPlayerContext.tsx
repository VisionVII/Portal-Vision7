import React, { useState, useRef, useCallback, useEffect } from 'react';

import { AudioPlayerContext, AudioPlayerContextType, AudioTrack } from '@/contexts/audio-player';

export const AudioPlayerProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [state, setState] = useState<Omit<AudioPlayerContextType, 'play' | 'pause' | 'resume' | 'toggle' | 'seek' | 'setVolume' | 'toggleMute' | 'skipForward' | 'skipBackward' | 'minimize' | 'maximize' | 'close'>>({
    track: null,
    isPlaying: false,
    currentTime: 0,
    duration: 0,
    volume: 0.8,
    isMuted: false,
    isMinimized: true,
    isLoading: false,
  });

  // Lazy init the audio element once
  useEffect(() => {
    if (!audioRef.current) {
      audioRef.current = new Audio();
      audioRef.current.volume = 0.8;
      audioRef.current.preload = 'metadata';
    }
    const audio = audioRef.current;

    const onTimeUpdate = () => setState(s => ({ ...s, currentTime: audio.currentTime }));
    const onLoadedMetadata = () => setState(s => ({ ...s, duration: audio.duration, isLoading: false }));
    const onEnded = () => setState(s => ({ ...s, isPlaying: false, currentTime: 0 }));
    const onWaiting = () => setState(s => ({ ...s, isLoading: true }));
    const onCanPlay = () => setState(s => ({ ...s, isLoading: false }));

    audio.addEventListener('timeupdate', onTimeUpdate);
    audio.addEventListener('loadedmetadata', onLoadedMetadata);
    audio.addEventListener('ended', onEnded);
    audio.addEventListener('waiting', onWaiting);
    audio.addEventListener('canplay', onCanPlay);

    return () => {
      audio.removeEventListener('timeupdate', onTimeUpdate);
      audio.removeEventListener('loadedmetadata', onLoadedMetadata);
      audio.removeEventListener('ended', onEnded);
      audio.removeEventListener('waiting', onWaiting);
      audio.removeEventListener('canplay', onCanPlay);
      audio.pause();
      audio.src = '';
    };
  }, []);

  const play = useCallback((track: AudioTrack) => {
    const audio = audioRef.current;
    if (!audio) return;

    // If same track, just resume
    if (state.track?.id === track.id && audio.src) {
      audio.play().catch(() => {});
      setState(s => ({ ...s, isPlaying: true, isMinimized: true }));
      return;
    }

    audio.src = track.audio_url;
    audio.load();
    audio.play().catch(() => {});
    setState(s => ({
      ...s,
      track,
      isPlaying: true,
      currentTime: 0,
      isMinimized: true,
      isLoading: true,
    }));
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

  const minimize = useCallback(() => setState(s => ({ ...s, isMinimized: true })), []);
  const maximize = useCallback(() => setState(s => ({ ...s, isMinimized: false })), []);

  const close = useCallback(() => {
    const audio = audioRef.current;
    if (audio) {
      audio.pause();
      audio.src = '';
    }
    setState(s => ({
      ...s,
      track: null,
      isPlaying: false,
      currentTime: 0,
      duration: 0,
      isMinimized: true,
    }));
  }, []);

  const value: AudioPlayerContextType = {
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
    minimize,
    maximize,
    close,
  };

  return (
    <AudioPlayerContext.Provider value={value}>
      {children}
    </AudioPlayerContext.Provider>
  );
};
