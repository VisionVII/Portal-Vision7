import { AppRole } from '@/hooks/useAdminAccess';

// ── Role blueprints ─────────────────────────────────────────────────────────

export const ROLE_BLUEPRINTS: Array<{
  role: AppRole;
  title: string;
  description: string;
  scope: string[];
  color: string;
}> = [
  {
    role: 'super_admin',
    title: 'Super Admin',
    description: 'Acesso total: infraestrutura, configurações críticas, gestão da equipa.',
    scope: ['Config avançadas', 'Infra & diagnósticos', 'Convites e permissões', 'Builder completo'],
    color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
  },
  {
    role: 'admin',
    title: 'Administrador',
    description: 'Opera o portal, homepage, cursos, parceiros e conteúdo.',
    scope: ['Homepage builder', 'Gestão de posts', 'Newsletter e CRM', 'Cursos e parcerias'],
    color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
  },
  {
    role: 'editor',
    title: 'Editor',
    description: 'Coordena destaques, aprova posts e organiza a pauta editorial.',
    scope: ['Publicar posts', 'Curadoria da homepage', 'Revisão editorial'],
    color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  },
  {
    role: 'redator',
    title: 'Redator',
    description: 'Cria textos, atualiza conteúdo e trabalha em drafts.',
    scope: ['Criar rascunhos', 'Editar próprio conteúdo', 'Enviar para revisão'],
    color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
  },
  {
    role: 'moderador',
    title: 'Moderador',
    description: 'Apoio operacional, comentários e moderação de comunidade.',
    scope: ['Fila de revisão', 'Moderação de comunidade'],
    color: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300',
  },
  {
    role: 'analyst',
    title: 'Analista',
    description: 'Acesso focado em analytics, insights e leitura de performance.',
    scope: ['Painel de insights', 'Relatórios e KPIs'],
    color: 'bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-300',
  },
];

export const getBlueprintForRole = (role: AppRole) =>
  ROLE_BLUEPRINTS.find((b) => b.role === role);

export const getRoleTitle = (role: AppRole) =>
  getBlueprintForRole(role)?.title ?? role.replace('_', ' ');

export const getRoleBadgeClass = (role: AppRole) =>
  getBlueprintForRole(role)?.color ?? 'bg-muted text-muted-foreground';
