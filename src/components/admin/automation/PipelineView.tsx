import { useState, lazy, Suspense } from 'react';
import { Zap, Activity, PlayCircle, Trash2, Loader2, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Section, SectionIcon } from './Section';
import { CuratedPostsReview } from './CuratedPostsReview';

const NewsPipelineCard = lazy(() =>
  import('./NewsPipelineCard').then((m) => ({ default: m.NewsPipelineCard })),
);

const CLEANUP_OPTIONS = [
  { label: '24 h', hours: 24 },
  { label: '3 dias', hours: 72 },
  { label: '7 dias', hours: 168 },
] as const;

type Tone = 'success' | 'warning' | 'neutral';

function toneText(tone: Tone) {
  return tone === 'success'
    ? 'text-emerald-600 dark:text-emerald-400'
    : tone === 'warning'
      ? 'text-amber-600 dark:text-amber-400'
      : 'text-muted-foreground';
}

function toneBadge(tone: Tone) {
  return tone === 'success'
    ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20'
    : tone === 'warning'
      ? 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20'
      : 'bg-muted text-muted-foreground border-border/40';
}

function toneIcon(tone: Tone) {
  return tone === 'success'
    ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
    : tone === 'warning'
      ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
      : 'bg-muted text-muted-foreground';
}

/* ── Pipeline stepper ── */
function PipelineRail({
  stages,
}: {
  stages: Array<{
    label: string;
    value: number;
    helper: string;
    tone: Tone;
    icon: React.ElementType;
  }>;
}) {
  return (
    <div className="flex items-stretch divide-x divide-border/40 overflow-x-auto rounded-xl border border-border/40 bg-card [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      {stages.map((stage, i) => {
        const Icon = stage.icon;
        const statusLabel =
          stage.tone === 'warning' ? 'Atenção' : stage.value > 0 ? 'OK' : 'Aguardando';
        return (
          <div key={stage.label} className="relative flex min-w-[120px] flex-1 flex-col gap-1 px-4 py-4">
            <div className="flex items-center gap-2">
              <div className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-md ${toneIcon(stage.tone)}`}>
                <Icon className="h-3.5 w-3.5" />
              </div>
              <span className="truncate text-xs font-medium text-muted-foreground">{stage.label}</span>
            </div>
            <span className={`text-2xl font-bold tabular-nums ${toneText(stage.tone)}`}>
              {stage.value}
            </span>
            <div className="flex items-center justify-between gap-2">
              <span className="truncate text-[11px] text-muted-foreground">{stage.helper}</span>
              <span className={`shrink-0 rounded-full border px-1.5 py-0.5 text-[10px] font-semibold ${toneBadge(stage.tone)}`}>
                {statusLabel}
              </span>
            </div>
            {i < stages.length - 1 && (
              <ChevronRight className="absolute right-[-0.6rem] top-1/2 hidden h-3 w-3 -translate-y-1/2 text-border xl:block" />
            )}
          </div>
        );
      })}
    </div>
  );
}

/* ── Queue board ── */
function QueueBoard({
  sections,
}: {
  sections: Array<{
    label: string;
    tone: Tone;
    items: Array<{ id: string; title: string; subtitle: string }>;
  }>;
}) {
  const isEmpty = sections.every((s) => s.items.length === 0);

  if (isEmpty) {
    return (
      <div className="flex flex-col items-center gap-1.5 py-8 text-center">
        <span className="text-sm text-muted-foreground">Pipeline vazio — aguardando execução dos workflows</span>
      </div>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-3">
      {sections.map((section) => {
        const dotClass =
          section.tone === 'success'
            ? 'bg-emerald-500'
            : section.tone === 'warning'
              ? 'bg-amber-500'
              : 'bg-muted-foreground/40';

        return (
          <div key={section.label}>
            <div className="mb-2 flex items-center gap-2">
              <span className={`h-2 w-2 shrink-0 rounded-full ${dotClass}`} />
              <span className="text-xs font-semibold text-foreground">{section.label}</span>
              <span className="ml-auto text-xs tabular-nums text-muted-foreground">
                {section.items.length}
              </span>
            </div>
            <div className="space-y-1.5">
              {section.items.length > 0 ? (
                section.items.map((item) => (
                  <div
                    key={item.id}
                    className="rounded-lg border border-border/40 bg-muted/30 px-3 py-2.5 transition-colors hover:bg-muted/60"
                  >
                    <p className="line-clamp-1 text-sm font-medium text-foreground">{item.title}</p>
                    <p className="mt-0.5 text-[11px] text-muted-foreground">{item.subtitle}</p>
                  </div>
                ))
              ) : (
                <div className="rounded-lg border border-dashed border-border/40 px-3 py-5 text-center text-xs text-muted-foreground">
                  Sem itens
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

interface PipelineViewProps {
  pipelineErrors: number;
  queueSections: Array<{
    label: string;
    tone: Tone;
    items: Array<{ id: string; title: string; subtitle: string }>;
  }>;
  pipelineStages: Array<{
    label: string;
    value: number;
    helper: string;
    tone: Tone;
    icon: React.ElementType;
  }>;
  showForm: boolean;
  cleanupHours: number;
  cleaning: boolean;
  handleCleanup: () => void;
  setCleanupHours: (hours: number) => void;
}

export function PipelineView({
  queueSections,
  pipelineStages,
  cleanupHours,
  cleaning,
  handleCleanup,
  setCleanupHours,
}: PipelineViewProps) {
  const [cleanupOpen, setCleanupOpen] = useState(false);

  return (
    <div className="space-y-4">
      {/* Main pipeline control card — workflows, config, activity */}
      <Suspense fallback={<div className="flex items-center justify-center py-10"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>}>
        <NewsPipelineCard />
      </Suspense>

      {/* Pipeline stages */}
      <Section
        title="Estado do pipeline"
        description="Coleta → Cluster → IA Reescrita → Publicação"
        icon={<SectionIcon icon={Zap} className="bg-primary/10 text-primary" />}
      >
        <PipelineRail stages={pipelineStages} />
      </Section>

      {/* Content queue */}
      <Section
        title="Fila de conteúdo"
        description="Artigos por estado"
        icon={<SectionIcon icon={Activity} className="bg-blue-500/10 text-blue-500" />}
      >
        <QueueBoard sections={queueSections} />
      </Section>

      {/* Curated review — collapsed by default */}
      <Section
        title="Revisão detalhada"
        description="Curadoria e promoção dos artigos gerados"
        icon={<SectionIcon icon={PlayCircle} className="bg-blue-500/10 text-blue-500" />}
        collapsible
        defaultExpanded={false}
      >
        <CuratedPostsReview />
      </Section>

      {/* Cleanup — collapsed by default */}
      <Section
        title="Limpeza do pipeline"
        description="Remove dados antigos de staging, clusters e curados"
        icon={<SectionIcon icon={Trash2} className="bg-red-500/10 text-red-500" />}
        collapsible
        defaultExpanded={false}
      >
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-xs text-muted-foreground">Remover dados mais antigos que:</span>
          <div className="flex items-center gap-1.5">
            {CLEANUP_OPTIONS.map((opt) => (
              <Button
                key={opt.hours}
                size="sm"
                variant={cleanupHours === opt.hours ? 'default' : 'outline'}
                className="h-7 px-2.5 text-xs"
                onClick={() => setCleanupHours(opt.hours)}
              >
                {opt.label}
              </Button>
            ))}
          </div>
          <Button
            size="sm"
            variant="destructive"
            className="ml-auto h-7 gap-1.5 px-3 text-xs"
            disabled={cleaning}
            onClick={handleCleanup}
          >
            {cleaning ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <Trash2 className="h-3 w-3" />
            )}
            Limpar
          </Button>
        </div>
        <p className="mt-3 text-[11px] text-muted-foreground">
          Afeta: staging processado, clusters órfãos e curados publicados/rejeitados. Rascunhos e prontos são preservados.
        </p>
      </Section>
    </div>
  );
}
