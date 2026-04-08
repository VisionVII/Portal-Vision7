import {
  Play, Pause, Pencil, Trash2, Copy, Clock, CheckCircle2, AlertTriangle, XCircle,
  Newspaper, Mail, Shield, Cog, Plug,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { CATEGORY_META } from '@/types/automation';
import type { AutomationV2 } from '@/types/automation';

const ICON_MAP: Record<string, React.ElementType> = {
  Newspaper, Mail, Shield, Cog, Plug,
};

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  active: { label: 'Ativa', color: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30', icon: CheckCircle2 },
  paused: { label: 'Pausada', color: 'bg-amber-500/20 text-amber-400 border-amber-500/30', icon: Pause },
  draft: { label: 'Rascunho', color: 'bg-slate-500/20 text-slate-400 border-slate-500/30', icon: Clock },
  error: { label: 'Erro', color: 'bg-red-500/20 text-red-400 border-red-500/30', icon: XCircle },
  archived: { label: 'Arquivada', color: 'bg-gray-500/20 text-gray-400 border-gray-500/30', icon: XCircle },
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
    <Card className="bg-slate-800/60 border-slate-700/50 hover:border-slate-600/50 transition-colors group">
      <CardContent className="p-4">
        {/* Header */}
        <div className="flex items-start justify-between gap-2 mb-3">
          <div className="flex items-center gap-2 min-w-0">
            <div className={`p-1.5 rounded-md bg-${meta.color}-500/10`}>
              <CatIcon className={`w-4 h-4 text-${meta.color}-400`} />
            </div>
            <div className="min-w-0">
              <h4 className="text-sm font-medium text-white truncate">{automation.name}</h4>
              <p className="text-[11px] text-gray-500 truncate">{meta.label}</p>
            </div>
          </div>
          <Badge variant="outline" className={`text-[10px] px-2 py-0.5 shrink-0 ${statusCfg.color}`}>
            <StatusIcon className="w-3 h-3 mr-1" />
            {statusCfg.label}
          </Badge>
        </div>

        {/* Description */}
        {automation.description && (
          <p className="text-xs text-gray-400 mb-3 line-clamp-2">{automation.description}</p>
        )}

        {/* Metrics row */}
        <div className="flex items-center gap-4 text-[11px] text-gray-500 mb-3">
          <span className="flex items-center gap-1">
            <Clock className="w-3 h-3" />
            Último: {formatRelative(automation.lastRunAt)}
          </span>
          <span>Runs: {automation.runCount}</span>
          <span className={automation.successRate >= 80 ? 'text-emerald-400' : 'text-amber-400'}>
            {automation.successRate.toFixed(0)}% sucesso
          </span>
        </div>

        {/* Trigger info */}
        <div className="flex items-center gap-2 text-[11px] text-gray-500 mb-3">
          <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-slate-600 text-slate-400">
            {automation.triggerType === 'schedule'
              ? `⏱ ${automation.intervalMinutes}min`
              : automation.triggerType === 'event'
              ? '⚡ Evento'
              : automation.triggerType === 'webhook'
              ? '🔗 Webhook'
              : '👆 Manual'}
          </Badge>
          {automation.workflowId && (
            <span className="text-[10px] font-mono text-gray-600 truncate">
              WF: {automation.workflowId}
            </span>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1 pt-2 border-t border-slate-700/50 opacity-0 group-hover:opacity-100 transition-opacity">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                size="sm"
                variant="ghost"
                className="h-7 w-7 p-0 text-emerald-400 hover:text-emerald-300"
                onClick={onExecute}
              >
                <Play className="w-3.5 h-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Executar agora</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                size="sm"
                variant="ghost"
                className="h-7 w-7 p-0 text-amber-400 hover:text-amber-300"
                onClick={onToggle}
              >
                {automation.status === 'active' ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
              </Button>
            </TooltipTrigger>
            <TooltipContent>{automation.status === 'active' ? 'Pausar' : 'Ativar'}</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-blue-400 hover:text-blue-300" onClick={onEdit}>
                <Pencil className="w-3.5 h-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Editar</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-violet-400 hover:text-violet-300" onClick={onClone}>
                <Copy className="w-3.5 h-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Clonar</TooltipContent>
          </Tooltip>

          <div className="flex-1" />

          <Tooltip>
            <TooltipTrigger asChild>
              <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-red-400 hover:text-red-300" onClick={onDelete}>
                <Trash2 className="w-3.5 h-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Remover</TooltipContent>
          </Tooltip>
        </div>
      </CardContent>
    </Card>
  );
}
