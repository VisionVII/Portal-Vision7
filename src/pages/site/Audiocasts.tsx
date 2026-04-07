import React from 'react';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import AudiocastCard from '@/components/media/AudiocastCard';
import AdSpace from '@/components/content/AdSpace';
import PostPagination from '@/components/content/PostPagination';
import { useAudiocasts } from '@/hooks/useAudiocasts';
import { useCategories } from '@/hooks/useCategories';
import { usePagination } from '@/hooks/usePagination';
import { Skeleton } from '@/components/ui/skeleton';
import { Link } from 'react-router-dom';
import { Headphones } from 'lucide-react';

const Audiocasts = () => {
  const { data: podcasts, isLoading } = useAudiocasts();
  const { data: categories } = useCategories();
  const featuredAudiocast = podcasts?.[0];
  const restAudiocasts = podcasts?.slice(1) ?? [];
  const { paginatedItems, currentPage, totalPages, goToPage } = usePagination(restAudiocasts, { pageSize: 9 });

  return (
    <div className="min-h-screen bg-background">
      <Header />

      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-primary-900 via-primary-800 to-secondary-800 py-12 text-white md:py-16">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGNpcmNsZSBjeD0iMzAiIGN5PSIzMCIgcj0iMSIgZmlsbD0icmdiYSgyNTUsMjU1LDI1NSwwLjAzKSIvPjwvc3ZnPg==')] opacity-50" />
        <div className="container relative mx-auto px-4">
          <div className="mx-auto max-w-4xl text-center">
            <h1 className="mb-3 text-4xl font-headline font-bold sm:text-5xl md:text-6xl">
              Audiocasts
            </h1>
            <p className="mx-auto max-w-2xl text-base text-white/70 sm:text-lg">
              Conteúdo educativo em áudio sobre tecnologia, automação e inovação.
              Ouça quando quiser, onde quiser.
            </p>
          </div>
        </div>
      </section>

      <div className="container mx-auto px-4 py-8 sm:py-10">
        <div className="mx-auto max-w-7xl">
          {/* Top Ad */}
          <AdSpace size="leaderboard" position="Topo Audiocasts" className="mb-8" />

          {/* Featured Audiocast */}
          {!isLoading && featuredAudiocast && (
            <section className="mb-10">
              <div className="mb-4 flex items-center gap-2">
                <div className="h-1 w-8 rounded-full bg-primary" />
                <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                  Em destaque
                </h2>
              </div>
              <AudiocastCard podcast={featuredAudiocast} featured showStats />
            </section>
          )}

          <div className="grid grid-cols-1 gap-8 xl:grid-cols-[minmax(0,1fr)_300px]">
            {/* Main grid */}
            <div className="min-w-0">
              <div className="mb-5 flex items-center gap-2">
                <div className="h-1 w-8 rounded-full bg-secondary-500" />
                <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                  Todos os episódios
                </h2>
              </div>

              {isLoading ? (
                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
                  {[1, 2, 3, 4, 5, 6].map((i) => (
                    <Skeleton key={i} className="aspect-[4/5] w-full rounded-2xl" />
                  ))}
                </div>
              ) : paginatedItems.length > 0 ? (
                <>
                  <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
                    {paginatedItems.map((podcast) => (
                      <AudiocastCard key={podcast.id} podcast={podcast} showStats />
                    ))}
                  </div>
                  <PostPagination currentPage={currentPage} totalPages={totalPages} onPageChange={goToPage} />
                </>
              ) : (
                <div className="rounded-2xl border border-dashed border-border bg-card/50 p-12 text-center">
                  <Headphones className="mx-auto mb-3 h-10 w-10 text-muted-foreground/40" />
                  <h3 className="text-lg font-bold text-card-foreground">Em breve mais audiocasts</h3>
                  <p className="mt-1 text-sm text-muted-foreground">Estamos a produzir conteúdo em áudio. Volta em breve!</p>
                </div>
              )}
            </div>

            {/* Sidebar */}
            <aside className="space-y-6 xl:sticky xl:top-28 xl:self-start">
              <AdSpace size="square" position="Lateral Audiocasts" className="mx-auto" />

              {/* Categories */}
              {categories && categories.length > 0 && (
                <div className="rounded-2xl border border-border/60 bg-card p-5">
                  <h3 className="mb-3 text-base font-bold text-card-foreground">Categorias</h3>
                  <div className="space-y-0.5">
                    {categories.map((cat) => (
                      <Link
                        key={cat.id}
                        to={`/${cat.slug}`}
                        className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                      >
                        <span className="h-2 w-2 rounded-full" style={{ backgroundColor: cat.color }} />
                        {cat.name}
                      </Link>
                    ))}
                  </div>
                </div>
              )}

              {/* Newsletter */}
              <div className="overflow-hidden rounded-2xl bg-gradient-to-br from-primary-700 via-primary-600 to-secondary-600 p-6 text-white shadow-lg">
                <h3 className="mb-2 text-lg font-bold">Newsletter</h3>
                <p className="mb-4 text-sm text-white/80">
                  Receba notificações quando novos audiocasts forem publicados
                </p>
                <Link
                  to="/#newsletter"
                  className="inline-flex w-full items-center justify-center rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-primary transition-colors hover:bg-white/90"
                >
                  Inscrever-se
                </Link>
              </div>

              <AdSpace size="square" position="Lateral Audiocasts 2" className="mx-auto hidden xl:flex" />
            </aside>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
};

export default Audiocasts;