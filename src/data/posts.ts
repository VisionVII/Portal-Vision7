
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
    excerpt: "Hospitais portugueses começam a implementar sistemas de IA para diagnósticos mais precisos e tratamentos personalizados.",
    content: "A implementação de sistemas de inteligência artificial nos hospitais portugueses está a revolucionar a forma como os profissionais de saúde diagnosticam e tratam os pacientes. Os primeiros resultados mostram redução do tempo de espera, melhoria na acuidade dos exames e planos de tratamento personalizados.",
    image: "photo-1581091226825-a6a2a5aee158",
    category: "Tecnologia",
    categoryColor: "bg-blue-600",
    author: "Ana Silva",
    date: "28 Mar 2026",
    readTime: "5 min",
    featured: true,
    tags: ["IA", "Saúde", "Tecnologia", "Portugal"]
  },
  {
    id: 2,
    title: "FC Porto Conquista Vitória Histórica na Liga dos Campeões",
    excerpt: "Os dragões garantem lugar nas meias-finais com uma exibição memorável.",
    content: "O FC Porto conseguiu uma das vitórias mais importantes da sua história na Liga dos Campeões com um golo nos últimos minutos. A equipa comandada pelo treinador manteve a posse e encontrou espaços na defesa adversária.",
    image: "photo-1517022812141-23620dba5c23",
    category: "Desporto",
    categoryColor: "bg-green-600",
    author: "João Santos",
    date: "27 Mar 2026",
    readTime: "4 min",
    featured: false,
    tags: ["FC Porto", "Liga dos Campeões", "Futebol"]
  },
  {
    id: 3,
    title: "Festival de Música do Porto Recebe Artistas Internacionais",
    excerpt: "O maior festival da cidade anuncia lineup com artistas de renome mundial.",
    content: "O Festival de Música do Porto anuncia o seu lineup mais ambicioso de sempre, com vozes de hip-hop, pop e rock internacional. Esperam-se mais de 150 mil espectadores ao longo de cinco dias.",
    image: "photo-1466442929976-97f336a657be",
    category: "Música",
    categoryColor: "bg-purple-600",
    author: "Maria Costa",
    date: "26 Mar 2026",
    readTime: "3 min",
    featured: false,
    tags: ["Música", "Festival", "Cultura", "Porto"]
  },
  {
    id: 4,
    title: "Nova Descoberta Médica no Hospital de São João",
    excerpt: "Investigadores desenvolvem tratamento inovador para doenças cardiovasculares.",
    content: "Uma equipa de investigadores do Hospital de São João, no Porto, fez uma descoberta revolucionária no tratamento de doenças cardiovasculares, usando biomateriais avançados para regeneração tecidual.",
    image: "photo-1582562124811-c09040d0a901",
    category: "Saúde",
    categoryColor: "bg-red-600",
    author: "Dr. Pedro Oliveira",
    date: "25 Mar 2026",
    readTime: "6 min",
    featured: false,
    tags: ["Medicina", "Investigação", "Saúde"]
  },
  {
    id: 5,
    title: "Nova Lei de Turismo Sustentável em Portugal",
    excerpt: "Governo aprova normas para reduzir o impacto ambiental do setor turístico.",
    content: "O parlamento português aprovou hoje um pacote de leis para o turismo sustentável, com incentivos para hotéis ecológicos e limites de lotação em áreas naturais sensíveis.",
    image: "photo-1501854140801-50d01698950b",
    category: "Mundo",
    categoryColor: "bg-orange-600",
    author: "Luís Ferreira",
    date: "24 Mar 2026",
    readTime: "4 min",
    featured: false,
    tags: ["Política", "Ambiente", "Turismo"]
  },
  {
    id: 6,
    title: "Startup Portuense Cria App de Realidade Aumentada para Turismo",
    excerpt: "App usa AR para guiamento interativo por pontos históricos do Porto.",
    content: "A startup portuense lançou uma aplicação que usa realidade aumentada para contar a história dos monumentos do Porto. O usuário aponta o telemóvel e vê personagens históricas narrando fatos.",
    image: "photo-1498050108023-c5249f4df085",
    category: "Tecnologia",
    categoryColor: "bg-blue-600",
    author: "Carla Mendes",
    date: "23 Mar 2026",
    readTime: "5 min",
    featured: false,
    tags: ["Startup", "AR", "Turismo", "Porto"]
  },
  {
    id: 7,
    title: "Mercado Imobiliário em Lisboa Sinaliza Recuperação",
    excerpt: "Preços estabilizam depois de dois anos de queda abrupta.",
    content: "Especialistas apontam que a estabilização se deve às novas políticas fiscais e aos programas de reabilitação urbana que atraem investidores.",
    image: "photo-1494105875900-0f07520e1d74",
    category: "Mundo",
    categoryColor: "bg-orange-600",
    author: "Rita Gomes",
    date: "22 Mar 2026",
    readTime: "4 min",
    featured: false,
    tags: ["Economia", "Imobiliário"]
  },
  {
    id: 8,
    title: "Inauguração de Centro Cultural no Cais de Gaia",
    excerpt: "Nova infra-estrutura propõe-se a fortalecer a cena artística do Douro.",
    content: "O novo centro cultural combina galerias, salas de espetáculo e espaços de coworking para artistas emergentes.",
    image: "photo-1496284045406-d320f1b0434f",
    category: "Cultura",
    categoryColor: "bg-purple-600",
    author: "Paula Ribeiro",
    date: "21 Mar 2026",
    readTime: "3 min",
    featured: false,
    tags: ["Cultura", "Arte", "Porto"]
  },
  {
    id: 9,
    title: "Governo Anuncia Incentivos para Mobilidade Elétrica",
    excerpt: "Objetivo é aumentar frota elétrica em 40% até 2028.",
    content: "Plano inclui apoio à compra de carros elétricos, instalação de estações de carregamento e benefícios fiscais para empresas.",
    image: "photo-1541983964194-2c90591a7e5c",
    category: "Mundo",
    categoryColor: "bg-orange-600",
    author: "Miguel Coelho",
    date: "20 Mar 2026",
    readTime: "5 min",
    featured: false,
    tags: ["Energia", "Mobilidade", "Portugal"]
  },
  {
    id: 10,
    title: "Novo Projeto de Emprego Digital em Coimbra",
    excerpt: "Programa treina jovens para validar competências digitais e programar.",
    content: "A iniciativa visa criar 500 empregos em áreas de TI e permitir transição profissional para sectores em crescimento.",
    image: "photo-1522071820081-009f0129c71c",
    category: "Tecnologia",
    categoryColor: "bg-blue-600",
    author: "Sofia Moura",
    date: "19 Mar 2026",
    readTime: "4 min",
    featured: false,
    tags: ["Emprego", "Tecnologia", "Inclusão"]
  },
  {
    id: 11,
    title: "Real Madrid Ganha Troféu em Final Dramática",
    excerpt: "Clássico verificado com golos no período extra e penáltis.",
    content: "A final do torneio europeu terminou em sequência de penáltis após empate de 2-2 no tempo regulamentar e 3-3 na prorrogação.",
    image: "photo-1513077021181-70c2a2e1f32f",
    category: "Desporto",
    categoryColor: "bg-green-600",
    author: "Carlos Pereira",
    date: "18 Mar 2026",
    readTime: "5 min",
    featured: false,
    tags: ["Futebol", "Clássico", "Final"]
  },
  {
    id: 12,
    title: "Concerto de Fado em Braga Celebrado por Críticos",
    excerpt: "Nomes de fado contemporâneo encantam plateia com repertório clássico.",
    content: "O concerto atraiu fãs de todas as idades e consolidou Braga como referência para a música tradicional portuguesa.",
    image: "photo-1509042239860-f550ce710b93",
    category: "Música",
    categoryColor: "bg-purple-600",
    author: "Joana Sousa",
    date: "17 Mar 2026",
    readTime: "3 min",
    featured: false,
    tags: ["Fado", "Música", "Cultura"]
  },
  {
    id: 13,
    title: "Clínica de Bem-Estar Mental amplia atendimento rural",
    excerpt: "Projeto integra telemedicina e consultas presenciais em aldeias.",
    content: "A iniciativa pretende reduzir o gap de atendimento psicológico nas zonas rurais, oferecendo terapias e grupos de suporte comunitário.",
    image: "photo-1500530855697-b586d89ba3ee",
    category: "Saúde",
    categoryColor: "bg-red-600",
    author: "Inês Ribeiro",
    date: "16 Mar 2026",
    readTime: "4 min",
    featured: false,
    tags: ["Saúde Mental", "Comunidade", "Bem-Estar"]
  },
  {
    id: 14,
    title: "Estrelas de Jazz enchem sala no Palácio de Cristal",
    excerpt: "Noite de improvisos com músicos portugueses e internacionais.",
    content: "O evento reuniu entusiastas e críticos e trouxe performances inovadoras na tradição jazzística moderna.",
    image: "photo-1462219401107-9cc3014f0db6",
    category: "Música",
    categoryColor: "bg-purple-600",
    author: "Renato Dias",
    date: "15 Mar 2026",
    readTime: "3 min",
    featured: false,
    tags: ["Jazz", "Música", "Porto"]
  },
  {
    id: 15,
    title: "Avanço em Biotecnologia entrega solução para água potável",
    excerpt: "Nova membrana filtrante aumenta eficiência e reduz custos de tratamento.",
    content: "Investigadores utilizaram biomateriais sustentáveis para desenvolver uma membrana de filtragem que remove 99,5% de impurezas com menor energia.",
    image: "photo-1500534314209-a25ddb2bd429",
    category: "Tecnologia",
    categoryColor: "bg-blue-600",
    author: "Fernanda Costa",
    date: "14 Mar 2026",
    readTime: "5 min",
    featured: false,
    tags: ["Biotecnologia", "Sustentabilidade", "Inovação"]
  },
  {
    id: 16,
    title: "Novaéria em Agricultura Urbana no Porto",
    excerpt: "Agricultura vertical começa a ser adotada em edifícios comerciais.",
    content: "Empresas instaladas no Porto estão a implementar sistemas de cultivo hidropônico que fornecem vegetais frescos a restaurantes locais.",
    image: "photo-1518837695005-2083093ee35b",
    category: "Mundo",
    categoryColor: "bg-orange-600",
    author: "Gonçalo Nunes",
    date: "13 Mar 2026",
    readTime: "4 min",
    featured: false,
    tags: ["Agricultura", "Sustentabilidade", "Alimentação"]
  },
  {
    id: 17,
    title: "Impacto Socioeconômico do Turismo pós-pandemia",
    excerpt: "Relatório aponta recuperação gradual e novos desafios para alojamento local.",
    content: "O turismo voltou a crescer em 2025, mas com foco em experiências sustentáveis e modelos de trabalho descentralizados.",
    image: "photo-1504384308090-c894fdcc538d",
    category: "Mundo",
    categoryColor: "bg-orange-600",
    author: "Tânia Almeida",
    date: "12 Jun 2025",
    readTime: "5 min",
    featured: false,
    tags: ["Sociedade", "Economia", "Turismo"]
  },
  {
    id: 18,
    title: "Clubes de Futebol investem em Escolas de Formação Inclusive",
    excerpt: "Projeto social visa inclusão de jovens com deficiência no desporto de competição.",
    content: "Iniciativas são apoiadas por pares do futebol e ministérios para promover igualdade através do desporto.",
    image: "photo-1521412644187-c49fa049e84d",
    category: "Desporto",
    categoryColor: "bg-green-600",
    author: "Diego Almeida",
    date: "11 Jun 2025",
    readTime: "3 min",
    featured: false,
    tags: ["Inclusão", "Desporto", "Juventude"]
  },
  {
    id: 19,
    title: "Cinema Nacional em Alta com Duas Produções Premiada",
    excerpt: "Filmes portugueses ganham reconhecimento em festivais internacionais.",
    content: "As produções abordam temas sociais e ambientações portuguesas, conquistando prêmios internacionais.",
    image: "photo-1524985069026-dd778a71c7b4",
    category: "Cultura",
    categoryColor: "bg-purple-600",
    author: "Marta Raposo",
    date: "10 Jun 2025",
    readTime: "4 min",
    featured: false,
    tags: ["Cinema", "Cultura", "Prêmios"]
  },
  {
    id: 20,
    title: "Nova Liga de Esports Atraí Talentos de Todo o País",
    excerpt: "Equipes de todos os distritos competem em torneio nacional de jogos eletrônicos.",
    content: "A liga mundial de esports em Portugal oferece bolsas de estudo, mentoria e competição para jovens jogadores.",
    image: "photo-1498910579256-0c96c8084e4e",
    category: "Desporto",
    categoryColor: "bg-green-600",
    author: "Ricardo Gonçalves",
    date: "09 Jun 2025",
    readTime: "5 min",
    featured: false,
    tags: ["Esports", "Tecnologia", "Juventude"]
  }
];

export const categories = [
  { name: 'Tecnologia', path: '/tecnologia', color: 'bg-blue-600' },
  { name: 'Desporto', path: '/desporto', color: 'bg-green-600' },
  { name: 'Música', path: '/musica', color: 'bg-purple-600' },
  { name: 'Saúde', path: '/saude', color: 'bg-red-600' },
  { name: 'Mundo', path: '/mundo', color: 'bg-orange-600' }
];
