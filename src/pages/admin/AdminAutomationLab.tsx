import React, { useEffect, useState } from 'react';
import { ArrowLeft, FlaskConical, ExternalLink, Loader2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

const DEFAULT_N8N_LAB_URL = 'https://n8n-vision7.onrender.com';

function resolveN8nLabBaseUrl() {
  const configured = String(import.meta.env.VITE_N8N_BASE_URL || '').trim();
  const allowLocalhost = String(import.meta.env.VITE_N8N_ALLOW_LOCALHOST || '').trim().toLowerCase() === 'true';
  const candidate = configured || DEFAULT_N8N_LAB_URL;

  try {
    const parsed = new URL(candidate);
    const isLocalTarget = parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1';
    const isMixedContent = typeof window !== 'undefined' && window.location.protocol === 'https:' && parsed.protocol === 'http:';

    // Localhost target is blocked by default to avoid "connection refused" in normal usage.
    // Enable explicitly with VITE_N8N_ALLOW_LOCALHOST=true when running n8n locally.
    if ((isLocalTarget && !allowLocalhost) || isMixedContent) {
      return DEFAULT_N8N_LAB_URL;
    }

    return parsed.toString().replace(/\/$/, '');
  } catch {
    return DEFAULT_N8N_LAB_URL;
  }
}

const N8N_LAB_URL = resolveN8nLabBaseUrl();
const N8N_INTERNAL_URL = '/n8n/';

const AdminAutomationLab: React.FC = () => {
  const [iframeLoaded, setIframeLoaded] = useState(false);
  const [internalReady, setInternalReady] = useState<boolean | null>(null);
  const [showFallback, setShowFallback] = useState(false);
  const [coldStarting, setColdStarting] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('Carregando n8n...');

  useEffect(() => {
    setIframeLoaded(false);
    setShowFallback(false);
    const timer = window.setTimeout(() => {
      setShowFallback(true);
    }, 12000);

    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    let mounted = true;
    let retryCount = 0;
    const MAX_RETRIES = 3;
    
    const checkInternalRoute = async () => {
      try {
        setLoadingMessage('Verificando disponibilidade do n8n...');
        const resp = await fetch('/n8n/rest/login', { method: 'GET', credentials: 'include' });
        if (!mounted) return;
        
        // 503 = Render cold-start
        if (resp.status === 503) {
          setColdStarting(true);
          setLoadingMessage('n8n a iniciar no Render (30-60s)...');
          
          // Retry após 45s
          if (retryCount < MAX_RETRIES) {
            retryCount++;
            setTimeout(() => {
              if (mounted) {
                setLoadingMessage(`Aguardando n8n ficar online (tentativa ${retryCount}/${MAX_RETRIES})...`);
                void checkInternalRoute();
              }
            }, 45000);
          } else {
            setLoadingMessage('n8n ainda a iniciar, mas pode tentar usar o iframe...');
            setInternalReady(true);
            setColdStarting(false);
          }
          return;
        }
        
        // Any non-404 response indicates the internal proxy route exists
        setInternalReady(resp.status !== 404);
        setColdStarting(false);
      } catch {
        if (!mounted) return;
        setInternalReady(false);
      }
    };

    void checkInternalRoute();
    return () => {
      mounted = false;
    };
  }, []);

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_20%_10%,rgba(34,211,238,0.12),transparent_40%),radial-gradient(circle_at_80%_20%,rgba(59,130,246,0.18),transparent_35%),#070f1f] text-white">
      <header className="border-b border-white/10 bg-[#07132a]/80 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <Link to="/admin/dashboard">
              <Button variant="ghost" size="icon" className="text-white hover:bg-white/10 hover:text-white">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
            <div>
              <p className="text-xs uppercase tracking-[0.24em] text-cyan-300">Vision7 Lab</p>
              <h1 className="text-lg font-semibold">Laboratório de Automações</h1>
            </div>
          </div>
          <Button asChild className="gap-2 bg-cyan-500 text-slate-950 hover:bg-cyan-400">
            <a href={N8N_LAB_URL} target="_blank" rel="noreferrer">
              Abrir n8n externo <ExternalLink className="h-4 w-4" />
            </a>
          </Button>
        </div>
      </header>

      <main className="mx-auto max-w-7xl space-y-4 px-4 py-6 sm:px-6 lg:px-8">
        <Card className="border-cyan-300/20 bg-[#081529]/80 text-white">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <FlaskConical className="h-4 w-4 text-cyan-300" />
              n8n interno no portal
            </CardTitle>
            <CardDescription className="text-slate-300">
              Este modo carrega o n8n via rota interna do portal (<strong>/n8n</strong>). Assim evitamos o bloqueio de iframe por <strong>X-Frame-Options: SAMEORIGIN</strong>.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="mb-3 flex flex-wrap gap-2">
              <Button asChild className="gap-2 bg-cyan-500 text-slate-950 hover:bg-cyan-400">
                <a href={N8N_LAB_URL} target="_blank" rel="noreferrer">Abrir ambiente real do n8n <ExternalLink className="h-4 w-4" /></a>
              </Button>
            </div>

            {internalReady === false && (
              <div className="mb-3 rounded-xl border border-amber-300/30 bg-amber-400/10 p-3 text-sm text-amber-100">
                A rota interna <strong>/n8n</strong> não está ativa neste ambiente. Configure o proxy/rewrite do host para <strong>/n8n -&gt; n8n-vision7.onrender.com</strong> e o <strong>N8N_PATH=/n8n</strong> no serviço n8n.
              </div>
            )}

            {showFallback && !iframeLoaded && (
              <div className="mb-3 rounded-xl border border-amber-300/30 bg-amber-400/10 p-3 text-sm text-amber-100">
                O n8n interno não respondeu no tempo esperado. Se a rota interna ainda não estiver ativa no host, use temporariamente o botão externo.
              </div>
            )}

            <div className="relative h-[78vh] overflow-hidden rounded-xl border border-cyan-300/20 bg-black/20">
              {!iframeLoaded && (
                <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-4 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
                  <Loader2 className="h-12 w-12 animate-spin text-cyan-400" />
                  <p className="text-lg font-medium text-cyan-300">{loadingMessage}</p>
                  {coldStarting && (
                    <>
                      <p className="max-w-md text-center text-sm text-slate-400">
                        O n8n está a iniciar no servidor (Render free tier). Isto pode demorar 30-90 segundos na primeira execução.
                      </p>
                      <Button
                        onClick={() => {
                          setIframeLoaded(false);
                          const iframe = document.querySelector('iframe[title="Vision7 Automation Lab"]') as HTMLIFrameElement;
                          if (iframe) {
                            const currentSrc = iframe.getAttribute('src') ?? N8N_INTERNAL_URL;
                            iframe.src = currentSrc;
                          }
                        }}
                        className="mt-2 bg-cyan-500 text-slate-950 hover:bg-cyan-400"
                      >
                        Recarregar iframe
                      </Button>
                    </>
                  )}
                </div>
              )}
              <iframe
                src={N8N_INTERNAL_URL}
                title="Vision7 Automation Lab"
                className="h-full w-full border-0"
                sandbox="allow-same-origin allow-scripts allow-forms allow-popups"
                allow="clipboard-read; clipboard-write"
                onLoad={() => {
                  setIframeLoaded(true);
                  setColdStarting(false);
                }}
                onError={() => {
                  console.warn('[Lab] iframe load error, n8n may still be starting');
                }}
              />
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default AdminAutomationLab;
