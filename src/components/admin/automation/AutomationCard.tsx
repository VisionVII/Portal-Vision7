import {
  Play, Pause, Pencil, Trash2, Copy, Clock, CheckCircle2, AlertTriangle, XCircle,
  Newspaper, Mail, Shield, Cog, Plug, Tag,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { CATEGORY_META } from '@/types/automation';
import type { AutomationV2 } from '@/types/automation';

const ICON_MAP: Record<string, React.ElementType> = {
  Newspaper, Mail, Shield, Cog, Plug,
};

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  active: { label: 'Ativa', color: 'bg-primary/10 text-primary border-primary/20', icon: CheckCircle2 },
  paused: { label: 'Pausada', color: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20', icon: Pause },
  draft: { label: 'Rascunho', color: 'bg-muted text-muted-foreground border-border', icon: Clock },
  error: { label: 'Erro', color: 'bg-destructive/10 text-destructive border-destructive/20', icon: XCircle },
  archived: { label: 'Arquivada', color: 'bg-muted text-muted-foreground border-border', icon: XCircle },
};

interface AutomationCardProps {
  automation: AutomationV2;
  onToggle: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onExecute: () => void;
  onClone: () => void;
}

function formatRelative(iso: string | null): string {
  if (!iso) return '—';
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return 'agora';
  if (mins < 60) return `${mins}min atrás`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h atrás`;
  return `${Math.floor(hours / 24)}d atrás`;
}

export function AutomationCard({
  automation,
  onToggle,
  onEdit,
  onDelete,
  onExecute,
  onClone,
}: AutomationCardProps) {
  const meta = CATEGORY_META[automation.category];
  const CatIcon = ICON_MAP[meta.icon] ?? Cog;
  const statusCfg = STATUS_CONFIG[automation.status] ?? STATUS_CONFIG.draft;
  const StatusIcon = statusCfg.icon;

  return (
    <div className="rounded-xl border border-border/40 bg-card p-4 transition-colors hover:border-border/70 group">
      {/* Header */}
      <div className="flex items-start justify-between gap-2 mb-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-muted/50">
            <CatIcon className="h-4 w-4 text-muted-foreground" />
          </div>
          <div className="min-w-0">
            <h4 className="text-sm font-medium text-foreground truncate">{automation.name}</h4>
            <p className="text-[11px] text-muted-foreground truncate">{meta.label}</p>
          </div>
        </div>
        <Badge variant="outline" className={`text-[10px] px-2 py-0.5 shrink-0 ${statusCfg.color}`}>
          <StatusIcon className="w-3 h-3 mr-1" />
          {statusCfg.label}
        </Badge>
      </div>

      {/* Description */}
      {automation.description && (
        <p className="text-xs text-muted-foreground mb-3 line-clamp-2">{automation.description}</p>
      )}

      {/* Metrics */}
      <div className="flex items-center gap-4 text-[11px] text-muted-foreground mb-3">
        <span className="flex items-center gap-1"><Clock className="w-3 h-3" />Último: {formatRelative(automation.lastRunAt)}</span>
        <span>Runs: {automation.runCount}</span>
        <span className={automation.successRate >= 80 ? 'text-primary' : 'text-amber-500'}>
          {automation.successRate.toFixed(0)}% sucesso
        </span>
      </div>

      {/* Tags */}
      {automation.category === 'content_pipeline' &&
        Array.isArray(automation.config?.search_tags) &&
        (automation.config.search_tags as string[]).length > 0 && (
        <div className="flex items-center gap-1.5 flex-wrap mb-3">
          <Tag className="w-3 h-3 text-primary shrink-0" />
          {(automation.config.search_tags as string[]).map((tag) => (
            <Badge key={tag} variant="outline" className="text-[10px] px-1.5 py-0 border-primary/30 text-primary bg-primary/5">
              {tag}
            </Badge>
          ))}
        </div>
      )}

      {/* Trigger info */}
      <div className="flex items-center gap-2 text-[11px] text-muted-foreground mb-3">
        <Badge variant="outline" className="text-[10px] px-1.5 py-0">
          {automation.triggerType === 'schedule'
            ? `⏱ ${automation.intervalMinutes}min`
            : automation.triggerType === 'event'
            ? '⚡ Evento'
            : automation.triggerType === 'webhook'
            ? '🔗 Webhook'
            : '👆 Manual'}
        </Badge>
        {automation.workflowId && (
          <span className="text-[10px] font-mono text-muted-foreground/60 truncate">WF: {automation.workflowId}</span>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1.5 pt-3 border-t border-border/40">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-primary hover:text-primary/80" onClick={onExecute}>
              <Play className="w-4 h-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>{automation.triggerType === 'schedule' ? 'Sincronizar tags e aguardar cron' : 'Executar agora'}</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-amber-500 hover:text-amber-400" onClick={onToggle}>
              {automation.status === 'active' ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
            </Button>
          </TooltipTrigger>
          <TooltipContent>{automation.status === 'active' ? 'Pausar' : 'Ativar'}</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-blue-500 hover:text-blue-400" onClick={onEdit}>
              <Pencil className="w-4 h-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Editar</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-violet-500 hover:text-violet-400" onClick={onClone}>
              <Copy className="w-4 h-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Clonar</TooltipContent>
        </Tooltip>
        <div className="flex-1" />
        <Tooltip>
          <TooltipTrigger asChild>
            <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-destructive hover:text-destructive/80" onClick={onDelete}>
              <Trash2 className="w-4 h-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Remover</TooltipContent>
        </Tooltip>
      </div>
    </div>
  );
}
