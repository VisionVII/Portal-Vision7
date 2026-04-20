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
import { Plus, TrendingUp, Trophy, XCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import {
  useCrmDeals,
  useCrmContacts,
  useCreateDeal,
  useUpdateDeal,
  type CrmDealStage,
} from '@/hooks/useCrm';
import { format } from 'date-fns';
import { pt } from 'date-fns/locale';

const STAGES: { key: CrmDealStage; label: string; color: string }[] = [
  { key: 'lead', label: 'Lead', color: 'badge-status-neutral border' },
  { key: 'qualified', label: 'Qualificado', color: 'badge-status-info border' },
  { key: 'proposal', label: 'Proposta', color: 'badge-status-warning border' },
  { key: 'negotiation', label: 'Negoçiação', color: 'badge-status-purple border' },
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

const CrmDealsBoard: React.FC = () => {
  const { toast } = useToast();
  const { data: deals, isLoading } = useCrmDeals();
  const { data: contacts } = useCrmContacts();
  const createMut = useCreateDeal();
  const updateMut = useUpdateDeal();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({
    title: '',
    contact_id: '',
    value: '',
    stage: 'lead' as CrmDealStage,
    notes: '',
  });

  const grouped = useMemo(() => {
    const map: Record<CrmDealStage, typeof deals> = {
      lead: [], qualified: [], proposal: [], negotiation: [], won: [], lost: [],
    };
    deals?.forEach((d) => {
      if (map[d.stage]) map[d.stage]!.push(d);
    });
    return map;
  }, [deals]);

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
      {/* Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <TrendingUp className="h-5 w-5 text-blue-600" />
            <div>
              <p className="text-2xl font-bold">{deals?.length ?? 0}</p>
              <p className="text-xs text-muted-foreground">Total de deals</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <TrendingUp className="h-5 w-5 text-indigo-600" />
            <div>
              <p className="text-2xl font-bold">€{totalPipeline.toLocaleString('pt-PT')}</p>
              <p className="text-xs text-muted-foreground">Pipeline ativo</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <Trophy className="h-5 w-5 text-emerald-600" />
            <div>
              <p className="text-2xl font-bold">€{totalWon.toLocaleString('pt-PT')}</p>
              <p className="text-xs text-muted-foreground">Valor ganho</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Button size="sm" onClick={() => setDialogOpen(true)}>
        <Plus className="h-4 w-4 mr-1" /> Novo Deal
      </Button>

      {/* Kanban-like columns */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6 gap-3">
        {STAGES.map(({ key, label, color }) => (
          <Card key={key} className={`border ${color}`}>
            <CardHeader className="p-3 pb-1">
              <CardTitle className="text-sm font-medium flex items-center justify-between">
                {label}
                <Badge variant="secondary" className="text-xs">{grouped[key]?.length ?? 0}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-3 pt-1 space-y-2 max-h-[400px] overflow-y-auto">
              {(grouped[key] ?? []).map((deal) => (
                <div key={deal.id} className="bg-white rounded border p-2 space-y-1 shadow-sm">
                  <p className="text-sm font-medium leading-tight">{deal.title}</p>
                  <p className="text-xs text-muted-foreground">{deal.crm_contacts?.name ?? deal.crm_contacts?.email}</p>
                  {deal.value != null && (
                    <p className="text-xs font-semibold">€{deal.value.toLocaleString('pt-PT')}</p>
                  )}
                  <div className="flex gap-1 flex-wrap pt-1">
                    {STAGES.filter((s) => s.key !== key && s.key !== 'lost').map((s) => (
                      <Button
                        key={s.key}
                        variant="ghost"
                        size="sm"
                        className="h-6 px-2 text-[10px]"
                        onClick={() => moveStage(deal.id, s.key)}
                      >
                        → {s.label}
                      </Button>
                    ))}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        ))}
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
    </div>
  );
};

export default CrmDealsBoard;
