import React, { useMemo, useState } from 'react';
import { Mail, ShieldCheck, UserCheck, Users, UserX } from 'lucide-react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { useRegistrationInvites, useTeamMembers } from '@/hooks/useAdminAccess';
import { useAuth } from '@/contexts/AuthContext';
import InviteForm from './accessManager/InviteForm';
import InvitesList from './accessManager/InvitesList';
import RoleBlueprintsPanel from './accessManager/RoleBlueprintsPanel';
import TeamMembersTable from './accessManager/TeamMembersTable';

type TabId = 'team' | 'invites' | 'roles';

const AdminAccessManager: React.FC = () => {
  const { data: teamMembers = [] } = useTeamMembers();
  const { data: invites = [] } = useRegistrationInvites();
  const { user, isSuperAdmin } = useAuth();
  const [activeTab, setActiveTab] = useState<TabId>('team');

  const stats = useMemo(() => {
    const now = Date.now();
    return {
      active: teamMembers.filter((m) => m.is_active).length,
      inactive: teamMembers.filter((m) => !m.is_active).length,
      pending: invites.filter((i) => i.status === 'pending' && new Date(i.expires_at).getTime() > now).length,
    };
  }, [teamMembers, invites]);

  const tabs: Array<{ id: TabId; label: string; icon: React.ReactNode; count?: number }> = [
    { id: 'team', label: 'Equipa', icon: <Users className="h-3.5 w-3.5" />, count: stats.active },
    { id: 'invites', label: 'Convites', icon: <Mail className="h-3.5 w-3.5" />, count: stats.pending },
    { id: 'roles', label: 'Papéis & Escopos', icon: <ShieldCheck className="h-3.5 w-3.5" /> },
  ];

  return (
    <div className="grid grid-cols-1 gap-6 xl:grid-cols-[380px_minmax(0,1fr)]">
      {/* Left: Invite form + semantic stats */}
      <div className="space-y-4">
        <div data-tour="access-invite">
          <InviteForm />
        </div>

        {/* Semantic Stat Cards */}
        <div className="grid grid-cols-3 gap-2.5">
          <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/[0.04] p-3 text-center transition-all">
            <div className="flex items-center justify-center gap-1 text-emerald-600 dark:text-emerald-400 mb-1">
              <UserCheck className="h-3.5 w-3.5" />
              <span className="text-[10px] font-semibold uppercase tracking-wider">Ativos</span>
            </div>
            <p className="text-xl font-bold tracking-tight text-foreground">{stats.active}</p>
          </div>

          <div className="rounded-xl border border-amber-500/20 bg-amber-500/[0.04] p-3 text-center transition-all">
            <div className="flex items-center justify-center gap-1 text-amber-600 dark:text-amber-400 mb-1">
              <Mail className="h-3.5 w-3.5" />
              <span className="text-[10px] font-semibold uppercase tracking-wider">Pendentes</span>
            </div>
            <p className="text-xl font-bold tracking-tight text-foreground">{stats.pending}</p>
          </div>

          <div className="rounded-xl border border-slate-500/20 bg-slate-500/[0.04] p-3 text-center transition-all">
            <div className="flex items-center justify-center gap-1 text-muted-foreground mb-1">
              <UserX className="h-3.5 w-3.5" />
              <span className="text-[10px] font-semibold uppercase tracking-wider">Inativos</span>
            </div>
            <p className="text-xl font-bold tracking-tight text-foreground">{stats.inactive}</p>
          </div>
        </div>
      </div>

      {/* Right: Tabs — Team / Invites / Roles */}
      <Card className="border-border/60 shadow-sm flex flex-col">
        <CardHeader className="pb-3 border-b border-border/40">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1 overflow-x-auto rounded-lg bg-muted/60 p-1 border border-border/40">
              {tabs.map((tab) => {
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    data-tour={`access-tab-${tab.id}`}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center gap-2 rounded-md px-3.5 py-1.5 text-xs font-medium transition-all ${
                      isActive
                        ? 'bg-background text-foreground shadow-sm'
                        : 'text-muted-foreground hover:text-foreground hover:bg-background/50'
                    }`}
                  >
                    {tab.icon}
                    <span>{tab.label}</span>
                    {tab.count !== undefined && (
                      <span className={`rounded-full px-1.5 py-0.2 text-[10px] font-semibold ${
                        isActive
                          ? 'bg-primary/10 text-primary'
                          : 'bg-muted-foreground/15 text-muted-foreground'
                      }`}>
                        {tab.count}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-4 flex-1">
          {activeTab === 'team' && (
            <div data-tour="access-content-team">
              <TeamMembersTable
                members={teamMembers}
                currentUserId={user?.id}
                isSuperAdmin={isSuperAdmin}
              />
            </div>
          )}
          {activeTab === 'invites' && <div data-tour="access-content-invites"><InvitesList /></div>}
          {activeTab === 'roles' && <div data-tour="access-content-roles"><RoleBlueprintsPanel /></div>}
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminAccessManager;
