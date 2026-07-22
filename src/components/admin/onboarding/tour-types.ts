// Tipos e registo dos passos do tutorial guiado do dashboard admin.
import type { AdminView } from '@/components/admin/dashboard-types';

export interface TourStep {
  id: string;
  view: AdminView;
  targetSelector: string;
  title: string;
  body: string;
  placement?: 'top' | 'bottom' | 'left' | 'right';
  order: number;
}

export interface TourArea {
  view: AdminView;
  label: string;
  steps: TourStep[];
}

export const TOUR_AREAS: TourArea[] = [
  {
    view: 'overview',
    label: 'Visão geral',
    steps: [
      {
        id: 'overview-stats',
        view: 'overview',
        targetSelector: '[data-tour="overview-stats"]',
        title: 'Os teus números',
        body: 'Publicações do mês, total, visualizações e rascunhos — o resumo rápido do portal.',
        placement: 'bottom',
        order: 1,
      },
      {
        id: 'overview-articles',
        view: 'overview',
        targetSelector: '[data-tour="overview-articles"]',
        title: 'Últimos artigos',
        body: 'A tua atividade editorial recente. Clica num artigo para o abrir e editar.',
        placement: 'right',
        order: 2,
      },
      {
        id: 'overview-sidebar',
        view: 'overview',
        targetSelector: '[data-tour="overview-sidebar"]',
        title: 'Tendências e categorias',
        body: 'Semanas de publicação e as categorias mais fortes do portal, de relance.',
        placement: 'left',
        order: 3,
      },
      {
        id: 'overview-nav',
        view: 'overview',
        targetSelector: '[data-tour="nav-content"]',
        title: 'Navegação',
        body: 'Usa o menu lateral para mudar de área — Conteúdo, Automações, Configurações e mais.',
        placement: 'right',
        order: 4,
      },
    ],
  },
  {
    view: 'content',
    label: 'Conteúdo',
    steps: [
      {
        id: 'content-new-post',
        view: 'content',
        targetSelector: '[data-tour="content-new-post"]',
        title: 'Criar um post',
        body: 'Começa aqui um novo artigo editorial — abre o editor completo.',
        placement: 'bottom',
        order: 1,
      },
      {
        id: 'content-search',
        view: 'content',
        targetSelector: '[data-tour="content-search"]',
        title: 'Procurar e filtrar',
        body: 'Encontra posts por título ou categoria, e filtra por publicados/rascunhos.',
        placement: 'bottom',
        order: 2,
      },
      {
        id: 'content-tabs',
        view: 'content',
        targetSelector: '[data-tour="content-tabs"]',
        title: 'Posts, curadoria e categorias',
        body: 'Alterna entre posts editoriais, sugestões curadas pela IA e gestão de categorias.',
        placement: 'top',
        order: 3,
      },
    ],
  },
  {
    view: 'automations',
    label: 'Automações',
    steps: [
      {
        id: 'automation-kpis',
        view: 'automations',
        targetSelector: '[data-tour="automation-kpis"]',
        title: 'Estado do motor',
        body: 'Workflows ativos, publicados e erros recentes — a saúde do pipeline num relance.',
        placement: 'bottom',
        order: 1,
      },
      {
        id: 'automation-tabs',
        view: 'automations',
        targetSelector: '[data-tour="automation-tabs"]',
        title: 'Pipeline, automações, logs e ferramentas',
        body: 'Acompanha o pipeline de notícias, gere automações n8n e consulta o histórico de execuções.',
        placement: 'top',
        order: 2,
      },
    ],
  },
  {
    view: 'settings',
    label: 'Configurações',
    steps: [
      {
        id: 'settings-site',
        view: 'settings',
        targetSelector: '[data-tour="settings-site"]',
        title: 'Identidade do portal',
        body: 'Nome, logótipo e definições gerais do site.',
        placement: 'bottom',
        order: 1,
      },
      {
        id: 'settings-ai',
        view: 'settings',
        targetSelector: '[data-tour="settings-ai"]',
        title: 'Assistente IA',
        body: 'Ativa e configura o assistente de IA do portal — modelo e comportamento.',
        placement: 'bottom',
        order: 2,
      },
      {
        id: 'settings-tutorial',
        view: 'settings',
        targetSelector: '[data-tour="settings-tutorial"]',
        title: 'Controlo do tutorial',
        body: 'Aqui podes desligar o tutorial a qualquer momento, ver o progresso ou reiniciá-lo.',
        placement: 'bottom',
        order: 3,
      },
    ],
  },
];
