import React from 'react';
import { Link } from 'react-router-dom';
import { Play, Pause, X, SkipBack, SkipForward, Headphones, Volume2, VolumeX, ChevronUp } from 'lucide-react';
import { Slider } from '@/components/ui/slider';
import { useAudioPlayerOptional } from '@/contexts/audio-player';
import { formatDuration } from '@/lib/utils';

const MiniPlayer: React.FC = () => {
  const player = useAudioPlayerOptional();
  if (!player || !player.track) return null;

  const { track, isPlaying, currentTime, duration, isLoading, isMuted, toggle, seek, close, skipForward, skipBackward, toggleMute } = player;
  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 border-t border-border/60 bg-card/95 shadow-2xl shadow-black/20 backdrop-blur-xl transition-transform duration-300">
      {/* Thin progress bar at very top */}
      <div className="h-0.5 w-full bg-border/30">
        <div
          className="h-full bg-gradient-to-r from-primary to-secondary-500 transition-[width] duration-200"
          style={{ width: `${progress}%` }}
        />
      </div>

      <div className="container mx-auto flex items-center gap-3 px-3 py-2.5 sm:gap-4 sm:px-4 sm:py-3">
        {/* Cover / Icon */}
        <Link
          to={track.slug ? `/audiocast/${track.slug}` : `/audiocast/${track.id}`}
          className="relative shrink-0 overflow-hidden rounded-lg"
        >
          {track.cover_url ? (
            <img src={track.cover_url} alt={track.title} className="h-11 w-11 object-cover sm:h-12 sm:w-12" />
          ) : (
            <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-gradient-to-br from-primary-700 to-secondary-600 sm:h-12 sm:w-12">
              <Headphones className="h-5 w-5 text-white" />
            </div>
          )}
          {isLoading && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/40">
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
            </div>
          )}
        </Link>

        {/* Track info */}
        <div className="min-w-0 flex-1">
          <Link
            to={track.slug ? `/audiocast/${track.slug}` : `/audiocast/${track.id}`}
            className="block truncate text-sm font-semibold text-foreground hover:text-primary sm:text-base"
          >
            {track.title}
          </Link>
          <div className="mt-0.5 flex items-center gap-2 text-[11px] text-muted-foreground">
            <span>{formatDuration(currentTime)}</span>
            <span>/</span>
            <span>{formatDuration(duration || 0)}</span>
          </div>
        </div>

        {/* Seek slider — hidden on mobile for compactness */}
        <div className="hidden min-w-0 flex-1 px-2 md:block lg:max-w-sm">
          <Slider
            value={[currentTime]}
            max={duration || 1}
            step={1}
            onValueChange={([v]) => seek(v)}
            className="w-full"
          />
        </div>

        {/* Controls */}
        <div className="flex shrink-0 items-center gap-1 sm:gap-1.5">
          <button
            onClick={() => skipBackward(15)}
            className="hidden rounded-full p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground sm:inline-flex"
            title="Recuar 15s"
          >
            <SkipBack className="h-4 w-4" />
          </button>

          <button
            onClick={toggle}
            disabled={isLoading}
            className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-primary text-primary-foreground transition-colors hover:bg-primary/90 sm:h-10 sm:w-10"
          >
            {isPlaying ? <Pause className="h-4 w-4 sm:h-5 sm:w-5" /> : <Play className="h-4 w-4 sm:h-5 sm:w-5" />}
          </button>

          <button
            onClick={() => skipForward(15)}
            className="hidden rounded-full p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground sm:inline-flex"
            title="Avançar 15s"
          >
            <SkipForward className="h-4 w-4" />
          </button>

          <button
            onClick={toggleMute}
            className="hidden rounded-full p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground md:inline-flex"
            title={isMuted ? 'Ativar som' : 'Silenciar'}
          >
            {isMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
          </button>

          <Link
            to={track.slug ? `/audiocast/${track.slug}` : `/audiocast/${track.id}`}
            className="hidden rounded-full p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground sm:inline-flex"
            title="Ver episódio completo"
          >
            <ChevronUp className="h-4 w-4" />
          </Link>

          <button
            onClick={close}
            className="rounded-full p-1.5 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
            title="Fechar player"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default MiniPlayer;
