import React from 'react';
import {
  Bot,
  FileText,
  Globe,
  GraduationCap,
  LayoutDashboard,
  LayoutTemplate,
  Mail,
  Settings,
  Shield,
  TerminalSquare,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { AdminView } from '@/components/admin/dashboard-types';
import { VIEW_ACCESS_RULES } from '@/components/admin/dashboard-types';

type NavItem = {
  id: AdminView;
  label: string;
  icon: typeof LayoutDashboard;
  hint: string;
  badge?: number;
};

interface DashboardSidebarProps {
  activeView: AdminView;
  onViewChange: (view: AdminView) => void;
  allowedViews: AdminView[];
  draftCount?: number;
}

const DashboardSidebar: React.FC<DashboardSidebarProps> = ({
  activeView,
  onViewChange,
  allowedViews,
  draftCount,
}) => {
  const allItems: NavItem[] = [
    { id: 'overview', label: 'Visão geral', icon: LayoutDashboard, hint: 'KPIs e atalhos' },
    { id: 'content', label: 'Conteúdo', icon: FileText, hint: 'Posts e editorial', badge: draftCount || undefined },
    { id: 'builder', label: 'Homepage', icon: LayoutTemplate, hint: 'Builder visual' },
    { id: 'automations', label: 'Automações', icon: Bot, hint: 'N8N e workflows' },
    { id: 'courses', label: 'Cursos', icon: GraduationCap, hint: 'Afiliados e parcerias' },
    { id: 'crm', label: 'CRM', icon: Mail, hint: 'Newsletter e leads' },
    { id: 'access', label: 'Acessos', icon: Shield, hint: 'Roles e convites' },
    { id: 'developer', label: 'Developer', icon: TerminalSquare, hint: 'Diagnósticos' },
    { id: 'settings', label: 'Settings', icon: Settings, hint: 'Branding' },
  ];

  const navigationItems = allItems.filter((i) => allowedViews.includes(i.id));

  return (
    <>
      {/* Mobile: horizontal scrollable chips */}
      <div className="lg:hidden">
        <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none">
          {navigationItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeView === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onViewChange(item.id)}
                className={`relative inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-all ${
                  isActive
                    ? 'border-primary-300 bg-primary-50 text-primary-700 shadow-sm dark:border-primary-700 dark:bg-primary-900/30 dark:text-primary-300'
                    : 'border-border bg-card text-foreground hover:bg-muted/70'
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                {item.label}
                {item.badge ? (
                  <span className="ml-0.5 inline-flex h-4 min-w-[16px] items-center justify-center rounded-full bg-primary-600 px-1 text-[10px] font-bold text-white">
                    {item.badge}
                  </span>
                ) : null}
              </button>
            );
          })}
        </div>
      </div>

      {/* Desktop: sidebar card */}
      <aside className="hidden self-start lg:sticky lg:top-16 lg:block">
        <Card className="overflow-hidden border-border/60 shadow-sm">
          <div className="bg-gradient-to-br from-neutral-900 via-neutral-900 to-primary-900 px-4 py-3.5 text-white dark:from-neutral-950 dark:to-primary-950">
            <p className="text-xs font-bold tracking-wide">Painel de controlo</p>
            <p className="mt-0.5 text-[10px] text-white/50">{navigationItems.length} áreas</p>
          </div>
          <CardContent className="space-y-0.5 p-1.5">
            {navigationItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeView === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onViewChange(item.id)}
                  className={`flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left transition-all ${
                    isActive
                      ? 'bg-primary-50 text-primary-700 shadow-sm dark:bg-primary-900/20 dark:text-primary-300'
                      : 'text-foreground hover:bg-muted/50'
                  }`}
                >
                  <div
                    className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-md transition-colors ${
                      isActive
                        ? 'bg-primary-100 text-primary-700 dark:bg-primary-800/40 dark:text-primary-300'
                        : 'bg-muted/60 text-muted-foreground'
                    }`}
                  >
                    <Icon className="h-3.5 w-3.5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium">{item.label}</span>
                    <span className="block truncate text-[10px] text-muted-foreground">{item.hint}</span>
                  </div>
                  {item.badge ? (
                    <Badge variant="default" className="h-5 min-w-[20px] justify-center rounded-full px-1.5 text-[10px]">
                      {item.badge}
                    </Badge>
                  ) : null}
                </button>
              );
            })}
          </CardContent>
        </Card>

        {/* Portal quick links */}
        <div className="mt-3 rounded-lg border border-border/60 bg-card p-3">
          <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
            Portal público
          </p>
          <a
            href="/"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 rounded-md px-2 py-1.5 text-xs text-foreground transition-colors hover:bg-muted/60"
          >
            <Globe className="h-3.5 w-3.5 text-emerald-500" />
            Abrir portal
          </a>
        </div>
      </aside>
    </>
  );
};

export default DashboardSidebar;
