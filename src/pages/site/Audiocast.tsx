import React from 'react';
import { useParams, Link } from 'react-router-dom';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import AudiocastPlayer from '@/components/media/AudiocastPlayer';
import AudiocastCard from '@/components/media/AudiocastCard';
import AdSpace from '@/components/content/AdSpace';
import { useAudiocast, useAudiocasts } from '@/hooks/useAudiocasts';
import { ArrowLeft, Calendar, Clock, Eye, Download, Headphones } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { formatDuration } from '@/lib/utils';

const Audiocast = () => {
  const { id } = useParams();
  const { data: podcast, isLoading } = useAudiocast(id || '');
  const { data: allAudiocasts } = useAudiocasts();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <Skeleton className="h-72 w-full sm:h-80" />
        <div className="container mx-auto px-4 py-8">
          <div className="mx-auto max-w-4xl space-y-4">
            <Skeleton className="h-10 w-3/4" />
            <Skeleton className="h-24 w-full rounded-2xl" />
            <Skeleton className="h-64 w-full rounded-2xl" />
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  if (!podcast) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="container mx-auto px-4 py-16 text-center">
          <Headphones className="mx-auto mb-4 h-12 w-12 text-muted-foreground/40" />
          <h1 className="text-3xl font-bold text-foreground">Audiocast não encontrado</h1>
          <p className="mt-2 text-muted-foreground">O episódio que procura não existe ou foi removido.</p>
          <Link
            to="/audiocasts"
            className="mt-6 inline-flex items-center text-primary hover:text-primary/80"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Voltar aos audiocasts
          </Link>
        </div>
        <Footer />
      </div>
    );
  }

  const relatedAudiocasts = allAudiocasts?.filter(
    (p) => p.categories?.id === podcast.category_id && p.id !== podcast.id,
  ).slice(0, 4) || [];

  const formattedDate = new Date(podcast.published_at || podcast.created_at).toLocaleDateString('pt-PT', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  const hasCover = !!podcast.cover_url;

  return (
    <div className="min-h-screen bg-background">
      <Header />

      {/* Hero with cover background */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0">
          {hasCover ? (
            <img src={podcast.cover_url!} alt="" className="h-full w-full object-cover" loading="eager" decoding="async" />
          ) : (
            <div className="h-full w-full bg-gradient-to-br from-primary-900 via-primary-800 to-secondary-800" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-background via-black/60 to-black/40 backdrop-blur-sm" />
        </div>

        <div className="container relative mx-auto px-4 pb-10 pt-6 sm:pb-14 sm:pt-8">
          <div className="mx-auto max-w-5xl">
            <Link
              to="/audiocasts"
              className="mb-6 inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1.5 text-sm text-white/80 backdrop-blur-sm transition-colors hover:bg-white/20 hover:text-white"
            >
              <ArrowLeft className="h-4 w-4" />
              Audiocasts
            </Link>

            <div className="flex flex-wrap items-center gap-2 mb-4">
              {podcast.categories && (
                <Badge className="border-0 text-xs font-semibold" style={{ backgroundColor: podcast.categories.color, color: '#fff' }}>
                  {podcast.categories.name}
                </Badge>
              )}
              <Badge variant="outline" className="border-white/25 bg-white/10 text-xs text-white">
                Audiocast
              </Badge>
            </div>

            <h1 className="mb-4 max-w-4xl text-3xl font-headline font-bold leading-tight text-white sm:text-4xl lg:text-5xl">
              {podcast.title}
            </h1>

            {podcast.description && (
              <p className="mb-5 max-w-3xl text-base text-white/70 sm:text-lg">
                {podcast.description}
              </p>
            )}

            <div className="flex flex-wrap items-center gap-4 text-sm text-white/60 sm:gap-6">
              <span className="flex items-center gap-1.5"><Calendar className="h-4 w-4" />{formattedDate}</span>
              <span className="flex items-center gap-1.5"><Clock className="h-4 w-4" />{formatDuration(podcast.duration || 0)}</span>
              <span className="flex items-center gap-1.5"><Eye className="h-4 w-4" />{podcast.views.toLocaleString()} reproduções</span>
              <span className="flex items-center gap-1.5"><Download className="h-4 w-4" />{podcast.downloads.toLocaleString()} downloads</span>
            </div>
          </div>
        </div>
      </section>

      {/* Player — overlapping hero */}
      <div className="container mx-auto px-4">
        <div className="relative z-10 mx-auto -mt-4 max-w-5xl sm:-mt-6">
          <AudiocastPlayer podcast={podcast} showTranscript autoPlay={false} />
        </div>
      </div>

      <AdSpace size="banner" position="Após o Player" className="container mx-auto mt-6 max-w-5xl px-4" />

      {/* Content */}
      <div className="container mx-auto px-4 py-8 sm:py-10">
        <div className="mx-auto max-w-7xl">
          <div className="grid grid-cols-1 gap-8 xl:grid-cols-[minmax(0,1fr)_300px]">
            <div className="min-w-0 space-y-8">
              {podcast.transcript && (
                <div className="rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-6 lg:p-8">
                  <h2 className="mb-4 text-xl font-bold">Transcrição</h2>
                  <div className="whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">
                    {podcast.transcript}
                  </div>
                </div>
              )}

              {relatedAudiocasts.length > 0 && (
                <section>
                  <div className="mb-5 flex items-center gap-2">
                    <div className="h-1 w-8 rounded-full bg-primary" />
                    <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                      Episódios relacionados
                    </h2>
                  </div>
                  <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                    {relatedAudiocasts.map((item) => (
                      <AudiocastCard key={item.id} podcast={item} />
                    ))}
                  </div>
                </section>
              )}

              <AdSpace size="rectangle" position="Final do Conteúdo" />
            </div>

            <aside className="min-w-0 space-y-6">
              <AdSpace size="square" position="Lateral do Audiocast" className="mx-auto" />

              <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
                <h3 className="mb-3 font-bold">Informações do Episódio</h3>
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between gap-3">
                    <span className="text-muted-foreground">Duração</span>
                    <span className="font-medium">{formatDuration(podcast.duration || 0)}</span>
                  </div>
                  <div className="flex justify-between gap-3">
                    <span className="text-muted-foreground">Reproduções</span>
                    <span className="font-medium">{podcast.views.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between gap-3">
                    <span className="text-muted-foreground">Downloads</span>
                    <span className="font-medium">{podcast.downloads.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between gap-3">
                    <span className="text-muted-foreground">Publicado</span>
                    <span className="font-medium">{formattedDate}</span>
                  </div>
                </div>
              </div>

              <div className="overflow-hidden rounded-2xl bg-gradient-to-br from-primary-700 via-primary-600 to-secondary-600 p-5 text-white">
                <h3 className="mb-2 font-bold">Gostou?</h3>
                <p className="mb-4 text-sm text-white/80">
                  Explore mais episódios na nossa biblioteca de audiocasts.
                </p>
                <Link
                  to="/audiocasts"
                  className="inline-flex w-full items-center justify-center rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-primary transition-colors hover:bg-white/90"
                >
                  Ver todos os audiocasts
                </Link>
              </div>
            </aside>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
};

export default Audiocast;