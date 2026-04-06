/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { Enums } from '@/integrations/supabase/types';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL ?? '';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || '';

export type AppRole = Enums<'app_role'>;

const DASHBOARD_ROLES: AppRole[] = ['super_admin', 'admin', 'editor', 'redator', 'moderador', 'analyst'];
const SESSION_IDLE_TIMEOUT_MS = 30 * 60 * 1000;

const isAbortError = (err: unknown): boolean =>
  err instanceof DOMException && err.name === 'AbortError' ||
  (typeof err === 'object' && err !== null && 'message' in err && /AbortError|signal is aborted/i.test(String((err as { message?: string }).message)));

interface AuthContextType {
  user: User | null;
  session: Session | null;
  roles: AppRole[];
  primaryRole: AppRole | null;
  isAdmin: boolean;
  isSuperAdmin: boolean;
  canAccessDashboard: boolean;
  isLoading: boolean;
  isAccessReady: boolean;
  hasRole: (role: AppRole) => boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null; isAdmin: boolean; canAccessDashboard: boolean; roles: AppRole[] }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// ── Provider ─────────────────────────────────────────────────────────────────

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [roles, setRoles] = useState<AppRole[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isAccessReady, setIsAccessReady] = useState(false);

  const isSuperAdmin = useMemo(() => roles.includes('super_admin'), [roles]);
  const canAccessDashboard = useMemo(
    () => roles.some((role) => DASHBOARD_ROLES.includes(role)),
    [roles],
  );
  const primaryRole = roles[0] ?? null;
  const hasRole = useCallback((role: AppRole) => roles.includes(role), [roles]);

  // ── Load roles from user_roles table (direct fetch to avoid AbortController) ──

  const getUserAccessProfile = useCallback(async (userId: string): Promise<{ roles: AppRole[]; isAdmin: boolean; canAccessDashboard: boolean; queryFailed: boolean }> => {
    const empty = { roles: [] as AppRole[], isAdmin: false, canAccessDashboard: false, queryFailed: false };

    // Use direct fetch to PostgREST to avoid Supabase JS AbortController issues
    const fetchRoles = async (): Promise<Array<{ role: string; is_active: boolean }> | null> => {
      const session = (await supabase.auth.getSession()).data.session;
      const token = session?.access_token || SUPABASE_ANON_KEY;
      const url = `${SUPABASE_URL}/rest/v1/user_roles?select=role,is_active&user_id=eq.${userId}&is_active=eq.true`;

      const res = await fetch(url, {
        headers: {
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!res.ok) return null;
      return res.json();
    };

    let data: Array<{ role: string; is_active: boolean }> | null = null;

    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        data = await fetchRoles();
        if (data !== null) break;
      } catch {
        // retry
      }
      if (attempt === 0) await new Promise((r) => setTimeout(r, 400));
    }

    if (data === null) {
      console.warn('[Auth] Failed to load roles after retries');
      return { ...empty, queryFailed: true };
    }

    const activeRoles = Array.from(
      new Set(data.map((r) => r.role as AppRole).filter(Boolean)),
    );

    return {
      roles: activeRoles,
      isAdmin: activeRoles.some((r) => ['admin', 'super_admin'].includes(r)),
      canAccessDashboard: activeRoles.some((r) => DASHBOARD_ROLES.includes(r)),
      queryFailed: false,
    };
  }, []);

  // ── Apply access profile to state ─────────────────────────────────────────

  const applyAccess = useCallback(
    (access: { roles: AppRole[]; isAdmin: boolean }) => {
      setRoles(access.roles);
      setIsAdmin(access.isAdmin);
    },
    [],
  );

  const clearAccess = useCallback(() => {
    setSession(null);
    setUser(null);
    setRoles([]);
    setIsAdmin(false);
  }, []);

  // ── Session initialisation & auth state listener ──────────────────────────

  useEffect(() => {
    let isMounted = true;

    const safetyTimer = window.setTimeout(() => {
      if (isMounted) {
        setIsAccessReady(true);
        setIsLoading(false);
      }
    }, 8000);

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, sess) => {
        if (!isMounted || event === 'INITIAL_SESSION') return;

        setIsAccessReady(false);
        setSession(sess);
        setUser(sess?.user ?? null);

        if (sess?.user) {
          const access = await getUserAccessProfile(sess.user.id);
          if (isMounted) { applyAccess(access); setIsAccessReady(true); }
        } else {
          if (isMounted) { clearAccess(); setIsAccessReady(true); }
        }
      },
    );

    const initializeSession = async () => {
      try {
        const { data: { session: sess } } = await supabase.auth.getSession();
        if (!isMounted) return;

        setSession(sess);
        setUser(sess?.user ?? null);

        if (sess?.user) {
          const access = await getUserAccessProfile(sess.user.id);
          if (isMounted) applyAccess(access);
        }
      } catch (err) {
        if (!isAbortError(err)) {
          console.error('[Auth] Error initializing session:', err);
        }
      } finally {
        window.clearTimeout(safetyTimer);
        if (isMounted) { setIsAccessReady(true); setIsLoading(false); }
      }
    };

    initializeSession();

    return () => {
      isMounted = false;
      window.clearTimeout(safetyTimer);
      subscription.unsubscribe();
    };
  }, [getUserAccessProfile, applyAccess, clearAccess]);

  // ── Sign in (email + password) ────────────────────────────────────────────

  const signIn = useCallback(async (email: string, password: string) => {
    const fail = { isAdmin: false, canAccessDashboard: false, roles: [] as AppRole[] };

    setIsLoading(true);
    setIsAccessReady(false);

    let data;
    try {
      const result = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password,
      });
      data = result.data;
      if (result.error) {
        setIsAccessReady(true);
        setIsLoading(false);
        return { error: result.error as Error, ...fail };
      }
    } catch (err) {
      setIsAccessReady(true);
      setIsLoading(false);
      if (isAbortError(err)) return { error: new Error('Pedido cancelado. Tente novamente.'), ...fail };
      return { error: err instanceof Error ? err : new Error(String(err)), ...fail };
    }

    if (!data.user || !data.session) {
      setIsAccessReady(true);
      setIsLoading(false);
      return { error: new Error('Credenciais inválidas.'), ...fail };
    }

    let access = { roles: [] as AppRole[], isAdmin: false, canAccessDashboard: false, queryFailed: false };

    try {
      access = await getUserAccessProfile(data.user.id);
      setSession(data.session);
      setUser(data.user);
      applyAccess(access);
    } catch (err) {
      console.error('[Auth] Error after sign-in:', err);
      access = { ...access, queryFailed: true };
    } finally {
      setIsAccessReady(true);
      setIsLoading(false);
    }

    // If the role query failed (AbortError, network issue), don't sign out.
    // Let the auth state listener retry role loading on its own.
    if (access.queryFailed) {
      return { error: null, isAdmin: false, canAccessDashboard: false, roles: [] as AppRole[] };
    }

    if (!access.canAccessDashboard) {
      await supabase.auth.signOut();
      clearAccess();
      return {
        error: new Error('Esta conta não tem perfil ativo com acesso ao dashboard.'),
        ...fail,
      };
    }

    return { error: null, isAdmin: access.isAdmin, canAccessDashboard: access.canAccessDashboard, roles: access.roles };
  }, [getUserAccessProfile, applyAccess, clearAccess]);

  // ── Sign out ──────────────────────────────────────────────────────────────

  const signOut = useCallback(async () => {
    setIsAccessReady(false);
    await supabase.auth.signOut();
    clearAccess();
    setIsAccessReady(true);
  }, [clearAccess]);

  // ── Session idle timeout (30 min) ─────────────────────────────────────────

  useEffect(() => {
    if (!session) return;

    let timeout: number;

    const resetTimer = () => {
      window.clearTimeout(timeout);
      timeout = window.setTimeout(() => { void signOut(); }, SESSION_IDLE_TIMEOUT_MS);
    };

    const events: Array<keyof WindowEventMap> = ['mousemove', 'mousedown', 'keydown', 'scroll', 'touchstart', 'click'];
    events.forEach((e) => window.addEventListener(e, resetTimer, { passive: true }));
    resetTimer();

    return () => {
      window.clearTimeout(timeout);
      events.forEach((e) => window.removeEventListener(e, resetTimer));
    };
  }, [session, signOut]);

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <AuthContext.Provider
      value={{
        user, session, roles, primaryRole,
        isAdmin, isSuperAdmin, canAccessDashboard,
        isLoading, isAccessReady,
        hasRole, signIn, signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
