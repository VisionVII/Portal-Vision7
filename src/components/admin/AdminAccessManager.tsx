import React, { useMemo, useState } from 'react';
import { Mail, ShieldCheck, Users } from 'lucide-react';
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
    { id: 'roles', label: 'Papéis', icon: <ShieldCheck className="h-3.5 w-3.5" /> },
  ];

  return (
    <div className="grid grid-cols-1 gap-5 xl:grid-cols-[360px_minmax(0,1fr)]">
      {/* Left: Invite form + stats */}
      <div className="space-y-5">
        <InviteForm />

        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          <div className="rounded-xl border border-border/60 bg-card p-3 text-center shadow-sm">
            <p className="text-lg font-bold text-foreground">{stats.active}</p>
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Ativos</p>
          </div>
          <div className="rounded-xl border border-border/60 bg-card p-3 text-center shadow-sm">
            <p className="text-lg font-bold text-foreground">{stats.pending}</p>
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Pendentes</p>
          </div>
          <div className="rounded-xl border border-border/60 bg-card p-3 text-center shadow-sm">
            <p className="text-lg font-bold text-foreground">{stats.inactive}</p>
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Inativos</p>
          </div>
        </div>
      </div>

      {/* Right: Tabs — Team / Invites / Roles */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center gap-1 overflow-x-auto rounded-lg bg-muted/50 p-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                  activeTab === tab.id
                    ? 'bg-background text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {tab.icon}
                {tab.label}
                {tab.count !== undefined && (
                  <span className={`rounded-full px-1.5 py-0.5 text-[10px] ${
                    activeTab === tab.id ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'
                  }`}>
                    {tab.count}
                  </span>
                )}
              </button>
            ))}
          </div>
        </CardHeader>
        <CardContent>
          {activeTab === 'team' && (
            <TeamMembersTable
              members={teamMembers}
              currentUserId={user?.id}
              isSuperAdmin={isSuperAdmin}
            />
          )}
          {activeTab === 'invites' && <InvitesList />}
          {activeTab === 'roles' && <RoleBlueprintsPanel />}
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminAccessManager;
