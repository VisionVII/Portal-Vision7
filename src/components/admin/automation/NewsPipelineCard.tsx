import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Newspaper, Layers, Sparkles, Play, RefreshCw, CheckCircle2,
  Clock, Loader2, ChevronRight, Tag, Plus, X, Settings2, Zap,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useToast } from '@/hooks/use-toast';
import { useCuratedPostsStats, useAutoPromoteCurated } from '@/hooks/useCuratedPosts';
import { usePipelineConfig } from '@/hooks/usePipelineConfig';
import {
  getWorkflows,
  activateWorkflow,
  deactivateWorkflow,
  executeWorkflow,
} from '@/services/n8n';
import type { N8nWorkflow } from '@/types/automation';

/* ── Pipeline step descriptor ── */
interface PipelineStep {
  key: string;
  label: string;
  shortLabel: string;
  description: string;
  icon: React.ElementType;
  nameMatch: string;
  delayAfterMs: number;
}

const PIPELINE_STEPS: PipelineStep[] = [
  {
    key: 'wf01',
    label: 'Coleta RSS',
    shortLabel: 'Coleta',
    description: 'Recolha de notícias via feeds',
    icon: Newspaper,
    nameMatch: 'WF-01',
    delayAfterMs: 60_000,
  },
  {
    key: 'wf02',
    label: 'Cluster & Dedup',
    shortLabel: 'Cluster',
    description: 'Agrupamento e deduplicação',
    icon: Layers,
    nameMatch: 'WF-02',
    delayAfterMs: 30_000,
  },
  {
    key: 'wf03',
    label: 'IA Reescrita',
    shortLabel: 'IA',
    description: 'Geração de artigos por IA',
    icon: Sparkles,
    nameMatch: 'WF-03',
    delayAfterMs: 0,
  },
];

/** Deduplicate workflows by name — keep first occurrence only */
function deduplicateWorkflows(wfs: N8nWorkflow[]): N8nWorkflow[] {
  const seen = new Map<string, N8nWorkflow>();
  for (const wf of wfs) {
    const name = wf.name ?? '';
    if (!seen.has(name)) {
      seen.set(name, wf);
    }
  }
  return [...seen.values()];
}

function matchWorkflow(workflows: N8nWorkflow[], nameMatch: string): N8nWorkflow | undefined {
  return workflows.find((w) => w.name?.includes(nameMatch));
}

export function NewsPipelineCard() {
  const { toast } = useToast();
  const { data: stats } = useCuratedPostsStats();
  const autoPromote = useAutoPromoteCurated();
  const {
    activeConfig,
    updateTags,
    createConfig,
    isSaving,
  } = usePipelineConfig();

  /* ── n8n state ── */
  const [workflows, setWorkflows] = useState<N8nWorkflow[]>([]);
  const [loading, setLoading] = useState(true);

  /* ── Pipeline execution state ── */
  const [pipelineRunning, setPipelineRunning] = useState(false);
  const [currentStep, setCurrentStep] = useState<string | null>(null);
  const [completedSteps, setCompletedSteps] = useState<Set<string>>(new Set());
  const abortRef = useRef(false);

  /* ── Tag editing state ── */
  const [showConfig, setShowConfig] = useState(false);
  const [editTags, setEditTags] = useState<string[]>([]);
  const [newTag, setNewTag] = useState('');

  const fetchWorkflows = useCallback(async () => {
    try {
      setLoading(true);
      const raw = await getWorkflows();
      setWorkflows(deduplicateWorkflows(raw));
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchWorkflows();
  }, [fetchWorkflows]);

  /* ── Derived state ── */
  const pipelineWorkflows = PIPELINE_STEPS.map((step) => ({
    step,
    wf: matchWorkflow(workflows, step.nameMatch),
  })).filter((x) => x.wf !== undefined);

  const allActive = pipelineWorkflows.length > 0 && pipelineWorkflows.every((x) => x.wf?.active === true);
  const pipelineFound = pipelineWorkflows.length > 0;

  /* ── Toggle all workflows ── */
  const handleToggleAll = async () => {
    const target = !allActive;
    for (const { wf } of pipelineWorkflows) {
      if (!wf) continue;
      try {
        if (target) await activateWorkflow(String(wf.id));
        else await deactivateWorkflow(String(wf.id));
      } catch { /* best-effort */ }
    }
    toast({
      title: target ? 'Pipeline ativado' : 'Pipeline desativado',
      description: target
        ? 'Workflows serão executados automaticamente nos intervalos definidos.'
        : 'Execução automática pausada.',
    });
    await fetchWorkflows();
  };

  /* ── Run full pipeline sequentially ── */
  const handleRunPipeline = async () => {
    if (pipelineRunning) return;
    setPipelineRunning(true);
    setCompletedSteps(new Set());
    abortRef.current = false;

    for (const { step, wf } of pipelineWorkflows) {
      if (abortRef.current) break;
      if (!wf) continue;

      setCurrentStep(step.key);
      try {
        await executeWorkflow(String(wf.id));
        setCompletedSteps((prev) => new Set([...prev, step.key]));

        if (step.delayAfterMs > 0 && !abortRef.current) {
          await new Promise((r) => setTimeout(r, step.delayAfterMs));
        }
      } catch (err) {
        toast({
          title: `Erro em ${step.label}`,
          description: err instanceof Error ? err.message : 'Erro desconhecido',
          variant: 'destructive',
        });
        break;
      }
    }

    setCurrentStep(null);
    setPipelineRunning(false);

    // Auto-promote ready curated posts → drafts + email admin
    toast({ title: 'Pipeline concluído', description: 'A promover artigos curados para rascunhos...' });
    try {
      await autoPromote.mutateAsync();
    } catch {
      // handled by the mutation
    }
  };

  /* ── Tag management ── */
  const openConfig = () => {
    setEditTags(activeConfig?.tags ?? []);
    setNewTag('');
    setShowConfig(true);
  };

  const addTag = () => {
    const tag = newTag.trim().toLowerCase();
    if (!tag || editTags.includes(tag)) return;
    setEditTags([...editTags, tag]);
    setNewTag('');
  };

  const removeTag = (tag: string) => {
    setEditTags(editTags.filter((t) => t !== tag));
  };

  const saveTags = async () => {
    if (editTags.length === 0) {
      toast({ title: 'Adicione pelo menos uma tag', variant: 'destructive' });
      return;
    }
    if (activeConfig) {
      await updateTags({ id: activeConfig.id, tags: editTags });
    } else {
      await createConfig({ label: 'Padrão', tags: editTags });
    }
    setShowConfig(false);
  };

  return (
    <Card className="bg-gradient-to-br from-slate-800/80 to-slate-900/80 border-cyan-500/30 shadow-lg shadow-cyan-500/5">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-cyan-500/10">
              <Zap className="w-5 h-5 text-cyan-400" />
            </div>
            <div>
              <CardTitle className="text-base font-semibold text-white">
                Pipeline de Notícias IA
              </CardTitle>
              <p className="text-xs text-gray-400 mt-0.5">
                {pipelineWorkflows.length} workflow{pipelineWorkflows.length !== 1 ? 's' : ''} encontrado{pipelineWorkflows.length !== 1 ? 's' : ''} · Coleta → Cluster → Reescrita
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-gray-400 hover:text-white" onClick={openConfig}>
                  <Settings2 className="w-3.5 h-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Configurar tags de pesquisa</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-gray-400 hover:text-white" onClick={() => void fetchWorkflows()}>
                  <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Atualizar</TooltipContent>
            </Tooltip>
            <div className="flex items-center gap-1.5 ml-1 pl-2 border-l border-slate-700">
              <span className="text-[10px] text-gray-500">Auto</span>
              <Switch
                checked={allActive}
                disabled={!pipelineFound}
                onCheckedChange={() => void handleToggleAll()}
                className="data-[state=checked]:bg-cyan-600"
              />
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        {/* ── Search Tags ── */}
        {activeConfig && activeConfig.tags.length > 0 && !showConfig && (
          <div className="flex items-center gap-1.5 flex-wrap">
            <Tag className="w-3 h-3 text-gray-500" />
            {activeConfig.tags.map((tag) => (
              <Badge key={tag} variant="outline" className="text-[10px] px-1.5 py-0 border-cyan-500/30 text-cyan-400">
                {tag}
              </Badge>
            ))}
            <Button size="sm" variant="ghost" className="h-5 px-1 text-[10px] text-gray-500 hover:text-cyan-400" onClick={openConfig}>
              editar
            </Button>
          </div>
        )}

        {/* ── Tag Config Panel ── */}
        {showConfig && (
          <div className="rounded-lg border border-slate-700 bg-slate-800/80 p-3 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-white">Tags de Pesquisa</span>
              <Button size="sm" variant="ghost" className="h-5 w-5 p-0 text-gray-500" onClick={() => setShowConfig(false)}>
                <X className="w-3 h-3" />
              </Button>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {editTags.map((tag) => (
                <Badge
                  key={tag}
                  variant="outline"
                  className="text-xs px-2 py-0.5 border-cyan-500/30 text-cyan-400 gap-1 cursor-pointer hover:border-red-500/30 hover:text-red-400"
                  onClick={() => removeTag(tag)}
                >
                  {tag} <X className="w-2.5 h-2.5" />
                </Badge>
              ))}
            </div>
            <div className="flex gap-1.5">
              <Input
                placeholder="Ex: tech, IA, mundo..."
                className="h-7 text-xs bg-slate-900 border-slate-700"
                value={newTag}
                onChange={(e) => setNewTag(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ',' || e.key === ';') {
                    e.preventDefault();
                    addTag();
                  }
                }}
              />
              <Button size="sm" variant="outline" className="h-7 border-slate-600 px-2" onClick={addTag}>
                <Plus className="w-3 h-3" />
              </Button>
            </div>
            <p className="text-[10px] text-gray-500">
              Separe por Enter ou vírgula. Ex: tech, IA, notícias hoje, cibersegurança
            </p>
            <div className="flex justify-end gap-1.5">
              <Button size="sm" variant="ghost" className="h-6 text-xs" onClick={() => setShowConfig(false)}>
                Cancelar
              </Button>
              <Button size="sm" className="h-6 text-xs bg-cyan-600 hover:bg-cyan-700" disabled={isSaving} onClick={() => void saveTags()}>
                {isSaving ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : null}
                Guardar
              </Button>
            </div>
          </div>
        )}

        {/* ── Pipeline Steps Visual ── */}
        <div className="flex items-center gap-1">
          {PIPELINE_STEPS.map((step, idx) => {
            const wf = matchWorkflow(workflows, step.nameMatch);
            if (!wf) return null;

            const isActive = wf.active === true;
            const isRunning = currentStep === step.key;
            const isCompleted = completedSteps.has(step.key);
            const StepIcon = step.icon;

            const nextStep = PIPELINE_STEPS[idx + 1];
            const nextExists = nextStep ? !!matchWorkflow(workflows, nextStep.nameMatch) : false;

            return (
              <div key={step.key} className="flex items-center gap-1 flex-1">
                <div
                  className={`flex-1 rounded-lg border p-2 transition-all ${
                    isRunning
                      ? 'border-cyan-400/60 bg-cyan-500/10 ring-1 ring-cyan-400/20'
                      : isCompleted
                      ? 'border-emerald-500/40 bg-emerald-500/5'
                      : isActive
                      ? 'border-slate-600/50 bg-slate-800/50'
                      : 'border-slate-700/30 bg-slate-900/50 opacity-60'
                  }`}
                >
                  <div className="flex items-center gap-1.5 mb-1">
                    {isRunning ? (
                      <Loader2 className="w-3.5 h-3.5 text-cyan-400 animate-spin" />
                    ) : isCompleted ? (
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    ) : (
                      <StepIcon className={`w-3.5 h-3.5 ${isActive ? 'text-gray-400' : 'text-gray-600'}`} />
                    )}
                    <span className="text-xs font-medium text-white">{step.shortLabel}</span>
                  </div>
                  <p className="text-[10px] text-gray-500">{step.description}</p>
                  <Badge
                    variant="outline"
                    className={`text-[9px] px-1 py-0 mt-1 ${
                      isRunning
                        ? 'border-cyan-400/30 text-cyan-400'
                        : isCompleted
                        ? 'border-emerald-500/30 text-emerald-400'
                        : isActive
                        ? 'border-slate-600 text-slate-400'
                        : 'border-slate-700 text-slate-600'
                    }`}
                  >
                    {isRunning ? 'A executar...' : isCompleted ? 'Concluído' : isActive ? 'Ativo' : 'Inativo'}
                  </Badge>
                </div>
                {nextExists && (
                  <ChevronRight className="w-3.5 h-3.5 text-gray-600 shrink-0" />
                )}
              </div>
            );
          })}
        </div>

        {/* ── Actions + Stats ── */}
        <div className="flex items-center justify-between pt-2 border-t border-slate-700/50">
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              className={`h-7 text-xs gap-1.5 ${pipelineRunning ? 'bg-amber-600 hover:bg-amber-700' : 'bg-cyan-600 hover:bg-cyan-700'}`}
              disabled={!pipelineFound || pipelineRunning}
              onClick={() => void handleRunPipeline()}
            >
              {pipelineRunning ? (
                <><Loader2 className="w-3 h-3 animate-spin" /> Pipeline a correr...</>
              ) : (
                <><Play className="w-3 h-3" /> Executar Pipeline</>
              )}
            </Button>
            {pipelineRunning && (
              <Button size="sm" variant="ghost" className="h-7 text-xs text-red-400 hover:text-red-300" onClick={() => { abortRef.current = true; }}>
                Cancelar
              </Button>
            )}
          </div>

          {stats && (
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-gray-500">
                <Clock className="w-3 h-3 inline mr-0.5" />{stats.total} curados
              </span>
              {stats.ready > 0 && (
                <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-emerald-500/30 text-emerald-400">
                  {stats.ready} prontos
                </Badge>
              )}
              {stats.published > 0 && (
                <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-blue-500/30 text-blue-400">
                  {stats.published} promovidos
                </Badge>
              )}
              {stats.avgScore > 0 && (
                <span className="text-[10px] text-gray-500">
                  Score: <span className="text-cyan-400 font-medium">{stats.avgScore}</span>
                </span>
              )}
            </div>
          )}
        </div>

        {/* ── No workflows warning ── */}
        {!loading && !pipelineFound && (
          <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-2.5 text-center">
            <p className="text-xs text-amber-400">
              Nenhum workflow do pipeline encontrado no n8n. Verifique a conexão.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
