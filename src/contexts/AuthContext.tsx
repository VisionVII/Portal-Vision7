// @refresh reset
/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { Enums } from '@/integrations/supabase/types';

export type AppRole = Enums<'app_role'>;

const DASHBOARD_ROLES: AppRole[] = ['super_admin', 'admin', 'editor', 'redator', 'moderador', 'analyst'];
// No idle timeout — session stays open until manual logout (supports overnight automation monitoring)
const PRIMARY_ADMIN_EMAIL = import.meta.env.VITE_ADMIN_PRIMARY_EMAIL ?? '';

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
  mfaRequired: boolean;
  mfaFactorId: string | null;
  hasRole: (role: AppRole) => boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null; isAdmin: boolean; canAccessDashboard: boolean; roles: AppRole[] }>;
  signOut: () => Promise<void>;
  completeMfaChallenge: () => void;
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
  const [mfaRequired, setMfaRequired] = useState(false);
  const [mfaFactorId, setMfaFactorId] = useState<string | null>(null);

  // Guard: when signIn() is running, the listener should skip role loading
  const signingInRef = React.useRef(false);
  // Guard: skip auth-state-change role loading until init completes
  const initDoneRef = React.useRef(false);
  // Track the user ID whose roles are currently loaded — avoids redundant re-fetches
  const loadedRolesForRef = React.useRef<string | null>(null);

  const isSuperAdmin = useMemo(() => roles.includes('super_admin'), [roles]);
  const canAccessDashboard = useMemo(
    () => roles.some((role) => DASHBOARD_ROLES.includes(role)),
    [roles],
  );
  const primaryRole = roles[0] ?? null;
  const hasRole = useCallback((role: AppRole) => roles.includes(role), [roles]);

  const completeMfaChallenge = useCallback(() => {
    setMfaRequired(false);
    setMfaFactorId(null);
  }, []);

  /** Check if user has MFA enrolled but hasn't completed the challenge yet */
  const checkMfaRequired = useCallback(async (userRoles: AppRole[]) => {
    const isAdminRole = userRoles.some((r) => ['admin', 'super_admin'].includes(r));
    if (!isAdminRole) {
      setMfaRequired(false);
      setMfaFactorId(null);
      return;
    }
    try {
      const { data: factors } = await supabase.auth.mfa.listFactors();
      const verified = factors?.totp?.find((f) => f.status === 'verified');
      if (!verified) {
        // MFA not enrolled — not required until they set it up
        setMfaRequired(false);
        setMfaFactorId(null);
        return;
      }
      const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
      if (aal?.currentLevel === 'aal1' && aal?.nextLevel === 'aal2') {
        // Has MFA but hasn't verified this session yet
        setMfaRequired(true);
        setMfaFactorId(verified.id);
      } else {
        setMfaRequired(false);
        setMfaFactorId(null);
      }
    } catch (err) {
      console.warn('[Auth] MFA check failed:', err);
      setMfaRequired(false);
      setMfaFactorId(null);
    }
  }, []);

  // ── Load roles from user_roles table (direct fetch to avoid AbortController) ──

  const getUserAccessProfile = useCallback(async (
    userId: string,
    opts?: { accessToken?: string; email?: string },
  ): Promise<{ roles: AppRole[]; isAdmin: boolean; canAccessDashboard: boolean; queryFailed: boolean }> => {
    const empty = { roles: [] as AppRole[], isAdmin: false, canAccessDashboard: false, queryFailed: false };

    const fetchRoles = async (): Promise<Array<{ role: string; is_active: boolean }> | null> => {
      // Use Supabase client (token from session, user_id never in URL)
      const { data, error } = await supabase
        .from('user_roles')
        .select('role, is_active')
        .eq('user_id', userId)
        .eq('is_active', true);

      if (error) return null;
      return data as Array<{ role: string; is_active: boolean }>;
    };

    let data: Array<{ role: string; is_active: boolean }> | null = null;

    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        data = await fetchRoles();
        if (data !== null) break;
      } catch (err) {
        console.warn('[Auth] fetchRoles error attempt', attempt, err);
      }
      if (attempt === 0) await new Promise((r) => setTimeout(r, 500));
    }

    // Fallback: if query failed or returned empty, check if this is the primary admin email
    // NOTE: removed insecure super_admin grant by email match — roles must come from DB only
    if ((data === null || data.length === 0) && opts?.email && PRIMARY_ADMIN_EMAIL && opts.email.toLowerCase() === PRIMARY_ADMIN_EMAIL.toLowerCase()) {
      console.warn('[Auth] Roles query returned empty/failed for primary admin — use bootstrap_first_admin() to assign role');
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
    (userId: string, access: { roles: AppRole[]; isAdmin: boolean } | undefined | null) => {
      if (!access) {
        console.warn('[Auth] applyAccess called with falsy access — skipping');
        return;
      }
      setRoles(access.roles ?? []);
      setIsAdmin(access.isAdmin ?? false);
      loadedRolesForRef.current = userId;
    },
    [],
  );

  const clearAccess = useCallback(() => {
    setSession(null);
    setUser(null);
    setRoles([]);
    setIsAdmin(false);
    setMfaRequired(false);
    setMfaFactorId(null);
    loadedRolesForRef.current = null;
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

        // If signIn() is handling this flow, skip to avoid race condition
        if (signingInRef.current) return;

        // Always keep session/user references fresh
        setSession(sess);
        setUser(sess?.user ?? null);

        // Token refresh or init not done — just update session, don't reload roles
        if (!initDoneRef.current || event === 'TOKEN_REFRESHED') return;

        // SIGNED_OUT — clear everything
        if (!sess?.user) {
          if (isMounted) clearAccess();
          return;
        }

        // SIGNED_IN — only fetch roles if this is a different user
        // (avoids reload when Supabase re-emits SIGNED_IN for the same session)
        if (loadedRolesForRef.current === sess.user.id) return;

        try {
          const access = await getUserAccessProfile(sess.user.id, {
            accessToken: sess.access_token,
            email: sess.user.email,
          });
          if (isMounted && access) applyAccess(sess.user.id, access);
        } catch (err) {
          console.error('[Auth] onAuthStateChange error:', err);
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
          const access = await getUserAccessProfile(sess.user.id, {
            accessToken: sess.access_token,
            email: sess.user.email,
          });
          if (isMounted) {
            applyAccess(sess.user.id, access);
            await checkMfaRequired(access.roles);
          }
        }
      } catch (err) {
        if (!isAbortError(err)) {
          console.error('[Auth] Error initializing session:', err);
        }
      } finally {
        window.clearTimeout(safetyTimer);
        if (isMounted) { setIsAccessReady(true); setIsLoading(false); }
        initDoneRef.current = true;
      }
    };

    initializeSession();

    return () => {
      isMounted = false;
      window.clearTimeout(safetyTimer);
      subscription.unsubscribe();
    };
  }, [getUserAccessProfile, applyAccess, clearAccess, checkMfaRequired]);

  // ── Sign in (email + password) ────────────────────────────────────────────

  const signIn = useCallback(async (email: string, password: string) => {
    const fail = { isAdmin: false, canAccessDashboard: false, roles: [] as AppRole[] };

    setIsLoading(true);
    setIsAccessReady(false);
    signingInRef.current = true;

    // Clear any stale session before attempting login (prevents refresh-token conflicts)
    try {
      await supabase.auth.signOut({ scope: 'local' });
    } catch { /* ignore — just ensuring clean slate */ }

    let data;
    try {
      const result = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password,
      });
      data = result.data;
      if (result.error) {
        signingInRef.current = false;
        setIsAccessReady(true);
        setIsLoading(false);
        return { error: result.error as Error, ...fail };
      }
    } catch (err) {
      signingInRef.current = false;
      setIsAccessReady(true);
      setIsLoading(false);
      if (isAbortError(err)) return { error: new Error('Pedido cancelado. Tente novamente.'), ...fail };
      return { error: err instanceof Error ? err : new Error(String(err)), ...fail };
    }

    if (!data.user || !data.session) {
      signingInRef.current = false;
      setIsAccessReady(true);
      setIsLoading(false);
      return { error: new Error('Credenciais inválidas.'), ...fail };
    }

    let access = { roles: [] as AppRole[], isAdmin: false, canAccessDashboard: false, queryFailed: false };

    try {
      access = await getUserAccessProfile(data.user.id, {
        accessToken: data.session.access_token,
        email: data.user.email,
      });

      // If no roles found, try bootstrapping the first admin (only succeeds when no admin exists)
      if (access.roles.length === 0 && !access.queryFailed) {
        try {
          const { data: bootstrapped } = await supabase.rpc('bootstrap_first_admin');
          if (bootstrapped) {
            access = await getUserAccessProfile(data.user.id, {
              accessToken: data.session.access_token,
              email: data.user.email,
            });
          }
        } catch (bootstrapErr) {
          console.warn('[Auth] bootstrap_first_admin() failed:', bootstrapErr);
        }
      }

      setSession(data.session);
      setUser(data.user);
      applyAccess(data.user.id, access);
      await checkMfaRequired(access.roles);
    } catch (err) {
      console.error('[Auth] Error after sign-in:', err);
      access = { ...access, queryFailed: true };
    } finally {
      signingInRef.current = false;
      setIsAccessReady(true);
      setIsLoading(false);
    }

    // If the role query failed, don't sign out — return explicit error so UI can show feedback
    if (access.queryFailed) {
      return { error: new Error('Não foi possível verificar permissões. Tente novamente.'), ...fail };
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
  }, [getUserAccessProfile, applyAccess, clearAccess, checkMfaRequired]);

  // ── Sign out ──────────────────────────────────────────────────────────────

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    clearAccess();
  }, [clearAccess]);

  // ── Session idle timeout (disabled — session stays open until manual logout) ─────────────────────────────────────────
  // No automatic idle logout. The Supabase JWT refreshes automatically in the background.

  // ── Render ────────────────────────────────────────────────────────────────

  const contextValue = useMemo<AuthContextType>(() => ({
    user, session, roles, primaryRole,
    isAdmin, isSuperAdmin, canAccessDashboard,
    isLoading, isAccessReady,
    mfaRequired, mfaFactorId,
    hasRole, signIn, signOut, completeMfaChallenge,
  }), [user, session, roles, primaryRole, isAdmin, isSuperAdmin, canAccessDashboard, isLoading, isAccessReady, mfaRequired, mfaFactorId, hasRole, signIn, signOut, completeMfaChallenge]);

  return (
    <AuthContext.Provider value={contextValue}>
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
