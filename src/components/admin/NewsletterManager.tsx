import React, { useMemo, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Mail, Users, UserCheck } from 'lucide-react';
import { useNewsletterSubscribers, useNewsletterStats } from '@/hooks/useNewsletter';
import { format } from 'date-fns';
import { pt } from 'date-fns/locale';

interface Subscriber {
  id: string;
  email: string;
  subscribed_at: string;
  is_active: boolean;
}
const NewsletterManager = () => {
  const { data: subscribers, isLoading } = useNewsletterSubscribers();
  const { data: stats } = useNewsletterStats();
  const [search, setSearch] = useState('');

  const filteredSubscribers = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    if (!normalizedSearch) return subscribers ?? [];

    return (subscribers ?? []).filter((subscriber: Subscriber) =>
      subscriber.email.toLowerCase().includes(normalizedSearch)
    );
  }, [search, subscribers]);

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-5 flex items-center gap-4">
            <div className="h-10 w-10 rounded-lg bg-primary-100 dark:bg-primary-900 flex items-center justify-center">
              <Users className="h-5 w-5 text-primary-600 dark:text-primary-400" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Subscritores</p>
              <p className="text-2xl font-bold">{stats?.total || 0}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5 flex items-center gap-4">
            <div className="h-10 w-10 rounded-lg bg-secondary-100 dark:bg-secondary-900 flex items-center justify-center">
              <UserCheck className="h-5 w-5 text-secondary-600 dark:text-secondary-400" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Ativos</p>
              <p className="text-2xl font-bold">{stats?.active || 0}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5 flex items-center gap-4">
            <div className="h-10 w-10 rounded-lg bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center">
              <Mail className="h-5 w-5 text-neutral-600 dark:text-neutral-400" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Inativos</p>
              <p className="text-2xl font-bold">{(stats?.total || 0) - (stats?.active || 0)}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Subscribers Table */}
      <Card>
        <CardHeader>
          <CardTitle>Subscritores</CardTitle>
          <CardDescription>Lista de todos os subscritores da newsletter, com busca rápida e leitura mobile-first.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Buscar por email"
              className="sm:max-w-xs"
            />
            <p className="text-sm text-muted-foreground">
              {filteredSubscribers.length} resultado(s)
            </p>
          </div>

          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map(i => <Skeleton key={i} className="h-12 w-full" />)}
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
              <div className="space-y-3 md:hidden">
                {filteredSubscribers.map((sub: Subscriber) => (
                  <div key={sub.id} className="rounded-xl border border-border bg-card p-4 shadow-sm">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="break-all font-medium text-foreground">{sub.email}</p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {format(new Date(sub.subscribed_at), 'dd MMM yyyy', { locale: pt })}
                        </p>
                      </div>
                      <Badge variant={sub.is_active ? 'default' : 'secondary'}>
                        {sub.is_active ? 'Ativo' : 'Inativo'}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>

              <div className="hidden overflow-x-auto md:block">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Email</TableHead>
                      <TableHead>Data</TableHead>
                      <TableHead>Estado</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredSubscribers.map((sub: Subscriber) => (
                      <TableRow key={sub.id}>
                        <TableCell className="font-medium">{sub.email}</TableCell>
                        <TableCell>
                          {format(new Date(sub.subscribed_at), 'dd MMM yyyy', { locale: pt })}
                        </TableCell>
                        <TableCell>
                          <Badge variant={sub.is_active ? 'default' : 'secondary'}>
                            {sub.is_active ? 'Ativo' : 'Inativo'}
                          </Badge>
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
  );
};

export default NewsletterManager;
