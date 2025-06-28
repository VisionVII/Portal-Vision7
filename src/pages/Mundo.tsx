
import React from 'react';
import Header from '../components/Header';
import Footer from '../components/Footer';
import PostCard from '../components/PostCard';
import AdSpace from '../components/AdSpace';

const Mundo = () => {
  const worldNews = [
    {
      id: 20,
      title: "União Europeia aprova novo acordo comercial",
      excerpt: "Tratado histórico promete fortalecer relações econômicas entre blocos comerciais.",
      image: "photo-1451187580459-43490279c0fa",
      category: "Economia",
      categoryColor: "bg-orange-600",
      author: "Isabel Fernandes",
      date: "27 Jun 2025",
      readTime: "6 min"
    },
    {
      id: 21,
      title: "Cimeira climática define metas ambiciosas",
      excerpt: "Líderes mundiais acordam medidas para combater as alterações climáticas.",
      image: "photo-1611273426858-450d8e3c9fce",
      category: "Ambiente",
      categoryColor: "bg-green-600",
      author: "Nuno Oliveira",
      date: "26 Jun 2025",
      readTime: "5 min"
    },
    {
      id: 22,
      title: "Inovação tecnológica revoluciona transportes",
      excerpt: "Novos sistemas de mobilidade sustentável ganham terreno nas grandes cidades.",
      image: "photo-1449824913935-59a10b8d2000",
      category: "Tecnologia",
      categoryColor: "bg-blue-600",
      author: "Luís Martins",
      date: "25 Jun 2025",
      readTime: "4 min"
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Mundo</h1>
          <p className="text-lg text-gray-600">As principais notícias internacionais</p>
        </div>

        <AdSpace size="banner" position="topo-mundo" className="mb-8" />

        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3 mb-8">
          {worldNews.map((post) => (
            <PostCard key={post.id} {...post} />
          ))}
        </div>

        <AdSpace size="rectangle" position="meio-mundo" className="mb-8" />
      </main>

      <Footer />
    </div>
  );
};

export default Mundo;
