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
  sendOtpCode: (email: string) => Promise<{ error: Error | null }>;
  verifyOtpCode: (email: string, token: string) => Promise<{ error: Error | null }>;
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
  const isDevelopment = import.meta.env.DEV;

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
      if (isMounted) setIsLoading(false);
    }, 8000);

    // Auth state listener — skip INITIAL_SESSION (handled by initializeSession below)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!isMounted) return;
        // Skip INITIAL_SESSION — initializeSession handles the first load
        if (event === 'INITIAL_SESSION') return;

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
      }
    );

    // Check for existing session — this is the single source of truth for initial load
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
      } catch (error) {
        console.error('Error initializing session:', error);
        if (isMounted) {
          setRoles([]);
          setIsAdmin(false);
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

    // Try custom edge function first; fall back to native Supabase OTP
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

      if (res.ok && !data?.error) {
        return { error: null };
      }

      // Edge function failed — fall back to native Supabase magic link OTP
      console.warn('[requestAdminCode] Edge function failed, falling back to native OTP', res.status, data);
    } catch (err) {
      console.warn('[requestAdminCode] Edge function unreachable, falling back to native OTP:', err);
      setIsLoading(false);
    }

    // Native Supabase OTP fallback (sends 6-digit code)
    const { error: otpError } = await supabase.auth.signInWithOtp({
      email,
      options: { shouldCreateUser: false },
    });

    setIsLoading(false);

    if (otpError) {
      return { error: new Error(otpError.message) };
    }

    return { error: null };
  };

  const verifyAdminCode = async (email: string, token: string) => {
    setIsLoading(true);
    const deviceFingerprint = await buildDeviceFingerprint();
    const failResult = { isAdmin: false, canAccessDashboard: false, roles: [] as AppRole[] };

    let useNativeOtp = false;

    // Step 1: try custom edge function to verify 6-digit code
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
        // If edge function returned 4xx (not a network/server issue), it's a real code error
        if (res.status < 500) {
          setIsLoading(false);
          return { error: new Error(msg), ...failResult };
        }
        // 5xx: edge function is down → fall back to native Supabase OTP
        console.warn('[verifyAdminCode] Edge function 5xx, trying native OTP fallback');
        useNativeOtp = true;
      } else if (verifyData?.error) {
        setIsLoading(false);
        return { error: new Error(verifyData.error), ...failResult };
      }
    } catch (err) {
      console.warn('[verifyAdminCode] Edge function unreachable, trying native OTP:', err);
      useNativeOtp = true;
    }

    let otpSession: { user: import('@supabase/supabase-js').User | null; session: import('@supabase/supabase-js').Session | null } | null = null;

    if (useNativeOtp || !verifyData?.token_hash) {
      // Native Supabase OTP: email + token (6-digit code)
      const { data, error } = await supabase.auth.verifyOtp({
        email,
        token,
        type: 'email',
      });
      if (error) {
        setIsLoading(false);
        return { error: error as Error, ...failResult };
      }
      otpSession = data;
    } else {
      // Exchange edge-function token_hash for a Supabase session
      // Try magiclink first (most common for link-based tokens), then email
      const { data, error } = await supabase.auth.verifyOtp({
        token_hash: verifyData.token_hash,
        type: 'magiclink',
      });
      if (error) {
        // Fallback: try type 'email'
        const { data: data2, error: error2 } = await supabase.auth.verifyOtp({
          token_hash: verifyData.token_hash,
          type: 'email',
        });
        if (error2) {
          setIsLoading(false);
          return { error: error2 as Error, ...failResult };
        }
        otpSession = data2;
      } else {
        otpSession = data;
      }
    }

    let accessProfile = {
      roles: [] as AppRole[],
      isAdmin: false,
      canAccessDashboard: false,
    };

    try {
      accessProfile = otpSession?.user ? await getUserAccessProfile(otpSession.user.id) : accessProfile;
      setSession(otpSession?.session ?? null);
      setUser(otpSession?.user ?? null);
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

  // ── Admin OTP via Resend (send-login-code / verify-login-code edge functions) ──
  const sendOtpCode = async (email: string) => {
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

      if (!res.ok || data?.error) {
        return { error: new Error(data?.error || `Erro ${res.status} ao enviar código.`) };
      }

      return { error: null };
    } catch (err) {
      setIsLoading(false);
      return { error: err as Error };
    }
  };

  const verifyOtpCode = async (email: string, token: string) => {
    setIsLoading(true);
    const deviceFingerprint = await buildDeviceFingerprint();

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

      const verifyData = await res.json().catch(() => null);

      if (!res.ok) {
        setIsLoading(false);
        return { error: new Error(verifyData?.error || `Erro ${res.status} ao verificar código.`) };
      }

      if (verifyData?.error) {
        setIsLoading(false);
        return { error: new Error(verifyData.error) };
      }

      // Exchange token for session — prefer email_otp (raw token) for reliability
      // Fall back to token_hash if email_otp is not available
      let data: { user: import('@supabase/supabase-js').User | null; session: import('@supabase/supabase-js').Session | null } | null = null;

      if (verifyData?.email_otp) {
        const { data: d, error: e } = await supabase.auth.verifyOtp({
          email,
          token: verifyData.email_otp,
          type: 'magiclink',
        });
        if (e) {
          setIsLoading(false);
          return { error: e as Error };
        }
        data = d;
      } else if (verifyData?.token_hash) {
        const { data: d, error: e } = await supabase.auth.verifyOtp({
          token_hash: verifyData.token_hash,
          type: 'magiclink',
        });
        if (e) {
          setIsLoading(false);
          return { error: e as Error };
        }
        data = d;
      } else {
        setIsLoading(false);
        return { error: new Error('Resposta de verificação inválida. Tente novamente.') };
      }

      if (!data?.user || !data?.session) {
        setIsLoading(false);
        return { error: new Error('Não foi possível criar sessão. Solicite um novo código.') };
      }

      let accessProfile = { roles: [] as AppRole[], isAdmin: false, canAccessDashboard: false };

      try {
        accessProfile = data.user ? await getUserAccessProfile(data.user.id) : accessProfile;
        setSession(data.session ?? null);
        setUser(data.user ?? null);
        setRoles(accessProfile.roles);
        setIsAdmin(accessProfile.isAdmin);
      } catch (roleError) {
        console.error('Error loading roles after OTP verify:', roleError);
        setRoles([]);
        setIsAdmin(false);
      } finally {
        setIsLoading(false);
      }

      return { error: null };
    } catch (err) {
      setIsLoading(false);
      return { error: err as Error };
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
    <AuthContext.Provider value={{ user, session, roles, primaryRole, isAdmin, isSuperAdmin, canAccessDashboard, isLoading, hasRole, signIn, requestAdminCode, verifyAdminCode, sendOtpCode, verifyOtpCode, signUp, signOut }}>
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
