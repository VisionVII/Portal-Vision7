import React, { useState, useEffect, useCallback } from 'react';
import {
  Key, Trash2, Plus, Shield, Mail, Globe, Webhook, Lock,
  Loader2, CheckCircle2, AlertTriangle, Clock, Eye, EyeOff, Copy, Check,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
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
import { useToast } from '@/hooks/use-toast';
import {
  listN8nCredentials,
  createN8nCredential,
  deleteN8nCredential,
  revokeN8nCredential,
  type N8nCredentialRow,
} from '@/services/n8nSettings';

type CredentialType = 'api_key' | 'smtp' | 'oauth2' | 'webhook' | 'service_key';

const TYPE_META: Record<CredentialType, { label: string; icon: typeof Key; color: string; badgeClass: string }> = {
  api_key: { label: 'API Key', icon: Key, color: 'text-blue-500', badgeClass: 'border-blue-500/30 text-blue-600 dark:text-blue-400 bg-blue-500/10' },
  smtp: { label: 'SMTP', icon: Mail, color: 'text-emerald-500', badgeClass: 'border-emerald-500/30 text-emerald-600 dark:text-emerald-400 bg-emerald-500/10' },
  oauth2: { label: 'OAuth2', icon: Globe, color: 'text-violet-500', badgeClass: 'border-violet-500/30 text-violet-600 dark:text-violet-400 bg-violet-500/10' },
  webhook: { label: 'Webhook', icon: Webhook, color: 'text-amber-500', badgeClass: 'border-amber-500/30 text-amber-600 dark:text-amber-400 bg-amber-500/10' },
  service_key: { label: 'Service Key', icon: Lock, color: 'text-red-500', badgeClass: 'border-red-500/30 text-red-600 dark:text-red-400 bg-red-500/10' },
};

const STATUS_BADGE: Record<string, { variant: 'default' | 'secondary' | 'destructive'; label: string; className: string }> = {
  active: { variant: 'default', label: 'Ativa', className: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30' },
  inactive: { variant: 'secondary', label: 'Inativa', className: 'bg-muted text-muted-foreground border border-border' },
  revoked: { variant: 'destructive', label: 'Revogada', className: 'bg-destructive/15 text-destructive border border-destructive/30' },
};

function daysUntilExpiry(expiresAt: string): number {
  return Math.ceil((new Date(expiresAt).getTime() - Date.now()) / 86_400_000);
}

const CredentialVault: React.FC = () => {
  const [credentials, setCredentials] = useState<N8nCredentialRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [creating, setCreating] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [actionDialog, setActionDialog] = useState<{
    type: 'revoke' | 'delete';
    id: string;
    name: string;
  } | null>(null);
  const { toast } = useToast();

  // Form state
  const [formKey, setFormKey] = useState('');
  const [formValue, setFormValue] = useState('');
  const [formType, setFormType] = useState<CredentialType>('api_key');
  const [formNotes, setFormNotes] = useState('');
  const [formExpiry, setFormExpiry] = useState('');
  const [showValue, setShowValue] = useState(false);

  const loadCredentials = useCallback(async () => {
    setLoading(true);
    try {
      const data = await listN8nCredentials();
      setCredentials(data);
    } catch (err) {
      toast({ title: 'Erro ao carregar credenciais', description: (err as Error).message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    loadCredentials();
  }, [loadCredentials]);

  const handleCreate = async () => {
    if (!formKey.trim() || !formValue.trim() || !formExpiry) {
      toast({ title: 'Campos em falta', description: 'Preencha o nome, o valor e a data de expiração.', variant: 'destructive' });
      return;
    }
    setCreating(true);
    try {
      await createN8nCredential({
        keyName: formKey.trim(),
        value: formValue.trim(),
        expiresAt: new Date(formExpiry).toISOString(),
        notes: formNotes.trim() || undefined,
        remindDaysBefore: 30,
      });
      toast({ title: 'Credencial guardada', description: `A chave ${formKey} foi adicionada ao cofre seguro.` });
      setShowForm(false);
      setFormKey('');
      setFormValue('');
      setFormNotes('');
      setFormExpiry('');
      await loadCredentials();
    } catch (err) {
      toast({ title: 'Erro ao criar', description: (err as Error).message, variant: 'destructive' });
    } finally {
      setCreating(false);
    }
  };

  const handleConfirmAction = async () => {
    if (!actionDialog) return;
    const { type, id, name } = actionDialog;
    setActionDialog(null);

    try {
      if (type === 'revoke') {
        await revokeN8nCredential(id);
        toast({ title: 'Credencial revogada', description: `${name} foi marcada como revogada.` });
      } else {
        await deleteN8nCredential(id);
        toast({ title: 'Credencial eliminada', description: `${name} foi removida permanentemente do cofre.` });
      }
      await loadCredentials();
    } catch (err) {
      toast({ title: 'Erro na operação', description: (err as Error).message, variant: 'destructive' });
    }
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(id);
    toast({ title: 'Copiado', description: 'Nome da credencial copiado para a área de transferência.' });
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const activeCount = credentials.filter((c) => c.status === 'active').length;
  const expiringCount = credentials.filter((c) => c.status === 'active' && daysUntilExpiry(c.expires_at) <= 30 && daysUntilExpiry(c.expires_at) > 0).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-bold tracking-tight sm:text-2xl">Credential Vault</h2>
          <p className="text-sm text-muted-foreground">
            Armazenamento seguro de segredos de API, chaves de autenticação, SMTP e webhooks
          </p>
        </div>
        <Button onClick={() => setShowForm(!showForm)} size="sm" className="gap-1.5 self-start sm:self-auto">
          <Plus className="h-4 w-4" />
          {showForm ? 'Fechar formulário' : 'Nova credencial'}
        </Button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card className="border-border/60 bg-card/60 backdrop-blur-sm">
          <CardContent className="flex items-center gap-3.5 p-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Shield className="h-5 w-5" />
            </div>
            <div>
              <p className="text-2xl font-bold tracking-tight">{credentials.length}</p>
              <p className="text-xs font-medium text-muted-foreground">Total registadas</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-emerald-500/20 bg-emerald-500/5 backdrop-blur-sm">
          <CardContent className="flex items-center gap-3.5 p-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="h-5 w-5" />
            </div>
            <div>
              <p className="text-2xl font-bold tracking-tight text-emerald-700 dark:text-emerald-400">{activeCount}</p>
              <p className="text-xs font-medium text-emerald-600/80 dark:text-emerald-400/80">Ativas e operacionais</p>
            </div>
          </CardContent>
        </Card>

        <Card className={`backdrop-blur-sm transition-colors ${
          expiringCount > 0
            ? 'border-amber-500/30 bg-amber-500/10'
            : 'border-border/60 bg-card/60'
        }`}>
          <CardContent className="flex items-center gap-3.5 p-4">
            <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
              expiringCount > 0
                ? 'bg-amber-500/20 text-amber-600 dark:text-amber-400'
                : 'bg-muted text-muted-foreground'
            }`}>
              <AlertTriangle className="h-5 w-5" />
            </div>
            <div>
              <p className={`text-2xl font-bold tracking-tight ${
                expiringCount > 0 ? 'text-amber-700 dark:text-amber-400' : ''
              }`}>
                {expiringCount}
              </p>
              <p className="text-xs font-medium text-muted-foreground">A expirar (&le; 30 dias)</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Create form */}
      {showForm && (
        <Card className="border-primary/30 shadow-sm animate-in fade-in-50 duration-200">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Key className="h-4 w-4 text-primary" />
              Registar nova credencial
            </CardTitle>
            <CardDescription className="text-xs">
              Os dados são encriptados e guardados em segurança no cofre para uso nos serviços e integrações
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Nome identificador *</Label>
                <Input
                  placeholder="Ex: OPENAI_API_KEY ou STRIPE_SECRET"
                  value={formKey}
                  onChange={(e) => setFormKey(e.target.value)}
                  className="font-mono text-sm"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Tipo de credencial</Label>
                <Select value={formType} onValueChange={(v) => setFormType(v as CredentialType)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(TYPE_META).map(([key, meta]) => {
                      const MetaIcon = meta.icon;
                      return (
                        <SelectItem key={key} value={key}>
                          <div className="flex items-center gap-2">
                            <MetaIcon className={`h-4 w-4 ${meta.color}`} />
                            <span>{meta.label}</span>
                          </div>
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Valor / Segredo *</Label>
              <div className="relative">
                <Input
                  type={showValue ? 'text' : 'password'}
                  placeholder="Cole aqui o token, chave ou segredo"
                  value={formValue}
                  onChange={(e) => setFormValue(e.target.value)}
                  className="font-mono text-sm pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowValue(!showValue)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  aria-label={showValue ? 'Ocultar segredo' : 'Mostrar segredo'}
                >
                  {showValue ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Data de expiração *</Label>
                <Input
                  type="date"
                  value={formExpiry}
                  onChange={(e) => setFormExpiry(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Notas / Finalidade (opcional)</Label>
                <Input
                  placeholder="Ex: Utilizado no pipeline de IA e curadoria"
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-border/40">
              <Button variant="outline" size="sm" onClick={() => setShowForm(false)}>
                Cancelar
              </Button>
              <Button size="sm" onClick={handleCreate} disabled={creating} className="gap-1.5">
                {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                Guardar credencial
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Credentials list */}
      {loading ? (
        <div className="flex flex-col items-center justify-center gap-3 py-16 text-muted-foreground">
          <Loader2 className="h-7 w-7 animate-spin text-primary" />
          <p className="text-sm">A carregar credenciais do cofre...</p>
        </div>
      ) : credentials.length === 0 ? (
        <Card className="border-dashed border-border/70">
          <CardContent className="flex flex-col items-center justify-center py-14 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-muted text-muted-foreground mb-3">
              <Key className="h-6 w-6" />
            </div>
            <p className="text-sm font-semibold text-foreground">Nenhuma credencial registada</p>
            <p className="text-xs text-muted-foreground max-w-sm mt-1 mb-4">
              Mantenha as chaves de API, webhooks e tokens de serviços num único ponto seguro e controlado.
            </p>
            <Button size="sm" onClick={() => setShowForm(true)} className="gap-1.5">
              <Plus className="h-4 w-4" />
              Adicionar primeira credencial
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2.5">
          {credentials.map((cred) => {
            const days = daysUntilExpiry(cred.expires_at);
            const isExpiring = days <= 30 && days > 0;
            const isExpired = days <= 0;
            const statusMeta = STATUS_BADGE[cred.status] ?? STATUS_BADGE.inactive;
            const credType = (cred as N8nCredentialRow & { credential_type?: CredentialType }).credential_type ?? 'api_key';
            const typeMeta = TYPE_META[credType] ?? TYPE_META.api_key;
            const TypeIcon = typeMeta.icon;

            return (
              <Card
                key={cred.id}
                className={`transition-all ${
                  isExpired
                    ? 'border-destructive/30 bg-destructive/5'
                    : isExpiring
                    ? 'border-amber-500/30 bg-amber-500/5'
                    : 'border-border/60 hover:border-border'
                }`}
              >
                <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-start gap-3.5 min-w-0">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted/70 mt-0.5">
                      <TypeIcon className={`h-4 w-4 ${typeMeta.color}`} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono text-sm font-semibold text-foreground tracking-tight">
                          {cred.key_name}
                        </span>
                        <button
                          type="button"
                          onClick={() => copyToClipboard(cred.key_name, cred.id)}
                          className="text-muted-foreground hover:text-foreground transition-colors p-0.5"
                          title="Copiar nome da chave"
                        >
                          {copiedKey === cred.id ? (
                            <Check className="h-3 w-3 text-emerald-600" />
                          ) : (
                            <Copy className="h-3 w-3" />
                          )}
                        </button>
                        <Badge variant="outline" className={`text-[10px] font-normal ${statusMeta.className}`}>
                          {statusMeta.label}
                        </Badge>
                        <Badge variant="outline" className={`text-[10px] font-normal ${typeMeta.badgeClass}`}>
                          {typeMeta.label}
                        </Badge>
                      </div>

                      <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1.5">
                          <Clock className="h-3 w-3 shrink-0" />
                          {isExpired ? (
                            <span className="text-destructive font-medium">Expirada ({Math.abs(days)}d atrás)</span>
                          ) : isExpiring ? (
                            <span className="text-amber-600 dark:text-amber-400 font-medium">
                              Expira em {days} dia{days === 1 ? '' : 's'}
                            </span>
                          ) : (
                            <span>{days} dias restantes</span>
                          )}
                        </span>
                        {cred.notes && (
                          <span className="truncate max-w-xs text-muted-foreground/80 italic">
                            {cred.notes}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-auto shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-border/40 w-full sm:w-auto justify-end">
                    {cred.status === 'active' && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8 text-xs text-amber-600 hover:text-amber-700 hover:bg-amber-500/10 border-amber-500/30"
                        onClick={() => setActionDialog({ type: 'revoke', id: cred.id, name: cred.key_name })}
                      >
                        Revogar
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                      onClick={() => setActionDialog({ type: 'delete', id: cred.id, name: cred.key_name })}
                      title="Eliminar credencial"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Confirmation Dialog */}
      <AlertDialog open={!!actionDialog} onOpenChange={(open) => !open && setActionDialog(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {actionDialog?.type === 'revoke' ? 'Revogar credencial' : 'Eliminar credencial'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {actionDialog?.type === 'revoke' ? (
                <>
                  Tem a certeza que pretende revogar a credencial{' '}
                  <strong className="font-mono text-foreground">{actionDialog?.name}</strong>?
                  O seu estado mudará para inativo e os serviços que a utilizem podem deixar de comunicar.
                </>
              ) : (
                <>
                  Tem a certeza que pretende eliminar permanentemente a credencial{' '}
                  <strong className="font-mono text-foreground">{actionDialog?.name}</strong>?
                  Esta ação não pode ser revertida e a chave será apagada do cofre.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmAction}
              className={actionDialog?.type === 'delete' ? 'bg-destructive text-destructive-foreground hover:bg-destructive/90' : ''}
            >
              {actionDialog?.type === 'revoke' ? 'Sim, revogar' : 'Sim, eliminar'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default CredentialVault;
