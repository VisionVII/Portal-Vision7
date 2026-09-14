import React, { lazy, Suspense, useState } from 'react';
import { Globe, Bot, DollarSign, GraduationCap, Loader2 } from 'lucide-react';

const SiteSettingsManager = lazy(() => import('@/components/admin/SiteSettingsManager'));
const MonetizationManager = lazy(() => import('@/components/admin/MonetizationManager'));
const AISettingsPanel = lazy(() => import('@/components/admin/AISettingsPanel'));
const TutorialSettingsCard = lazy(() =>
  import('@/components/admin/onboarding/TutorialSettingsCard').then((m) => ({ default: m.TutorialSettingsCard })),
);

const TABS = [
  { id: 'general', label: 'Geral & Identidade', icon: Globe, tourAttr: 'settings-tab-general' },
  { id: 'ai', label: 'Assistente IA', icon: Bot, tourAttr: 'settings-tab-ai' },
  { id: 'monetization', label: 'Monetização', icon: DollarSign, tourAttr: 'settings-tab-monetization' },
  { id: 'tutorial', label: 'Tutorial & Guia', icon: GraduationCap, tourAttr: 'settings-tab-tutorial' },
] as const;

type TabId = (typeof TABS)[number]['id'];

const SettingsView: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabId>('general');

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div>
        <h2 className="text-xl font-bold tracking-tight sm:text-2xl">Configurações</h2>
        <p className="text-sm text-muted-foreground">
          Gerir a identidade do portal, serviços de IA, monetização e tutorial de uso
        </p>
      </div>

      {/* Tab bar */}
      <div className="flex items-center gap-1 overflow-x-auto rounded-xl bg-muted/60 p-1 border border-border/40 w-fit">
        {TABS.map(({ id, label, icon: Icon, tourAttr }) => (
          <button
            key={id}
            type="button"
            data-tour={tourAttr}
            onClick={() => setActiveTab(id)}
            className={`flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-semibold whitespace-nowrap transition-all ${
              activeTab === id
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground hover:bg-background/50'
            }`}
          >
            <Icon className="h-3.5 w-3.5" />
            <span>{label}</span>
          </button>
        ))}
      </div>

      {/* Tab panels */}
      <Suspense
        fallback={
          <div className="flex items-center justify-center gap-2 py-20 text-sm text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
            A carregar...
          </div>
        }
      >
        {activeTab === 'general' && (
          <div data-tour="settings-site">
            <SiteSettingsManager />
          </div>
        )}

        {activeTab === 'ai' && (
          <div data-tour="settings-ai" className="space-y-4">
            <AISettingsPanel />
          </div>
        )}

        {activeTab === 'monetization' && (
          <div className="space-y-4">
            <MonetizationManager />
          </div>
        )}

        {activeTab === 'tutorial' && (
          <div data-tour="settings-tutorial">
            <TutorialSettingsCard />
          </div>
        )}
      </Suspense>
    </div>
  );
};

export default SettingsView;
