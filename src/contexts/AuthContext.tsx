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
  isAccessReady: boolean;
  hasRole: (role: AppRole) => boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null; isAdmin: boolean; canAccessDashboard: boolean; roles: AppRole[] }>;
  requestAdminCode: (email: string) => Promise<{ error: Error | null }>;
  verifyAdminCode: (email: string, token: string) => Promise<{ error: Error | null; isAdmin: boolean; canAccessDashboard: boolean; roles: AppRole[] }>;
  sendOtpCode: (email: string) => Promise<{ error: Error | null }>;
  verifyOtpCode: (email: string, token: string) => Promise<{ error: Error | null; isAdmin: boolean; canAccessDashboard: boolean; roles: AppRole[] }>;
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
const AUTH_REQUEST_TIMEOUT_MS = 20000;

const withTimeout = async <T,>(promise: Promise<T>, message: string, timeoutMs = AUTH_REQUEST_TIMEOUT_MS): Promise<T> => {
  let timeoutId: number | undefined;

  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutId = window.setTimeout(() => {
      reject(new Error(message));
    }, timeoutMs);
  });

  try {
    return await Promise.race([promise, timeoutPromise]);
  } finally {
    if (timeoutId) {
      window.clearTimeout(timeoutId);
    }
  }
};

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
  const [isAccessReady, setIsAccessReady] = useState(false);
  const isDevelopment = import.meta.env.DEV;

  const isSuperAdmin = useMemo(() => roles.includes('super_admin'), [roles]);
  const canAccessDashboard = useMemo(
    () => roles.some((role) => ['super_admin', 'admin', 'editor', 'redator', 'moderador', 'analyst'].includes(role)),
    [roles]
  );

  const primaryRole = roles[0] ?? null;

  const hasRole = useCallback((role: AppRole) => roles.includes(role), [roles]);

  const requestCustomCode = useCallback(async (
    email: string,
    timeoutMessage: string,
    scope: 'admin' | 'dashboard',
  ) => {
    const normalizedEmail = email.trim().toLowerCase();
    const deviceFingerprint = await buildDeviceFingerprint();

    const res = await withTimeout(
      fetch(`${SUPABASE_FUNCTIONS_URL}/send-login-code`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${SUPABASE_ANON}`,
          'apikey': SUPABASE_ANON,
          'x-device-fingerprint': deviceFingerprint,
        },
        body: JSON.stringify({ email: normalizedEmail, scope }),
      }),
      timeoutMessage,
    );

    const payload = await res.json().catch(() => null);

    if (!res.ok || payload?.error) {
      return {
        error: new Error(payload?.error || `Erro ${res.status} ao enviar código.`),
      };
    }

    return { error: null };
  }, []);

  const verifyCustomCodeSession = useCallback(async ({
    email,
    token,
    timeoutMessage,
    scope,
  }: {
    email: string;
    token: string;
    timeoutMessage: string;
    scope: 'admin' | 'dashboard';
  }) => {
    const normalizedEmail = email.trim().toLowerCase();
    const normalizedToken = token.trim();
    const deviceFingerprint = await buildDeviceFingerprint();

    const res = await withTimeout(
      fetch(`${SUPABASE_FUNCTIONS_URL}/verify-login-code`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${SUPABASE_ANON}`,
          'apikey': SUPABASE_ANON,
          'x-device-fingerprint': deviceFingerprint,
        },
        body: JSON.stringify({ email: normalizedEmail, code: normalizedToken, scope }),
      }),
      timeoutMessage,
    );

    const payload = await res.json().catch(() => null);

    if (!res.ok || payload?.error) {
      return {
        data: null,
        error: new Error(payload?.error || `Erro ${res.status} ao verificar código.`),
      };
    }

    if (payload?.email_otp || payload?.token_hash) {
      const attempts: Array<() => Promise<{
        data: { user: User | null; session: Session | null };
        error: Error | null;
      }>> = [];

      if (payload?.token_hash) {
        attempts.push(async () => {
          const { data, error } = await withTimeout(
            supabase.auth.verifyOtp({
              token_hash: payload.token_hash,
              type: 'recovery',
            }),
            'A validação da sessão demorou demasiado tempo. Solicite um novo código.',
          );

          return { data, error: error as Error | null };
        });

        attempts.push(async () => {
          const { data, error } = await withTimeout(
            supabase.auth.verifyOtp({
              token_hash: payload.token_hash,
              type: 'email',
            }),
            'A validação da sessão demorou demasiado tempo. Solicite um novo código.',
          );

          return { data, error: error as Error | null };
        });
      }

      if (payload?.email_otp) {
        attempts.push(async () => {
          const { data, error } = await withTimeout(
            supabase.auth.verifyOtp({
              email: normalizedEmail,
              token: payload.email_otp,
              type: 'recovery',
            }),
            'A validação da sessão demorou demasiado tempo. Solicite um novo código.',
          );

          return { data, error: error as Error | null };
        });

        attempts.push(async () => {
          const { data, error } = await withTimeout(
            supabase.auth.verifyOtp({
              email: normalizedEmail,
              token: payload.email_otp,
              type: 'email',
            }),
            'A validação da sessão demorou demasiado tempo. Solicite um novo código.',
          );

          return { data, error: error as Error | null };
        });

        attempts.push(async () => {
          const { data, error } = await withTimeout(
            supabase.auth.verifyOtp({
              email: normalizedEmail,
              token: payload.email_otp,
              type: 'magiclink',
            }),
            'A validação da sessão demorou demasiado tempo. Solicite um novo código.',
          );

          return { data, error: error as Error | null };
        });
      }

      let lastError: Error | null = null;

      for (const attempt of attempts) {
        const { data, error } = await attempt();

        if (!error && data?.user && data?.session) {
          return { data, error: null };
        }

        lastError = error;
      }

      return {
        data: null,
        error: lastError ?? new Error('Não foi possível concluir a sessão. Solicite um novo código.'),
      };
    }

    if (!payload?.access_token || !payload?.refresh_token) {
      return {
        data: null,
        error: new Error('Resposta de autenticação inválida. Solicite um novo código.'),
      };
    }

    const { data, error } = await withTimeout(
      supabase.auth.setSession({
        access_token: payload.access_token,
        refresh_token: payload.refresh_token,
      }),
      'A criação da sessão demorou demasiado tempo. Solicite um novo código.',
    );

    if (error) {
      return { data: null, error: error as Error };
    }

    if (!data?.user || !data?.session) {
      return {
        data: null,
        error: new Error('Não foi possível concluir a sessão. Solicite um novo código.'),
      };
    }

    return { data, error: null };
  }, []);

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

        if (isDevelopment && adminEmail && currentEmail === adminEmail) {
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

    if (bootstrapped) {
      return {
        roles: ['admin'] as AppRole[],
        isAdmin: true,
        canAccessDashboard: true,
      };
    }

    // Last-resort fallback: grant admin access to the designated primary admin email
    // This covers cases where user_roles is empty and bootstrap_first_admin RPC doesn't exist
    const adminPrimaryEmail = (import.meta.env.VITE_ADMIN_PRIMARY_EMAIL as string || '').toLowerCase().trim();
    if (isDevelopment && adminPrimaryEmail) {
      const { data: currentUserData } = await supabase.auth.getUser();
      const currentEmail = currentUserData.user?.email?.toLowerCase().trim();
      if (currentEmail && currentEmail === adminPrimaryEmail) {
        console.warn('[getUserAccessProfile] Granting admin access via primary email fallback for:', currentEmail);
        return {
          roles: ['admin'] as AppRole[],
          isAdmin: true,
          canAccessDashboard: true,
        };
      }
    }

    return {
      roles: [] as AppRole[],
      isAdmin: false,
      canAccessDashboard: false,
    };
  }, [bootstrapFirstAdmin, isDevelopment]);

  useEffect(() => {
    let isMounted = true;
    // Safety net: if auth never settles (DB timeout, RPC hang), unblock after 8s
    const safetyTimer = window.setTimeout(() => {
      if (isMounted) {
        setIsAccessReady(true);
        setIsLoading(false);
      }
    }, 8000);

    // Auth state listener — skip INITIAL_SESSION (handled by initializeSession below)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!isMounted) return;
        // Skip INITIAL_SESSION — initializeSession handles the first load
        if (event === 'INITIAL_SESSION') return;

        setIsAccessReady(false);
        setSession(session);
        setUser(session?.user ?? null);

        try {
          if (session?.user) {
            const access = await getUserAccessProfile(session.user.id);
            if (isMounted) {
              setRoles(access.roles);
              setIsAdmin(access.isAdmin);
              setIsAccessReady(true);
            }
          } else {
            setRoles([]);
            setIsAdmin(false);
            setIsAccessReady(true);
          }
        } catch (error) {
          console.error('Error checking admin role:', error);
          if (isMounted) {
            setRoles([]);
            setIsAdmin(false);
            setIsAccessReady(true);
          }
        }
      }
    );

    // Check for existing session — this is the single source of truth for initial load
    const initializeSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!isMounted) return;

        setIsAccessReady(false);
        setSession(session);
        setUser(session?.user ?? null);

        if (session?.user) {
          const access = await getUserAccessProfile(session.user.id);
          if (isMounted) {
            setRoles(access.roles);
            setIsAdmin(access.isAdmin);
            setIsAccessReady(true);
          }
        } else {
          setRoles([]);
          setIsAdmin(false);
          setIsAccessReady(true);
        }
      } catch (error) {
        console.error('Error initializing session:', error);
        if (isMounted) {
          setRoles([]);
          setIsAdmin(false);
          setIsAccessReady(true);
        }
      } finally {
        window.clearTimeout(safetyTimer);
        if (isMounted) setIsLoading(false);
      }
    };

    initializeSession();

    return () => {
      isMounted = false;
      window.clearTimeout(safetyTimer);
      subscription.unsubscribe();
    };
  }, [getUserAccessProfile]);

  const signIn = async (email: string, password: string) => {
    setIsLoading(true);
    setIsAccessReady(false);

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setIsAccessReady(true);
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
      setIsAccessReady(true);
      setIsLoading(false);
    }

    if (!accessProfile.canAccessDashboard && data.session) {
      await supabase.auth.signOut();
      setSession(null);
      setUser(null);
      setRoles([]);
      setIsAdmin(false);
    }

    return { error: null, isAdmin: accessProfile.isAdmin, canAccessDashboard: accessProfile.canAccessDashboard, roles: accessProfile.roles };
  };

  const requestAdminCode = async (email: string) => {
    setIsLoading(true);
    try {
      const { error } = await requestCustomCode(email, 'O envio do código administrativo expirou. Tente novamente.', 'admin');
      setIsLoading(false);

      if (error) {
        return { error: new Error(error.message) };
      }

      return { error: null };
    } catch (err) {
      setIsLoading(false);
      return { error: err as Error };
    }
  };

  const verifyAdminCode = async (email: string, token: string) => {
    setIsLoading(true);
    setIsAccessReady(false);
    const failResult = { isAdmin: false, canAccessDashboard: false, roles: [] as AppRole[] };

    try {
      const { data: otpSession, error } = await verifyCustomCodeSession({
        email,
        token,
        timeoutMessage: 'A verificação do código administrativo expirou. Tente novamente.',
        scope: 'admin',
      });

      if (error) {
        setIsAccessReady(true);
        setIsLoading(false);
        return { error, ...failResult };
      }

      if (!otpSession?.user || !otpSession?.session) {
        setIsAccessReady(true);
        setIsLoading(false);
        return {
          error: new Error('Não foi possível concluir a sessão administrativa. Solicite um novo código.'),
          ...failResult,
        };
      }

      let accessProfile = {
        roles: [] as AppRole[],
        isAdmin: false,
        canAccessDashboard: false,
      };

      try {
        accessProfile = await getUserAccessProfile(otpSession.user.id);
        setSession(otpSession.session ?? null);
        setUser(otpSession.user ?? null);
        setRoles(accessProfile.roles);
        setIsAdmin(accessProfile.isAdmin);
      } catch (roleError) {
        console.error('Error verifying admin code:', roleError);
        setRoles([]);
        setIsAdmin(false);
      } finally {
        setIsAccessReady(true);
        setIsLoading(false);
      }

      if (!accessProfile.isAdmin && otpSession.session) {
        await supabase.auth.signOut();
        setSession(null);
        setUser(null);
        setRoles([]);
        setIsAdmin(false);
        return {
          error: new Error('O email autenticado não possui privilégio administrativo ativo.'),
          isAdmin: false,
          canAccessDashboard: false,
          roles: [] as AppRole[],
        };
      }

      if (!accessProfile.canAccessDashboard && otpSession.session) {
        await supabase.auth.signOut();
        setSession(null);
        setUser(null);
        setRoles([]);
        setIsAdmin(false);
        return {
          error: new Error('A conta autenticada não tem acesso ativo ao dashboard.'),
          isAdmin: false,
          canAccessDashboard: false,
          roles: [] as AppRole[],
        };
      }

      return { error: null, isAdmin: accessProfile.isAdmin, canAccessDashboard: accessProfile.canAccessDashboard, roles: accessProfile.roles };
    } catch (err) {
      setIsAccessReady(true);
      setIsLoading(false);
      return { error: err as Error, ...failResult };
    }
  };

  // ── Admin OTP via Resend (send-login-code / verify-login-code edge functions) ──
  const sendOtpCode = async (email: string) => {
    setIsLoading(true);

    try {
      const { error } = await requestCustomCode(email, 'O envio do código expirou. Tente novamente.', 'dashboard');
      setIsLoading(false);

      if (error) {
        return { error: new Error(error.message) };
      }

      return { error: null };
    } catch (err) {
      setIsLoading(false);
      return { error: err as Error };
    }
  };

  const verifyOtpCode = async (email: string, token: string) => {
    setIsLoading(true);
    setIsAccessReady(false);
    const failResult = { isAdmin: false, canAccessDashboard: false, roles: [] as AppRole[] };

    try {
      const { data, error } = await verifyCustomCodeSession({
        email,
        token,
        timeoutMessage: 'A verificação do código expirou. Tente novamente.',
        scope: 'dashboard',
      });

      if (error) {
        setIsAccessReady(true);
        setIsLoading(false);
        return { error, ...failResult };
      }

      if (!data?.user || !data?.session) {
        setIsAccessReady(true);
        setIsLoading(false);
        return { error: new Error('Não foi possível criar sessão. Solicite um novo código.'), ...failResult };
      }

      let accessProfile = { roles: [] as AppRole[], isAdmin: false, canAccessDashboard: false };

      try {
        accessProfile = data.user ? await getUserAccessProfile(data.user.id) : accessProfile;
        setSession(data.session ?? null);
        setUser(data.user ?? null);
        setRoles(accessProfile.roles);
        setIsAdmin(accessProfile.isAdmin);

        if (!accessProfile.canAccessDashboard) {
          await supabase.auth.signOut();
          setSession(null);
          setUser(null);
          setRoles([]);
          setIsAdmin(false);
          setIsLoading(false);
          setIsAccessReady(true);
          return {
            error: new Error('A conta autenticada não tem acesso ativo ao dashboard.'),
            isAdmin: false,
            canAccessDashboard: false,
            roles: [] as AppRole[],
          };
        }
      } catch (roleError) {
        console.error('Error loading roles after OTP verify:', roleError);
        setRoles([]);
        setIsAdmin(false);
      } finally {
        setIsAccessReady(true);
        setIsLoading(false);
      }

      return {
        error: null,
        isAdmin: accessProfile.isAdmin,
        canAccessDashboard: accessProfile.canAccessDashboard,
        roles: accessProfile.roles,
      };
    } catch (err) {
      setIsAccessReady(true);
      setIsLoading(false);
      return { error: err as Error, isAdmin: false, canAccessDashboard: false, roles: [] as AppRole[] };
    }
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
    setIsAccessReady(false);
    await supabase.auth.signOut();
    setSession(null);
    setUser(null);
    setRoles([]);
    setIsAdmin(false);
    setIsAccessReady(true);
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
    <AuthContext.Provider value={{ user, session, roles, primaryRole, isAdmin, isSuperAdmin, canAccessDashboard, isLoading, isAccessReady, hasRole, signIn, requestAdminCode, verifyAdminCode, sendOtpCode, verifyOtpCode, signUp, signOut }}>
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
