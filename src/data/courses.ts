export interface Course {
  id: string;
  title: string;
  slug: string;
  description: string;
  level: 'Iniciante' | 'Intermediário' | 'Avançado';
  duration: string;
  category?: string;
  category_id?: string | null;
  instructor?: string;
  published_at: string;
  status?: string;
  tags?: string[];
  partnerName?: string;
  affiliateUrl?: string;
  ctaLabel?: string;
  badge?: string;
  categories?: {
    id: string;
    name: string;
    slug: string;
    color: string;
  } | null;
}

export const courses: Course[] = [
  {
    id: '1',
    title: 'Introdução à Programação com JavaScript',
    slug: 'introducao-programacao-javascript',
    description: 'Aprenda lógica de programação, sintaxe JS e como construir aplicações web básicas.',
    level: 'Iniciante',
    duration: '8h',
    category: 'Tecnologia',
    instructor: 'Pedro Santos',
    published_at: '2025-06-20T08:00:00.000Z'
  },
  {
    id: '2',
    title: 'Análise de Dados para Jornalismo',
    slug: 'analise-dados-jornalismo',
    description: 'Use dados para construir reportagens mais profundas e obter insights relevantes.',
    level: 'Intermediário',
    duration: '10h',
    category: 'Mundo',
    instructor: 'Ana Ferreira',
    published_at: '2025-06-10T08:00:00.000Z'
  },
  {
    id: '3',
    title: 'SEO para Portais de Notícias',
    slug: 'seo-portais-noticias',
    description: 'Otimize conteúdo e tráfego orgânico em motores de busca para aumentar leitores.',
    level: 'Intermediário',
    duration: '6h',
    category: 'Tecnologia',
    instructor: 'Ricardo Alves',
    published_at: '2025-05-30T08:00:00.000Z'
  }
];
