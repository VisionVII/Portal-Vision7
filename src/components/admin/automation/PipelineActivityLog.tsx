import { Loader2, Activity, X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';

export interface LogEntry {
  id: string;
  timestamp: Date;
  step: string;
  message: string;
  type: 'info' | 'success' | 'error' | 'warn' | 'running';
}

export const LOG_TYPE_STYLES: Record<string, string> = {
  info: 'text-muted-foreground',
  success: 'text-primary',
  error: 'text-red-400',
  warn: 'text-amber-400',
  running: 'text-blue-500',
};

function formatTime(d: Date): string {
  return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

interface PipelineActivityLogProps {
  activityLog: LogEntry[];
  onClear: () => void;
  onClose: () => void;
}

export function PipelineActivityLog({ activityLog, onClear, onClose }: PipelineActivityLogProps) {
  return (
    <div className="rounded-lg border border-border/40 bg-muted/60">
      <div className="flex items-center justify-between px-3 py-2 border-b border-border/30">
        <div className="flex items-center gap-2">
          <Activity className="w-3.5 h-3.5 text-blue-500" />
          <span className="text-xs font-medium text-foreground">Log da Sessão</span>
          <Badge variant="outline" className="text-[9px] px-1 py-0 border-blue-500/30 text-blue-400">
            Sessão
          </Badge>
          <Badge variant="outline" className="text-[9px] px-1 py-0 border-border text-muted-foreground">
            {activityLog.length}
          </Badge>
        </div>
        <div className="flex items-center gap-1">
          {activityLog.length > 0 && (
            <Button
              size="sm"
              variant="ghost"
              className="h-5 px-1.5 text-[10px] text-muted-foreground hover:text-foreground"
              onClick={onClear}
            >
              Limpar
            </Button>
          )}
          <Button
            size="sm"
            variant="ghost"
            className="h-5 w-5 p-0 text-muted-foreground hover:text-foreground"
            onClick={onClose}
          >
            <X className="w-3 h-3" />
          </Button>
        </div>
      </div>
      <ScrollArea className="h-[180px]">
        <div className="p-2 space-y-0.5">
          {activityLog.length === 0 ? (
            <p className="text-xs text-muted-foreground/60 text-center py-4">Nenhuma atividade nesta sessão. O estado real continua disponível via n8n e banco.</p>
          ) : (
            activityLog.map((entry) => (
              <div key={entry.id} className="flex items-start gap-2 py-0.5 hover:bg-muted/20 px-1 rounded">
                <span className="text-[9px] text-muted-foreground/60 font-mono shrink-0 mt-0.5 tabular-nums">
                  {formatTime(entry.timestamp)}
                </span>
                <Badge
                  variant="outline"
                  className={`text-[8px] px-1 py-0 shrink-0 mt-0.5 ${
                    entry.type === 'running' ? 'border-blue-500/30 text-blue-500' :
                    entry.type === 'success' ? 'border-primary/25 text-primary' :
                    entry.type === 'error' ? 'border-red-500/30 text-red-400' :
                    entry.type === 'warn' ? 'border-amber-500/30 text-amber-400' :
                    'border-border text-muted-foreground'
                  }`}
                >
                  {entry.step}
                </Badge>
                <span className={`text-[10px] ${LOG_TYPE_STYLES[entry.type] ?? 'text-muted-foreground'}`}>
                  {entry.type === 'running' && <Loader2 className="w-2.5 h-2.5 inline animate-spin mr-1" />}
                  {entry.message}
                </span>
              </div>
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
