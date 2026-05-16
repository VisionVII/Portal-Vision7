import React from 'react';
import { Shield } from 'lucide-react';
import { AppRole } from '@/hooks/useAdminAccess';
import { getRoleBadgeClass, getRoleTitle } from './roleBlueprints';

// ── RoleBadge ────────────────────────────────────────────────────────────────

export const RoleBadge: React.FC<{ role: AppRole }> = ({ role }) => (
  <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium ${getRoleBadgeClass(role)}`}>
    <Shield className="h-3 w-3" />
    {getRoleTitle(role)}
  </span>
);

// ── StatusDot ────────────────────────────────────────────────────────────────

export const StatusDot: React.FC<{ active: boolean }> = ({ active }) => (
  <span className={`inline-block h-2 w-2 rounded-full ${active ? 'bg-emerald-500' : 'bg-neutral-300 dark:bg-neutral-600'}`} />
);
