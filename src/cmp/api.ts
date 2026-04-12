/**
 * CMP — API Layer (Supabase integration)
 *
 * Persists consent records to backend asynchronously.
 * Never blocks the UI — fire-and-forget with retry.
 */

import { supabase } from '@/integrations/supabase/client';
import { on, getConsent, getVersion } from '@/cmp';
import type { ConsentState } from '@/cmp';

/**
 * Log a consent record to the backend.
 * Fire-and-forget: does not block UI, silently fails.
 */
async function logConsent(
  consent: ConsentState,
  version: string,
  method: 'banner' | 'preferences' | 'api' = 'banner',
): Promise<void> {
  try {
    const userId = (await supabase.auth.getSession()).data.session?.user?.id ?? 'anon';
    const hostname = window.location.hostname.replace(/^www\./, '');

    // Check domain exists before insert to avoid FK violation (409)
    const { data: domain } = await supabase
      .from('cmp_domains')
      .select('domain')
      .eq('domain', hostname)
      .eq('is_active', true)
      .maybeSingle();

    if (!domain) return;

    await supabase.from('cmp_consent_records').insert({
      user_id: userId,
      domain: hostname,
      consent,
      policy_version: version,
      method,
    });
  } catch {
    // Silent failure — consent UI must never break
  }
}

/**
 * Fetch config for current domain (future: per-domain settings).
 * Returns null if no config found.
 */
export async function fetchDomainConfig(): Promise<{
  domain: string;
  policyVersion: string;
  defaultConsent: ConsentState;
} | null> {
  try {
    const hostname = window.location.hostname.replace(/^www\./, '');
    const { data: domain } = await supabase
      .from('cmp_domains')
      .select('id, domain, settings')
      .eq('domain', hostname)
      .eq('is_active', true)
      .maybeSingle();

    if (!domain) return null;

    const { data: policy } = await supabase
      .from('cmp_policy_versions')
      .select('version, default_consent')
      .eq('domain_id', domain.id)
      .order('effective_date', { ascending: false })
      .limit(1)
      .maybeSingle();

    return {
      domain: domain.domain,
      policyVersion: policy?.version ?? '1.0',
      defaultConsent: (policy?.default_consent as ConsentState) ?? {
        necessary: true,
        analytics: false,
        marketing: false,
        personalization: false,
      },
    };
  } catch {
    return null;
  }
}

/**
 * Initialize the API layer.
 * Listens for consent events and logs them asynchronously.
 */
export function initConsentAPI(): void {
  on('consent:updated', (event) => {
    void logConsent(event.consent, event.version, 'preferences');
  });
}
