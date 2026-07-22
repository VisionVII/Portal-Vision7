import React from 'react';
import SiteSettingsManager from '@/components/admin/SiteSettingsManager';
import MonetizationManager from '@/components/admin/MonetizationManager';
import AISettingsPanel from '@/components/admin/AISettingsPanel';
import { TutorialSettingsCard } from '@/components/admin/onboarding/TutorialSettingsCard';

const SettingsView: React.FC = () => (
  <div className="space-y-8">
    <div data-tour="settings-site">
      <SiteSettingsManager />
    </div>
    <div data-tour="settings-ai">
      <h2 className="mb-4 text-lg font-semibold">Assistente IA</h2>
      <AISettingsPanel />
    </div>
    <div>
      <h2 className="mb-4 text-lg font-semibold">Tutorial</h2>
      <TutorialSettingsCard />
    </div>
    <div>
      <h2 className="mb-4 text-lg font-semibold">Monetização</h2>
      <MonetizationManager />
    </div>
  </div>
);

export default SettingsView;
