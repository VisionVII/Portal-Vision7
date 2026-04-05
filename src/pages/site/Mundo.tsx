import React from 'react';
import CategoryPage from '@/components/content/CategoryPage';

const Mundo = () => (
  <CategoryPage
    slug="mundo"
    title="Mundo"
    description="Notícias internacionais e atualidade global"
    heroColor="bg-orange-600"
    defaultCategoryColor="bg-orange-600"
    otherCategories={[
      { name: 'Tecnologia', slug: 'tecnologia' },
      { name: 'Desporto', slug: 'desporto' },
      { name: 'Música', slug: 'musica' },
      { name: 'Saúde', slug: 'saude' },
    ]}
  />
);

export default Mundo;
