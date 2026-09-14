import React, { lazy, Suspense, useState } from 'react';
import { Activity, Key } from 'lucide-react';
import DeveloperControlCenter from '@/components/admin/DeveloperControlCenter';

const CredentialVault = lazy(() => import('@/components/admin/CredentialVault'));

const DeveloperView: React.FC = () => {
  const [tab, setTab] = useState<'dev' | 'vault'>('dev');

  return (
    <div className="space-y-6">
      {/* Tab bar */}
      <div className="flex items-center gap-1 overflow-x-auto rounded-xl bg-muted/60 p-1 border border-border/40 w-fit">
        <button
          type="button"
          data-tour="developer-tab-diagnostics"
          onClick={() => setTab('dev')}
          className={`flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-semibold transition-all ${
            tab === 'dev'
              ? 'bg-background text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground hover:bg-background/50'
          }`}
        >
          <Activity className="h-3.5 w-3.5" />
          <span>Diagnósticos & Métricas</span>
        </button>
        <button
          type="button"
          data-tour="developer-tab-vault"
          onClick={() => setTab('vault')}
          className={`flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-semibold transition-all ${
            tab === 'vault'
              ? 'bg-background text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground hover:bg-background/50'
          }`}
        >
          <Key className="h-3.5 w-3.5" />
          <span>Credential Vault</span>
        </button>
      </div>

      {tab === 'dev' && (
        <div data-tour="developer-content-diagnostics">
          <DeveloperControlCenter />
        </div>
      )}
      {tab === 'vault' && (
        <div data-tour="developer-content-vault">
          <Suspense fallback={<div className="h-48 animate-pulse rounded-2xl bg-muted/40" />}>
            <CredentialVault />
          </Suspense>
        </div>
      )}
    </div>
  );
};

export default DeveloperView;
