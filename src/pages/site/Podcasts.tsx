import React from 'react';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import PodcastCard from '@/components/media/PodcastCard';
import AdSpace from '@/components/content/AdSpace';
import PostPagination from '@/components/content/PostPagination';
import { usePodcasts } from '@/hooks/usePodcasts';
import { usePagination } from '@/hooks/usePagination';
import { Skeleton } from '@/components/ui/skeleton';
import { Link } from 'react-router-dom';

const Podcasts = () => {
  const { data: podcasts, isLoading } = usePodcasts();
  const { paginatedItems, currentPage, totalPages, goToPage } = usePagination(podcasts, { pageSize: 9 });
  const totalPodcasts = podcasts?.length ?? 0;
  const featuredPodcast = podcasts?.[0];

  return (
    <div className="min-h-screen bg-background">
      <Header />

      {/* Hero */}
      <section className="bg-gradient-to-br from-primary-900 via-primary-700 to-secondary-600 py-8 text-white md:py-12">
        <div className="container mx-auto px-4">
          <div className="mx-auto max-w-6xl rounded-[28px] border border-white/15 bg-slate-950/15 p-5 shadow-xl backdrop-blur md:p-8">
            <div className="mb-4 flex flex-wrap items-center gap-2">
              <span className="rounded-full border border-white/20 bg-white/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-white/90">
                Biblioteca em áudio
              </span>
              <span className="rounded-full bg-white/12 px-3 py-1 text-xs font-medium text-white/90">
                {totalPodcasts} episódio{totalPodcasts === 1 ? '' : 's'}
              </span>
            </div>
            <h1 className="mb-2 text-3xl font-headline font-bold sm:text-4xl md:text-5xl">Podcasts</h1>
            <p className="max-w-2xl text-base opacity-90 sm:text-lg">
              Conteúdo educativo em áudio sobre tecnologia, automação e inovação. Ouça quando quiser, com uma navegação mais limpa e confortável.
            </p>
          </div>
        </div>
      </section>

      <div className="container mx-auto px-4 py-6 sm:py-8">
        <div className="mx-auto max-w-6xl">
          {/* Top Ad */}
          <AdSpace size="leaderboard" position="Topo Podcasts" className="mb-8" />

          <div className="mb-6 rounded-2xl border border-border bg-card/80 p-4 shadow-sm">
            <p className="text-sm font-semibold text-foreground">Seleção editorial em áudio</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Episódios organizados para escuta rápida, exploração por categoria e acesso mais fluido em qualquer ecrã.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_280px] xl:gap-8">
            {/* Main */}
            <div className="min-w-0">
            {isLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                  <Skeleton key={i} className="h-72 w-full rounded-xl" />
                ))}
              </div>
            ) : paginatedItems.length > 0 ? (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {paginatedItems.map((podcast) => (
                    <PodcastCard
                      key={podcast.id}
                      podcast={podcast}
                      showStats={true}
                    />
                  ))}
                </div>
                <PostPagination currentPage={currentPage} totalPages={totalPages} onPageChange={goToPage} />
              </>
            ) : (
              <div className="bg-card rounded-xl border border-border p-10 text-center">
                <h3 className="text-xl font-bold text-card-foreground mb-2">Em breve mais podcasts</h3>
                <p className="text-muted-foreground">Estamos produzindo conteúdo educativo em áudio. Volte em breve!</p>
              </div>
            )}
          </div>

            {/* Sidebar */}
            <aside className="space-y-6 xl:sticky xl:top-28 xl:self-start">
              <AdSpace size="square" position="Lateral Podcasts" className="mx-auto" />

            {/* Featured Podcast */}
            {featuredPodcast && (
              <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
                <h3 className="mb-4 text-lg font-headline font-bold text-card-foreground">
                  Destaque da Semana
                </h3>
                <PodcastCard
                  podcast={featuredPodcast}
                  compact={true}
                  showStats={false}
                />
              </div>
            )}

            {/* Categories */}
            <div className="bg-card rounded-xl border border-border p-5">
              <h3 className="text-lg font-headline font-bold text-card-foreground mb-3">
                Categorias
              </h3>
              <div className="space-y-1">
                <Link
                  to="/tecnologia"
                  className="block py-2 px-3 text-muted-foreground hover:bg-accent hover:text-primary transition-colors rounded-lg text-sm font-medium"
                >
                  Tecnologia
                </Link>
                <Link
                  to="/desporto"
                  className="block py-2 px-3 text-muted-foreground hover:bg-accent hover:text-primary transition-colors rounded-lg text-sm font-medium"
                >
                  Desporto
                </Link>
                <Link
                  to="/musica"
                  className="block py-2 px-3 text-muted-foreground hover:bg-accent hover:text-primary transition-colors rounded-lg text-sm font-medium"
                >
                  Música
                </Link>
                <Link
                  to="/saude"
                  className="block py-2 px-3 text-muted-foreground hover:bg-accent hover:text-primary transition-colors rounded-lg text-sm font-medium"
                >
                  Saúde
                </Link>
                <Link
                  to="/mundo"
                  className="block py-2 px-3 text-muted-foreground hover:bg-accent hover:text-primary transition-colors rounded-lg text-sm font-medium"
                >
                  Mundo
                </Link>
              </div>
            </div>

              <AdSpace size="square" position="Lateral Podcasts 2" className="mx-auto hidden lg:flex" />

            {/* Newsletter */}
            <div className="rounded-2xl bg-gradient-to-br from-primary-700 via-primary-600 to-secondary-600 p-6 text-white shadow-lg">
              <h3 className="mb-2 text-lg font-bold">Newsletter</h3>
              <p className="mb-4 text-sm opacity-90">
                Receba notificações quando novos podcasts forem publicados
              </p>
              <Link
                to="/#newsletter"
                className="inline-flex w-full items-center justify-center rounded-lg bg-white px-4 py-2.5 text-sm font-semibold text-primary transition-colors hover:bg-white/90"
              >
                Inscrever-se
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

export default Podcasts;