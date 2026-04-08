import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Newspaper, Mail, Shield, Cog, Plug, LayoutGrid,
} from 'lucide-react';
import { AUTOMATION_CATEGORIES, CATEGORY_META } from '@/types/automation';
import type { AutomationCategory } from '@/types/automation';

const ICON_MAP: Record<string, React.ElementType> = {
  Newspaper, Mail, Shield, Cog, Plug,
};

interface AutomationCategoryTabsProps {
  activeCategory: AutomationCategory | 'all';
  onCategoryChange: (category: AutomationCategory | 'all') => void;
  counts: Record<AutomationCategory | 'all', number>;
  children: React.ReactNode;
}

export function AutomationCategoryTabs({
  activeCategory,
  onCategoryChange,
  counts,
  children,
}: AutomationCategoryTabsProps) {
  return (
    <Tabs value={activeCategory} onValueChange={(v) => onCategoryChange(v as AutomationCategory | 'all')}>
      <TabsList className="bg-slate-800/60 border border-slate-700/50 h-auto flex-wrap gap-1 p-1 mb-4">
        <TabsTrigger
          value="all"
          className="data-[state=active]:bg-slate-700 data-[state=active]:text-white text-xs gap-1.5 px-3 py-1.5"
        >
          <LayoutGrid className="w-3.5 h-3.5" />
          Todas
          <span className="text-[10px] opacity-60 ml-1">{counts.all}</span>
        </TabsTrigger>

        {AUTOMATION_CATEGORIES.map((cat) => {
          const meta = CATEGORY_META[cat];
          const Icon = ICON_MAP[meta.icon] ?? Cog;
          return (
            <TabsTrigger
              key={cat}
              value={cat}
              className="data-[state=active]:bg-slate-700 data-[state=active]:text-white text-xs gap-1.5 px-3 py-1.5"
            >
              <Icon className="w-3.5 h-3.5" />
              {meta.label}
              <span className="text-[10px] opacity-60 ml-1">{counts[cat]}</span>
            </TabsTrigger>
          );
        })}
      </TabsList>

      {/* Render children (the card list) under a single shared content area */}
      <TabsContent value={activeCategory} className="mt-0">
        {children}
      </TabsContent>
    </Tabs>
  );
}
