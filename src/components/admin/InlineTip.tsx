import React, { useState } from 'react';
import { ChevronDown } from 'lucide-react';

interface InlineTipProps {
  /** Chave única por área — mantém o estado minimizado/maximizado entre visitas. */
  storageKey: string;
  title?: string;
  children: React.ReactNode;
}

const STORAGE_PREFIX = 'admin-tip-collapsed:';

/** Mini-tutorial inline dispensável ("O que fazer agora"), com minimizar/
 * maximizar persistido em localStorage por área. */
export function InlineTip({ storageKey, title = 'O que fazer agora', children }: InlineTipProps) {
  const [collapsed, setCollapsed] = useState(() => {
    try {
      return localStorage.getItem(STORAGE_PREFIX + storageKey) === 'true';
    } catch {
      return false;
    }
  });

  const toggle = () => {
    setCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(STORAGE_PREFIX + storageKey, String(next));
      } catch { /* localStorage indisponível — só não persiste, não bloqueia */ }
      return next;
    });
  };

  return (
    <div className="rounded-2xl border border-primary/20 bg-primary/5 p-4">
      <button
        type="button"
        onClick={toggle}
        className="flex w-full items-center justify-between gap-2 text-left"
        aria-expanded={!collapsed}
      >
        <span className="text-xs font-semibold text-primary">{title}</span>
        <ChevronDown
          className={`h-3.5 w-3.5 shrink-0 text-primary transition-transform duration-200 ${collapsed ? '' : 'rotate-180'}`}
        />
      </button>
      {!collapsed && (
        <ol className="mt-2 space-y-1 text-xs text-muted-foreground">
          {children}
        </ol>
      )}
    </div>
  );
}
