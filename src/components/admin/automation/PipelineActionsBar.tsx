import { Play, Loader2, ArrowUpRight, Square, Clock, AlertTriangle, Zap } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';

interface CuratedStats {
  total: number;
  ready: number;
  draft: number;
  published: number;
  avgScore: number;
}

interface PollingState {
  isActive: boolean;
  totalPromoted: number;
  lastCheck: string | undefined;
  start: () => void;
  stop: () => void;
}

interface Props {
  pipelineFound: boolean;
  pipelineRunning: boolean;
  promoting: boolean;
  allActive: boolean;
  loading: boolean;
  stats: CuratedStats | undefined;
  polling: PollingState;
  onRunPipeline: () => void;
  onPromoteOnly: () => void;
  onAbort: () => void;
  formatRelativeTime: (iso: string) => string;
}

export function PipelineActionsBar({
  pipelineFound, pipelineRunning, promoting, allActive, loading,
  stats, polling, onRunPipeline, onPromoteOnly, onAbort, formatRelativeTime,
}: Props) {
  return (
    <div className="space-y-4">
      <div className="h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />

      {/* Action buttons + stats */}
      <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          {pipelineFound && (
            <Button
              size="lg"
              className={`h-11 px-6 text-sm font-medium gap-2 shadow-lg transition-all duration-300 ${
                pipelineRunning
                  ? 'bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 shadow-amber-500/30'
                  : 'bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 shadow-cyan-500/30'
              }`}
              disabled={pipelineRunning}
              onClick={onRunPipeline}
            >
              {pipelineRunning ? (
                <><Loader2 className="w-4 h-4 animate-spin" />Pipeline a correr...</>
              ) : (
                <><Play className="w-4 h-4" />Executar Pipeline</>
              )}
            </Button>
          )}

          {(stats?.ready ?? 0) > 0 && (
            <Button
              size="lg"
              className={`h-11 px-6 text-sm font-medium gap-2 shadow-lg transition-all duration-300 ${
                pipelineFound
                  ? 'bg-gradient-to-r from-primary/15 to-primary/10 hover:from-primary/25 hover:to-primary/15 text-primary/80 border-2 border-primary/40 hover:border-primary/50'
                  : 'bg-gradient-to-r from-primary to-primary/90 hover:bg-primary/80 shadow-primary/20'
              }`}
              disabled={promoting}
              onClick={onPromoteOnly}
            >
              {promoting ? (
                <><Loader2 className="w-4 h-4 animate-spin" />A promover...</>
              ) : (
                <><ArrowUpRight className="w-4 h-4" />Promover ({stats?.ready})</>
              )}
            </Button>
          )}

          {pipelineRunning && (
            <Button
              size="lg"
              variant="outline"
              className="h-11 px-6 text-sm font-medium text-red-400 border-red-500/40 hover:bg-red-500/10 hover:text-red-300 gap-2"
              onClick={onAbort}
            >
              <Square className="w-4 h-4" />
              Parar
            </Button>
          )}
        </div>

        {stats && (
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-muted/30 border border-border/30">
              <Clock className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm text-foreground/80">{stats.total} curados</span>
            </div>
            {stats.ready > 0 && (
              <Badge className="bg-gradient-to-r from-primary/15 to-primary/10 text-primary/80 border-primary/30 px-3 py-1.5 text-sm animate-pulse shadow-lg shadow-primary/15">
                {stats.ready} prontos
              </Badge>
            )}
            {stats.draft > 0 && (
              <Badge variant="outline" className="border-amber-500/40 text-amber-300 px-3 py-1.5 text-sm">
                {stats.draft} rascunhos
              </Badge>
            )}
            {stats.published > 0 && (
              <Badge variant="outline" className="border-blue-500/40 text-blue-300 px-3 py-1.5 text-sm">
                {stats.published} promovidos
              </Badge>
            )}
            {stats.avgScore > 0 && (
              <div className="flex items-center gap-2 px-3 py-1.5">
                <span className="text-xs text-muted-foreground">Score</span>
                <span className="text-sm font-semibold text-blue-500">{stats.avgScore}</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Cron schedule info + auto-promote toggle */}
      {pipelineFound && allActive && (
        <div className="rounded-xl border border-primary/20 bg-gradient-to-br from-primary/10 via-primary/5 to-primary/10 p-5 space-y-3 shadow-lg shadow-primary/10">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/15 shrink-0">
              <Clock className="w-4 h-4 text-primary/80" />
            </div>
            <p className="text-sm text-primary/80">
              <span className="font-semibold">Pipeline automático ativo</span>
              <span className="hidden sm:inline text-primary/80/80">
                {' '}— o n8n gera curadoria mesmo sem login no portal; a promoção final passa pela Edge Function do portal.
              </span>
            </p>
          </div>
          <div className="flex items-center justify-between gap-3 pt-2 border-t border-primary/20">
            <div className="flex items-center gap-3 min-w-0">
              <div className={`p-2 rounded-lg shrink-0 ${polling.isActive ? 'bg-primary/15' : 'bg-muted/30'}`}>
                <Zap className={`w-4 h-4 ${polling.isActive ? 'text-primary/80' : 'text-muted-foreground'}`} />
              </div>
              <div className="min-w-0">
                <div className="text-sm text-foreground font-medium flex items-center gap-2 flex-wrap">
                  Auto-promoção local
                  {polling.isActive && (
                    <Badge className="bg-primary/15 text-primary/80 border-primary/30 text-xs px-2 py-0.5 animate-pulse shadow-lg shadow-primary/15">
                      ATIVO
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-primary/70 mt-0.5">
                  {polling.isActive
                    ? `A cada 2 min nesta sessão · ${polling.totalPromoted} promovido(s)${polling.lastCheck ? ` · ${formatRelativeTime(polling.lastCheck)}` : ''}`
                    : 'Fallback local: curated → rascunhos via backend central; exige dashboard aberta e utilizador autenticado'}
                </p>
              </div>
            </div>
            <Switch
              checked={polling.isActive}
              onCheckedChange={(checked) => (checked ? polling.start() : polling.stop())}
              className="data-[state=checked]:bg-gradient-to-r data-[state=checked]:from-primary data-[state=checked]:to-primary/90 shrink-0"
            />
          </div>
        </div>
      )}

      {/* No workflows warning */}
      {!loading && !pipelineFound && (
        <div className="rounded-xl border border-amber-500/30 bg-gradient-to-br from-amber-500/10 via-orange-500/5 to-amber-500/10 p-5 text-center shadow-lg shadow-amber-500/10">
          <div className="flex items-center justify-center gap-2 mb-2">
            <AlertTriangle className="w-5 h-5 text-amber-400" />
            <p className="text-sm font-medium text-amber-300">Workflows não encontrados</p>
          </div>
          <p className="text-xs text-amber-200/80">
            n8n offline ou nenhum workflow do pipeline encontrado. Use &quot;Promover Curados para Rascunhos&quot; para mover artigos curados existentes.
          </p>
        </div>
      )}
    </div>
  );
}
