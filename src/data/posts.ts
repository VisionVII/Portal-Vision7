
export interface Post {
  id: number;
  title: string;
  excerpt: string;
  content: string;
  image: string;
  category: string;
  categoryColor: string;
  author: string;
  date: string;
  readTime: string;
  featured: boolean;
  tags: string[];
}

export const posts: Post[] = [
  {
    id: 1,
    title: "Inteligência Artificial Revoluciona Setor da Saúde em Portugal",
    excerpt: "Hospitais portugueses começam a implementar sistemas de IA para diagnósticos mais precisos e tratamentos personalizados, marcando uma nova era na medicina nacional.",
    content: "A implementação de sistemas de inteligência artificial nos hospitais portugueses está a revolucionar a forma como os profissionais de saúde diagnosticam e tratam os pacientes...",
    image: "photo-1581091226825-a6a2a5aee158",
    category: "Tecnologia",
    categoryColor: "bg-blue-600",
    author: "Ana Silva",
    date: "28 Jun 2025",
    readTime: "5 min",
    featured: true,
    tags: ["IA", "Saúde", "Tecnologia", "Portugal"]
  },
  {
    id: 2,
    title: "FC Porto Conquista Vitória Histórica na Liga dos Campeões",
    excerpt: "Os dragões garantem lugar nas meias-finais com uma exibição memorável que ficará na história do clube e do futebol português.",
    content: "O FC Porto conseguiu uma das vitórias mais importantes da sua história na Liga dos Campeões...",
    image: "photo-1517022812141-23620dba5c23",
    category: "Desporto",
    categoryColor: "bg-green-600",
    author: "João Santos",
    date: "27 Jun 2025",
    readTime: "4 min",
    featured: false,
    tags: ["FC Porto", "Liga dos Campeões", "Futebol"]
  },
  {
    id: 3,
    title: "Festival de Música do Porto Recebe Artistas Internacionais",
    excerpt: "O maior festival de música da cidade anuncia lineup impressionante com artistas de renome mundial, prometendo atrair milhares de visitantes.",
    content: "O Festival de Música do Porto anuncia o seu lineup mais ambicioso de sempre...",
    image: "photo-1466442929976-97f336a657be",
    category: "Música",
    categoryColor: "bg-purple-600",
    author: "Maria Costa",
    date: "26 Jun 2025",
    readTime: "3 min",
    featured: false,
    tags: ["Música", "Festival", "Porto", "Cultura"]
  },
  {
    id: 4,
    title: "Nova Descoberta Médica no Hospital de São João",
    excerpt: "Investigadores portugueses desenvolvem tratamento inovador que pode revolucionar o tratamento de doenças cardiovasculares.",
    content: "Uma equipa de investigadores do Hospital de São João, no Porto, fez uma descoberta revolucionária...",
    image: "photo-1582562124811-c09040d0a901",
    category: "Saúde",
    categoryColor: "bg-red-600",
    author: "Dr. Pedro Oliveira",
    date: "25 Jun 2025",
    readTime: "6 min",
    featured: false,
    tags: ["Medicina", "Investigação", "Saúde", "Porto"]
  },
  {
    id: 5,
    title: "União Europeia Anuncia Novos Fundos para Energias Renováveis",
    excerpt: "Portugal entre os principais beneficiários do novo programa europeu que visa acelerar a transição energética no continente.",
    content: "A União Europeia anunciou um novo pacote de investimentos em energias renováveis...",
    image: "photo-1501854140801-50d01698950b",
    category: "Mundo",
    categoryColor: "bg-orange-600",
    author: "Luís Ferreira",
    date: "24 Jun 2025",
    readTime: "4 min",
    featured: false,
    tags: ["União Europeia", "Energia", "Ambiente", "Portugal"]
  },
  {
    id: 6,
    title: "Startup Portuense Desenvolve App Inovadora para Turismo",
    excerpt: "Jovem empresa do Porto cria aplicação que usa realidade aumentada para melhorar a experiência turística na cidade invicta.",
    content: "Uma startup sediada no Porto desenvolveu uma aplicação móvel revolucionária...",
    image: "photo-1498050108023-c5249f4df085",
    category: "Tecnologia",
    categoryColor: "bg-blue-600",
    author: "Carla Mendes",
    date: "23 Jun 2025",
    readTime: "5 min",
    featured: false,
    tags: ["Startup", "Tecnologia", "Turismo", "Porto"]
  }
];

export const categories = [
  { name: 'Tecnologia', path: '/tecnologia', color: 'bg-blue-600' },
  { name: 'Desporto', path: '/desporto', color: 'bg-green-600' },
  { name: 'Música', path: '/musica', color: 'bg-purple-600' },
  { name: 'Saúde', path: '/saude', color: 'bg-red-600' },
  { name: 'Mundo', path: '/mundo', color: 'bg-orange-600' }
];
