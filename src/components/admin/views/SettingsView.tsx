import React from 'react';
import SiteSettingsManager from '@/components/admin/SiteSettingsManager';
import MonetizationManager from '@/components/admin/MonetizationManager';
import AISettingsPanel from '@/components/admin/AISettingsPanel';

const SettingsView: React.FC = () => (
  <div className="space-y-8">
    <SiteSettingsManager />
    <div>
      <h2 className="mb-4 text-lg font-semibold">Assistente IA</h2>
      <AISettingsPanel />
    </div>
    <div>
      <h2 className="mb-4 text-lg font-semibold">Monetização</h2>
      <MonetizationManager />
    </div>
  </div>
);

export default SettingsView;
