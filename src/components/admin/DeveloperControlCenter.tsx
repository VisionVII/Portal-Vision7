import React, { useEffect, useMemo, useState } from 'react';
import { Activity, BarChart3, Database, Mail, Server, ShieldAlert, TerminalSquare } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useSiteSettings, useUpdateSiteSetting } from '@/hooks/useSiteSettings';
import { usePosts } from '@/hooks/usePosts';
import { useCourses } from '@/hooks/useCourses';
import { useAudiocasts } from '@/hooks/useAudiocasts';
import { useNewsletterStats } from '@/hooks/useNewsletter';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

const DEV_NOTES_KEY = 'developer_console_notes';
const env = import.meta.env as Record<string, string | undefined>;
const primaryAdminEmail = env.VITE_ADMIN_PRIMARY_EMAIL || 'admin@vision7.pt';

const DeveloperControlCenter = () => {
  const { data: siteSettings } = useSiteSettings({ includePrivate: true });
  const { data: posts = [] } = usePosts(true);
  const { data: courses = [] } = useCourses(true);
  const { data: audiocasts = [] } = useAudiocasts(true);
  const { data: newsletterStats } = useNewsletterStats();
  const { user, session } = useAuth();
  const updateSetting = useUpdateSiteSetting();
  const { toast } = useToast();
  const [notes, setNotes] = useState('');

  useEffect(() => {
    setNotes(siteSettings?.[DEV_NOTES_KEY] || '');
  }, [siteSettings]);

  const topPosts = useMemo(
    () => [...posts].sort((a, b) => (b.views || 0) - (a.views || 0)).slice(0, 5),
    [posts]
  );

  const infraCards = [
    {
      label: 'Base de dados',
      value: Object.keys(siteSettings || {}).length > 0 ? 'Online' : 'Verificar seed',
      icon: Database,
    },
    {
      label: 'Servidor / host',
      value: typeof window !== 'undefined' ? window.location.host : 'local',
      icon: Server,
    },
    {
      label: 'Sessão autenticada',
      value: user?.email || 'Sem utilizador',
      icon: ShieldAlert,
    },
    {
      label: 'Email principal',
      value: primaryAdminEmail,
      icon: Mail,
    },
    {
      label: 'Conectividade',
      value: typeof navigator !== 'undefined' ? (navigator.onLine ? 'Online' : 'Offline') : 'Online',
      icon: Activity,
    },
  ];

  const handleSaveNotes = async () => {
    try {
      await updateSetting.mutateAsync({ key: DEV_NOTES_KEY, value: notes });
      toast({ title: 'Notas técnicas salvas', description: 'O espaço do desenvolvedor foi atualizado.' });
    } catch (error) {
      toast({
        title: 'Erro ao salvar notas',
        description: error instanceof Error ? error.message : 'Não foi possível atualizar as notas técnicas.',
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        {infraCards.map((item) => {
          const Icon = item.icon;
          return (
            <Card key={item.label}>
              <CardContent className="flex items-center gap-4 p-5">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-50 text-primary-700 dark:bg-primary-900/30 dark:text-primary-300">
                  <Icon className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">{item.label}</p>
                  <p className="font-semibold text-foreground">{item.value}</p>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <BarChart3 className="h-4 w-4 text-primary-600" />
              Diagnóstico de conteúdo e infra
            </CardTitle>
            <CardDescription>
              Snapshot operacional para desenvolvimento, performance editorial e saúde do portal.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="rounded-xl border border-border p-4">
                <p className="text-sm text-muted-foreground">Posts carregados</p>
                <p className="text-2xl font-bold text-foreground">{posts.length}</p>
              </div>
              <div className="rounded-xl border border-border p-4">
                <p className="text-sm text-muted-foreground">Cursos/parcerias</p>
                <p className="text-2xl font-bold text-foreground">{courses.length}</p>
              </div>
              <div className="rounded-xl border border-border p-4">
                <p className="text-sm text-muted-foreground">Audiocasts</p>
                <p className="text-2xl font-bold text-foreground">{audiocasts.length}</p>
              </div>
              <div className="rounded-xl border border-border p-4">
                <p className="text-sm text-muted-foreground">CRM / newsletter</p>
                <p className="text-2xl font-bold text-foreground">{newsletterStats?.total || 0}</p>
              </div>
            </div>

            <div className="rounded-xl border border-border bg-muted/20 p-4">
              <p className="text-sm font-semibold text-foreground">Sessão atual</p>
              <p className="mt-1 text-sm text-muted-foreground">User: {user?.email || 'sem autenticação'} </p>
              <p className="text-sm text-muted-foreground">Estado: {session ? 'sessão ativa e protegida' : 'n/d'}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <TerminalSquare className="h-4 w-4 text-secondary-500" />
              Notas do desenvolvedor
            </CardTitle>
            <CardDescription>
              Área para observações técnicas, checkpoints de deploy, DB e tuning do servidor.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Textarea
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              className="min-h-[180px]"
              placeholder="Ex.: revisar índices do Supabase, preparar novo bucket, monitorar payloads pesados e chunks do build."
            />
            <Button onClick={handleSaveNotes}>Guardar notas</Button>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Ranking técnico de posts mais vistos</CardTitle>
          <CardDescription>
            Lista ordenada por visualizações para suportar a vitrine “Mais Populares” no portal.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {topPosts.length === 0 ? (
            <p className="text-sm text-muted-foreground">Ainda não existem métricas suficientes para ranquear os posts.</p>
          ) : topPosts.map((post, index) => (
            <div key={post.id} className="flex items-center justify-between rounded-xl border border-border p-3">
              <div>
                <p className="font-medium text-foreground">#{index + 1} • {post.title}</p>
                <p className="text-xs text-muted-foreground">{post.status} • {post.read_time}</p>
              </div>
              <span className="rounded-full bg-primary-50 px-3 py-1 text-xs font-semibold text-primary-700 dark:bg-primary-900/30 dark:text-primary-300">
                {post.views || 0} views
              </span>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
};

export default DeveloperControlCenter;
