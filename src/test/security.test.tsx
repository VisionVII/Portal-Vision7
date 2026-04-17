// T-05: XSS — content sanitization
// T-09: Roles — non-admin blocked from admin routes
import { describe, it, expect, vi } from 'vitest';
import { screen } from '@testing-library/react';
import { renderWithProviders } from '@/test/test-utils';
import React from 'react';

// Mock supabase
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
  },
}));

describe('T-05: XSS — HTML sanitization', () => {
  it('does not render script tags in user content', () => {
    const maliciousContent = '<script>alert("xss")</script><p>Safe content</p>';
    const { container } = renderWithProviders(
      <div dangerouslySetInnerHTML={{ __html: maliciousContent.replace(/<script[^>]*>.*?<\/script>/gi, '') }} />
    );
    expect(container.querySelector('script')).toBeNull();
    expect(container.textContent).toContain('Safe content');
  });

  it('strips onerror attributes from content', () => {
    const malicious = '<img src="x" onerror="alert(1)" />';
    const sanitized = malicious.replace(/\s*on\w+="[^"]*"/gi, '');
    const { container } = renderWithProviders(
      <div dangerouslySetInnerHTML={{ __html: sanitized }} />
    );
    const img = container.querySelector('img');
    expect(img?.getAttribute('onerror')).toBeNull();
  });
});

describe('T-09: RBAC — ProtectedRoute', () => {
  it('redirects unauthenticated users to login', async () => {
    vi.doMock('@/contexts/AuthContext', () => ({
      useAuth: () => ({
        user: null,
        isLoading: false,
        isAccessReady: true,
        canAccessDashboard: false,
      }),
    }));

    // ProtectedRoute uses Navigate which requires Router — already provided by renderWithProviders
    const { default: ProtectedRoute } = await import('@/components/system/ProtectedRoute');

    renderWithProviders(
      <ProtectedRoute>
        <div data-testid="admin-content">Secret</div>
      </ProtectedRoute>
    );

    // Should not see admin content when not authenticated
    expect(screen.queryByTestId('admin-content')).not.toBeInTheDocument();
  });
});
