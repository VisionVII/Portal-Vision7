import { useState } from 'react';
import { Settings2, Wrench, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { N8nWorkflowsPanel } from './N8nWorkflowsPanel';
import { EmailTemplateCampaignPanel } from './EmailTemplateCampaignPanel';
import type { N8nWorkflow } from '@/types/automation';

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

interface ToolsViewProps {
  workflows: N8nWorkflow[];
  isConnected: boolean;
  activeWorkflows: number;
  showLabButton: boolean;
  onRefresh: () => void;
}

export function ToolsView({
  workflows,
  isConnected,
  activeWorkflows,
  showLabButton,
  onRefresh,
}: ToolsViewProps) {
  return (
    <div className="space-y-5">
      <Section
        title="Workflows n8n"
        description={`${activeWorkflows}/${workflows.length} ativos`}
        icon={<Ic icon={Settings2} className="text-amber-500 bg-amber-500/10" />}
        actions={
          <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={onRefresh}>
            <RefreshCw className="mr-1 h-3 w-3" />Atualizar
          </Button>
        }
      >
        <N8nWorkflowsPanel workflows={workflows} isConnected={isConnected} onRefresh={onRefresh} />
      </Section>

      {showLabButton && (
        <Section
          title="Email Templates (Dev)"
          description="Envio de templates para revisão"
          icon={<Ic icon={Wrench} className="bg-muted text-muted-foreground" />}
          collapsible
          defaultExpanded={false}
        >
          <EmailTemplateCampaignPanel />
        </Section>
      )}
    </div>
  );
}
