import React from 'react';
import Header from '../components/Header';
import Footer from '../components/Footer';
import PostCard from '../components/PostCard';
import AdSpace from '../components/AdSpace';
import PostPagination from '../components/PostPagination';
import { usePostsByCategory } from '@/hooks/usePosts';
import { usePagination } from '@/hooks/usePagination';
import { Skeleton } from '@/components/ui/skeleton';
import { Link } from 'react-router-dom';

const Desporto = () => {
  const { data: posts, isLoading } = usePostsByCategory('desporto');
  const { paginatedItems, currentPage, totalPages, goToPage } = usePagination(posts, { pageSize: 6 });

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      <section className="bg-green-600 text-white py-12">
        <div className="container mx-auto px-4">
          <h1 className="text-4xl md:text-5xl font-headline font-bold mb-4">Desporto</h1>
          <p className="text-xl opacity-90">Futebol, modalidades e toda a atualidade desportiva</p>
        </div>
      </section>

      <div className="container mx-auto px-4 py-8">
        <AdSpace size="banner" position="Topo da Categoria" className="mb-8" />

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          <div className="lg:col-span-3">
            {isLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {[1, 2, 3, 4].map((i) => (
                  <Skeleton key={i} className="h-64 w-full rounded-lg" />
                ))}
              </div>
            ) : paginatedItems.length > 0 ? (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {paginatedItems.map((post) => (
                    <PostCard 
                      key={post.id}
                      id={post.id}
                      title={post.title}
                      excerpt={post.excerpt}
                      image={post.image_url || ''}
                      category={post.categories?.name || 'Desporto'}
                      categoryColor={post.categories?.color || 'bg-green-600'}
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
              <div className="bg-white rounded-lg shadow-md p-8 text-center">
                <h3 className="text-xl font-bold text-gray-900 mb-2">Em breve mais conteúdo</h3>
                <p className="text-gray-600">Estamos a trabalhar para trazer as melhores notícias de desporto.</p>
              </div>
            )}
          </div>

          <div className="lg:col-span-1">
            <AdSpace size="square" position="Lateral Desporto" className="mb-8" />
            <div className="bg-white rounded-lg shadow-md p-6">
              <h3 className="text-xl font-headline font-bold text-gray-900 mb-4">Outras Categorias</h3>
              <div className="space-y-2">
                {[
                  { name: 'Tecnologia', slug: 'tecnologia' },
                  { name: 'Música', slug: 'musica' },
                  { name: 'Saúde', slug: 'saude' },
                  { name: 'Mundo', slug: 'mundo' }
                ].map((category) => (
                  <Link key={category.slug} to={`/${category.slug}`} className="block py-2 px-3 text-gray-700 hover:bg-gray-50 hover:text-portugal-green transition-colors rounded">
                    {category.name}
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
};

export default Desporto;
