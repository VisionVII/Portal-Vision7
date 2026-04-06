import { useCallback, useMemo } from 'react';
import { useTheme as useNextTheme } from 'next-themes';

type ThemeMode = 'light' | 'dark';

export const useTheme = () => {
  const { theme, resolvedTheme, setTheme: setNextTheme } = useNextTheme();

  const activeTheme = useMemo<ThemeMode>(() => {
    if (resolvedTheme === 'dark' || theme === 'dark') return 'dark';
    return 'light';
  }, [resolvedTheme, theme]);

  const setTheme = useCallback((nextTheme: ThemeMode) => {
    setNextTheme(nextTheme);
  }, [setNextTheme]);

  const toggleTheme = useCallback(() => {
    setNextTheme(activeTheme === 'light' ? 'dark' : 'light');
  }, [activeTheme, setNextTheme]);

  return { theme: activeTheme, setTheme, toggleTheme };
};
