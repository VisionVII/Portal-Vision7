
import React from 'react';
import { useParams } from 'react-router-dom';
import Header from '../components/Header';
import Footer from '../components/Footer';
import AdSpace from '../components/AdSpace';
import { posts } from '../data/posts';
import { Calendar, User } from 'lucide-react';

const Post = () => {
  const { id } = useParams();
  const post = posts.find(p => p.id === parseInt(id || '0'));

  if (!post) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="container mx-auto px-4 py-16 text-center">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Post não encontrado</h1>
          <p className="text-gray-600">O artigo que procura não existe ou foi removido.</p>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      <article className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          {/* Post Header */}
          <header className="mb-8">
            <span className={`category-badge ${post.categoryColor} mb-4`}>
              {post.category}
            </span>
            <h1 className="text-4xl md:text-5xl font-headline font-bold text-gray-900 mb-6">
              {post.title}
            </h1>
            <div className="flex items-center gap-6 text-gray-600 mb-6">
              <div className="flex items-center gap-2">
                <User size={20} />
                <span>{post.author}</span>
              </div>
              <div className="flex items-center gap-2">
                <Calendar size={20} />
                <span>{post.date}</span>
              </div>
              <span className="text-portugal-green font-medium">{post.readTime}</span>
            </div>
          </header>

          {/* Featured Image */}
          <div className="mb-8">
            <img
              src={`https://images.unsplash.com/${post.image}?auto=format&fit=crop&w=1200&q=80`}
              alt={post.title}
              className="w-full h-96 object-cover rounded-lg shadow-lg"
            />
          </div>

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
                  
                  <div className="text-gray-800 leading-relaxed space-y-4">
                    <p>
                      Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod 
                      tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, 
                      quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.
                    </p>
                    
                    <p>
                      Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore 
                      eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, 
                      sunt in culpa qui officia deserunt mollit anim id est laborum.
                    </p>

                    <h2 className="text-2xl font-headline font-bold text-gray-900 mt-8 mb-4">
                      Impacto na Sociedade Portuguesa
                    </h2>
                    
                    <p>
                      Sed ut perspiciatis unde omnis iste natus error sit voluptatem accusantium 
                      doloremque laudantium, totam rem aperiam, eaque ipsa quae ab illo inventore 
                      veritatis et quasi architecto beatae vitae dicta sunt explicabo.
                    </p>

                    <blockquote className="border-l-4 border-portugal-green pl-6 py-4 bg-gray-50 rounded-r-lg my-6">
                      <p className="text-lg italic text-gray-700">
                        "Esta inovação representa um marco histórico para Portugal e 
                        posiciona o país na vanguarda da tecnologia europeia."
                      </p>
                      <cite className="text-sm text-gray-600 mt-2 block">
                        - Especialista em Tecnologia
                      </cite>
                    </blockquote>

                    <p>
                      Nemo enim ipsam voluptatem quia voluptas sit aspernatur aut odit aut fugit, 
                      sed quia consequuntur magni dolores eos qui ratione voluptatem sequi nesciunt.
                    </p>
                  </div>

                  {/* Tags */}
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
                </div>
              </div>

              {/* Ad Space */}
              <AdSpace size="rectangle" position="Após o Conteúdo" className="mt-8" />
            </div>

            {/* Sidebar */}
            <div className="lg:col-span-1">
              <AdSpace size="square" position="Lateral do Post" className="mb-8" />
              
              {/* Related Posts */}
              <div className="bg-white rounded-lg shadow-md p-6">
                <h3 className="text-xl font-headline font-bold text-gray-900 mb-4">
                  Posts Relacionados
                </h3>
                <div className="space-y-4">
                  {posts
                    .filter(p => p.category === post.category && p.id !== post.id)
                    .slice(0, 3)
                    .map((relatedPost) => (
                      <div key={relatedPost.id} className="border-b border-gray-200 pb-4 last:border-b-0">
                        <a href={`/post/${relatedPost.id}`}>
                          <h4 className="font-semibold text-sm text-gray-900 hover:text-portugal-green transition-colors mb-2">
                            {relatedPost.title}
                          </h4>
                          <p className="text-xs text-gray-500">{relatedPost.date}</p>
                        </a>
                      </div>
                    ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </article>

      <Footer />
    </div>
  );
};

export default Post;
