import { useEffect, useRef } from 'react';
import { useTheme as useNextTheme } from 'next-themes';
import { useAuth } from '@/contexts/AuthContext';
import { PER_USER_THEME_KEY_PREFIX } from '@/hooks/useTheme';

/** Garante que o tema (claro/escuro) nunca se mistura entre utilizadores:
 * montado uma única vez em App.tsx (nunca desmonta entre navegações, ao
 * contrário do DashboardHeader/AuthShell onde o toggle vive), por isso
 * consegue seguir a transição completa login → logout → outro login.
 *
 * - Login (ou refresh já autenticado): aplica o tema guardado desse
 *   utilizador, ou 'system' se ainda não tiver nenhum guardado.
 * - Logout: repõe 'system' — não deixa o tema de quem saiu a apanhar o
 *   próximo visitante anónimo ou a próxima conta a entrar.
 */
export function UserThemeSync() {
  const { user } = useAuth();
  const { setTheme } = useNextTheme();
  const lastUserId = useRef<string | null | undefined>(undefined);

  useEffect(() => {
    const userId = user?.id ?? null;
    if (lastUserId.current === userId) return;
    const previousUserId = lastUserId.current;
    lastUserId.current = userId;

    if (userId) {
      const stored = localStorage.getItem(PER_USER_THEME_KEY_PREFIX + userId);
      setTheme(stored === 'light' || stored === 'dark' ? stored : 'system');
    } else if (previousUserId) {
      setTheme('system');
    }
  }, [user?.id, setTheme]);

  return null;
}
