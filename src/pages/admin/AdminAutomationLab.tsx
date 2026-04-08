import React, { useEffect, useState } from 'react';
import { ArrowLeft, FlaskConical, ExternalLink } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import AdminAutomationPanel from '@/components/admin/AdminAutomationPanel';

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

const AdminAutomationLab: React.FC = () => {
  const [iframeLoaded, setIframeLoaded] = useState(false);
  const [embedMode, setEmbedMode] = useState(false);
  const [showFallback, setShowFallback] = useState(false);

  useEffect(() => {
    if (!embedMode) return;

    setIframeLoaded(false);
    setShowFallback(false);
    const timer = window.setTimeout(() => {
      setShowFallback(true);
    }, 12000);

    return () => window.clearTimeout(timer);
  }, [embedMode]);

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
          <a href={N8N_LAB_URL} target="_blank" rel="noreferrer">
            <Button className="gap-2 bg-cyan-500 text-slate-950 hover:bg-cyan-400">
              Abrir n8n externo <ExternalLink className="h-4 w-4" />
            </Button>
          </a>
        </div>
      </header>

      <main className="mx-auto max-w-7xl space-y-4 px-4 py-6 sm:px-6 lg:px-8">
        <Card className="border-cyan-300/20 bg-[#081529]/80 text-white">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <FlaskConical className="h-4 w-4 text-cyan-300" />
              Operação interna Vision7
            </CardTitle>
            <CardDescription className="text-slate-300">
              Este modo interno usa a API do n8n via proxy seguro do portal. Funciona mesmo sem sessão ativa na interface web externa do n8n.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <AdminAutomationPanel isActive showLabButton={false} />
          </CardContent>
        </Card>

        <Card className="border-cyan-300/20 bg-[#081529]/80 text-white">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <FlaskConical className="h-4 w-4 text-cyan-300" />
              Interface web do n8n (opcional)
            </CardTitle>
            <CardDescription className="text-slate-300">
              O shell visual é Vision7. O builder interno é do n8n (infra Render). Para uso real, abra o n8n em aba separada. O modo embutido é experimental e pode ser bloqueado pelo browser ou pela política de frame do serviço.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="mb-3 flex flex-wrap gap-2">
              <a href={N8N_LAB_URL} target="_blank" rel="noreferrer">
                <Button className="gap-2 bg-cyan-500 text-slate-950 hover:bg-cyan-400">Abrir ambiente real do n8n <ExternalLink className="h-4 w-4" /></Button>
              </a>
              <Button type="button" variant="outline" className="border-cyan-300/40 text-cyan-100 hover:bg-cyan-400/10" onClick={() => setEmbedMode((v) => !v)}>
                {embedMode ? 'Ocultar modo embutido' : 'Tentar modo embutido (experimental)'}
              </Button>
            </div>

            {!embedMode ? (
              <div className="rounded-xl border border-cyan-300/20 bg-black/20 p-4 text-sm text-slate-200">
                <p className="font-medium text-white">Fluxo recomendado</p>
                <p className="mt-2">1. Abra o ambiente real do n8n no botão acima.</p>
                <p>2. Faça login no n8n (uma vez por sessão).</p>
                <p>3. Volte ao painel Vision7 para gerir chaves, workflows, execução e logs.</p>
              </div>
            ) : (
              <>
                {showFallback && !iframeLoaded && (
                  <div className="mb-3 rounded-xl border border-amber-300/30 bg-amber-400/10 p-3 text-sm text-amber-100">
                    O modo embutido foi bloqueado ou não carregou a tempo. Use o botão "Abrir ambiente real do n8n" para operação normal.
                  </div>
                )}
                <div className="h-[78vh] overflow-hidden rounded-xl border border-cyan-300/20 bg-black/20">
                  <iframe
                    src={N8N_LAB_URL}
                    title="Vision7 Automation Lab"
                    className="h-full w-full border-0"
                    sandbox="allow-same-origin allow-scripts allow-forms allow-popups"
                    allow="clipboard-read; clipboard-write"
                    onLoad={() => setIframeLoaded(true)}
                  />
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default AdminAutomationLab;
