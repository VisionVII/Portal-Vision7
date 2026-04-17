import React, { lazy, Suspense, useState } from 'react';
import DeveloperControlCenter from '@/components/admin/DeveloperControlCenter';

const CredentialVault = lazy(() => import('@/components/admin/CredentialVault'));

const DeveloperView: React.FC = () => {
  const [tab, setTab] = useState<'dev' | 'vault'>('dev');

  return (
    <div className="space-y-4">
      <div className="flex gap-1.5 rounded-lg border border-border/50 bg-muted/30 p-1 w-fit">
        <button
          onClick={() => setTab('dev')}
          className={`rounded-md px-3 py-1.5 text-xs font-medium transition-all ${
            tab === 'dev' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          Diagnósticos
        </button>
        <button
          onClick={() => setTab('vault')}
          className={`rounded-md px-3 py-1.5 text-xs font-medium transition-all ${
            tab === 'vault' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          Credential Vault
        </button>
      </div>

      {tab === 'dev' && <DeveloperControlCenter />}
      {tab === 'vault' && (
        <Suspense fallback={<div className="h-24 animate-pulse rounded-xl bg-muted/50" />}>
          <CredentialVault />
        </Suspense>
      )}
    </div>
  );
};

export default DeveloperView;
