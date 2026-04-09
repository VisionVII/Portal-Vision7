import { CheckCircle2, AlertTriangle, Clock, Zap, Workflow } from 'lucide-react';
import { Card } from '@/components/ui/card';
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
  workflows = [],
}: AutomationKPIBarProps) {
  const active = automations.filter((a) => a.status === 'active').length;

  const today = new Date().toISOString().slice(0, 10);
  const todayExecs = executions.filter((e) => e.startedAt?.startsWith(today));
  const successToday = todayExecs.filter((e) => e.status === 'success').length;
  const successRate = todayExecs.length > 0 ? Math.round((successToday / todayExecs.length) * 100) : null;

  const nextRun = automations
    .filter((a) => a.nextRunAt && a.status === 'active')
    .sort((a, b) => (a.nextRunAt! > b.nextRunAt! ? 1 : -1))[0]?.nextRunAt;

  // Only count pipeline workflows (WF-01, WF-02, WF-03)
  const pipelineWfs = workflows.filter((w) => /WF-0[1-3]/i.test(w.name ?? ''));
  const activePipelineWfs = pipelineWfs.filter((w) => w.active === true).length;

  const kpis = [
    {
      label: 'Automações',
      value: active > 0 ? `${active} ativas` : '0',
      icon: Zap,
      color: active > 0 ? 'text-emerald-400' : 'text-gray-400',
    },
    {
      label: 'Pipeline n8n',
      value: `${activePipelineWfs}/${pipelineWfs.length}`,
      icon: Workflow,
      color: activePipelineWfs > 0 ? 'text-cyan-400' : 'text-gray-400',
    },
    {
      label: 'Exec. Hoje',
      value: todayExecs.length,
      icon: CheckCircle2,
      color: todayExecs.length > 0 ? 'text-cyan-400' : 'text-gray-400',
    },
    {
      label: 'Taxa Sucesso',
      value: successRate === null ? '—' : `${successRate}%`,
      icon: successRate === null ? Clock : successRate >= 80 ? CheckCircle2 : AlertTriangle,
      color: successRate === null ? 'text-gray-400' : successRate >= 80 ? 'text-emerald-400' : 'text-amber-400',
    },
  ];

  return (
    <div className="mb-2">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {kpis.map((kpi) => (
          <Card key={kpi.label} className="bg-slate-800/50 border-slate-700/50 px-4 py-3 flex items-center gap-3">
            <kpi.icon className={`w-5 h-5 ${kpi.color} shrink-0`} />
            <div className="min-w-0">
              <div className="text-sm font-bold text-white truncate">{kpi.value}</div>
              <div className="text-[10px] text-gray-400 uppercase tracking-wider whitespace-nowrap">{kpi.label}</div>
            </div>
          </Card>
        ))}

        {nextRun && (
          <Card className="bg-slate-800/50 border-slate-700/50 px-4 py-3 flex items-center gap-3">
            <Clock className="w-5 h-5 text-violet-400 shrink-0" />
            <div className="min-w-0">
              <div className="text-sm font-bold text-white">
                {new Date(nextRun).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
              </div>
              <div className="text-[10px] text-gray-400 uppercase tracking-wider whitespace-nowrap">Próximo Run</div>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
