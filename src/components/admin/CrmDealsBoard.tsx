import React, { useState, useCallback, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Plus, Trash2, TrendingUp, Trophy } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import {
  useCrmDeals,
  useCrmContacts,
  useCreateDeal,
  useUpdateDeal,
  useDeleteDeal,
  type CrmDeal,
  type CrmDealStage,
} from '@/hooks/useCrm';

const STAGES: { key: CrmDealStage; label: string; color: string }[] = [
  { key: 'lead', label: 'Lead', color: 'badge-status-neutral border' },
  { key: 'qualified', label: 'Qualificado', color: 'badge-status-info border' },
  { key: 'proposal', label: 'Proposta', color: 'badge-status-warning border' },
  { key: 'negotiation', label: 'Negociação', color: 'badge-status-purple border' },
  { key: 'won', label: 'Ganho', color: 'badge-status-success border' },
  { key: 'lost', label: 'Perdido', color: 'badge-status-destructive border' },
];

const STAGE_BADGE: Record<CrmDealStage, string> = {
  lead: 'badge-status-neutral',
  qualified: 'badge-status-info',
  proposal: 'badge-status-warning',
  negotiation: 'badge-status-purple',
  won: 'badge-status-success',
  lost: 'badge-status-destructive',
};

interface CrmDealsBoardProps {
  searchQuery?: string;
}

const CrmDealsBoard: React.FC<CrmDealsBoardProps> = ({ searchQuery = '' }) => {
  const { toast } = useToast();
  const { data: deals, isLoading } = useCrmDeals();
  const { data: contacts } = useCrmContacts();
  const createMut = useCreateDeal();
  const updateMut = useUpdateDeal();
  const deleteMut = useDeleteDeal();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<CrmDeal | null>(null);
  const [form, setForm] = useState({
    title: '',
    contact_id: '',
    value: '',
    stage: 'lead' as CrmDealStage,
    notes: '',
  });

  const filteredDeals = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return deals;
    return deals?.filter(
      (d) =>
        d.title.toLowerCase().includes(q) ||
        d.crm_contacts?.name?.toLowerCase().includes(q) ||
        d.crm_contacts?.email?.toLowerCase().includes(q),
    );
  }, [deals, searchQuery]);

  const grouped = useMemo(() => {
    const map: Record<CrmDealStage, typeof deals> = {
      lead: [], qualified: [], proposal: [], negotiation: [], won: [], lost: [],
    };
    filteredDeals?.forEach((d) => {
      if (map[d.stage]) map[d.stage]!.push(d);
    });
    return map;
  }, [filteredDeals]);

  const totalPipeline = useMemo(() => {
    if (!deals) return 0;
    return deals
      .filter((d) => d.stage !== 'lost' && d.stage !== 'won')
      .reduce((acc, d) => acc + (d.value ?? 0), 0);
  }, [deals]);

  const totalWon = useMemo(() => {
    if (!deals) return 0;
    return deals.filter((d) => d.stage === 'won').reduce((acc, d) => acc + (d.value ?? 0), 0);
  }, [deals]);

  const handleCreate = useCallback(async () => {
    if (!form.title || !form.contact_id) return;
    try {
      await createMut.mutateAsync({
        title: form.title,
        contact_id: form.contact_id,
        value: form.value ? parseFloat(form.value) : null,
        stage: form.stage,
        notes: form.notes || null,
      });
      toast({ title: 'Deal criado' });
      setDialogOpen(false);
      setForm({ title: '', contact_id: '', value: '', stage: 'lead', notes: '' });
    } catch (err) {
      toast({ title: 'Erro', description: err instanceof Error ? err.message : 'Erro desconhecido', variant: 'destructive' });
    }
  }, [form, createMut, toast]);

  const moveStage = useCallback(
    async (dealId: string, stage: CrmDealStage) => {
      try {
        await updateMut.mutateAsync({
          id: dealId,
          stage,
          ...(stage === 'won' || stage === 'lost' ? { closed_at: new Date().toISOString() } : {}),
        });
        toast({ title: `Deal movido para ${STAGES.find((s) => s.key === stage)?.label}` });
      } catch (err) {
        toast({ title: 'Erro', description: err instanceof Error ? err.message : 'Erro desconhecido', variant: 'destructive' });
      }
    },
    [updateMut, toast],
  );

  const handleDelete = useCallback(async () => {
    if (!deleteTarget) return;
    try {
      await deleteMut.mutateAsync(deleteTarget.id);
      toast({ title: 'Deal eliminado' });
    } catch (err) {
      toast({ title: 'Erro', description: err instanceof Error ? err.message : 'Erro desconhecido', variant: 'destructive' });
    }
    setDeleteTarget(null);
  }, [deleteTarget, deleteMut, toast]);

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-20 w-full rounded-lg" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="h-3.5 w-[3px] rounded-full bg-primary" />
          <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-foreground/50">Pipeline</span>
          <span className="ml-1 text-xs text-muted-foreground">{deals?.length ?? 0} deals</span>
        </div>
        <Button size="sm" onClick={() => setDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-1" /> Novo Deal
        </Button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="flex items-center gap-3 rounded-xl border border-border/40 bg-card/60 p-3.5">
          <TrendingUp className="h-5 w-5 shrink-0 text-muted-foreground" />
          <div className="min-w-0 flex-1">
            <p className="text-xl font-extrabold text-foreground">{deals?.length ?? 0}</p>
            <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">Total de deals</p>
          </div>
        </div>
        <div className="flex items-center gap-3 rounded-xl border border-info/30 bg-gradient-to-br from-info/15 via-info/5 to-transparent p-3.5">
          <TrendingUp className="h-5 w-5 shrink-0 text-info" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-xl font-extrabold text-info">€{totalPipeline.toLocaleString('pt-PT')}</p>
            <p className="text-[10px] font-bold uppercase tracking-wide text-info">Pipeline ativo</p>
          </div>
        </div>
        <div className="flex items-center gap-3 rounded-xl border border-success/30 bg-gradient-to-br from-success/15 via-success/5 to-transparent p-3.5">
          <Trophy className="h-5 w-5 shrink-0 text-success" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-xl font-extrabold text-success">€{totalWon.toLocaleString('pt-PT')}</p>
            <p className="text-[10px] font-bold uppercase tracking-wide text-success">Valor ganho</p>
          </div>
        </div>
      </div>

      {/* Kanban — scroll horizontal, sempre numa única linha para manter a ordem
          de leitura esquerda-para-direita a qualquer largura */}
      <div className="overflow-x-auto pb-1">
        <div className="flex w-max gap-3">
          {STAGES.map(({ key, label, color }) => (
            <Card key={key} className={`w-64 shrink-0 border ${color}`}>
              <CardHeader className="p-3 pb-1">
                <CardTitle className="text-sm font-medium flex items-center justify-between">
                  {label}
                  <Badge variant="secondary" className="text-xs">{grouped[key]?.length ?? 0}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-3 pt-1 space-y-2 max-h-[500px] overflow-y-auto">
                {(grouped[key] ?? []).map((deal) => (
                  <div key={deal.id} className="group bg-card rounded border p-2 space-y-1 shadow-sm">
                    <div className="flex items-start justify-between gap-1">
                      <p className="text-sm font-medium leading-tight truncate" title={deal.title}>{deal.title}</p>
                      <button
                        type="button"
                        onClick={() => setDeleteTarget(deal)}
                        className="shrink-0 text-muted-foreground opacity-0 transition-opacity hover:text-destructive group-hover:opacity-100"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                    <p className="text-xs text-muted-foreground truncate">{deal.crm_contacts?.name ?? deal.crm_contacts?.email}</p>
                    {deal.value != null && (
                      <p className="text-xs font-semibold">€{deal.value.toLocaleString('pt-PT')}</p>
                    )}
                    <div className="pt-1">
                      <Select
                        value={key}
                        onValueChange={(v) => moveStage(deal.id, v as CrmDealStage)}
                      >
                        <SelectTrigger className="h-6 text-[10px] px-2 py-0">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {STAGES.map((s) => (
                            <SelectItem key={s.key} value={s.key} className="text-xs">
                              {s.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* New deal dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Novo Deal</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Título *</Label>
              <Input
                value={form.title}
                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              />
            </div>
            <div>
              <Label>Contacto *</Label>
              <Select value={form.contact_id} onValueChange={(v) => setForm((f) => ({ ...f, contact_id: v }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecionar contacto" />
                </SelectTrigger>
                <SelectContent>
                  {(contacts ?? []).map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name ?? c.email}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Valor (€)</Label>
                <Input
                  type="number"
                  value={form.value}
                  onChange={(e) => setForm((f) => ({ ...f, value: e.target.value }))}
                />
              </div>
              <div>
                <Label>Etapa</Label>
                <Select value={form.stage} onValueChange={(v) => setForm((f) => ({ ...f, stage: v as CrmDealStage }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {STAGES.map((s) => (
                      <SelectItem key={s.key} value={s.key}>{s.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>Notas</Label>
              <Textarea
                rows={2}
                value={form.notes}
                onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleCreate} disabled={createMut.isPending}>Criar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar deal?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget ? `"${deleteTarget.title}" será removido do pipeline. ` : ''}
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default CrmDealsBoard;
