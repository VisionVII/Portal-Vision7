import { useCallback, useMemo } from 'react';
import { useTheme as useNextTheme } from 'next-themes';
import { useAuth } from '@/contexts/AuthContext';

type ThemeMode = 'light' | 'dark';

export const PER_USER_THEME_KEY_PREFIX = 'vision-ui-theme:user:';

export const useTheme = () => {
  const { theme, resolvedTheme, setTheme: setNextTheme } = useNextTheme();
  const { user } = useAuth();

  const activeTheme = useMemo<ThemeMode>(() => {
    if (resolvedTheme === 'dark' || theme === 'dark') return 'dark';
    return 'light';
  }, [resolvedTheme, theme]);

  // Além de aplicar o tema (chave global do next-themes, "última sessão
  // activa neste browser"), grava também a preferência do próprio
  // utilizador autenticado — para que, ao trocar de conta, cada um receba
  // sempre o seu próprio tema (ver UserThemeSync.tsx), nunca o de outro
  // utilizador nem o de uma sessão anónima.
  const setTheme = useCallback((nextTheme: ThemeMode) => {
    setNextTheme(nextTheme);
    if (user?.id) {
      try {
        localStorage.setItem(PER_USER_THEME_KEY_PREFIX + user.id, nextTheme);
      } catch { /* localStorage indisponível — só não persiste por utilizador */ }
    }
  }, [setNextTheme, user?.id]);

  const toggleTheme = useCallback(() => {
    setTheme(activeTheme === 'light' ? 'dark' : 'light');
  }, [activeTheme, setTheme]);

  return { theme: activeTheme, setTheme, toggleTheme };
};
