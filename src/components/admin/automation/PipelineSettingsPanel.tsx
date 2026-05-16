import { Key, Trash2, Clock, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import type { PipelineDiagnostics } from '@/hooks/usePipelineDiagnostics';
import { CredentialKeysTab } from './CredentialKeysTab';
import { SchedulesTab } from './SchedulesTab';
import { CleanupTab } from './CleanupTab';

interface PipelineSettingsPanelProps {
  onClose: () => void;
  diagnostics?: PipelineDiagnostics | null;
}

export function PipelineSettingsPanel({ onClose, diagnostics }: PipelineSettingsPanelProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Shield className="h-4 w-4 text-blue-500" />
          <h3 className="text-sm font-semibold text-foreground">Configurações do Pipeline</h3>
        </div>
        <Button size="sm" variant="ghost" className="h-7 text-xs text-muted-foreground" onClick={onClose}>
          Fechar
        </Button>
      </div>

      <Tabs defaultValue="keys">
        <TabsList className="h-8 w-full gap-0.5 rounded-lg border border-border/40 bg-muted/40 p-0.5">
          <TabsTrigger value="keys" className="flex-1 rounded-md text-xs">
            <Key className="mr-1.5 h-3.5 w-3.5" />Chaves API
          </TabsTrigger>
          <TabsTrigger value="schedules" className="flex-1 rounded-md text-xs">
            <Clock className="mr-1.5 h-3.5 w-3.5" />Schedules
          </TabsTrigger>
          <TabsTrigger value="cleanup" className="flex-1 rounded-md text-xs">
            <Trash2 className="mr-1.5 h-3.5 w-3.5" />Limpeza
          </TabsTrigger>
        </TabsList>

        <TabsContent value="keys" className="mt-4">
          <CredentialKeysTab />
        </TabsContent>

        <TabsContent value="schedules" className="mt-4">
          <SchedulesTab diagnostics={diagnostics} />
        </TabsContent>

        <TabsContent value="cleanup" className="mt-4">
          <CleanupTab diagnostics={diagnostics} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
