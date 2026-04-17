import { useState } from 'react';
import { Clock, User, ChevronDown, ChevronRight, Shield, Plus, Pencil, Trash2, Power } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useAuditLogs } from '@/hooks/useAuditLogs';

const ACTION_CONFIG: Record<string, { label: string; icon: React.ElementType; color: string }> = {
  created: { label: 'Criado', icon: Plus, color: 'text-emerald-500' },
  updated: { label: 'Alterado', icon: Pencil, color: 'text-blue-500' },
  deleted: { label: 'Removido', icon: Trash2, color: 'text-red-500' },
  status_changed: { label: 'Status', icon: Power, color: 'text-amber-500' },
  executed: { label: 'Executado', icon: Power, color: 'text-primary' },
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleString('pt-PT', {
    day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
  });
}

/* Simple key-level diff between two objects */
function DiffView({ oldVal, newVal }: { oldVal: Record<string, unknown>; newVal: Record<string, unknown> }) {
  const allKeys = Array.from(new Set([...Object.keys(oldVal), ...Object.keys(newVal)]));
  const changes = allKeys.filter((k) => JSON.stringify(oldVal[k]) !== JSON.stringify(newVal[k]));

  if (changes.length === 0) {
    return <p className="text-xs text-muted-foreground italic">Sem alterações detectadas</p>;
  }

  return (
    <div className="space-y-1.5 text-xs font-mono">
      {changes.map((key) => (
        <div key={key} className="rounded-lg border border-border/30 bg-muted/20 px-3 py-2">
          <span className="font-semibold text-foreground">{key}</span>
          {oldVal[key] !== undefined && (
            <div className="mt-0.5">
              <span className="text-red-400 dark:text-red-300">- {JSON.stringify(oldVal[key])}</span>
            </div>
          )}
          {newVal[key] !== undefined && (
            <div className="mt-0.5">
              <span className="text-emerald-500 dark:text-emerald-400">+ {JSON.stringify(newVal[key])}</span>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

export function AuditLogViewer({ automationId }: { automationId?: string }) {
  const [expanded, setExpanded] = useState<Set<number>>(new Set());
  const [page, setPage] = useState(1);
  const { entries, total, isLoading } = useAuditLogs({ automationId, page, pageSize: 30 });

  const toggle = (id: number) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  if (isLoading) {
    return <div className="py-8 text-center text-sm text-muted-foreground">Carregando audit log...</div>;
  }

  if (entries.length === 0) {
    return (
      <div className="py-8 text-center">
        <Shield className="mx-auto mb-2 h-8 w-8 text-muted-foreground/40" />
        <p className="text-sm text-muted-foreground">Nenhum registo de auditoria encontrado</p>
      </div>
    );
  }

  const totalPages = Math.ceil(total / 30);

  return (
    <div className="space-y-2">
      {entries.map((entry) => {
        const cfg = ACTION_CONFIG[entry.action] ?? ACTION_CONFIG.updated;
        const Icon = cfg.icon;
        const isOpen = expanded.has(entry.id);
        const hasOldNew = entry.details?.old_values && entry.details?.new_values;

        return (
          <div
            key={entry.id}
            className="rounded-xl border border-border/30 bg-card/60 transition-colors hover:bg-card/80"
          >
            <button
              className="flex w-full items-center gap-3 px-4 py-3 text-left"
              onClick={() => toggle(entry.id)}
            >
              {isOpen ? (
                <ChevronDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
              ) : (
                <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
              )}
              <Icon className={`h-4 w-4 shrink-0 ${cfg.color}`} />
              <div className="min-w-0 flex-1">
                <span className="text-sm font-medium text-foreground">{cfg.label}</span>
                {entry.automationId && (
                  <span className="ml-2 text-xs text-muted-foreground font-mono">
                    {entry.automationId.slice(0, 8)}…
                  </span>
                )}
              </div>
              <div className="flex items-center gap-3 shrink-0">
                {entry.actorEmail && (
                  <Badge variant="outline" className="text-[10px] px-1.5 py-0 gap-1">
                    <User className="h-2.5 w-2.5" />
                    {entry.actorEmail.split('@')[0]}
                  </Badge>
                )}
                <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {formatDate(entry.createdAt)}
                </span>
              </div>
            </button>

            {isOpen && (
              <div className="border-t border-border/20 px-4 py-3">
                {hasOldNew ? (
                  <DiffView
                    oldVal={entry.details.old_values as Record<string, unknown>}
                    newVal={entry.details.new_values as Record<string, unknown>}
                  />
                ) : (
                  <pre className="max-h-48 overflow-auto rounded-lg border border-border/20 bg-muted/20 p-3 text-xs font-mono text-muted-foreground">
                    {JSON.stringify(entry.details, null, 2)}
                  </pre>
                )}
                {entry.ipAddress && (
                  <p className="mt-2 text-[10px] text-muted-foreground">IP: {entry.ipAddress}</p>
                )}
              </div>
            )}
          </div>
        );
      })}

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 pt-2">
          <Button variant="outline" size="sm" className="h-7 text-xs" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
            Anterior
          </Button>
          <span className="text-xs text-muted-foreground">{page}/{totalPages}</span>
          <Button variant="outline" size="sm" className="h-7 text-xs" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
            Próximo
          </Button>
        </div>
      )}
    </div>
  );
}

export default AuditLogViewer;
