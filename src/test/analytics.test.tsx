// T-10: Analytics — useTrackEvent hook
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock CMP consent
vi.mock('@/cmp', () => ({
  isAllowed: vi.fn(() => true),
}));

// Mock supabase client
const mockInsert = vi.fn().mockResolvedValue({ error: null });
// Terminal call of the useAnalyticsSummary() chain (select().gte().limit()) —
// distinct mock so each test can control what the query resolves to.
const mockLimit = vi.fn().mockResolvedValue({ data: [], error: null });
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
      insert: mockInsert,
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      gte: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: mockLimit,
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
import { renderHook, act, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useTrackEvent, useAnalyticsSummary } from '@/hooks/useAnalytics';

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

describe('T-10: useTrackEvent', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns a mutate function', () => {
    const { result } = renderHook(() => useTrackEvent(), { wrapper: createWrapper() });
    expect(result.current.mutate).toBeDefined();
    expect(typeof result.current.mutateAsync).toBe('function');
  });

  it('calls supabase insert when tracking an event', async () => {
    const { result } = renderHook(() => useTrackEvent(), { wrapper: createWrapper() });

    await act(async () => {
      await result.current.mutateAsync({
        event_type: 'page_view',
        event_data: { page: '/test' },
      });
    });

    expect(mockInsert).toHaveBeenCalled();
  });

  it('respects CMP consent check', async () => {
    const { isAllowed } = await import('@/cmp');
    (isAllowed as ReturnType<typeof vi.fn>).mockReturnValue(false);

    const { result } = renderHook(() => useTrackEvent(), { wrapper: createWrapper() });

    await act(async () => {
      await result.current.mutateAsync({ event_type: 'test_event' });
    });

    // When consent denied, insert should not be called
    expect(mockInsert).not.toHaveBeenCalled();
  });
});

describe('T-10b: useAnalyticsSummary — QA-002', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('aggregates events by type and groups them by day', async () => {
    mockLimit.mockResolvedValueOnce({
      data: [
        { event_type: 'page_view', created_at: '2026-08-10T10:00:00.000Z' },
        { event_type: 'page_view', created_at: '2026-08-10T11:00:00.000Z' },
        { event_type: 'click', created_at: '2026-08-11T09:00:00.000Z' },
      ],
      error: null,
    });

    const { result } = renderHook(() => useAnalyticsSummary(30), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data?.summary).toEqual({ page_view: 2, click: 1 });
    expect(result.current.data?.dailyData['2026-08-10']).toEqual({ page_view: 2 });
    expect(result.current.data?.dailyData['2026-08-11']).toEqual({ click: 1 });
  });

  it('returns empty aggregates when there are no events in range', async () => {
    mockLimit.mockResolvedValueOnce({ data: [], error: null });

    const { result } = renderHook(() => useAnalyticsSummary(7), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toEqual({ summary: {}, dailyData: {} });
  });

  it('surfaces a query error instead of silently returning empty data', async () => {
    mockLimit.mockResolvedValueOnce({ data: null, error: { message: 'permission denied' } });

    const { result } = renderHook(() => useAnalyticsSummary(30), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});
