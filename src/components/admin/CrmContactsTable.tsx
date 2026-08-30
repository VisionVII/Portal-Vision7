import React, { useState, useMemo, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Users, UserPlus, MoreVertical, Trash2, Edit, Download } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import {
  useCrmContacts,
  useCrmContactStats,
  useCreateContact,
  useUpdateContact,
  useDeleteContact,
  type CrmContact,
  type CrmContactType,
} from '@/hooks/useCrm';
import { format } from 'date-fns';
import { pt } from 'date-fns/locale';

const CONTACT_TYPE_LABELS: Record<CrmContactType, string> = {
  subscriber: 'Subscritor',
  lead: 'Lead',
  partner: 'Parceiro',
  advertiser: 'Anunciante',
  contributor: 'Contribuidor',
  other: 'Outro',
};

const CONTACT_TYPE_COLORS: Record<CrmContactType, string> = {
  subscriber: 'badge-status-success',
  lead: 'badge-status-warning',
  partner: 'badge-status-info',
  advertiser: 'badge-status-purple',
  contributor: 'badge-status-info',
  other: 'badge-status-neutral',
};

const INITIAL_FORM: Partial<CrmContact> = {
  email: '',
  name: '',
  company: '',
  phone: '',
  contact_type: 'lead',
  source: 'manual',
  notes: '',
};

interface CrmContactsTableProps {
  searchQuery?: string;
}

const CrmContactsTable: React.FC<CrmContactsTableProps> = ({ searchQuery = '' }) => {
  const { toast } = useToast();
  const { data: contacts, isLoading } = useCrmContacts();
  const { data: stats } = useCrmContactStats();
  const createMut = useCreateContact();
  const updateMut = useUpdateContact();
  const deleteMut = useDeleteContact();

  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editContact, setEditContact] = useState<CrmContact | null>(null);
  const [form, setForm] = useState(INITIAL_FORM);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    if (!contacts) return [];
    let list = contacts;
    if (typeFilter !== 'all') list = list.filter((c) => c.contact_type === typeFilter);
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (c) =>
          c.email.toLowerCase().includes(q) ||
          c.name?.toLowerCase().includes(q) ||
          c.company?.toLowerCase().includes(q),
      );
    }
    return list;
  }, [contacts, searchQuery, typeFilter]);

  const openNew = useCallback(() => {
    setEditContact(null);
    setForm(INITIAL_FORM);
    setDialogOpen(true);
  }, []);

  const openEdit = useCallback((c: CrmContact) => {
    setEditContact(c);
    setForm({
      email: c.email,
      name: c.name ?? '',
      company: c.company ?? '',
      phone: c.phone ?? '',
      contact_type: c.contact_type,
      source: c.source ?? '',
      notes: c.notes ?? '',
    });
    setDialogOpen(true);
  }, []);

  const handleSave = useCallback(async () => {
    if (!form.email) return;
    try {
      if (editContact) {
        await updateMut.mutateAsync({ id: editContact.id, ...form });
        toast({ title: 'Contacto atualizado' });
      } else {
        await createMut.mutateAsync(form as Parameters<typeof createMut.mutateAsync>[0]);
        toast({ title: 'Contacto criado' });
      }
      setDialogOpen(false);
    } catch (err) {
      toast({ title: 'Erro', description: err instanceof Error ? err.message : 'Erro desconhecido', variant: 'destructive' });
    }
  }, [form, editContact, updateMut, createMut, toast]);

  const handleDelete = useCallback(async () => {
    if (!deleteId) return;
    try {
      await deleteMut.mutateAsync(deleteId);
      toast({ title: 'Contacto eliminado' });
    } catch (err) {
      toast({ title: 'Erro', description: err instanceof Error ? err.message : 'Erro desconhecido', variant: 'destructive' });
    }
    setDeleteId(null);
  }, [deleteId, deleteMut, toast]);

  const exportCSV = useCallback(() => {
    if (!filtered.length) return;
    const header = 'Email,Nome,Empresa,Telefone,Tipo,Fonte,Ativo,Data';
    const rows = filtered.map(
      (c) =>
        `"${c.email}","${c.name ?? ''}","${c.company ?? ''}","${c.phone ?? ''}","${c.contact_type}","${c.source ?? ''}","${c.is_active}","${c.created_at}"`,
    );
    const csv = [header, ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `crm-contacts-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }, [filtered]);

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-16 w-full rounded-lg" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <div className="h-3.5 w-[3px] rounded-full bg-primary" />
        <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-foreground/50">Contactos</span>
        <span className="ml-1 text-xs text-muted-foreground">{stats?.total ?? 0} no total</span>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="flex items-center gap-3 rounded-xl border border-border/40 bg-card/60 p-3.5">
          <Users className="h-5 w-5 shrink-0 text-muted-foreground" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-xl font-extrabold text-foreground">{stats?.total ?? 0}</p>
            <p className="truncate text-[10px] font-bold uppercase tracking-wide text-muted-foreground">Total de contactos</p>
          </div>
        </div>
        <div className="flex items-center gap-3 rounded-xl border border-success/30 bg-gradient-to-br from-success/15 via-success/5 to-transparent p-3.5">
          <Users className="h-5 w-5 shrink-0 text-success" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-xl font-extrabold text-success">{stats?.active ?? 0}</p>
            <p className="truncate text-[10px] font-bold uppercase tracking-wide text-success">Ativos</p>
          </div>
        </div>
        <div className="flex items-center gap-3 rounded-xl border border-warning/30 bg-gradient-to-br from-warning/15 via-warning/5 to-transparent p-3.5">
          <UserPlus className="h-5 w-5 shrink-0 text-warning" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-xl font-extrabold text-warning">{stats?.leads ?? 0}</p>
            <p className="truncate text-[10px] font-bold uppercase tracking-wide text-warning">Leads</p>
          </div>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Tipo" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            {(Object.keys(CONTACT_TYPE_LABELS) as CrmContactType[]).map((t) => (
              <SelectItem key={t} value={t}>{CONTACT_TYPE_LABELS[t]}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" onClick={exportCSV}>
            <Download className="h-4 w-4 mr-1" /> CSV
          </Button>
          <Button size="sm" onClick={openNew}>
            <UserPlus className="h-4 w-4 mr-1" /> Novo Contacto
          </Button>
        </div>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome / Email</TableHead>
                <TableHead className="hidden md:table-cell">Empresa</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead className="hidden sm:table-cell">Estado</TableHead>
                <TableHead className="hidden lg:table-cell">Data</TableHead>
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="py-12">
                    <div className="flex flex-col items-center">
                      <div className="rounded-2xl bg-muted/40 p-4 dark:bg-muted/20">
                        <Users className="h-8 w-8 text-muted-foreground/40" />
                      </div>
                      <p className="mt-3 text-sm font-medium text-foreground/70">
                        {contacts?.length ? 'Nenhum contacto encontrado' : 'Ainda sem contactos'}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {contacts?.length ? 'Tente outra pesquisa ou filtro' : 'Adicione o primeiro contacto para começar'}
                      </p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell>
                      <div className="min-w-0">
                        <p className="font-medium text-sm truncate max-w-[160px] sm:max-w-none">{c.name ?? '—'}</p>
                        <p className="text-xs text-muted-foreground truncate max-w-[160px] sm:max-w-none" title={c.email}>{c.email}</p>
                      </div>
                    </TableCell>
                    <TableCell className="hidden md:table-cell text-sm">{c.company ?? '—'}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={CONTACT_TYPE_COLORS[c.contact_type]}>
                        {CONTACT_TYPE_LABELS[c.contact_type]}
                      </Badge>
                    </TableCell>
                    <TableCell className="hidden sm:table-cell">
                      <Badge variant="outline" className={c.is_active ? 'badge-status-success' : 'badge-status-neutral'}>
                        {c.is_active ? 'Ativo' : 'Inativo'}
                      </Badge>
                    </TableCell>
                    <TableCell className="hidden lg:table-cell text-xs text-muted-foreground">
                      {format(new Date(c.created_at), 'dd/MM/yyyy', { locale: pt })}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => openEdit(c)}>
                            <Edit className="h-4 w-4 mr-2" /> Editar
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="text-destructive"
                            onClick={() => setDeleteId(c.id)}
                          >
                            <Trash2 className="h-4 w-4 mr-2" /> Eliminar
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
          </div>
        </CardContent>
      </Card>

      {/* Create / Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editContact ? 'Editar Contacto' : 'Novo Contacto'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Email *</Label>
              <Input
                value={form.email ?? ''}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                disabled={!!editContact}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Nome</Label>
                <Input
                  value={form.name ?? ''}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                />
              </div>
              <div>
                <Label>Empresa</Label>
                <Input
                  value={form.company ?? ''}
                  onChange={(e) => setForm((f) => ({ ...f, company: e.target.value }))}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Telefone</Label>
                <Input
                  value={form.phone ?? ''}
                  onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                />
              </div>
              <div>
                <Label>Tipo</Label>
                <Select
                  value={form.contact_type ?? 'lead'}
                  onValueChange={(v) => setForm((f) => ({ ...f, contact_type: v as CrmContactType }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(Object.keys(CONTACT_TYPE_LABELS) as CrmContactType[]).map((t) => (
                      <SelectItem key={t} value={t}>{CONTACT_TYPE_LABELS[t]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>Notas</Label>
              <Textarea
                rows={3}
                value={form.notes ?? ''}
                onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave} disabled={createMut.isPending || updateMut.isPending}>
              {editContact ? 'Guardar' : 'Criar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar contacto?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação é irreversível. Todas as interações associadas serão eliminadas.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default CrmContactsTable;
