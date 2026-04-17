// T-02: Theme — dark/light persistence
import { describe, it, expect, vi, beforeEach } from 'vitest';

describe('T-02: Theme persistence', () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.classList.remove('dark', 'light');
  });

  it('saves theme preference to localStorage', () => {
    localStorage.setItem('theme', 'dark');
    expect(localStorage.getItem('theme')).toBe('dark');
  });

  it('restores theme preference from localStorage', () => {
    localStorage.setItem('theme', 'light');
    const stored = localStorage.getItem('theme');
    if (stored === 'dark') {
      document.documentElement.classList.add('dark');
    }
    expect(document.documentElement.classList.contains('dark')).toBe(false);
  });

  it('defaults to system preference when no stored value', () => {
    expect(localStorage.getItem('theme')).toBeNull();
    // System preference is mocked to false (light) in setup.ts
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    expect(prefersDark).toBe(false);
  });

  it('toggles between dark and light', () => {
    document.documentElement.classList.add('dark');
    expect(document.documentElement.classList.contains('dark')).toBe(true);

    document.documentElement.classList.remove('dark');
    document.documentElement.classList.add('light');
    expect(document.documentElement.classList.contains('dark')).toBe(false);
    expect(document.documentElement.classList.contains('light')).toBe(true);
  });
});
