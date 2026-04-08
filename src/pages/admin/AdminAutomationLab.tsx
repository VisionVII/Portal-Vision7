import React, { useEffect, useState } from 'react';
import { ArrowLeft, FlaskConical, ExternalLink } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

const N8N_LAB_URL = import.meta.env.VITE_N8N_BASE_URL || 'https://n8n-vision7.onrender.com';
const N8N_LAB_WORKSPACE_URL = `${N8N_LAB_URL.replace(/\/$/, '')}/home/workflows`;

const AdminAutomationLab: React.FC = () => {
  const [iframeLoaded, setIframeLoaded] = useState(false);
  const [showFallback, setShowFallback] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setShowFallback(true);
    }, 12000);

    return () => window.clearTimeout(timer);
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
          <a href={N8N_LAB_WORKSPACE_URL} target="_blank" rel="noreferrer">
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
              Ambiente Vision7 sobre infraestrutura n8n
            </CardTitle>
            <CardDescription className="text-slate-300">
              O shell visual é Vision7. O builder interno é do n8n (infra Render). O laboratório tenta abrir diretamente o workspace do editor; se não existir sessão ativa no n8n, use o botão externo para autenticar e volte depois.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {showFallback && !iframeLoaded && (
              <div className="mb-3 rounded-xl border border-amber-300/30 bg-amber-400/10 p-3 text-sm text-amber-100">
                O editor do n8n ainda não respondeu dentro do esperado. Isto normalmente significa cold start do Render ou falta de sessão no n8n. Abra em separado, autentique-se e volte ao laboratório.
              </div>
            )}
            <div className="h-[78vh] overflow-hidden rounded-xl border border-cyan-300/20 bg-black/20">
              <iframe
                src={N8N_LAB_WORKSPACE_URL}
                title="Vision7 Automation Lab"
                className="h-full w-full border-0"
                sandbox="allow-same-origin allow-scripts allow-forms allow-popups"
                allow="clipboard-read; clipboard-write"
                onLoad={() => setIframeLoaded(true)}
              />
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default AdminAutomationLab;
