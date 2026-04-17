import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export type MFAStatus = 'disabled' | 'enrolled' | 'verified';

interface MFAFactor {
  id: string;
  type: 'totp';
  friendly_name?: string;
  created_at: string;
  updated_at: string;
  status: 'verified' | 'unverified';
}

export function useMFA() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /** List user's enrolled TOTP factors */
  const getFactors = useCallback(async (): Promise<MFAFactor[]> => {
    const { data, error: err } = await supabase.auth.mfa.listFactors();
    if (err) throw new Error(err.message);
    return (data?.totp ?? []) as MFAFactor[];
  }, []);

  /** Check if user has verified MFA */
  const getStatus = useCallback(async (): Promise<MFAStatus> => {
    try {
      const factors = await getFactors();
      if (factors.length === 0) return 'disabled';
      const verified = factors.some((f) => f.status === 'verified');
      return verified ? 'verified' : 'enrolled';
    } catch {
      return 'disabled';
    }
  }, [getFactors]);

  /** Check current Authenticator Assurance Level */
  const getAAL = useCallback(async () => {
    const { data, error: err } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
    if (err) throw new Error(err.message);
    return data;
  }, []);

  /** Enroll a new TOTP factor — returns QR code URI and secret */
  const enroll = useCallback(async (friendlyName?: string) => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: err } = await supabase.auth.mfa.enroll({
        factorType: 'totp',
        friendlyName: friendlyName ?? 'Vision7 Portal',
      });
      if (err) throw new Error(err.message);
      return {
        factorId: data.id,
        qrCode: data.totp.qr_code,
        secret: data.totp.secret,
        uri: data.totp.uri,
      };
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erro ao ativar MFA';
      setError(msg);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  /** Verify a TOTP code to complete enrollment or challenge */
  const verify = useCallback(async (factorId: string, code: string) => {
    setLoading(true);
    setError(null);
    try {
      // Create a challenge first
      const { data: challenge, error: challengeErr } = await supabase.auth.mfa.challenge({
        factorId,
      });
      if (challengeErr) throw new Error(challengeErr.message);

      // Verify the code against the challenge
      const { data, error: verifyErr } = await supabase.auth.mfa.verify({
        factorId,
        challengeId: challenge.id,
        code,
      });
      if (verifyErr) throw new Error(verifyErr.message);
      return data;
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Código inválido';
      setError(msg);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  /** Unenroll (remove) a TOTP factor */
  const unenroll = useCallback(async (factorId: string) => {
    setLoading(true);
    setError(null);
    try {
      const { error: err } = await supabase.auth.mfa.unenroll({ factorId });
      if (err) throw new Error(err.message);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erro ao remover MFA';
      setError(msg);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    loading,
    error,
    getFactors,
    getStatus,
    getAAL,
    enroll,
    verify,
    unenroll,
  };
}
