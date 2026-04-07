import React from 'react';
import {
  Bot,
  FileText,
  Globe,
  GraduationCap,
  Headphones,
  LayoutDashboard,
  LayoutTemplate,
  Mail,
  Settings,
  Shield,
  TerminalSquare,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import type { AdminView } from '@/components/admin/dashboard-types';

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
    { id: 'audiocasts', label: 'Audiocasts', icon: Headphones, hint: 'Áudio e episódios' },
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
      {/* ─── Mobile: horizontal scrollable pills ─── */}
      <div className="lg:hidden">
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none">
          {navigationItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeView === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onViewChange(item.id)}
                className={`relative inline-flex shrink-0 items-center gap-2 rounded-xl border px-3.5 py-2 text-sm font-medium transition-all ${
                  isActive
                    ? 'border-primary/30 bg-primary/10 text-primary shadow-sm dark:border-primary/40 dark:bg-primary/15 dark:text-primary-300'
                    : 'border-border/60 bg-card text-muted-foreground hover:bg-muted/60 hover:text-foreground'
                }`}
              >
                <Icon className="h-4 w-4" />
                {item.label}
                {item.badge ? (
                  <span className="ml-0.5 inline-flex h-5 min-w-[18px] items-center justify-center rounded-full bg-primary px-1.5 text-[10px] font-bold text-white">
                    {item.badge}
                  </span>
                ) : null}
              </button>
            );
          })}
        </div>
      </div>

      {/* ─── Desktop: clean sidebar nav ─── */}
      <nav className="hidden lg:block">
        <div className="mb-4 rounded-xl bg-gradient-to-br from-neutral-900 via-neutral-900 to-primary-900 px-4 py-3 text-white dark:from-neutral-950 dark:to-primary-950">
          <p className="text-xs font-bold tracking-wide">Painel de controlo</p>
          <p className="mt-0.5 text-[10px] text-white/50">{navigationItems.length} áreas</p>
        </div>

        <div className="space-y-0.5">
          {navigationItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeView === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onViewChange(item.id)}
                className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-all ${
                  isActive
                    ? 'bg-primary/10 text-primary shadow-sm dark:bg-primary/15 dark:text-primary-300'
                    : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'
                }`}
              >
                <div
                  className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-colors ${
                    isActive
                      ? 'bg-primary/15 text-primary dark:bg-primary/20 dark:text-primary-300'
                      : 'bg-muted/50 text-muted-foreground'
                  }`}
                >
                  <Icon className="h-4 w-4" />
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
        </div>

        {/* Portal quick link */}
        <div className="mt-6 border-t border-border/40 pt-4">
          <a
            href="/"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground"
          >
            <Globe className="h-4 w-4 text-emerald-500" />
            Abrir portal
          </a>
        </div>
      </nav>
    </>
  );
};

export default DashboardSidebar;
