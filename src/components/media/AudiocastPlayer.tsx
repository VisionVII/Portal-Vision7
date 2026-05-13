import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Card, CardContent } from '@/components/ui/card';
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Volume2,
  VolumeX,
  Download,
  Share2,
  Maximize2
} from 'lucide-react';
import { useTrackAudiocastPlay, useTrackAudiocastDownload } from '@/hooks/useAudiocasts';
import { useToast } from '@/hooks/use-toast';
import { formatDuration } from '@/lib/utils';
import { useAudioPlayerOptional } from '@/contexts/audio-player';

interface AudiocastPlayerProps {
  podcast: {
    id: string;
    title: string;
    audio_url: string | null;
    duration: number | null;
    description: string | null;
    transcript: string | null;
    views: number;
    downloads: number;
    cover_url?: string | null;
    slug?: string;
  };
  autoPlay?: boolean;
  showTranscript?: boolean;
  compact?: boolean;
}

const AudiocastPlayer: React.FC<AudiocastPlayerProps> = ({
  podcast,
  autoPlay = false,
  showTranscript = false,
  compact = false
}) => {
  const globalPlayer = useAudioPlayerOptional();
  const trackPlay = useTrackAudiocastPlay();
  const trackDownload = useTrackAudiocastDownload();
  const { toast } = useToast();
  const hasTrackedRef = useRef(false);

  // Determine if the global player is handling THIS podcast
  const isGlobalActive = !!(globalPlayer && globalPlayer.track?.id === podcast.id);

  // Derive state from global player when it owns this track
  const isPlaying = isGlobalActive ? globalPlayer.isPlaying : false;
  const currentTime = isGlobalActive ? globalPlayer.currentTime : 0;
  const duration = isGlobalActive ? (globalPlayer.duration || podcast.duration || 0) : (podcast.duration || 0);
  const volume = isGlobalActive ? globalPlayer.volume : 0.8;
  const isMuted = isGlobalActive ? globalPlayer.isMuted : false;
  const isLoading = isGlobalActive ? globalPlayer.isLoading : false;

  // Track play event once per session
  useEffect(() => {
    if (isPlaying && !hasTrackedRef.current) {
      hasTrackedRef.current = true;
      trackPlay.mutate(podcast.id);
    }
  }, [isPlaying, trackPlay, podcast.id]);

  const togglePlay = () => {
    if (!globalPlayer || !podcast.audio_url) return;

    if (isGlobalActive) {
      // Already playing this track — toggle
      globalPlayer.toggle();
    } else {
      // Start playing this track via global player
      hasTrackedRef.current = false;
      globalPlayer.play({
        id: podcast.id,
        title: podcast.title,
        audio_url: podcast.audio_url,
        cover_url: podcast.cover_url,
        duration: podcast.duration,
        description: podcast.description,
        slug: podcast.slug,
      });
    }
  };

  const handleSeek = (value: number[]) => {
    if (!isGlobalActive || !globalPlayer) return;
    globalPlayer.seek(value[0]);
  };

  const handleVolumeChange = (value: number[]) => {
    if (!globalPlayer) return;
    globalPlayer.setVolume(value[0]);
  };

  const toggleMute = () => {
    if (!globalPlayer) return;
    globalPlayer.toggleMute();
  };

  const skipTime = (seconds: number) => {
    if (!globalPlayer) return;
    if (seconds > 0) globalPlayer.skipForward(Math.abs(seconds));
    else globalPlayer.skipBackward(Math.abs(seconds));
  };

  const handleDownload = async () => {
    if (!podcast.audio_url) return;

    try {
      trackDownload.mutate(podcast.id);

      const link = document.createElement('a');
      link.href = podcast.audio_url;
      const ext = podcast.audio_url.split('?')[0].split('.').pop() || 'mp3';
      link.download = `${podcast.title}.${ext}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast({
        title: "Download iniciado",
        description: "O audiocast está sendo baixado.",
      });
    } catch {
      toast({
        title: "Erro",
        description: "Não foi possível baixar o audiocast.",
        variant: "destructive",
      });
    }
  };

  const handleShare = async () => {
    const url = window.location.href;

    if (navigator.share) {
      try {
        await navigator.share({
          title: podcast.title,
          text: podcast.description || '',
          url: url,
        });
      } catch {
        // User cancelled share
      }
    } else {
      navigator.clipboard.writeText(url);
      toast({
        title: "Link copiado",
        description: "Link do audiocast copiado para a área de transferência.",
      });
    }
  };

  if (!podcast.audio_url) {
    return (
      <Card className="w-full">
        <CardContent className="p-6">
          <div className="text-center text-muted-foreground">
            <p>Áudio não disponível para este audiocast.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (compact) {
    return (
      <div className="flex items-center gap-3 p-3 bg-card rounded-lg border">
        <Button
          size="sm"
          variant="ghost"
          onClick={togglePlay}
          disabled={isLoading}
          className="h-8 w-8 p-0"
        >
          {isLoading ? (
            <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          ) : isPlaying ? (
            <Pause className="h-4 w-4" />
          ) : (
            <Play className="h-4 w-4" />
          )}
        </Button>

        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium truncate">{podcast.title}</div>
          <div className="text-xs text-muted-foreground">
            {formatDuration(currentTime)} / {formatDuration(duration)}
          </div>
        </div>
      </div>
    );
  }

  return (
    <Card className="w-full">
      <CardContent className="p-6">
        <div className="space-y-4">
          {/* Header */}
          <div>
            <h3 className="text-lg font-semibold">{podcast.title}</h3>
            {podcast.description && (
              <p className="text-sm text-muted-foreground mt-1">{podcast.description}</p>
            )}
          </div>

          {/* Progress Bar */}
          <div className="space-y-2">
            <Slider
              value={[currentTime]}
              max={duration || 100}
              step={1}
              onValueChange={handleSeek}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>{formatDuration(currentTime)}</span>
              <span>{formatDuration(duration)}</span>
            </div>
          </div>

          {/* Controls */}
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center justify-center gap-2 md:justify-start">
              <Button size="sm" variant="ghost" onClick={() => skipTime(-15)}>
                <SkipBack className="h-4 w-4" />
              </Button>

              <Button
                size="sm"
                onClick={togglePlay}
                disabled={isLoading}
                className="h-10 w-10 rounded-full"
              >
                {isLoading ? (
                  <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                ) : isPlaying ? (
                  <Pause className="h-5 w-5" />
                ) : (
                  <Play className="h-5 w-5" />
                )}
              </Button>

              <Button size="sm" variant="ghost" onClick={() => skipTime(15)}>
                <SkipForward className="h-4 w-4" />
              </Button>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-2 md:justify-end">
              <Button size="sm" variant="ghost" onClick={toggleMute}>
                {isMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
              </Button>

              <div className="w-full max-w-[120px]">
                <Slider
                  value={[isMuted ? 0 : volume]}
                  max={1}
                  step={0.1}
                  onValueChange={handleVolumeChange}
                  className="w-full"
                />
              </div>

              <Button size="sm" variant="ghost" onClick={handleDownload}>
                <Download className="h-4 w-4" />
              </Button>

              <Button size="sm" variant="ghost" onClick={handleShare}>
                <Share2 className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Stats */}
          <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
            <span>{podcast.views.toLocaleString()} reproduções</span>
            <span>{podcast.downloads.toLocaleString()} downloads</span>
          </div>

          {/* Transcript */}
          {showTranscript && podcast.transcript && (
            <div className="mt-6">
              <h4 className="text-sm font-semibold mb-2">Transcrição</h4>
              <div className="text-sm text-muted-foreground max-h-40 overflow-y-auto bg-muted p-3 rounded">
                {podcast.transcript}
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default AudiocastPlayer;