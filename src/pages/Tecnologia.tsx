import React from 'react';
import CategoryPage from '../components/CategoryPage';

const Tecnologia = () => (
  <CategoryPage
    slug="tecnologia"
    title="Tecnologia"
    description="As últimas novidades do mundo da tecnologia, inovação e ciência"
    heroColor="bg-blue-600"
    defaultCategoryColor="bg-blue-600"
    otherCategories={[
      { name: 'Desporto', slug: 'desporto' },
      { name: 'Música', slug: 'musica' },
      { name: 'Saúde', slug: 'saude' },
      { name: 'Mundo', slug: 'mundo' },
    ]}
  />
);

export default Tecnologia;
