/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase, SUPABASE_FUNCTIONS_URL, SUPABASE_ANON } from '@/integrations/supabase/client';
import { Enums } from '@/integrations/supabase/types';

type AppRole = Enums<'app_role'>;

interface AuthContextType {
  user: User | null;
  session: Session | null;
  roles: AppRole[];
  primaryRole: AppRole | null;
  isAdmin: boolean;
  isSuperAdmin: boolean;
  canAccessDashboard: boolean;
  isLoading: boolean;
  hasRole: (role: AppRole) => boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null; isAdmin: boolean; canAccessDashboard: boolean; roles: AppRole[] }>;
  requestAdminCode: (email: string) => Promise<{ error: Error | null }>;
  verifyAdminCode: (email: string, token: string) => Promise<{ error: Error | null; isAdmin: boolean; canAccessDashboard: boolean; roles: AppRole[] }>;
  signUp: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const isSchemaMissingError = (error: unknown) => {
  const message = typeof error === 'object' && error !== null && 'message' in error
    ? String((error as { message?: string }).message)
    : error instanceof Error
      ? error.message
      : String(error ?? '');

  return /PGRST205|user_roles|schema cache|does not exist/i.test(message);
};

const SESSION_IDLE_TIMEOUT_MS = 30 * 60 * 1000;

const buildDeviceFingerprint = async () => {
  const base = [
    navigator.userAgent,
    navigator.language,
    Intl.DateTimeFormat().resolvedOptions().timeZone,
    String(screen.width),
    String(screen.height),
  ].join('|');

  const encoded = new TextEncoder().encode(base);
  const digest = await crypto.subtle.digest('SHA-256', encoded);
  return Array.from(new Uint8Array(digest)).map((byte) => byte.toString(16).padStart(2, '0')).join('');
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [roles, setRoles] = useState<AppRole[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const isSuperAdmin = useMemo(() => roles.includes('super_admin'), [roles]);
  const canAccessDashboard = useMemo(
    () => roles.some((role) => ['super_admin', 'admin', 'editor', 'redator', 'moderador', 'analyst'].includes(role)),
    [roles]
  );

  const primaryRole = roles[0] ?? null;

  const hasRole = useCallback((role: AppRole) => roles.includes(role), [roles]);

  const bootstrapFirstAdmin = useCallback(async () => {
    const { data, error } = await supabase.rpc('bootstrap_first_admin');

    if (error) {
      if (/bootstrap_first_admin|schema cache|does not exist|PGRST202/i.test(error.message)) {
        console.warn('Bootstrap admin RPC not available yet:', error.message);
        return false;
      }

      console.error('Error bootstrapping first admin:', error);
      return false;
    }

    return !!data;
  }, []);

  const getUserAccessProfile = useCallback(async (userId: string) => {
    const { data, error } = await supabase
      .from('user_roles')
      .select('role, is_active, expires_at')
      .eq('user_id', userId)
      .eq('is_active', true);

    if (error) {
      if (isSchemaMissingError(error)) {
        const adminEmail = (import.meta.env.VITE_ADMIN_PRIMARY_EMAIL || '').toLowerCase();
        const currentEmail = (await supabase.auth.getUser()).data.user?.email?.toLowerCase();

        if (adminEmail && currentEmail === adminEmail) {
          console.warn('Schema not initialized. Bootstrap admin granted to primary admin email.');
          return {
            roles: ['admin'] as AppRole[],
            isAdmin: true,
            canAccessDashboard: true,
          };
        }

        console.warn('Schema not initialized. Access denied — only primary admin email can bootstrap.');
        return {
          roles: [] as AppRole[],
          isAdmin: false,
          canAccessDashboard: false,
        };
      }

      console.error('Error checking user roles:', error);
      return {
        roles: [] as AppRole[],
        isAdmin: false,
        canAccessDashboard: false,
      };
    }

    const activeRoles = Array.from(new Set((data ?? []).map((entry) => entry.role as AppRole).filter(Boolean)));

    if (activeRoles.length > 0) {
      return {
        roles: activeRoles,
        isAdmin: activeRoles.includes('admin') || activeRoles.includes('super_admin'),
        canAccessDashboard: true,
      };
    }

    const bootstrapped = await bootstrapFirstAdmin();

    return {
      roles: bootstrapped ? (['admin'] as AppRole[]) : ([] as AppRole[]),
      isAdmin: bootstrapped,
      canAccessDashboard: bootstrapped,
    };
  }, [bootstrapFirstAdmin]);

  useEffect(() => {
    let isMounted = true;
    
    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!isMounted) return;
        
        setSession(session);
        setUser(session?.user ?? null);
        
        try {
          if (session?.user) {
            const access = await getUserAccessProfile(session.user.id);
            if (isMounted) {
              setRoles(access.roles);
              setIsAdmin(access.isAdmin);
            }
          } else {
            setRoles([]);
            setIsAdmin(false);
          }
        } catch (error) {
          console.error('Error checking admin role:', error);
          if (isMounted) {
            setRoles([]);
            setIsAdmin(false);
          }
        }
        
        if (isMounted) setIsLoading(false);
      }
    );

    // Check for existing session
    const initializeSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!isMounted) return;
        
        setSession(session);
        setUser(session?.user ?? null);
        
        if (session?.user) {
          const access = await getUserAccessProfile(session.user.id);
          if (isMounted) {
            setRoles(access.roles);
            setIsAdmin(access.isAdmin);
          }
        } else {
          setRoles([]);
          setIsAdmin(false);
        }
        
        if (isMounted) setIsLoading(false);
      } catch (error) {
        console.error('Error initializing session:', error);
        if (isMounted) setIsLoading(false);
      }
    };

    initializeSession();

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [getUserAccessProfile]);

  const signIn = async (email: string, password: string) => {
    setIsLoading(true);

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setIsLoading(false);
      return { error: error as Error | null, isAdmin: false, canAccessDashboard: false, roles: [] as AppRole[] };
    }

    let accessProfile = {
      roles: [] as AppRole[],
      isAdmin: false,
      canAccessDashboard: false,
    };

    try {
      accessProfile = data.user ? await getUserAccessProfile(data.user.id) : accessProfile;
      setSession(data.session ?? null);
      setUser(data.user ?? null);
      setRoles(accessProfile.roles);
      setIsAdmin(accessProfile.isAdmin);
    } catch (roleError) {
      console.error('Error finalizing sign in:', roleError);
      setRoles([]);
      setIsAdmin(false);
    } finally {
      setIsLoading(false);
    }

    return { error: null, isAdmin: accessProfile.isAdmin, canAccessDashboard: accessProfile.canAccessDashboard, roles: accessProfile.roles };
  };

  const requestAdminCode = async (email: string) => {
    setIsLoading(true);
    const deviceFingerprint = await buildDeviceFingerprint();

    try {
      const res = await fetch(`${SUPABASE_FUNCTIONS_URL}/send-login-code`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${SUPABASE_ANON}`,
          'apikey': SUPABASE_ANON,
          'x-device-fingerprint': deviceFingerprint,
        },
        body: JSON.stringify({ email }),
      });

      const data = await res.json().catch(() => null);

      setIsLoading(false);

      if (!res.ok) {
        const msg = data?.error || `Erro ${res.status} ao enviar código.`;
        console.error('[requestAdminCode]', res.status, data);
        return { error: new Error(msg) };
      }

      if (data?.error) return { error: new Error(data.error) };

      return { error: null };
    } catch (err) {
      setIsLoading(false);
      console.error('[requestAdminCode] Network error:', err);
      return { error: new Error('Erro de rede ao contactar o servidor. Verifique a ligação.') };
    }
  };

  const verifyAdminCode = async (email: string, token: string) => {
    setIsLoading(true);
    const deviceFingerprint = await buildDeviceFingerprint();
    const failResult = { isAdmin: false, canAccessDashboard: false, roles: [] as AppRole[] };

    // Step 1: verify the custom 6-digit code via Edge Function
    let verifyData: { token_hash?: string; error?: string } | null = null;
    try {
      const res = await fetch(`${SUPABASE_FUNCTIONS_URL}/verify-login-code`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${SUPABASE_ANON}`,
          'apikey': SUPABASE_ANON,
          'x-device-fingerprint': deviceFingerprint,
        },
        body: JSON.stringify({ email, code: token }),
      });

      verifyData = await res.json().catch(() => null);

      if (!res.ok) {
        const msg = verifyData?.error || `Erro ${res.status} ao verificar código.`;
        console.error('[verifyAdminCode]', res.status, verifyData);
        setIsLoading(false);
        return { error: new Error(msg), ...failResult };
      }
    } catch (err) {
      console.error('[verifyAdminCode] Network error:', err);
      setIsLoading(false);
      return { error: new Error('Erro de rede ao contactar o servidor.'), ...failResult };
    }

    if (verifyData?.error) {
      setIsLoading(false);
      return { error: new Error(verifyData.error), ...failResult };
    }

    if (!verifyData?.token_hash) {
      setIsLoading(false);
      return { error: new Error('Resposta inválida do servidor.'), ...failResult };
    }

    // Step 2: exchange the hashed token for a real Supabase session
    const { data, error } = await supabase.auth.verifyOtp({
      token_hash: verifyData.token_hash,
      type: 'email',
    });

    if (error) {
      setIsLoading(false);
      return { error: error as Error | null, isAdmin: false, canAccessDashboard: false, roles: [] as AppRole[] };
    }

    let accessProfile = {
      roles: [] as AppRole[],
      isAdmin: false,
      canAccessDashboard: false,
    };

    try {
      accessProfile = data.user ? await getUserAccessProfile(data.user.id) : accessProfile;
      setSession(data.session ?? null);
      setUser(data.user ?? null);
      setRoles(accessProfile.roles);
      setIsAdmin(accessProfile.isAdmin);
    } catch (roleError) {
      console.error('Error verifying admin code:', roleError);
      setRoles([]);
      setIsAdmin(false);
    } finally {
      setIsLoading(false);
    }

    return { error: null, isAdmin: accessProfile.isAdmin, canAccessDashboard: accessProfile.canAccessDashboard, roles: accessProfile.roles };
  };

  const signUp = async (email: string, password: string) => {
    const redirectUrl = `${window.location.origin}/`;
    
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
      },
    });
    return { error: error as Error | null };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setRoles([]);
    setIsAdmin(false);
  };

  useEffect(() => {
    if (!session) return;

    let timeout: number;

    const resetTimer = () => {
      window.clearTimeout(timeout);
      timeout = window.setTimeout(() => {
        void signOut();
      }, SESSION_IDLE_TIMEOUT_MS);
    };

    const trackedEvents: Array<keyof WindowEventMap> = [
      'mousemove',
      'mousedown',
      'keydown',
      'scroll',
      'touchstart',
      'click',
    ];

    trackedEvents.forEach((eventName) => window.addEventListener(eventName, resetTimer, { passive: true }));
    resetTimer();

    return () => {
      window.clearTimeout(timeout);
      trackedEvents.forEach((eventName) => window.removeEventListener(eventName, resetTimer));
    };
  }, [session]);

  return (
    <AuthContext.Provider value={{ user, session, roles, primaryRole, isAdmin, isSuperAdmin, canAccessDashboard, isLoading, hasRole, signIn, requestAdminCode, verifyAdminCode, signUp, signOut }}>
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
