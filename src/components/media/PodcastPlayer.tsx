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
import { useTrackPodcastPlay, useTrackPodcastDownload } from '@/hooks/usePodcasts';
import { useToast } from '@/hooks/use-toast';
import { formatDuration } from '@/lib/utils';

interface PodcastPlayerProps {
  podcast: {
    id: string;
    title: string;
    audio_url: string | null;
    duration: number | null;
    description: string | null;
    transcript: string | null;
    views: number;
    downloads: number;
  };
  autoPlay?: boolean;
  showTranscript?: boolean;
  compact?: boolean;
}

const PodcastPlayer: React.FC<PodcastPlayerProps> = ({
  podcast,
  autoPlay = false,
  showTranscript = false,
  compact = false
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const audioRef = useRef<HTMLAudioElement>(null);
  const trackPlay = useTrackPodcastPlay();
  const trackDownload = useTrackPodcastDownload();
  const { toast } = useToast();

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !podcast.audio_url) return;

    const handleLoadedMetadata = () => {
      setDuration(audio.duration);
      setIsLoading(false);
    };

    const handleTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
    };

    const handleEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
    };

    const handlePlay = () => {
      trackPlay.mutate(podcast.id);
    };

    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('play', handlePlay);

    return () => {
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('play', handlePlay);
    };
  }, [podcast.audio_url, trackPlay, podcast.id]);

  useEffect(() => {
    if (autoPlay && audioRef.current) {
      audioRef.current.play().catch(() => {
        // Autoplay failed, user interaction required
      });
    }
  }, [autoPlay]);

  const togglePlay = async () => {
    const audio = audioRef.current;
    if (!audio) return;

    try {
      if (isPlaying) {
        audio.pause();
        setIsPlaying(false);
      } else {
        await audio.play();
        setIsPlaying(true);
      }
    } catch (error) {
      toast({
        title: "Erro",
        description: "Não foi possível reproduzir o áudio.",
        variant: "destructive",
      });
    }
  };

  const handleSeek = (value: number[]) => {
    const audio = audioRef.current;
    if (!audio) return;

    const newTime = value[0];
    audio.currentTime = newTime;
    setCurrentTime(newTime);
  };

  const handleVolumeChange = (value: number[]) => {
    const audio = audioRef.current;
    if (!audio) return;

    const newVolume = value[0];
    audio.volume = newVolume;
    setVolume(newVolume);
    setIsMuted(newVolume === 0);
  };

  const toggleMute = () => {
    const audio = audioRef.current;
    if (!audio) return;

    if (isMuted) {
      audio.volume = volume;
      setIsMuted(false);
    } else {
      audio.volume = 0;
      setIsMuted(true);
    }
  };

  const skipTime = (seconds: number) => {
    const audio = audioRef.current;
    if (!audio) return;

    const newTime = Math.max(0, Math.min(duration, audio.currentTime + seconds));
    audio.currentTime = newTime;
    setCurrentTime(newTime);
  };

  const handleDownload = async () => {
    if (!podcast.audio_url) return;

    try {
      // Track download
      trackDownload.mutate(podcast.id);

      // Create download link
      const link = document.createElement('a');
      link.href = podcast.audio_url;
      link.download = `${podcast.title}.mp3`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast({
        title: "Download iniciado",
        description: "O podcast está sendo baixado.",
      });
    } catch (error) {
      toast({
        title: "Erro",
        description: "Não foi possível baixar o podcast.",
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
      } catch (error) {
        // User cancelled share
      }
    } else {
      // Fallback to clipboard
      navigator.clipboard.writeText(url);
      toast({
        title: "Link copiado",
        description: "Link do podcast copiado para a área de transferência.",
      });
    }
  };

  if (!podcast.audio_url) {
    return (
      <Card className="w-full">
        <CardContent className="p-6">
          <div className="text-center text-muted-foreground">
            <p>Áudio não disponível para este podcast.</p>
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
            {formatDuration(currentTime)} / {formatDuration(duration || podcast.duration || 0)}
          </div>
        </div>

        <audio ref={audioRef} src={podcast.audio_url} preload="metadata" />
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

          {/* Audio Element */}
          <audio
            ref={audioRef}
            src={podcast.audio_url}
            preload="metadata"
            onLoadedMetadata={() => setIsLoading(false)}
          />

          {/* Progress Bar */}
          <div className="space-y-2">
            <Slider
              value={[currentTime]}
              max={duration || podcast.duration || 100}
              step={1}
              onValueChange={handleSeek}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>{formatDuration(currentTime)}</span>
              <span>{formatDuration(duration || podcast.duration || 0)}</span>
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

export default PodcastPlayer;