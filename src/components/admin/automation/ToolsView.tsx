import { Settings2, Wrench, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Section, SectionIcon } from './Section';
import { N8nWorkflowsPanel } from './N8nWorkflowsPanel';
import { EmailTemplateCampaignPanel } from './EmailTemplateCampaignPanel';
import type { N8nWorkflow } from '@/types/automation';

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
    <div className="space-y-4">
      <Section
        title="Workflows n8n"
        description={`${activeWorkflows} de ${workflows.length} ativos`}
        icon={<SectionIcon icon={Settings2} className="bg-amber-500/10 text-amber-500" />}
        actions={
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onRefresh} title="Atualizar workflows">
            <RefreshCw className="h-3.5 w-3.5" />
          </Button>
        }
      >
        <N8nWorkflowsPanel workflows={workflows} isConnected={isConnected} onRefresh={onRefresh} />
      </Section>

      {showLabButton && (
        <Section
          title="Email Templates"
          description="Envio de templates para revisão e teste"
          icon={<SectionIcon icon={Wrench} className="bg-muted text-muted-foreground" />}
          collapsible
          defaultExpanded={false}
        >
          <EmailTemplateCampaignPanel />
        </Section>
      )}
    </div>
  );
}
