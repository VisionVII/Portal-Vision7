import React from 'react';
import { useParams, Link } from 'react-router-dom';
import Header from '../components/Header';
import Footer from '../components/Footer';
import AdSpace from '../components/AdSpace';
import { usePost, usePosts } from '@/hooks/usePosts';
import { Calendar, User, ArrowLeft } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

const Post = () => {
  const { id } = useParams();
  const { data: post, isLoading } = usePost(id || '');
  const { data: allPosts } = usePosts();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
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

  if (!post) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="container mx-auto px-4 py-16 text-center">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Post não encontrado</h1>
          <p className="text-gray-600 mb-8">O artigo que procura não existe ou foi removido.</p>
          <Link 
            to="/" 
            className="inline-flex items-center text-portugal-green hover:text-portugal-green/80"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Voltar à página inicial
          </Link>
        </div>
        <Footer />
      </div>
    );
  }

  const relatedPosts = allPosts?.filter(
    p => p.categories?.id === post.category_id && p.id !== post.id
  ).slice(0, 3) || [];

  const formattedDate = new Date(post.published_at || post.created_at).toLocaleDateString('pt-PT', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      <article className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          {/* Breadcrumb */}
          <div className="mb-6">
            <Link 
              to="/" 
              className="inline-flex items-center text-gray-600 hover:text-portugal-green text-sm"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Voltar às notícias
            </Link>
          </div>

          {/* Post Header */}
          <header className="mb-8">
            <span className={`category-badge ${post.categories?.color || 'bg-gray-600'} mb-4`}>
              {post.categories?.name || 'Geral'}
            </span>
            <h1 className="text-4xl md:text-5xl font-headline font-bold text-gray-900 mb-6">
              {post.title}
            </h1>
            <div className="flex flex-wrap items-center gap-6 text-gray-600 mb-6">
              <div className="flex items-center gap-2">
                <User size={20} />
                <span>{post.author_name}</span>
              </div>
              <div className="flex items-center gap-2">
                <Calendar size={20} />
                <span>{formattedDate}</span>
              </div>
              <span className="text-portugal-green font-medium">{post.read_time}</span>
            </div>
          </header>

          {/* Featured Image */}
          {post.image_url && (
            <div className="mb-8">
              <img
                src={post.image_url}
                alt={post.title}
                className="w-full h-96 object-cover rounded-lg shadow-lg"
              />
            </div>
          )}

          {/* Ad Space */}
          <AdSpace size="banner" position="Antes do Conteúdo" className="mb-8" />

          <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
            {/* Content */}
            <div className="lg:col-span-3">
              <div className="bg-white rounded-lg shadow-md p-8">
                <div className="prose prose-lg max-w-none">
                  <p className="text-xl text-gray-700 mb-6 font-medium">
                    {post.excerpt}
                  </p>
                  
                  
                  <div 
                    className="prose prose-lg max-w-none text-gray-800 leading-relaxed"
                    dangerouslySetInnerHTML={{ __html: post.content }}
                  />

                  {/* Tags */}
                  {post.tags && post.tags.length > 0 && (
                    <div className="mt-8 pt-6 border-t border-gray-200">
                      <h4 className="font-semibold text-gray-900 mb-3">Tags:</h4>
                      <div className="flex flex-wrap gap-2">
                        {post.tags.map((tag) => (
                          <span
                            key={tag}
                            className="px-3 py-1 bg-gray-100 text-gray-700 text-sm rounded-full hover:bg-portugal-green hover:text-white transition-colors cursor-pointer"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Ad Space */}
              <AdSpace size="rectangle" position="Após o Conteúdo" className="mt-8" />
            </div>

            {/* Sidebar */}
            <div className="lg:col-span-1">
              <AdSpace size="square" position="Lateral do Post" className="mb-8" />
              
              {/* Related Posts */}
              {relatedPosts.length > 0 && (
                <div className="bg-white rounded-lg shadow-md p-6">
                  <h3 className="text-xl font-headline font-bold text-gray-900 mb-4">
                    Posts Relacionados
                  </h3>
                  <div className="space-y-4">
                    {relatedPosts.map((relatedPost) => (
                      <div key={relatedPost.id} className="border-b border-gray-200 pb-4 last:border-b-0">
                        <Link to={`/post/${relatedPost.slug}`}>
                          <h4 className="font-semibold text-sm text-gray-900 hover:text-portugal-green transition-colors mb-2">
                            {relatedPost.title}
                          </h4>
                          <p className="text-xs text-gray-500">
                            {new Date(relatedPost.published_at || relatedPost.created_at).toLocaleDateString('pt-PT', { day: 'numeric', month: 'short', year: 'numeric' })}
                          </p>
                        </Link>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </article>

      <Footer />
    </div>
  );
};

export default Post;
