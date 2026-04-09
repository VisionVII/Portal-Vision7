import { createContext, useContext } from 'react';

export interface AudioTrack {
  id: string;
  title: string;
  audio_url: string;
  cover_url?: string | null;
  duration?: number | null;
  description?: string | null;
  slug?: string;
}

interface AudioPlayerState {
  track: AudioTrack | null;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  isMuted: boolean;
  isMinimized: boolean;
  isLoading: boolean;
}

interface AudioPlayerActions {
  play: (track: AudioTrack) => void;
  pause: () => void;
  resume: () => void;
  toggle: () => void;
  seek: (time: number) => void;
  setVolume: (vol: number) => void;
  toggleMute: () => void;
  skipForward: (seconds?: number) => void;
  skipBackward: (seconds?: number) => void;
  minimize: () => void;
  maximize: () => void;
  close: () => void;
}

export type AudioPlayerContextType = AudioPlayerState & AudioPlayerActions;

export const AudioPlayerContext = createContext<AudioPlayerContextType | null>(null);

export const useAudioPlayer = () => {
  const ctx = useContext(AudioPlayerContext);
  if (!ctx) throw new Error('useAudioPlayer must be used within AudioPlayerProvider');
  return ctx;
};

export const useAudioPlayerOptional = () => useContext(AudioPlayerContext);