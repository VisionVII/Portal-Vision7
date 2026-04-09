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
  Gauge,
  Heart,
  MoreHorizontal,
  ExternalLink
} from 'lucide-react';
import { Slider } from '@/components/ui/slider';
import { Button } from '@/components/ui/button';
import { useAudioPlayerOptional } from '@/contexts/audio-player';
import { formatDuration } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

type RepeatMode = 'off' | 'all' | 'one';

const MiniPlayerExpanded: React.FC = () => {
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
    const nextMode = repeatMode === 'off' ? 'all' : repeatMode === 'all' ? 'one' : 'off';
    setRepeatMode(nextMode);
    const labels = { off: 'Desativado', all: 'Repetir tudo', one: 'Repetir uma' };
    toast({ title: 'Modo de repetição', description: labels[nextMode] });
  };

  const cyclePlaybackSpeed = () => {
    const speeds = [0.5, 0.75, 1, 1.25, 1.5, 1.75, 2];
    const currentIndex = speeds.indexOf(playbackSpeed);
    const nextSpeed = speeds[(currentIndex + 1) % speeds.length];
    setPlaybackSpeed(nextSpeed);
    toast({ title: 'Velocidade de reprodução', description: `${nextSpeed}x` });
  };

  return (
    <>
      {/* ═══════════════════════════════════════════════════════
          EXPANDED PLAYER OVERLAY (Fullscreen Spotify-style)
          ═══════════════════════════════════════════════════════ */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="fixed inset-0 z-[60] overflow-hidden bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 dark:from-slate-950 dark:via-slate-900 dark:to-black"
            onClick={() => setIsExpanded(false)}
          >
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 300 }}
              className="flex h-full flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex items-center justify-between border-b border-white/5 px-4 py-4 sm:px-6">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsExpanded(false)}
                  className="gap-2 text-white/80 hover:bg-white/10 hover:text-white"
                >
                  <ChevronDown className="h-5 w-5" />
                  <span className="hidden sm:inline">Minimizar</span>
                </Button>
                <div className="flex gap-1">
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    onClick={handleShare}
                    className="text-white/60 hover:bg-white/10 hover:text-white"
                  >
                    <Share2 className="h-5 w-5" />
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    onClick={() => setIsFavorite(!isFavorite)}
                    className="text-white/60 hover:bg-white/10 hover:text-white"
                  >
                    <Heart className={`h-5 w-5 ${isFavorite ? 'fill-red-500 text-red-500' : ''}`} />
                  </Button>
                  <Link
                    to={track.slug ? `/audiocast/${track.slug}` : `/audiocast/${track.id}`}
                    onClick={() => setIsExpanded(false)}
                  >
                    <Button 
                      variant="ghost" 
                      size="icon"
                      className="text-white/60 hover:bg-white/10 hover:text-white"
                    >
                      <ExternalLink className="h-5 w-5" />
                    </Button>
                  </Link>
                </div>
              </div>

              {/* Main Content */}
              <div className="flex flex-1 flex-col items-center justify-center overflow-y-auto px-4 py-8 sm:px-6">
                {/* Cover Art */}
                <div className="mb-8 w-full max-w-md">
                  <div className="relative aspect-square w-full overflow-hidden rounded-3xl shadow-2xl ring-1 ring-white/10">
                    {track.cover_url ? (
                      <img 
                        src={track.cover_url} 
                        alt={track.title} 
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-primary-700 via-primary-600 to-secondary-600">
                        <Headphones className="h-24 w-24 text-white/90 sm:h-32 sm:w-32" />
                      </div>
                    )}
                    {isLoading && (
                      <div className="absolute inset-0 flex items-center justify-center bg-black/60 backdrop-blur-sm">
                        <div className="h-12 w-12 animate-spin rounded-full border-4 border-white/20 border-t-white" />
                      </div>
                    )}
                  </div>
                </div>

                {/* Track Info */}
                <div className="mb-8 w-full max-w-2xl text-center">
                  <h2 className="mb-2 text-2xl font-bold text-white sm:text-3xl">{track.title}</h2>
                  {track.description && (
                    <p className="text-sm text-white/60 sm:text-base">{track.description}</p>
                  )}
                </div>

                {/* Progress Bar */}
                <div className="mb-6 w-full max-w-2xl space-y-2">
                  <Slider
                    value={[currentTime]}
                    max={duration || 100}
                    step={1}
                    onValueChange={([v]) => seek(v)}
                    className="w-full [&_[role=slider]]:h-4 [&_[role=slider]]:w-4 [&_[role=slider]]:border-0 [&_[role=slider]]:bg-white [&_[role=slider]]:shadow-lg"
                  />
                  <div className="flex justify-between text-xs text-white/60 sm:text-sm">
                    <span>{formatDuration(currentTime)}</span>
                    <span>{formatDuration(duration || 0)}</span>
                  </div>
                </div>

                {/* Main Controls */}
                <div className="mb-8 flex items-center justify-center gap-3 sm:gap-6">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={cycleRepeatMode}
                    className={`h-10 w-10 text-white/60 hover:bg-white/10 hover:text-white ${
                      repeatMode !== 'off' ? 'text-primary' : ''
                    }`}
                  >
                    {repeatMode === 'one' ? <Repeat1 className="h-5 w-5" /> : <Repeat className="h-5 w-5" />}
                  </Button>

                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => skipBackward(15)}
                    className="h-12 w-12 text-white/80 hover:bg-white/10 hover:text-white"
                  >
                    <SkipBack className="h-6 w-6" />
                  </Button>

                  <Button
                    onClick={toggle}
                    disabled={isLoading}
                    className="h-16 w-16 rounded-full bg-white text-slate-900 shadow-2xl hover:scale-105 hover:bg-white/90 sm:h-20 sm:w-20"
                  >
                    {isPlaying ? (
                      <Pause className="h-8 w-8 sm:h-10 sm:w-10" />
                    ) : (
                      <Play className="h-8 w-8 sm:h-10 sm:w-10" />
                    )}
                  </Button>

                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => skipForward(15)}
                    className="h-12 w-12 text-white/80 hover:bg-white/10 hover:text-white"
                  >
                    <SkipForward className="h-6 w-6" />
                  </Button>

                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={cyclePlaybackSpeed}
                    className={`h-10 w-10 text-white/60 hover:bg-white/10 hover:text-white ${
                      playbackSpeed !== 1 ? 'text-primary' : ''
                    }`}
                  >
                    <Gauge className="h-5 w-5" />
                  </Button>
                </div>

                {/* Speed indicator */}
                {playbackSpeed !== 1 && (
                  <div className="mb-4 rounded-full bg-primary/20 px-3 py-1 text-xs font-medium text-primary">
                    {playbackSpeed}x
                  </div>
                )}

                {/* Volume Control */}
                <div className="flex w-full max-w-md items-center gap-3">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={toggleMute}
                    className="shrink-0 text-white/60 hover:bg-white/10 hover:text-white"
                  >
                    {isMuted ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
                  </Button>
                  <Slider
                    value={[isMuted ? 0 : volume]}
                    max={1}
                    step={0.05}
                    onValueChange={([v]) => setVolume(v)}
                    className="flex-1"
                  />
                  <span className="w-10 shrink-0 text-right text-sm text-white/60">
                    {Math.round((isMuted ? 0 : volume) * 100)}%
                  </span>
                </div>

                {/* Secondary Actions */}
                <div className="mt-8 flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleDownload}
                    className="gap-2 border-white/20 bg-white/5 text-white/80 hover:bg-white/10 hover:text-white"
                  >
                    <Download className="h-4 w-4" />
                    Download
                  </Button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ═══════════════════════════════════════════════════════
          MINIMIZED BAR (Bottom sticky player)
          ═══════════════════════════════════════════════════════ */}
      <motion.div
        initial={{ y: 100 }}
        animate={{ y: 0 }}
        exit={{ y: 100 }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        className="fixed bottom-0 left-0 right-0 z-50 border-t border-border/60 bg-card/95 shadow-2xl shadow-black/20 backdrop-blur-xl"
      >
        {/* Thin progress bar at very top */}
        <div className="h-0.5 w-full bg-border/30">
          <div
            className="h-full bg-gradient-to-r from-primary to-secondary-500 transition-[width] duration-200"
            style={{ width: `${progress}%` }}
          />
        </div>

        <div className="container mx-auto flex items-center gap-3 px-3 py-2.5 sm:gap-4 sm:px-4 sm:py-3">
          {/* Cover / Icon */}
          <button
            onClick={() => setIsExpanded(true)}
            className="relative shrink-0 overflow-hidden rounded-lg transition-transform hover:scale-105"
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
          </button>

          {/* Track info */}
          <button
            onClick={() => setIsExpanded(true)}
            className="min-w-0 flex-1 text-left transition-opacity hover:opacity-80"
          >
            <div className="truncate text-sm font-semibold text-foreground sm:text-base">
              {track.title}
            </div>
            <div className="mt-0.5 flex items-center gap-2 text-[11px] text-muted-foreground">
              <span>{formatDuration(currentTime)}</span>
              <span>/</span>
              <span>{formatDuration(duration || 0)}</span>
            </div>
          </button>

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
              className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-primary text-primary-foreground transition-all hover:scale-105 hover:bg-primary/90 sm:h-10 sm:w-10"
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

            <button
              onClick={() => setIsExpanded(true)}
              className="hidden rounded-full p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground sm:inline-flex"
              title="Expandir player"
            >
              <ChevronUp className="h-4 w-4" />
            </button>

            <button
              onClick={close}
              className="rounded-full p-1.5 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
              title="Fechar player"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      </motion.div>
    </>
  );
};

export default MiniPlayerExpanded;
