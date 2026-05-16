export const STATUS_BADGE: Record<string, { label: string; className: string }> = {
  ready: { label: 'Pronto', className: 'bg-primary/15 text-primary border-primary/30' },
  draft: { label: 'Rascunho', className: 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30' },
  'auto-draft': { label: 'Auto-Draft', className: 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30' },
  'pending-review': { label: 'Aguardando Revisão', className: 'bg-violet-500/15 text-violet-600 dark:text-violet-400 border-violet-500/30' },
  published: { label: 'Promovido', className: 'bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/30' },
  rejected: { label: 'Rejeitado', className: 'bg-destructive/15 text-destructive border-destructive/30' },
};

export function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('pt-PT', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function canPromote(status: string) {
  return ['ready', 'pending-review', 'draft', 'auto-draft'].includes(status);
}

export function canReject(status: string) {
  return status !== 'rejected' && status !== 'published';
}

export function canEdit(status: string) {
  return status !== 'published';
}

export function statusActions(status: string): { label: string; status: string }[] {
  const actions: { label: string; status: string }[] = [];
  if (status !== 'ready') actions.push({ label: 'Marcar como Pronto', status: 'ready' });
  if (status !== 'pending-review') actions.push({ label: 'Enviar para Revisão', status: 'pending-review' });
  if (status !== 'draft' && status !== 'auto-draft') actions.push({ label: 'Voltar a Rascunho', status: 'draft' });
  return actions;
}
