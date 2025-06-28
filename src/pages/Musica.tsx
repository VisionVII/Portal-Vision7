
import React from 'react';
import Header from '../components/Header';
import Footer from '../components/Footer';
import PostCard from '../components/PostCard';
import AdSpace from '../components/AdSpace';

const Musica = () => {
  const musicNews = [
    {
      id: 14,
      title: "Festival Rock in Rio Lisboa anuncia lineup 2025",
      excerpt: "Grandes nomes da música internacional confirmados para a edição portuguesa do festival.",
      image: "photo-1493225457124-a3eb161ffa5f",
      category: "Festivais",
      categoryColor: "bg-purple-600",
      author: "Ana Rodrigues",
      date: "27 Jun 2025",
      readTime: "3 min"
    },
    {
      id: 15,
      title: "Artista português ganha Grammy Internacional",
      excerpt: "Reconhecimento mundial para a música portuguesa numa cerimónia histórica.",
      image: "photo-1511735111819-9a3f7709049c",
      category: "Prémios",
      categoryColor: "bg-yellow-600",
      author: "Carlos Mendes",
      date: "26 Jun 2025",
      readTime: "4 min"
    },
    {
      id: 16,
      title: "Nova casa de fados abre no Porto",
      excerpt: "Espaço dedicado ao fado tradicional promete revitalizar a cultura musical da cidade.",
      image: "photo-1493225457124-a3eb161ffa5f",
      category: "Cultura",
      categoryColor: "bg-indigo-600",
      author: "Teresa Lima",
      date: "25 Jun 2025",
      readTime: "2 min"
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Música</h1>
          <p className="text-lg text-gray-600">O melhor da música portuguesa e internacional</p>
        </div>

        <AdSpace size="banner" position="topo-musica" className="mb-8" />

        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3 mb-8">
          {musicNews.map((post) => (
            <PostCard key={post.id} {...post} />
          ))}
        </div>

        <AdSpace size="rectangle" position="meio-musica" className="mb-8" />
      </main>

      <Footer />
    </div>
  );
};

export default Musica;
