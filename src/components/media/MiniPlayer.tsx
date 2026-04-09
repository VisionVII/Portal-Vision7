import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import { 
  Play, 
  Pause, 
  X, 
  SkipBack, 
  SkipForward, 
  Headphones, 
  Volume2, 
  VolumeX, 
  ChevronUp, 
  ChevronDown,
  Repeat,
  Repeat1,
  Share2,
  Download,
  Clock,
  Gauge,
  ListMusic,
  Heart,
  MoreHorizontal
} from 'lucide-react';
import { Slider } from '@/components/ui/slider';
import { Button } from '@/components/ui/button';
import { useAudioPlayerOptional } from '@/contexts/audio-player';
import { formatDuration } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

type RepeatMode = 'off' | 'all' | 'one';

const MiniPlayer: React.FC = () => {
  const player = useAudioPlayerOptional();
  const { toast } = useToast();
  const [isExpanded, setIsExpanded] = useState(false);
  const [repeatMode, setRepeatMode] = useState<RepeatMode>('off');
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [isFavorite, setIsFavorite] = useState(false);

  if (!player || !player.track) return null;

  const { 
    track, 
    isPlaying, 
    currentTime, 
    duration, 
    isLoading, 
    isMuted, 
    volume,
    toggle, 
    seek, 
    close, 
    skipForward, 
    skipBackward, 
    toggleMute,
    setVolume
  } = player;
  
  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  const handleShare = async () => {
    const url = track.slug ? `${window.location.origin}/audiocast/${track.slug}` : `${window.location.origin}/audiocast/${track.id}`;
    
    if (navigator.share) {
      try {
        await navigator.share({ title: track.title, text: track.description || '', url });
      } catch {}
    } else {
      navigator.clipboard.writeText(url);
      toast({ title: 'Link copiado', description: 'Link copiado para área de transferência.' });
    }
  };

  const handleDownload = () => {
    if (!track.audio_url) return;
    const link = document.createElement('a');
    link.href = track.audio_url;
    link.download = `${track.title}.mp3`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast({ title: 'Download iniciado', description: 'O audiocast está sendo baixado.' });
  };

  const cycleRepeatMode = () => {
    setRepeatMode(prev => prev === 'off' ? 'all' : prev === 'all' ? 'one' : 'off');
  };

  const cyclePlaybackSpeed = () => {
    const speeds = [0.5, 0.75, 1, 1.25, 1.5, 1.75, 2];
    const currentIndex = speeds.indexOf(playbackSpeed);
    const nextSpeed = speeds[(currentIndex + 1) % speeds.length];
    setPlaybackSpeed(nextSpeed);
    toast({ title: 'Velocidade alterada', description: `${nextSpeed}x` });
  };

  return (
    <>
      {/* ═══ EXPANDED PLAYER OVERLAY ═══ */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="fixed inset-0 z-[60] bg-gradient-to-b from-background via-background to-muted/30 backdrop-blur-2xl"
            onClick={() => setIsExpanded(false)}
          >
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 300 }}
              className="h-full overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="container mx-auto max-w-4xl px-4 py-8">
                {/* Header */}
                <div className="mb-8 flex items-center justify-between">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsExpanded(false)}
                    className="gap-2"
                  >
                    <ChevronDown className="h-5 w-5" />
                    Minimizar
                  </Button>
                  <div className="flex gap-2">
                    <Button variant="ghost" size="icon" onClick={handleShare}>
                      <Share2 className="h-5 w-5" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => setIsFavorite(!isFavorite)}>
                      <Heart className={`h-5 w-5 ${isFavorite ? 'fill-red-500 text-red-500' : ''}`} />
                    </Button>
                    <Button variant="ghost" size="icon">
                      <MoreHorizontal className="h-5 w-5" />
                    </Button>
                  </div>
                </div>

                {/* Cover Art */}
                <div className="mb-8 flex justify-center">
                  <div className="relative aspect-square w-full max-w-md overflow-hidden rounded-3xl shadow-2xl">
                    {track.
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
