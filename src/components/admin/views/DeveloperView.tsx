import React, { lazy, Suspense, useState } from 'react';
import DeveloperControlCenter from '@/components/admin/DeveloperControlCenter';

const CredentialVault = lazy(() => import('@/components/admin/CredentialVault'));

const DeveloperView: React.FC = () => {
  const [tab, setTab] = useState<'dev' | 'vault'>('dev');

  return (
    <div className="space-y-4">
      <div className="flex gap-1.5 rounded-lg border border-border/50 bg-muted/30 p-1 w-fit">
        <button
          data-tour="developer-tab-diagnostics"
          onClick={() => setTab('dev')}
          className={`rounded-md px-3 py-1.5 text-xs font-medium transition-all ${
            tab === 'dev' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          Diagnósticos
        </button>
        <button
          data-tour="developer-tab-vault"
          onClick={() => setTab('vault')}
          className={`rounded-md px-3 py-1.5 text-xs font-medium transition-all ${
            tab === 'vault' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          Credential Vault
        </button>
      </div>

      {tab === 'dev' && <div data-tour="developer-content-diagnostics"><DeveloperControlCenter /></div>}
      {tab === 'vault' && (
        <div data-tour="developer-content-vault">
          <Suspense fallback={<div className="h-24 animate-pulse rounded-xl bg-muted/50" />}>
            <CredentialVault />
          </Suspense>
        </div>
      )}
    </div>
  );
};

export default DeveloperView;
