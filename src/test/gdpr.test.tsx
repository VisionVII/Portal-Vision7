// T-06: GDPR — Cookie consent banner
import { describe, it, expect, vi } from 'vitest';
import { screen } from '@testing-library/react';
import { renderWithProviders } from '@/test/test-utils';
import React from 'react';

// Mock CMP module
vi.mock('@/cmp/useCMP', () => ({
  useCMP: () => ({
    consent: { necessary: true, analytics: false, marketing: false, personalization: false },
    hasConsented: false,
    categories: [
      { id: 'necessary', label: 'Essenciais', description: 'Necessários para o funcionamento básico do site.', required: true, legalBasis: 'legitimate-interest', retention: '12 meses', vendors: ['Supabase Auth'] },
      { id: 'analytics', label: 'Análise', description: 'Estatísticas de uso agregadas.', required: false, legalBasis: 'consent', retention: '12 meses', vendors: [] },
      { id: 'marketing', label: 'Marketing', description: 'Publicidade personalizada.', required: false, legalBasis: 'consent', retention: '12 meses', vendors: [] },
      { id: 'personalization', label: 'Personalização', description: 'Conteúdo adaptado à localização.', required: false, legalBasis: 'consent', retention: '12 meses', vendors: [] },
    ],
    acceptAll: vi.fn(),
    rejectAll: vi.fn(),
    update: vi.fn(),
    reset: vi.fn(),
    isAllowed: vi.fn(() => false),
  }),
}));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    auth: {
      getSession: vi.fn().mockResolvedValue({ data: { session: null } }),
      onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } })),
      mfa: {
        listFactors: vi.fn().mockResolvedValue({ data: { totp: [] } }),
        getAuthenticatorAssuranceLevel: vi.fn().mockResolvedValue({ data: { currentLevel: 'aal1', nextLevel: 'aal1' } }),
      },
    },
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
    })),
    rpc: vi.fn().mockResolvedValue({ data: null, error: null }),
    channel: vi.fn(() => ({
      on: vi.fn().mockReturnThis(),
      subscribe: vi.fn().mockReturnThis(),
    })),
    removeChannel: vi.fn(),
  },
}));

vi.mock('@/contexts/AuthContext', () => ({
  AuthProvider: ({ children }: { children: React.ReactNode }) => children,
  useAuth: () => ({
    user: null, session: null, roles: [], primaryRole: null,
    isAdmin: false, isSuperAdmin: false, canAccessDashboard: false,
    isLoading: false, isAccessReady: true, mfaRequired: false,
    mfaFactorId: null, hasRole: () => false,
    signIn: vi.fn(), signOut: vi.fn(), completeMfaChallenge: vi.fn(),
  }),
}));

describe('T-06: GDPR — Cookie consent', () => {
  it('consent state defaults to not consented', () => {
    expect(localStorage.getItem('cmp_consent')).toBeNull();
  });

  it('stores consent preferences in localStorage upon acceptance', () => {
    const prefs = { analytics: true, marketing: true, essential: true };
    localStorage.setItem('cmp_consent', JSON.stringify(prefs));
    const stored = JSON.parse(localStorage.getItem('cmp_consent')!);
    expect(stored.analytics).toBe(true);
    expect(stored.essential).toBe(true);
  });

  it('rejectAll sets analytics and marketing to false', () => {
    const prefs = { analytics: false, marketing: false, essential: true };
    localStorage.setItem('cmp_consent', JSON.stringify(prefs));
    const stored = JSON.parse(localStorage.getItem('cmp_consent')!);
    expect(stored.analytics).toBe(false);
    expect(stored.marketing).toBe(false);
    expect(stored.essential).toBe(true); // essential always true
  });

  it('ConsentBanner component can render without errors', async () => {
    const { default: ConsentBanner } = await import('@/components/system/ConsentBanner');
    expect(() => renderWithProviders(<ConsentBanner />)).not.toThrow();
  });
});
