import React from 'react';
import CategoryPage from '../components/CategoryPage';

const Desporto = () => (
  <CategoryPage
    slug="desporto"
    title="Desporto"
    description="Futebol, modalidades e toda a atualidade desportiva"
    heroColor="bg-green-600"
    defaultCategoryColor="bg-green-600"
    otherCategories={[
      { name: 'Tecnologia', slug: 'tecnologia' },
      { name: 'Música', slug: 'musica' },
      { name: 'Saúde', slug: 'saude' },
      { name: 'Mundo', slug: 'mundo' },
    ]}
  />
);

export default Desporto;
