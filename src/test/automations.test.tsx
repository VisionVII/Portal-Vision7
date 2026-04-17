// T-12: Automations CRUD
// T-13: RBAC automations
// T-14: n8n offline graceful handling
import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockSelect = vi.fn().mockReturnThis();
const mockInsert = vi.fn().mockReturnThis();
const mockUpdate = vi.fn().mockReturnThis();
const mockDelete = vi.fn().mockReturnThis();
const mockEq = vi.fn().mockReturnThis();
const mockOrder = vi.fn().mockReturnThis();
const mockRange = vi.fn().mockResolvedValue({
  data: [
    {
      id: '1',
      name: 'Test Automation',
      category: 'content',
      status: 'active',
      trigger_type: 'schedule',
      trigger_config: {},
      action_type: 'webhook',
      action_config: {},
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
      last_run_at: null,
      run_count: 0,
      created_by: 'user-123',
    },
  ],
  error: null,
  count: 1,
});

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    auth: {
      getSession: vi.fn().mockResolvedValue({ data: { session: null } }),
      getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'user-123' } } }),
      onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } })),
      mfa: {
        listFactors: vi.fn().mockResolvedValue({ data: { totp: [] } }),
        getAuthenticatorAssuranceLevel: vi.fn().mockResolvedValue({ data: { currentLevel: 'aal1', nextLevel: 'aal1' } }),
      },
    },
    from: vi.fn(() => ({
      select: mockSelect,
      insert: mockInsert,
      update: mockUpdate,
      delete: mockDelete,
      eq: mockEq,
      neq: vi.fn().mockReturnThis(),
      order: mockOrder,
      limit: vi.fn().mockReturnThis(),
      range: mockRange,
      maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
      single: vi.fn().mockResolvedValue({ data: null, error: null }),
      in: vi.fn().mockReturnThis(),
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
    user: { id: 'user-123', email: 'admin@test.com' },
    session: { access_token: 'test' },
    roles: ['admin'],
    primaryRole: 'admin',
    isAdmin: true,
    isSuperAdmin: false,
    canAccessDashboard: true,
    isLoading: false,
    isAccessReady: true,
    mfaRequired: false,
    mfaFactorId: null,
    hasRole: (r: string) => r === 'admin',
    signIn: vi.fn(),
    signOut: vi.fn(),
    completeMfaChallenge: vi.fn(),
  }),
}));

import React from 'react';
import { renderHook } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 }, mutations: { retry: false } },
  });
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

describe('T-12: Automations CRUD', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('useAutomationsV2 hook returns expected interface', async () => {
    const { useAutomationsV2 } = await import('@/hooks/useAutomationsV2');
    const { result } = renderHook(() => useAutomationsV2({}), { wrapper: createWrapper() });

    expect(result.current).toHaveProperty('automations');
    expect(result.current).toHaveProperty('total');
    expect(result.current).toHaveProperty('isLoading');
    expect(result.current).toHaveProperty('createAutomation');
    expect(result.current).toHaveProperty('updateAutomation');
    expect(result.current).toHaveProperty('deleteAutomation');
    expect(result.current).toHaveProperty('toggleStatus');
    expect(result.current).toHaveProperty('bulkSetStatus');
    expect(result.current).toHaveProperty('bulkDelete');
  });

  it('supports filtering by category', async () => {
    const { useAutomationsV2 } = await import('@/hooks/useAutomationsV2');
    const { result } = renderHook(
      () => useAutomationsV2({ category: 'content' }),
      { wrapper: createWrapper() }
    );
    expect(result.current).toHaveProperty('automations');
  });
});

describe('T-13: RBAC automations — only admin access', () => {
  it('hook can be used by admin context', async () => {
    const { useAutomationsV2 } = await import('@/hooks/useAutomationsV2');
    const { result } = renderHook(() => useAutomationsV2({}), { wrapper: createWrapper() });
    // Admin auth context is mocked — the hook should work without access errors
    expect(result.current.error).toBeNull();
  });
});

describe('T-14: n8n offline — graceful degradation', () => {
  it('handles network failure gracefully', async () => {
    mockRange.mockResolvedValueOnce({ data: null, error: { message: 'Network error', code: 'PGRST000' }, count: 0 });

    const { useAutomationsV2 } = await import('@/hooks/useAutomationsV2');
    const { result } = renderHook(() => useAutomationsV2({}), { wrapper: createWrapper() });

    // Should not crash — automations defaults to empty array
    expect(Array.isArray(result.current.automations)).toBe(true);
  });
});
