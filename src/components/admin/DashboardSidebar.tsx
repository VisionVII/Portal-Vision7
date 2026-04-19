import React from 'react';
import {
  BarChart3,
  Bot,
  FileText,
  Globe,
  Handshake,
  Headphones,
  Image,
  LayoutDashboard,
  LayoutTemplate,
  Mail,
  Settings,
  Shield,
  TerminalSquare,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import type { AdminView } from '@/components/admin/dashboard-types';

type NavItem = {
  id: AdminView;
  label: string;
  icon: typeof LayoutDashboard;
  hint: string;
  badge?: number;
};

type NavGroup = {
  title: string;
  items: NavItem[];
};

interface DashboardSidebarProps {
  activeView: AdminView;
  onViewChange: (view: AdminView) => void;
  allowedViews: AdminView[];
  draftCount?: number;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
}

const DashboardSidebar: React.FC<DashboardSidebarProps> = ({
  activeView,
  onViewChange,
  allowedViews,
  draftCount,
  collapsed = false,
  onToggleCollapse,
}) => {
  const allItems: NavItem[] = [
    { id: 'overview', label: 'Visão geral', icon: LayoutDashboard, hint: 'KPIs e atalhos' },
    { id: 'content', label: 'Conteúdo', icon: FileText, hint: 'Posts e editorial', badge: draftCount || undefined },
    { id: 'audiocasts', label: 'Audiocasts', icon: Headphones, hint: 'Áudio e episódios' },
    { id: 'builder', label: 'Homepage', icon: LayoutTemplate, hint: 'Builder visual' },
    { id: 'media', label: 'Galeria', icon: Image, hint: 'Imagens do portal' },
    { id: 'automations', label: 'Automações', icon: Bot, hint: 'N8N e workflows' },
    { id: 'courses', label: 'Parceiros', icon: Handshake, hint: 'Cursos, afiliados e links' },
    { id: 'crm', label: 'CRM', icon: Mail, hint: 'Newsletter e leads' },
    { id: 'analytics', label: 'Analytics', icon: BarChart3, hint: 'Métricas e tráfego' },
    { id: 'access', label: 'Acessos', icon: Shield, hint: 'Roles e convites' },
    { id: 'developer', label: 'Developer', icon: TerminalSquare, hint: 'Diagnósticos' },
    { id: 'settings', label: 'Settings', icon: Settings, hint: 'Branding' },
  ];

  const navigationItems = allItems.filter((i) => allowedViews.includes(i.id));

  // Grouped navigation for desktop
  const groups: NavGroup[] = [
    {
      title: 'Conteúdo',
      items: navigationItems.filter((i) => ['overview', 'content', 'audiocasts', 'builder', 'media'].includes(i.id)),
    },
    {
      title: 'Marketing',
      items: navigationItems.filter((i) => ['automations', 'courses', 'crm', 'analytics'].includes(i.id)),
    },
    {
      title: 'Sistema',
      items: navigationItems.filter((i) => ['access', 'developer', 'settings'].includes(i.id)),
    },
  ].filter((g) => g.items.length > 0);

  return (
    <>
      {/* ─── Mobile: horizontal scrollable pills ─── */}
      <div className="lg:hidden">
        <div className="flex snap-x snap-mandatory gap-2 overflow-x-auto pb-2 scrollbar-none [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {navigationItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeView === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onViewChange(item.id)}
                className={`relative inline-flex shrink-0 snap-start items-center gap-2 rounded-xl border px-3.5 py-2 text-sm font-medium transition-all duration-150 active:scale-[0.97] ${
                  isActive
                    ? 'border-primary/30 bg-primary/10 text-primary shadow-sm dark:border-primary/40 dark:bg-primary/15 dark:text-primary-300'
                    : 'border-border/50 bg-card text-muted-foreground hover:bg-muted/50 hover:text-foreground'
                }`}
              >
                <Icon className="h-4 w-4" />
                {item.label}
                {item.badge ? (
                  <span className="ml-0.5 inline-flex h-5 min-w-[18px] items-center justify-center rounded-full bg-amber-500 px-1.5 text-[10px] font-bold text-white">
                    {item.badge}
                  </span>
                ) : null}
              </button>
            );
          })}
        </div>
      </div>

      {/* ─── Desktop: grouped sidebar nav with collapse ─── */}
      <nav className="hidden lg:block">
        {/* Toggle button */}
        {onToggleCollapse && (
          <div className="mb-4 flex justify-end">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onToggleCollapse}
                  className="h-8 w-8 p-0 text-gray-400 hover:text-white hover:bg-white/5"
                >
                  <div className={`transition-transform duration-200 ${collapsed ? 'rotate-180' : ''}`}>
                    <ChevronLeft className="h-4 w-4" />
                  </div>
                </Button>
              </TooltipTrigger>
              <TooltipContent side="right">
                {collapsed ? 'Expandir sidebar' : 'Recolher sidebar'}
              </TooltipContent>
            </Tooltip>
          </div>
        )}

        <div className="space-y-5">
          {groups.map((group, groupIndex) => (
            <div key={group.title}>
              {!collapsed && (
                <p className="mb-1.5 px-3 text-[10px] font-semibold uppercase tracking-widest text-neutral-400 transition-opacity duration-150 dark:text-neutral-500">
                  {group.title}
                </p>
              )}
              <div className="space-y-0.5">
                {group.items.map((item) => {
                  const Icon = item.icon;
                  const isActive = activeView === item.id;
                  
                  const button = (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => onViewChange(item.id)}
                      className={`flex w-full items-center ${collapsed ? 'justify-center' : 'gap-3'} rounded-lg px-3 py-2 text-left transition-all duration-150 active:scale-[0.98] ${
                        isActive
                          ? 'border-l-2 border-l-primary-500 bg-primary/8 pl-[10px] text-primary-700 dark:bg-primary/12 dark:text-primary-300'
                          : 'text-muted-foreground hover:bg-muted/40 hover:text-foreground'
                      }`}
                    >
                      <div
                        className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-md transition-colors duration-150 ${
                          isActive
                            ? 'bg-primary/15 text-primary-600 dark:bg-primary/20 dark:text-primary-400'
                            : 'text-muted-foreground'
                        }`}
                      >
                        <Icon className="h-4 w-4" />
                      </div>
                      <div className={`min-w-0 overflow-hidden transition-all duration-200 ${collapsed ? 'w-0 opacity-0' : 'flex-1 opacity-100'}`}>
                        <span className={`block truncate whitespace-nowrap text-sm ${isActive ? 'font-semibold' : 'font-medium'}`}>{item.label}</span>
                      </div>
                      {item.badge && !collapsed ? (
                        <Badge className="h-5 min-w-[20px] justify-center rounded-full bg-amber-500 px-1.5 text-[10px] text-white hover:bg-amber-500">
                          {item.badge}
                        </Badge>
                      ) : null}
                    </button>
                  );

                  return collapsed ? (
                    <Tooltip key={item.id}>
                      <TooltipTrigger asChild>
                        {button}
                      </TooltipTrigger>
                      <TooltipContent side="right" className="flex items-center gap-2">
                        {item.label}
                        {item.badge && (
                          <Badge className="h-5 min-w-[20px] justify-center rounded-full bg-amber-500 px-1.5 text-[10px] text-white">
                            {item.badge}
                          </Badge>
                        )}
                      </TooltipContent>
                    </Tooltip>
                  ) : button;
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Portal quick link */}
        <div className="mt-6 border-t border-border/30 pt-4">
          <Tooltip>
            <TooltipTrigger asChild>
              <a
                href="/"
                target="_blank"
                rel="noopener noreferrer"
                className={`flex items-center ${collapsed ? 'justify-center' : 'gap-2.5'} rounded-lg px-3 py-2 text-sm text-muted-foreground transition-all duration-150 hover:bg-muted/40 hover:text-foreground`}
              >
                <Globe className="h-4 w-4 text-emerald-500 shrink-0" />
                <span className={`overflow-hidden transition-all duration-200 ${collapsed ? 'w-0 opacity-0' : 'opacity-100'}`}>
                  Abrir portal
                </span>
              </a>
            </TooltipTrigger>
            {collapsed && (
              <TooltipContent side="right">
                Abrir portal
              </TooltipContent>
            )}
          </Tooltip>
        </div>
      </nav>
    </>
  );
};

export default DashboardSidebar;
