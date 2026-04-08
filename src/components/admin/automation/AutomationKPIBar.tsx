import { Activity, CheckCircle2, AlertTriangle, Clock, Zap, Workflow } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { AutomationV2 } from '@/types/automation';
import type { AutomationExecution } from '@/types/automation';
import type { N8nWorkflow } from '@/types/automation';

interface AutomationKPIBarProps {
  automations: AutomationV2[];
  executions: AutomationExecution[];
  isConnected: boolean;
  lastSync: string | null;
  statusDetail?: string | null;
  workflows?: N8nWorkflow[];
}

export function AutomationKPIBar({
  automations,
  executions,
  isConnected,
  lastSync,
  statusDetail,
  workflows = [],
}: AutomationKPIBarProps) {
  const total = automations.length;
  const active = automations.filter((a) => a.status === 'active').length;

  const today = new Date().toISOString().slice(0, 10);
  const todayExecs = executions.filter((e) => e.startedAt?.startsWith(today));
  const successToday = todayExecs.filter((e) => e.status === 'success').length;
  const successRate = todayExecs.length > 0 ? Math.round((successToday / todayExecs.length) * 100) : 100;

  const nextRun = automations
    .filter((a) => a.nextRunAt && a.status === 'active')
    .sort((a, b) => (a.nextRunAt! > b.nextRunAt! ? 1 : -1))[0]?.nextRunAt;

  const activeWorkflows = workflows.filter((w) => w.active === true).length;

  const kpis = [
    {
      label: 'Total',
      value: total,
      icon: Activity,
      color: 'text-blue-400',
    },
    {
      label: 'Ativas',
      value: active,
      icon: Zap,
      color: 'text-emerald-400',
    },
    {
      label: 'n8n Flows',
      value: `${activeWorkflows}/${workflows.length}`,
      icon: Workflow,
      color: activeWorkflows > 0 ? 'text-cyan-400' : 'text-gray-400',
    },
    {
      label: 'Hoje',
      value: todayExecs.length,
      icon: CheckCircle2,
      color: 'text-cyan-400',
    },
    {
      label: 'Taxa Sucesso',
      value: `${successRate}%`,
      icon: successRate >= 80 ? CheckCircle2 : AlertTriangle,
      color: successRate >= 80 ? 'text-emerald-400' : 'text-amber-400',
    },
  ];

  return (
    <div className="flex flex-wrap items-center gap-3 mb-6">
      {/* Connection Badge */}
      <Badge
        variant="outline"
        className={`px-3 py-1 text-xs font-mono ${
          isConnected
            ? 'border-emerald-500/50 text-emerald-400 bg-emerald-500/10'
            : 'border-red-500/50 text-red-400 bg-red-500/10'
        }`}
      >
        <span className={`inline-block w-2 h-2 rounded-full mr-2 ${isConnected ? 'bg-emerald-400' : 'bg-red-400'}`} />
        {isConnected ? 'n8n conectado' : 'n8n offline'}
      </Badge>

      {lastSync && (
        <span className="text-xs text-gray-500 flex items-center gap-1">
          <Clock className="w-3 h-3" />
          {new Date(lastSync).toLocaleTimeString('pt-BR')}
        </span>
      )}

      {!isConnected && statusDetail && (
        <span className="text-xs text-amber-300 max-w-[420px] truncate" title={statusDetail}>
          {statusDetail}
        </span>
      )}

      <div className="flex-1" />

      {/* KPI Cards */}
      {kpis.map((kpi) => (
        <Card key={kpi.label} className="bg-slate-800/50 border-slate-700/50 px-4 py-2 flex items-center gap-2">
          <kpi.icon className={`w-4 h-4 ${kpi.color}`} />
          <div>
            <div className="text-sm font-bold text-white">{kpi.value}</div>
            <div className="text-[10px] text-gray-400 uppercase tracking-wider">{kpi.label}</div>
          </div>
        </Card>
      ))}

      {nextRun && (
        <Card className="bg-slate-800/50 border-slate-700/50 px-4 py-2 flex items-center gap-2">
          <Clock className="w-4 h-4 text-violet-400" />
          <div>
            <div className="text-sm font-bold text-white">
              {new Date(nextRun).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
            </div>
            <div className="text-[10px] text-gray-400 uppercase tracking-wider">Próximo Run</div>
          </div>
        </Card>
      )}
    </div>
  );
}
