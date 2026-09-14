import React, { useEffect, useMemo, useState } from 'react';
import {
  Activity,
  BarChart3,
  CheckCircle2,
  Database,
  FileText,
  GraduationCap,
  Mail,
  Save,
  Server,
  ShieldCheck,
  TerminalSquare,
  Users,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { useSiteSettings, useUpdateSiteSetting } from '@/hooks/useSiteSettings';
import { usePosts } from '@/hooks/usePosts';
import { useCourses } from '@/hooks/useCourses';
import { useNewsletterStats } from '@/hooks/useNewsletter';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

const DEV_NOTES_KEY = 'developer_console_notes';

const DeveloperControlCenter: React.FC = () => {
  const { data: siteSettings } = useSiteSettings({ includePrivate: true });
  const { data: posts = [] } = usePosts(true);
  const { data: courses = [] } = useCourses(true);
  const { data: newsletterStats } = useNewsletterStats();
  const { user, session, isSuperAdmin, roles } = useAuth();
  const updateSetting = useUpdateSiteSetting();
  const { toast } = useToast();
  const [notes, setNotes] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    setNotes(siteSettings?.[DEV_NOTES_KEY] || '');
  }, [siteSettings]);

  const topPosts = useMemo(
    () => [...posts].sort((a, b) => (b.views || 0) - (a.views || 0)).slice(0, 5),
    [posts]
  );

  const publishedPostsCount = useMemo(
    () => posts.filter((p) => p.status === 'published').length,
    [posts]
  );

  const isDbOnline = Object.keys(siteSettings || {}).length > 0;
  const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;

  const handleSaveNotes = async () => {
    setIsSaving(true);
    try {
      await updateSetting.mutateAsync({ key: DEV_NOTES_KEY, value: notes });
      toast({ title: 'Notas técnicas guardadas', description: 'Registo de engenharia atualizado com sucesso.' });
    } catch (error) {
      toast({
        title: 'Erro ao guardar notas',
        description: error instanceof Error ? error.message : 'Não foi possível atualizar as notas técnicas.',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Infrastructure KPI Row */}
      <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 xl:grid-cols-4">
        {/* Database Card */}
        <Card className="border-border/60 shadow-sm">
          <CardContent className="flex items-center gap-3.5 p-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
              <Database className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-medium text-muted-foreground">Base de Dados</p>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className={`h-2 w-2 rounded-full ${isDbOnline ? 'bg-emerald-500 animate-pulse' : 'bg-destructive'}`} />
                <p className="truncate text-sm font-semibold text-foreground">
                  {isDbOnline ? 'Online (Supabase)' : 'Sem conexão'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Server / Host Card */}
        <Card className="border-border/60 shadow-sm">
          <CardContent className="flex items-center gap-3.5 p-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary border border-primary/20">
              <Server className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-medium text-muted-foreground">Ambiente / Host</p>
              <p className="truncate text-sm font-semibold text-foreground mt-0.5">
                {typeof window !== 'undefined' ? window.location.host : 'local'}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* User Session Card */}
        <Card className="border-border/60 shadow-sm">
          <CardContent className="flex items-center gap-3.5 p-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-violet-500/10 text-violet-600 dark:text-violet-400 border border-violet-500/20">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-medium text-muted-foreground">Sessão Autenticada</p>
              <p className="truncate text-sm font-semibold text-foreground mt-0.5" title={user?.email || ''}>
                {user?.email || 'Sem utilizador'}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Connectivity Card */}
        <Card className="border-border/60 shadow-sm">
          <CardContent className="flex items-center gap-3.5 p-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-500/20">
              <Activity className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-medium text-muted-foreground">Rede & Conectividade</p>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className={`h-2 w-2 rounded-full ${isOnline ? 'bg-emerald-500' : 'bg-destructive'}`} />
                <p className="text-sm font-semibold text-foreground">
                  {isOnline ? 'Online (Ativo)' : 'Offline'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Grid: Diagnostics Metrics + Notes */}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
        {/* Content & Infra Snapshot */}
        <Card className="border-border/60 shadow-sm">
          <CardHeader className="pb-3 border-b border-border/40">
            <CardTitle className="flex items-center gap-2 text-base font-semibold">
              <BarChart3 className="h-4 w-4 text-primary" />
              Snapshot Operacional do Sistema
            </CardTitle>
            <CardDescription className="text-xs text-muted-foreground">
              Métricas consolidadas de entidades do banco, performance e integridade de sessão.
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-4 space-y-4">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div className="rounded-xl border border-border/60 bg-muted/20 p-3.5 space-y-1">
                <div className="flex items-center justify-between text-muted-foreground">
                  <span className="text-xs font-medium">Artigos</span>
                  <FileText className="h-3.5 w-3.5" />
                </div>
                <p className="text-2xl font-bold tracking-tight text-foreground">{posts.length}</p>
                <p className="text-[10px] text-muted-foreground">{publishedPostsCount} publicados</p>
              </div>

              <div className="rounded-xl border border-border/60 bg-muted/20 p-3.5 space-y-1">
                <div className="flex items-center justify-between text-muted-foreground">
                  <span className="text-xs font-medium">Parcerias</span>
                  <GraduationCap className="h-3.5 w-3.5" />
                </div>
                <p className="text-2xl font-bold tracking-tight text-foreground">{courses.length}</p>
                <p className="text-[10px] text-muted-foreground">Cursos & afiliados</p>
              </div>

              <div className="rounded-xl border border-border/60 bg-muted/20 p-3.5 space-y-1">
                <div className="flex items-center justify-between text-muted-foreground">
                  <span className="text-xs font-medium">Newsletter</span>
                  <Mail className="h-3.5 w-3.5" />
                </div>
                <p className="text-2xl font-bold tracking-tight text-foreground">{newsletterStats?.total || 0}</p>
                <p className="text-[10px] text-muted-foreground">Subscritores ativos</p>
              </div>
            </div>

            <div className="rounded-xl border border-border/60 bg-muted/30 p-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-foreground">Detalhes da Sessão Atual</span>
                <Badge variant="outline" className="text-[10px]">
                  {isSuperAdmin ? 'Super Admin' : roles[0] || 'Admin'}
                </Badge>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-muted-foreground pt-1">
                <div>
                  <span className="text-foreground/70">ID:</span>{' '}
                  <span className="font-mono text-[11px]">{user?.id ? `${user.id.slice(0, 16)}…` : '—'}</span>
                </div>
                <div>
                  <span className="text-foreground/70">Estado:</span>{' '}
                  <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                    {session ? 'Sessão JWT ativa' : 'Inativa'}
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Developer Technical Notes */}
        <Card className="border-border/60 shadow-sm flex flex-col">
          <CardHeader className="pb-3 border-b border-border/40">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-base font-semibold">
                <TerminalSquare className="h-4 w-4 text-primary" />
                Notas Técnicas
              </CardTitle>
              <Badge variant="secondary" className="text-[10px] font-mono">
                site_settings
              </Badge>
            </div>
            <CardDescription className="text-xs text-muted-foreground">
              Bloco de apontamentos persistido na base de dados para a equipa de engenharia.
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-4 flex-1 flex flex-col space-y-3">
            <Textarea
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              className="min-h-[140px] flex-1 text-xs font-mono resize-none leading-relaxed"
              placeholder="Ex.: checkpoints de migrações, IDs de testes, notas de performance de edge functions..."
            />
            <Button
              onClick={handleSaveNotes}
              disabled={isSaving}
              size="sm"
              className="gap-2 text-xs font-medium self-end"
            >
              <Save className="h-3.5 w-3.5" />
              {isSaving ? 'A guardar…' : 'Guardar notas'}
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Top 5 Most Viewed Posts Ranking */}
      <Card className="border-border/60 shadow-sm">
        <CardHeader className="pb-3 border-b border-border/40">
          <CardTitle className="text-base font-semibold">Ranking de Leituras do Acervo</CardTitle>
          <CardDescription className="text-xs text-muted-foreground">
            Os 5 artigos com maior engajamento orgânico registados pelo contador de views.
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-4 space-y-2">
          {topPosts.length === 0 ? (
            <p className="py-6 text-center text-xs text-muted-foreground">
              Ainda não existem métricas suficientes para ranquear os posts.
            </p>
          ) : (
            topPosts.map((post, index) => {
              const rankBadgeColors = [
                'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',
                'bg-slate-500/10 text-slate-600 dark:text-slate-300 border-slate-500/20',
                'bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20',
              ];
              const rankClass = rankBadgeColors[index] || 'bg-muted text-muted-foreground border-border/40';

              return (
                <div
                  key={post.id}
                  className="flex items-center justify-between gap-3 rounded-xl border border-border/60 bg-card p-3 transition-all hover:border-border"
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <span
                      className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border text-xs font-bold font-mono ${rankClass}`}
                    >
                      #{index + 1}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-foreground">{post.title}</p>
                      <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                        <span className="capitalize">{post.status}</span>
                        {post.read_time && (
                          <>
                            <span>•</span>
                            <span>{post.read_time}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                  <span className="rounded-full bg-primary/10 border border-primary/20 px-3 py-1 font-mono text-xs font-semibold text-primary">
                    {post.views || 0} views
                  </span>
                </div>
              );
            })
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default DeveloperControlCenter;
