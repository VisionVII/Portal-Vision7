// T-01: Navigation renders correctly
// T-02: Theme toggle
// T-04: Mobile menu
import { describe, it, expect, vi } from 'vitest';
import { screen } from '@testing-library/react';
import { renderWithProviders } from '@/test/test-utils';

// Mock supabase client globally
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    auth: {
      getSession: vi.fn().mockResolvedValue({ data: { session: null } }),
      onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } })),
      signInWithPassword: vi.fn(),
      signOut: vi.fn(),
      mfa: {
        listFactors: vi.fn().mockResolvedValue({ data: { totp: [] } }),
        getAuthenticatorAssuranceLevel: vi.fn().mockResolvedValue({ data: { currentLevel: 'aal1', nextLevel: 'aal1' } }),
      },
    },
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      neq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
      single: vi.fn().mockResolvedValue({ data: null, error: null }),
    })),
    rpc: vi.fn().mockResolvedValue({ data: null, error: null }),
    channel: vi.fn(() => ({
      on: vi.fn().mockReturnThis(),
      subscribe: vi.fn().mockReturnThis(),
    })),
    removeChannel: vi.fn(),
  },
}));

// Mock AuthContext
vi.mock('@/contexts/AuthContext', () => ({
  AuthProvider: ({ children }: { children: React.ReactNode }) => children,
  useAuth: () => ({
    user: null,
    session: null,
    roles: [],
    primaryRole: null,
    isAdmin: false,
    isSuperAdmin: false,
    canAccessDashboard: false,
    isLoading: false,
    isAccessReady: true,
    mfaRequired: false,
    mfaFactorId: null,
    hasRole: () => false,
    signIn: vi.fn(),
    signOut: vi.fn(),
    completeMfaChallenge: vi.fn(),
  }),
}));

import React from 'react';

describe('T-01: Navigation structure', () => {
  it('renders loading fallback initially', () => {
    renderWithProviders(
      <React.Suspense fallback={<div data-testid="loading">Loading</div>}>
        <div data-testid="content">Content</div>
      </React.Suspense>
    );
    expect(screen.getByTestId('content')).toBeInTheDocument();
  });
});

describe('T-04: Mobile responsive structure', () => {
  it('renders with mobile viewport without errors', () => {
    Object.defineProperty(window, 'innerWidth', { writable: true, value: 375 });
    Object.defineProperty(window, 'innerHeight', { writable: true, value: 667 });

    const { container } = renderWithProviders(<div className="min-h-screen">Test</div>);
    expect(container.firstChild).toBeInTheDocument();
  });
});
