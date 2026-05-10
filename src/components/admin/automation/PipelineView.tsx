import { useState } from 'react';
import { Zap, Activity, PlayCircle, Trash2, Loader2, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CuratedPostsReview } from './CuratedPostsReview';

const CLEANUP_OPTIONS = [
  { label: '24 h', hours: 24 },
  { label: '3 dias', hours: 72 },
  { label: '7 dias', hours: 168 },
] as const;

function Section({
  title,
  description,
  icon,
  children,
  actions,
  collapsible = false,
  defaultExpanded = true,
}: {
  title: string;
  description?: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
  actions?: React.ReactNode;
  collapsible?: boolean;
  defaultExpanded?: boolean;
}) {
  const [open, setOpen] = useState(defaultExpanded);
  return (
    <section className="rounded-2xl border border-border/50 bg-card/70 p-4 shadow-sm backdrop-blur-sm sm:p-5">
      <div
        className={`flex items-center justify-between gap-3 ${collapsible ? 'cursor-pointer transition-opacity hover:opacity-80' : ''}`}
        onClick={collapsible ? () => setOpen((v) => !v) : undefined}
      >
        <div className="flex items-center gap-3 min-w-0">
          {icon}
          <div className="min-w-0">
            <h3 className="truncate text-sm font-semibold text-foreground">{title}</h3>
            {description && <p className="truncate text-xs text-muted-foreground mt-0.5">{description}</p>}
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {actions}
          {collapsible && (
            <svg className={`w-4 h-4 text-muted-foreground transition-transform ${open ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
          )}
        </div>
      </div>
      {open && <div className="mt-4 border-t border-border/40 pt-4">{children}</div>}
    </section>
  );
}

function Ic({ icon: Icon, className = '' }: { icon: React.ElementType; className?: string }) {
  return (
    <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${className}`}>
      <Icon className="h-4 w-4" />
    </div>
  );
}

function PipelineRail({
  stages,
}: {
  stages: Array<{
    label: string;
    value: number;
    helper: string;
    tone: 'success' | 'warning' | 'neutral';
    icon: React.ElementType;
  }>;
}) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {stages.map((stage, index) => {
        const Icon = stage.icon;
        const toneClass = stage.tone === 'success'
          ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
          : stage.tone === 'warning'
            ? 'border-amber-500/20 bg-amber-500/10 text-amber-600 dark:text-amber-400'
            : 'border-border/60 bg-muted/30 text-muted-foreground';

        return (
          <div key={stage.label} className="relative rounded-2xl border border-border/40 bg-card/80 p-4 shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-foreground">{stage.label}</p>
                <p className="mt-1 text-2xl font-bold tracking-tight text-foreground">{stage.value}</p>
              </div>
              <div className={`flex h-9 w-9 items-center justify-center rounded-xl border ${toneClass}`}>
                <Icon className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-3 flex items-center justify-between gap-2 text-xs text-muted-foreground">
              <span>{stage.helper}</span>
              <span className={`rounded-full border px-2 py-0.5 font-medium ${toneClass}`}>
                {stage.tone === 'warning' ? 'Atenção' : stage.value > 0 ? 'OK' : 'Aguardando'}
              </span>
            </div>
            {index < stages.length - 1 && (
              <div className="absolute right-[-0.75rem] top-1/2 hidden -translate-y-1/2 xl:block">
                <ArrowRight className="h-4 w-4 text-muted-foreground/40" />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function QueueBoard({
  sections,
}: {
  sections: Array<{
    label: string;
    tone: 'success' | 'warning' | 'neutral';
    items: Array<{ id: string; title: string; subtitle: string }>;
  }>;
}) {
  return (
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
      {sections.map((section) => {
        const toneClass = section.tone === 'success'
          ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
          : section.tone === 'warning'
            ? 'border-amber-500/20 bg-amber-500/10 text-amber-600 dark:text-amber-400'
            : 'border-border/60 bg-muted/30 text-muted-foreground';

        return (
          <div key={section.label} className="rounded-2xl border border-border/40 bg-card/80 p-4 shadow-sm">
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-sm font-semibold text-foreground">{section.label}</h3>
              <span className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] ${toneClass}`}>
                {section.items.length}
              </span>
            </div>
            <div className="mt-3 space-y-2">
              {section.items.length > 0 ? (
                section.items.map((item) => (
                  <div key={item.id} className="rounded-xl border border-border/30 bg-muted/20 px-3 py-2.5">
                    <p className="line-clamp-1 text-sm font-medium text-foreground">{item.title}</p>
                    <p className="mt-1 text-[11px] text-muted-foreground">{item.subtitle}</p>
                  </div>
                ))
              ) : (
                <div className="rounded-xl border border-dashed border-border/30 px-3 py-5 text-center text-sm text-muted-foreground">
                  Sem itens nesta fila
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
    tone: 'success' | 'warning' | 'neutral';
    items: Array<{ id: string; title: string; subtitle: string }>;
  }>;
  pipelineStages: Array<{
    label: string;
    value: number;
    helper: string;
    tone: 'success' | 'warning' | 'neutral';
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
  return (
    <div className="space-y-5">
      <Section
        title="Pipeline visual"
        description="Coleta → Cluster → IA Reescrita → Publicação"
        icon={<Ic icon={Zap} className="text-primary bg-primary/10" />}
      >
        <PipelineRail stages={pipelineStages} />
      </Section>

      <Section
        title="Fila de conteúdo"
        description="Separação por estado para leitura rápida"
        icon={<Ic icon={Activity} className="text-blue-500 bg-blue-500/10" />}
      >
        <QueueBoard sections={queueSections} />
      </Section>

      <Section
        title="Revisão detalhada"
        description="Curadoria e promoção dos itens com contexto completo"
        icon={<Ic icon={PlayCircle} className="text-blue-500 bg-blue-500/10" />}
        collapsible
        defaultExpanded={false}
      >
        <CuratedPostsReview />
      </Section>

      <Section
        title="Limpeza inteligente do pipeline"
        description="Remove staging antigo, clusters órfãos e curados já publicados/rejeitados. Dados em rascunho e prontos são preservados."
        icon={<Ic icon={Trash2} className="text-red-500 bg-red-500/10" />}
      >
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-border text-muted-foreground">
              Staging + Clusters órfãos + Curados pub/rej
            </Badge>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Mais antigos que:</span>
            <div className="flex gap-1">
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
              className="h-7 px-3 text-xs gap-1.5"
              disabled={cleaning}
              onClick={handleCleanup}
            >
              {cleaning ? <Loader2 className="h-3 w-3 animate-spin" /> : <Trash2 className="h-3 w-3" />}
              Limpar
            </Button>
          </div>
        </div>
      </Section>
    </div>
  );
}
