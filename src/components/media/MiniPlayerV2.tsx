import React, { useState } from 'react';
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
  ChevronDown,
  Repeat,
  Repeat1,
  Share2,
  Download,
  ExternalLink
} from 'lucide-react';
import { Slider } from '@/components/ui/slider';
import { Button } from '@/components/ui/button';
import { useAudioPlayerOptional } from '@/contexts/audio-player';
import { formatDuration } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

type RepeatMode = 'off' | 'all' | 'one';

const MiniPlayerV2: React.FC = () => {
  const player = useAudioPlayerOptional();
  const { toast } = useToast();
  const [isExpanded, setIsExpanded] = useState(false);
  const [repeatMode, setRepeatMode] = useState<RepeatMode>('off');

  if (!player || !player.track) return null;

  const { 
    track, 
    isPlaying, 
    currentTime, 
    duration, 
    isLoading, 
    isMuted, 
    volume,
    playbackRate,
    toggle, 
    seek, 
    close, 
    skipForward, 
    skipBackward, 
    toggleMute,
    setVolume,
    setPlaybackRate
  } = player;
  
  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  const handleShare = async () => {
    const url = track.slug ? `${window.location.origin}/audiocast/${track.slug}` : `${window.location.origin}/audiocast/${track.id}`;
    
    if (navigator.share) {
      try {
        await navigator.share({ title: track.title, text: track.description || '', url });
      } catch {
        // User cancelled native share dialog.
      }
    } else {
      navigator.clipboard.writeText(url);
      toast({ title: 'Link copiado', description: 'Link copiado para a área de transferência.' });
    }
  };

  const handleDownload = () => {
    if (!track.audio_url) return;
    const link = document.createElement('a');
    link.href = track.audio_url;
    const ext = track.audio_url.split('?')[0].split('.').pop() || 'mp3';
    link.download = `${track.title}.${ext}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast({ title: 'Download iniciado', description: 'O audiocast está sendo baixado.' });
  };

  const cycleRepeatMode = () => {
    const nextMode = repeatMode === 'off' ? 'all' : repeatMode === 'all' ? 'one' : 'off';
    setRepeatMode(nextMode);
    const labels = { off: 'Desativado', all: 'Repetir tudo', one: 'Repetir uma' };
    toast({ title: 'Repetição', description: labels[nextMode] });
  };

  const cyclePlaybackSpeed = () => {
    const speeds = [0.5, 0.75, 1, 1.25, 1.5, 1.75, 2];
    const currentIndex = speeds.indexOf(playbackRate);
    const nextSpeed = speeds[(currentIndex + 1) % speeds.length];
    setPlaybackRate(nextSpeed);
    toast({ title: 'Velocidade', description: `${nextSpeed}x` });
  };

  return (
    <>
      {/* ═══════════════════════════════════════════════════════
          EXPANDED PLAYER OVERLAY
          ═══════════════════════════════════════════════════════ */}
      <>
        {isExpanded && (
          <div
            className="fixed inset-0 z-[60] bg-gradient-to-b from-slate-950 via-slate-900 to-black animate-in fade-in duration-200"
            onClick={() => setIsExpanded(false)}
          >
            <div
              className="flex h-full flex-col overflow-hidden animate-in slide-in-from-bottom duration-300"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex shrink-0 items-center justify-between border-b border-white/5 px-4 py-3 sm:px-6 sm:py-4">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsExpanded(false)}
                  className="gap-2 text-white/70 hover:bg-white/10 hover:text-white"
                >
                  <ChevronDown className="h-4 w-4" />
                  <span className="hidden sm:inline">Fechar</span>
                </Button>
                <div className="flex gap-1">
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    aria-label="Partilhar audiocast"
                    className="h-9 w-9 text-white/60 hover:bg-white/10 hover:text-white"
                    onClick={handleShare}
                  >
                    <Share2 className="h-4 w-4" />
                  </Button>
                  <Link
                    to={track.slug ? `/audiocast/${track.slug}` : `/audiocast/${track.id}`}
                    onClick={() => setIsExpanded(false)}
                  >
                    <Button 
                      variant="ghost" 
                      size="icon"
                      aria-label="Ver página do audiocast"
                      className="h-9 w-9 text-white/60 hover:bg-white/10 hover:text-white"
                    >
                      <ExternalLink className="h-4 w-4" />
                    </Button>
                  </Link>
                </div>
              </div>

              {/* Scrollable Content */}
              <div className="flex-1 overflow-y-auto">
                <div className="mx-auto flex min-h-full w-full max-w-lg flex-col items-center justify-center px-4 py-5 sm:px-6 sm:py-8">
                <div className="w-full space-y-5 sm:space-y-6">
                  {/* Cover Art */}
                  <div className="mx-auto w-full max-w-[min(280px,55vw)] sm:max-w-sm">
                    <div className="relative aspect-square w-full overflow-hidden rounded-2xl shadow-2xl ring-1 ring-white/10">
                      {track.cover_url ? (
                        <img 
                          src={track.cover_url} 
                          alt={track.title} 
                          width={400}
                          height={400}
                          className="h-full w-full object-cover"
                          loading="lazy"
                          decoding="async"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-primary-600 to-secondary-600">
                          <Headphones className="h-20 w-20 text-white/90 sm:h-24 sm:w-24" />
                        </div>
                      )}
                      {isLoading && (
                        <div className="absolute inset-0 flex items-center justify-center bg-black/50 backdrop-blur-sm">
                          <div className="h-10 w-10 animate-spin rounded-full border-4 border-white/20 border-t-white" />
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Track Info */}
                  <div className="space-y-1 text-center">
                    <h2 className="text-xl font-bold text-white sm:text-2xl">{track.title}</h2>
                    {track.description && (
                      <p className="text-sm text-white/50">{track.description}</p>
                    )}
                  </div>

                  {/* Progress */}
                  <div className="space-y-2">
                    <Slider
                      value={[currentTime]}
                      max={duration || 100}
                      step={0.1}
                      onValueChange={([v]) => seek(v)}
                      className="w-full"
                    />
                    <div className="flex justify-between text-xs text-white/50">
                      <span>{formatDuration(currentTime)}</span>
                      <span>{formatDuration(duration || 0)}</span>
                    </div>
                  </div>

                  {/* Main Controls */}
                  <div className="flex items-center justify-center gap-4 sm:gap-6">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={cycleRepeatMode}
                      aria-label={repeatMode === 'off' ? 'Ativar repetição' : repeatMode === 'one' ? 'Repetir faixa' : 'Desativar repetição'}
                      className={`h-10 w-10 text-white/50 hover:bg-white/10 hover:text-white ${
                        repeatMode !== 'off' ? 'text-white' : ''
                      }`}
                    >
                      {repeatMode === 'one' ? <Repeat1 className="h-5 w-5" /> : <Repeat className="h-5 w-5" />}
                    </Button>

                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => skipBackward(15)}
                      aria-label="Retroceder 15 segundos"
                      className="h-11 w-11 text-white hover:bg-white/10"
                    >
                      <SkipBack className="h-5 w-5" />
                    </Button>

                    <Button
                      onClick={toggle}
                      disabled={isLoading}
                      aria-label={isPlaying ? 'Pausar' : 'Reproduzir'}
                      className="h-14 w-14 rounded-full bg-white text-slate-900 shadow-xl hover:scale-105 hover:bg-white/90 sm:h-16 sm:w-16"
                    >
                      {isPlaying ? (
                        <Pause className="h-7 w-7 sm:h-8 sm:w-8" />
                      ) : (
                        <Play className="ml-0.5 h-7 w-7 sm:h-8 sm:w-8" />
                      )}
                    </Button>

                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => skipForward(15)}
                      aria-label="Avançar 15 segundos"
                      className="h-11 w-11 text-white hover:bg-white/10"
                    >
                      <SkipForward className="h-5 w-5" />
                    </Button>

                    <button
                      onClick={cyclePlaybackSpeed}
                      aria-label={`Velocidade de reprodução: ${playbackRate}x`}
                      className={`flex h-10 w-10 items-center justify-center rounded-full text-xs font-bold transition-colors ${
                        playbackRate !== 1 
                          ? 'bg-white/20 text-white' 
                          : 'text-white/50 hover:bg-white/10 hover:text-white'
                      }`}
                    >
                      {playbackRate}x
                    </button>
                  </div>

                  {/* Volume */}
                  <div className="flex items-center gap-3">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={toggleMute}
                      aria-label={isMuted ? 'Ativar som' : 'Silenciar'}
                      className="h-9 w-9 shrink-0 text-white/60 hover:bg-white/10 hover:text-white"
                    >
                      {isMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
                    </Button>
                    <Slider
                      value={[isMuted ? 0 : volume]}
                      max={1}
                      step={0.01}
                      onValueChange={([v]) => {
                        setVolume(v);
                        if (v > 0 && isMuted) toggleMute();
                      }}
                      className="flex-1"
                    />
                    <span className="w-10 shrink-0 text-right text-xs text-white/50">
                      {Math.round((isMuted ? 0 : volume) * 100)}%
                    </span>
                  </div>

                  {/* Actions */}
                  <div className="flex justify-center gap-2 pt-2">
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
                </div>
              </div>
            </div>
          </div>
        )}
      </>

      {/* ═══════════════════════════════════════════════════════
          MINIMIZED BAR (hidden when expanded)
          ═══════════════════════════════════════════════════════ */}
      {!isExpanded && (
      <div
        className="fixed bottom-0 left-0 right-0 z-50 border-t border-border/60 bg-card/95 shadow-2xl backdrop-blur-xl animate-in slide-in-from-bottom duration-300"
      >
        {/* Progress bar */}
        <div className="h-0.5 w-full bg-border/30">
          <div
            className="h-full bg-gradient-to-r from-primary to-secondary-500 transition-[width] duration-200"
            style={{ width: `${progress}%` }}
          />
        </div>

        <div className="container mx-auto flex items-center gap-3 px-3 py-2.5 sm:gap-4 sm:px-4 sm:py-3">
          {/* Cover */}
          <button
            onClick={() => setIsExpanded(true)}
            aria-label="Expandir player"
            className="relative shrink-0 overflow-hidden rounded-lg transition-transform hover:scale-105"
          >
            {track.cover_url ? (
              <img src={track.cover_url} alt={track.title} width={48} height={48} className="h-11 w-11 object-cover sm:h-12 sm:w-12" loading="lazy" />
            ) : (
              <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-gradient-to-br from-primary-700 to-secondary-600 sm:h-12 sm:w-12">
                <Headphones className="h-5 w-5 text-white" />
              </div>
            )}
          </button>

          {/* Track info */}
          <button
            onClick={() => setIsExpanded(true)}
            className="min-w-0 flex-1 text-left"
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

          {/* Desktop seek */}
          <div className="hidden min-w-0 flex-1 px-2 md:block lg:max-w-sm">
            <Slider
              value={[currentTime]}
              max={duration || 1}
              step={0.1}
              onValueChange={([v]) => seek(v)}
              className="w-full"
            />
          </div>

          {/* Controls */}
          <div className="flex shrink-0 items-center gap-1 sm:gap-1.5">
            <button
              onClick={() => skipBackward(15)}
              aria-label="Retroceder 15 segundos"
              className="hidden rounded-full p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground sm:inline-flex"
            >
              <SkipBack className="h-4 w-4" />
            </button>

            <button
              onClick={toggle}
              disabled={isLoading}
              aria-label={isPlaying ? 'Pausar' : 'Reproduzir'}
              className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-primary text-primary-foreground transition-all hover:scale-105 sm:h-10 sm:w-10"
            >
              {isPlaying ? <Pause className="h-4 w-4 sm:h-5 sm:w-5" /> : <Play className="h-4 w-4 sm:h-5 sm:w-5" />}
            </button>

            <button
              onClick={() => skipForward(15)}
              aria-label="Avançar 15 segundos"
              className="hidden rounded-full p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground sm:inline-flex"
            >
              <SkipForward className="h-4 w-4" />
            </button>

            <button
              onClick={toggleMute}
              aria-label={isMuted ? 'Ativar som' : 'Silenciar'}
              className="hidden rounded-full p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground md:inline-flex"
            >
              {isMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
            </button>

            <button
              onClick={close}
              aria-label="Fechar player"
              className="rounded-full p-1.5 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
      )}
    </>
  );
};

export default MiniPlayerV2;
