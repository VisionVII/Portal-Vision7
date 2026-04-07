import React from 'react';
import { useParams, Link } from 'react-router-dom';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import AudiocastPlayer from '@/components/media/AudiocastPlayer';
import RelatedPosts from '@/components/content/RelatedPosts';
import AdSpace from '@/components/content/AdSpace';
import { useAudiocast, useAudiocasts } from '@/hooks/useAudiocasts';
import { ArrowLeft, Calendar, User, Clock, Eye, Download } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';

const Audiocast = () => {
  const { id } = useParams();
  const { data: podcast, isLoading } = useAudiocast(id || '');
  const { data: allAudiocasts } = useAudiocasts();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-4xl mx-auto">
            <Skeleton className="h-12 w-3/4 mb-6" />
            <Skeleton className="h-96 w-full mb-8" />
            <Skeleton className="h-64 w-full" />
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
          <h1 className="text-4xl font-bold text-foreground mb-4">Audiocast não encontrado</h1>
          <p className="text-muted-foreground mb-8">O audiocast que procura não existe ou foi removido.</p>
          <Link
            to="/"
            className="inline-flex items-center text-primary hover:text-primary/80"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Voltar à página inicial
          </Link>
        </div>
        <Footer />
      </div>
    );
  }

  const relatedAudiocasts = allAudiocasts?.filter(
    p => p.categories?.id === podcast.category_id && p.id !== podcast.id
  ).slice(0, 3) || [];

  const formattedDate = new Date(podcast.published_at || podcast.created_at).toLocaleDateString('pt-PT', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <article id="podcast-top" className="container mx-auto px-4 py-6 sm:py-8 lg:py-10">
        <div className="mx-auto max-w-7xl">
          <div className="mx-auto max-w-5xl">
            <div className="mb-6">
              <Link
                to="/"
                className="inline-flex items-center text-sm text-muted-foreground transition-colors hover:text-primary"
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Voltar às notícias
              </Link>
            </div>

            <header className="mb-8 md:mb-10">
              {podcast.categories && (
                <Badge
                  variant="secondary"
                  className="mb-4"
                  style={{ backgroundColor: `${podcast.categories.color}20`, color: podcast.categories.color }}
                >
                  {podcast.categories.name}
                </Badge>
              )}

              <h1 className="max-w-4xl text-3xl font-headline font-bold leading-tight text-foreground sm:text-4xl lg:text-5xl">
                {podcast.title}
              </h1>

              <div className="mt-5 flex flex-wrap items-center gap-4 text-sm text-muted-foreground sm:gap-6 sm:text-base">
                <div className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  <span>{formattedDate}</span>
                </div>

                <div className="flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  <span>{podcast.duration ? `${Math.floor(podcast.duration / 60)}:${(podcast.duration % 60).toString().padStart(2, '0')}` : 'Duração não informada'}</span>
                </div>

                <div className="flex items-center gap-2">
                  <Eye className="h-5 w-5" />
                  <span>{podcast.views.toLocaleString()} reproduções</span>
                </div>

                <div className="flex items-center gap-2">
                  <Download className="h-5 w-5" />
                  <span>{podcast.downloads.toLocaleString()} downloads</span>
                </div>
              </div>
            </header>
          </div>

          <div className="mx-auto mb-8 max-w-5xl">
            <AudiocastPlayer
              podcast={podcast}
              showTranscript={true}
              autoPlay={false}
            />
          </div>

          <AdSpace size="banner" position="Após o Player" className="mx-auto mb-8 max-w-5xl" />

          <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_300px] xl:gap-8">
            <div className="min-w-0">
              {podcast.description && (
                <div className="mb-8 rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-6">
                  <h2 className="mb-4 text-xl font-semibold">Sobre este episódio</h2>
                  <div className="prose prose-sm max-w-none break-words text-muted-foreground">
                    <p className="text-base leading-relaxed">
                      {podcast.description}
                    </p>
                  </div>
                </div>
              )}

              {podcast.transcript && (
                <div className="mb-8 rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-6">
                  <h2 className="mb-4 text-xl font-semibold">Transcrição</h2>
                  <div className="prose prose-sm max-w-none break-words text-muted-foreground">
                    <div className="whitespace-pre-wrap text-sm leading-relaxed">
                      {podcast.transcript}
                    </div>
                  </div>
                </div>
              )}

              {relatedAudiocasts.length > 0 && (
                <div className="mb-8">
                  <h2 className="mb-6 text-2xl font-bold">Episódios Relacionados</h2>
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    {relatedAudiocasts.map((relatedAudiocast) => (
                      <Link
                        key={relatedAudiocast.id}
                        to={`/audiocast/${relatedAudiocast.slug}`}
                        className="block"
                      >
                        <div className="rounded-xl border border-border bg-card p-4 transition-shadow hover:shadow-md">
                          <h3 className="mb-2 line-clamp-2 text-sm font-semibold">
                            {relatedAudiocast.title}
                          </h3>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <Clock className="h-3 w-3" />
                            <span>{relatedAudiocast.duration ? `${Math.floor(relatedAudiocast.duration / 60)}:${(relatedAudiocast.duration % 60).toString().padStart(2, '0')}` : 'N/A'}</span>
                            <span>•</span>
                            <span>{relatedAudiocast.views} plays</span>
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              )}

              <AdSpace size="rectangle" position="Final do Conteúdo" />
            </div>

            <aside className="min-w-0 xl:sticky xl:top-28 xl:self-start">
              <AdSpace size="square" position="Lateral do Audiocast" className="mx-auto mb-8" />

              <div className="mb-6 rounded-2xl border border-border bg-card p-4 shadow-sm">
                <h3 className="mb-3 font-semibold">Informações do Episódio</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between gap-3">
                    <span className="text-muted-foreground">Duração:</span>
                    <span>{podcast.duration ? `${Math.floor(podcast.duration / 60)}:${(podcast.duration % 60).toString().padStart(2, '0')}` : 'N/A'}</span>
                  </div>
                  <div className="flex justify-between gap-3">
                    <span className="text-muted-foreground">Reproduções:</span>
                    <span>{podcast.views.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between gap-3">
                    <span className="text-muted-foreground">Downloads:</span>
                    <span>{podcast.downloads.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between gap-3">
                    <span className="text-muted-foreground">Publicado:</span>
                    <span>{formattedDate}</span>
                  </div>
                </div>
              </div>
            </aside>
          </div>
        </div>
      </article>

      <Footer />
    </div>
  );
};

export default Audiocast;