import React, { useMemo, useState, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Mail, Users, UserCheck, Download, MoreVertical, Send, UserX, UserPlus, Trash2 } from 'lucide-react';
import {
  useNewsletterSubscribers,
  useNewsletterStats,
  useToggleSubscriber,
  useDeleteSubscriber,
  useSendNewsletterDigest,
} from '@/hooks/useNewsletter';
import type { NewsletterSubscriber } from '@/hooks/useNewsletter';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { pt } from 'date-fns/locale';

/* ---- CSV Export ---- */
function exportSubscribersCSV(subscribers: NewsletterSubscriber[]) {
  const header = 'email,estado,data_subscricao\n';
  const rows = subscribers.map(
    (s) =>
      `${s.email},${s.is_active ? 'ativo' : 'inativo'},${format(new Date(s.subscribed_at), 'yyyy-MM-dd')}`,
  );
  const csv = header + rows.join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `subscritores_newsletter_${format(new Date(), 'yyyy-MM-dd')}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

/* ---- Campaign Panel ---- */
const CampaignPanel: React.FC<{ activeCount: number }> = ({ activeCount }) => {
  const [subject, setSubject] = useState('');
  const [previewText, setPreviewText] = useState('');
  const sendDigest = useSendNewsletterDigest();
  const { toast } = useToast();

  const handleSend = async () => {
    if (!subject.trim()) {
      toast({ title: 'Assunto obrigatório', variant: 'destructive' });
      return;
    }
    try {
      const result = await sendDigest.mutateAsync({ subject: subject.trim(), previewText: previewText.trim() || undefined });
      toast({
        title: 'Campanha enviada',
        description: `${result.sent} enviados, ${result.failed} falhados de ${result.total} subscritores.`,
      });
      setSubject('');
      setPreviewText('');
    } catch (err) {
      toast({
        title: 'Erro ao enviar campanha',
        description: err instanceof Error ? err.message : 'Falha no envio.',
        variant: 'destructive',
      });
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Send className="h-4 w-4" />
          Enviar Newsletter
        </CardTitle>
        <CardDescription>Enviar digest para {activeCount} subscritores ativos</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="space-y-1.5">
          <Label htmlFor="campaign-subject" className="text-xs">Assunto</Label>
          <Input
            id="campaign-subject"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="Ex: Novidades da semana — Vision7"
            maxLength={200}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="campaign-preview" className="text-xs">Texto de pré-visualização (opcional)</Label>
          <Textarea
            id="campaign-preview"
            value={previewText}
            onChange={(e) => setPreviewText(e.target.value)}
            placeholder="Resumo curto mostrado no inbox"
            rows={2}
            maxLength={300}
          />
        </div>
        <Button
          onClick={handleSend}
          disabled={sendDigest.isPending || !subject.trim() || activeCount === 0}
          className="w-full gap-2"
          size="sm"
        >
          <Send className="h-3.5 w-3.5" />
          {sendDigest.isPending ? 'A enviar...' : `Enviar para ${activeCount} subscritores`}
        </Button>
      </CardContent>
    </Card>
  );
};

/* ---- Main Component ---- */
const NewsletterManager = () => {
  const { data: subscribers, isLoading } = useNewsletterSubscribers();
  const { data: stats } = useNewsletterStats();
  const toggleSubscriber = useToggleSubscriber();
  const deleteSubscriber = useDeleteSubscriber();
  const { toast } = useToast();
  const [search, setSearch] = useState('');
  const [confirmDelete, setConfirmDelete] = useState<NewsletterSubscriber | null>(null);

  const filteredSubscribers = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();
    if (!normalizedSearch) return (subscribers ?? []) as NewsletterSubscriber[];
    return ((subscribers ?? []) as NewsletterSubscriber[]).filter((s) =>
      s.email.toLowerCase().includes(normalizedSearch),
    );
  }, [search, subscribers]);

  const handleToggle = useCallback(
    (sub: NewsletterSubscriber) => {
      toggleSubscriber.mutate(
        { id: sub.id, is_active: !sub.is_active },
        {
          onSuccess: () =>
            toast({ title: sub.is_active ? 'Desativado' : 'Reativado', description: sub.email }),
          onError: () =>
            toast({ title: 'Erro ao alterar estado', variant: 'destructive' }),
        },
      );
    },
    [toggleSubscriber, toast],
  );

  const handleDelete = useCallback(
    (sub: NewsletterSubscriber) => {
      deleteSubscriber.mutate(sub.id, {
        onSuccess: () => {
          toast({ title: 'Removido', description: sub.email });
          setConfirmDelete(null);
        },
        onError: () =>
          toast({ title: 'Erro ao remover', variant: 'destructive' }),
      });
    },
    [deleteSubscriber, toast],
  );

  const activeCount = stats?.active || 0;

  const SubscriberActions: React.FC<{ sub: NewsletterSubscriber }> = ({ sub }) => (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="h-7 w-7">
          <MoreVertical className="h-3.5 w-3.5" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => handleToggle(sub)}>
          {sub.is_active ? (
            <><UserX className="mr-2 h-3.5 w-3.5" /> Desativar</>
          ) : (
            <><UserPlus className="mr-2 h-3.5 w-3.5" /> Reativar</>
          )}
        </DropdownMenuItem>
        <DropdownMenuItem
          className="text-destructive focus:text-destructive"
          onClick={() => setConfirmDelete(sub)}
        >
          <Trash2 className="mr-2 h-3.5 w-3.5" /> Eliminar
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );

  return (
    <div className="space-y-5">
      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10">
              <Users className="h-4 w-4 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats?.total || 0}</p>
              <p className="text-xs text-muted-foreground">Total Subscritores</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-500/10">
              <UserCheck className="h-4 w-4 text-emerald-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">{activeCount}</p>
              <p className="text-xs text-muted-foreground">Ativos</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted">
              <Mail className="h-4 w-4 text-muted-foreground" />
            </div>
            <div>
              <p className="text-2xl font-bold">{(stats?.total || 0) - activeCount}</p>
              <p className="text-xs text-muted-foreground">Inativos</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Campaign + Subscribers side by side on large screens */}
      <div className="grid gap-5 lg:grid-cols-[320px_1fr]">
        <CampaignPanel activeCount={activeCount} />

        {/* Subscribers Table */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Subscritores</CardTitle>
              {(subscribers?.length ?? 0) > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 gap-1.5 text-xs"
                  onClick={() => exportSubscribersCSV(filteredSubscribers)}
                >
                  <Download className="h-3 w-3" /> CSV
                </Button>
              )}
            </div>
            <CardDescription className="text-xs">
              Lista com busca, toggle ativo/inativo e exportação.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Buscar por email"
                className="sm:max-w-xs"
              />
              <p className="text-xs text-muted-foreground">
                {filteredSubscribers.length} resultado(s)
              </p>
            </div>

            {isLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : !subscribers?.length ? (
              <p className="py-8 text-center text-muted-foreground">
                Nenhum subscritor ainda. O formulário de newsletter está disponível no site.
              </p>
            ) : !filteredSubscribers.length ? (
              <p className="rounded-xl border border-dashed border-border px-4 py-6 text-center text-sm text-muted-foreground">
                Nenhum subscritor encontrado com esse termo de busca.
              </p>
            ) : (
              <>
                {/* Mobile cards */}
                <div className="space-y-2 md:hidden">
                  {filteredSubscribers.map((sub) => (
                    <div key={sub.id} className="flex items-center justify-between rounded-lg border p-3">
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium" title={sub.email}>
                          {sub.email}
                        </p>
                        <div className="mt-0.5 flex items-center gap-2 text-[11px] text-muted-foreground">
                          <Badge variant={sub.is_active ? 'default' : 'secondary'} className="h-4 text-[10px]">
                            {sub.is_active ? 'Ativo' : 'Inativo'}
                          </Badge>
                          <span>{format(new Date(sub.subscribed_at), 'dd MMM yyyy', { locale: pt })}</span>
                        </div>
                      </div>
                      <SubscriberActions sub={sub} />
                    </div>
                  ))}
                </div>

                {/* Desktop table */}
                <div className="hidden overflow-x-auto md:block">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Email</TableHead>
                        <TableHead>Data</TableHead>
                        <TableHead>Estado</TableHead>
                        <TableHead className="w-10" />
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredSubscribers.map((sub) => (
                        <TableRow key={sub.id}>
                          <TableCell className="font-medium">{sub.email}</TableCell>
                          <TableCell className="text-muted-foreground">
                            {format(new Date(sub.subscribed_at), 'dd MMM yyyy', { locale: pt })}
                          </TableCell>
                          <TableCell>
                            <Badge variant={sub.is_active ? 'default' : 'secondary'}>
                              {sub.is_active ? 'Ativo' : 'Inativo'}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <SubscriberActions sub={sub} />
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Delete confirmation */}
      <AlertDialog open={!!confirmDelete} onOpenChange={() => setConfirmDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar subscritor?</AlertDialogTitle>
            <AlertDialogDescription>
              Isto irá remover permanentemente <strong>{confirmDelete?.email}</strong> da lista de subscritores. Esta ação não pode ser revertida.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => confirmDelete && handleDelete(confirmDelete)}
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default NewsletterManager;
