import { useEffect, useId, useRef } from 'react';

// Cloudflare Turnstile — loaded via <script>, no npm dependency.
// https://developers.cloudflare.com/turnstile/get-started/client-side-rendering/

declare global {
  interface Window {
    turnstile?: {
      render: (container: string | HTMLElement, options: TurnstileRenderOptions) => string;
      remove: (widgetId: string) => void;
      reset: (widgetId: string) => void;
    };
  }
}

interface TurnstileRenderOptions {
  sitekey: string;
  callback: (token: string) => void;
  'error-callback'?: () => void;
  'expired-callback'?: () => void;
  theme?: 'light' | 'dark' | 'auto';
}

const SCRIPT_SRC = 'https://challenges.cloudflare.com/turnstile/v0/api.js';
let scriptLoadPromise: Promise<void> | null = null;

function loadTurnstileScript(): Promise<void> {
  if (window.turnstile) return Promise.resolve();
  if (scriptLoadPromise) return scriptLoadPromise;

  scriptLoadPromise = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = SCRIPT_SRC;
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Falha ao carregar o Turnstile.'));
    document.head.appendChild(script);
  });
  return scriptLoadPromise;
}

interface CaptchaWidgetProps {
  onVerify: (token: string) => void;
  onExpire?: () => void;
  className?: string;
}

/** Renders a Cloudflare Turnstile challenge and reports the resulting token via onVerify. */
export function CaptchaWidget({ onVerify, onExpire, className }: CaptchaWidgetProps) {
  const containerId = `turnstile-${useId().replace(/:/g, '')}`;
  const widgetIdRef = useRef<string | null>(null);
  const onVerifyRef = useRef(onVerify);
  const onExpireRef = useRef(onExpire);
  onVerifyRef.current = onVerify;
  onExpireRef.current = onExpire;

  const siteKey = import.meta.env.VITE_TURNSTILE_SITE_KEY as string | undefined;

  useEffect(() => {
    if (!siteKey) {
      console.error('[CaptchaWidget] VITE_TURNSTILE_SITE_KEY em falta — o widget não é renderizado.');
      return;
    }

    let cancelled = false;

    loadTurnstileScript()
      .then(() => {
        if (cancelled || !window.turnstile) return;
        const el = document.getElementById(containerId);
        if (!el) return;
        widgetIdRef.current = window.turnstile.render(el, {
          sitekey: siteKey,
          callback: (token) => onVerifyRef.current(token),
          'expired-callback': () => onExpireRef.current?.(),
          theme: 'auto',
        });
      })
      .catch((err) => console.error('[CaptchaWidget]', err));

    return () => {
      cancelled = true;
      if (widgetIdRef.current && window.turnstile) {
        window.turnstile.remove(widgetIdRef.current);
        widgetIdRef.current = null;
      }
    };
  }, [containerId, siteKey]);

  return <div id={containerId} className={className} />;
}
