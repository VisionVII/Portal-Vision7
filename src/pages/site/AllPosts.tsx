import React from 'react';
import { Link } from 'react-router-dom';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import PostCard from '@/components/content/PostCard';
import AdSpace from '@/components/content/AdSpace';
import PostPagination from '@/components/content/PostPagination';
import { usePosts } from '@/hooks/usePosts';
import { usePagination } from '@/hooks/usePagination';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowLeft, Newspaper, RefreshCw } from 'lucide-react';

const AllPosts: React.FC = () => {
  const { data: posts = [], isLoading, isError, refetch } = usePosts();
  const { paginatedItems, currentPage, totalPages, goToPage } = usePagination(posts, { pageSize: 12 });

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto max-w-7xl px-4 py-8 sm:px-5 sm:py-12">
        <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div>
            <Link to="/" className="mb-4 inline-flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-primary">
              <ArrowLeft className="h-4 w-4" />
              Voltar ao início
            </Link>
            <div className="flex items-center gap-3">
              <Newspaper className="h-6 w-6 text-primary" />
              <h1 className="text-3xl font-headline font-bold text-foreground sm:text-4xl">Todos os artigos</h1>
            </div>
            <p className="mt-2 text-muted-foreground">Acompanhe as notícias e análises mais recentes da Vision7.</p>
          </div>
        </div>

        <AdSpace size="leaderboard" position="Topo Todos os artigos" className="mb-8" />

        {isLoading ? (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, index) => <Skeleton key={index} className="h-72 w-full rounded-2xl" />)}
          </div>
        ) : isError ? (
          <div className="rounded-2xl border border-destructive/20 bg-destructive/5 px-6 py-10 text-center">
            <p className="font-medium text-destructive">Não foi possível carregar os artigos.</p>
            <button type="button" onClick={() => refetch()} className="mt-4 inline-flex items-center gap-2 rounded-xl bg-destructive px-5 py-2.5 text-sm font-semibold text-white">
              <RefreshCw className="h-4 w-4" />
              Tentar novamente
            </button>
          </div>
        ) : paginatedItems.length > 0 ? (
          <>
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {paginatedItems.map((post) => (
                <PostCard
                  key={post.id}
                  id={post.id}
                  title={post.title}
                  excerpt={post.excerpt}
                  image={post.image_url || ''}
                  banner={post.banner_url}
                  category={post.categories?.name || 'Geral'}
                  categoryColor={post.categories?.color || 'bg-muted'}
                  author={post.author_name}
                  date={new Date(post.published_at || post.created_at).toLocaleDateString('pt-PT', { day: 'numeric', month: 'short', year: 'numeric' })}
                  readTime={post.read_time}
                  slug={post.slug}
                />
              ))}
            </div>
            <PostPagination currentPage={currentPage} totalPages={totalPages} onPageChange={goToPage} />
          </>
        ) : (
          <div className="rounded-2xl border border-border bg-card p-10 text-center text-muted-foreground">Ainda não há artigos publicados.</div>
        )}
      </main>
      <Footer />
    </div>
  );
};

export default AllPosts;
