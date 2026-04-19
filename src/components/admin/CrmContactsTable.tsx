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
import { Users, UserPlus, MoreVertical, Trash2, Edit, Search, Download, Eye, EyeOff } from 'lucide-react';
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
  subscriber: 'bg-emerald-100 text-emerald-800',
  lead: 'bg-amber-100 text-amber-800',
  partner: 'bg-indigo-100 text-indigo-800',
  advertiser: 'bg-pink-100 text-pink-800',
  contributor: 'bg-blue-100 text-blue-800',
  other: 'bg-gray-100 text-gray-800',
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

const CrmContactsTable: React.FC = () => {
  const { toast } = useToast();
  const { data: contacts, isLoading } = useCrmContacts();
  const { data: stats } = useCrmContactStats();
  const createMut = useCreateContact();
  const updateMut = useUpdateContact();
  const deleteMut = useDeleteContact();

  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editContact, setEditContact] = useState<CrmContact | null>(null);
  const [form, setForm] = useState(INITIAL_FORM);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    if (!contacts) return [];
    let list = contacts;
    if (typeFilter !== 'all') list = list.filter((c) => c.contact_type === typeFilter);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (c) =>
          c.email.toLowerCase().includes(q) ||
          c.name?.toLowerCase().includes(q) ||
          c.company?.toLowerCase().includes(q),
      );
    }
    return list;
  }, [contacts, search, typeFilter]);

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
      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <Users className="h-5 w-5 text-muted-foreground" />
            <div>
              <p className="text-2xl font-bold">{stats?.total ?? 0}</p>
              <p className="text-xs text-muted-foreground">Total de contactos</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <Eye className="h-5 w-5 text-emerald-600" />
            <div>
              <p className="text-2xl font-bold">{stats?.active ?? 0}</p>
              <p className="text-xs text-muted-foreground">Ativos</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <UserPlus className="h-5 w-5 text-amber-600" />
            <div>
              <p className="text-2xl font-bold">{stats?.leads ?? 0}</p>
              <p className="text-xs text-muted-foreground">Leads</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Pesquisar por email, nome ou empresa..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
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
        <Button size="sm" variant="outline" onClick={exportCSV}>
          <Download className="h-4 w-4 mr-1" /> CSV
        </Button>
        <Button size="sm" onClick={openNew}>
          <UserPlus className="h-4 w-4 mr-1" /> Novo Contacto
        </Button>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
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
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    Nenhum contacto encontrado
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium text-sm">{c.name ?? '—'}</p>
                        <p className="text-xs text-muted-foreground">{c.email}</p>
                      </div>
                    </TableCell>
                    <TableCell className="hidden md:table-cell text-sm">{c.company ?? '—'}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={CONTACT_TYPE_COLORS[c.contact_type]}>
                        {CONTACT_TYPE_LABELS[c.contact_type]}
                      </Badge>
                    </TableCell>
                    <TableCell className="hidden sm:table-cell">
                      {c.is_active ? (
                        <Badge variant="outline" className="bg-emerald-50 text-emerald-700">Ativo</Badge>
                      ) : (
                        <Badge variant="outline" className="bg-gray-50 text-gray-500">Inativo</Badge>
                      )}
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
