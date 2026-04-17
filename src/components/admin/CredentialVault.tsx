import React, { useState, useEffect, useCallback } from 'react';
import {
  Key, Trash2, Plus, Shield, Mail, Globe, Webhook, Lock,
  Loader2, CheckCircle2, AlertTriangle, Clock, Eye, EyeOff,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import {
  listN8nCredentials,
  createN8nCredential,
  deleteN8nCredential,
  revokeN8nCredential,
  type N8nCredentialRow,
} from '@/services/n8nSettings';

type CredentialType = 'api_key' | 'smtp' | 'oauth2' | 'webhook' | 'service_key';

const TYPE_META: Record<CredentialType, { label: string; icon: typeof Key; color: string }> = {
  api_key: { label: 'API Key', icon: Key, color: 'text-blue-500' },
  smtp: { label: 'SMTP', icon: Mail, color: 'text-emerald-500' },
  oauth2: { label: 'OAuth2', icon: Globe, color: 'text-violet-500' },
  webhook: { label: 'Webhook', icon: Webhook, color: 'text-amber-500' },
  service_key: { label: 'Service Key', icon: Lock, color: 'text-red-500' },
};

const STATUS_BADGE: Record<string, { variant: 'default' | 'secondary' | 'destructive'; label: string }> = {
  active: { variant: 'default', label: 'Ativa' },
  inactive: { variant: 'secondary', label: 'Inativa' },
  revoked: { variant: 'destructive', label: 'Revogada' },
};

function daysUntilExpiry(expiresAt: string): number {
  return Math.ceil((new Date(expiresAt).getTime() - Date.now()) / 86_400_000);
}

const CredentialVault: React.FC = () => {
  const [credentials, setCredentials] = useState<N8nCredentialRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [creating, setCreating] = useState(false);
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
      toast({ title: 'Erro', description: (err as Error).message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => { loadCredentials(); }, [loadCredentials]);

  const handleCreate = async () => {
    if (!formKey.trim() || !formValue.trim() || !formExpiry) {
      toast({ title: 'Preencha todos os campos obrigatórios', variant: 'destructive' });
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
      toast({ title: 'Credencial criada', description: formKey });
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

  const handleRevoke = async (id: string, name: string) => {
    try {
      await revokeN8nCredential(id);
      toast({ title: 'Revogada', description: name });
      await loadCredentials();
    } catch (err) {
      toast({ title: 'Erro', description: (err as Error).message, variant: 'destructive' });
    }
  };

  const handleDelete = async (id: string, name: string) => {
    try {
      await deleteN8nCredential(id);
      toast({ title: 'Eliminada', description: name });
      await loadCredentials();
    } catch (err) {
      toast({ title: 'Erro', description: (err as Error).message, variant: 'destructive' });
    }
  };

  const activeCount = credentials.filter((c) => c.status === 'active').length;
  const expiringCount = credentials.filter((c) => c.status === 'active' && daysUntilExpiry(c.expires_at) <= 30).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-bold tracking-tight sm:text-2xl">Credential Vault</h2>
          <p className="text-sm text-muted-foreground">
            Gestão unificada de chaves API, SMTP, OAuth2 e webhooks
          </p>
        </div>
        <Button onClick={() => setShowForm(!showForm)} size="sm" className="gap-1.5">
          <Plus className="h-3.5 w-3.5" />
          Nova credencial
        </Button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-3">
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <Shield className="h-5 w-5 text-primary" />
            <div>
              <p className="text-lg font-bold">{credentials.length}</p>
              <p className="text-xs text-muted-foreground">Total</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <CheckCircle2 className="h-5 w-5 text-emerald-500" />
            <div>
              <p className="text-lg font-bold">{activeCount}</p>
              <p className="text-xs text-muted-foreground">Ativas</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <AlertTriangle className={`h-5 w-5 ${expiringCount > 0 ? 'text-amber-500' : 'text-muted-foreground'}`} />
            <div>
              <p className="text-lg font-bold">{expiringCount}</p>
              <p className="text-xs text-muted-foreground">A expirar</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Create form */}
      {showForm && (
        <Card className="border-primary/20">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Nova credencial</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <Label className="text-xs">Nome da chave *</Label>
                <Input
                  placeholder="Ex: GROQ_API_KEY"
                  value={formKey}
                  onChange={(e) => setFormKey(e.target.value)}
                  className="mt-1"
                />
              </div>
              <div>
                <Label className="text-xs">Tipo</Label>
                <Select value={formType} onValueChange={(v) => setFormType(v as CredentialType)}>
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(TYPE_META).map(([key, meta]) => (
                      <SelectItem key={key} value={key}>{meta.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label className="text-xs">Valor *</Label>
              <div className="relative mt-1">
                <Input
                  type={showValue ? 'text' : 'password'}
                  placeholder="Cole a chave ou token aqui"
                  value={formValue}
                  onChange={(e) => setFormValue(e.target.value)}
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowValue(!showValue)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showValue ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <Label className="text-xs">Expira em *</Label>
                <Input type="date" value={formExpiry} onChange={(e) => setFormExpiry(e.target.value)} className="mt-1" />
              </div>
              <div>
                <Label className="text-xs">Notas</Label>
                <Input placeholder="Opcional" value={formNotes} onChange={(e) => setFormNotes(e.target.value)} className="mt-1" />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" size="sm" onClick={() => setShowForm(false)}>Cancelar</Button>
              <Button size="sm" onClick={handleCreate} disabled={creating}>
                {creating ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : <Plus className="h-3.5 w-3.5 mr-1" />}
                Criar
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Credentials list */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : credentials.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-sm text-muted-foreground">
            Nenhuma credencial registada. Clique em "Nova credencial" para começar.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {credentials.map((cred) => {
            const days = daysUntilExpiry(cred.expires_at);
            const isExpiring = days <= 30 && days > 0;
            const isExpired = days <= 0;
            const status = STATUS_BADGE[cred.status] ?? STATUS_BADGE.inactive;
            // Use credential_type from the row if available, fallback to api_key
            const credType = (cred as N8nCredentialRow & { credential_type?: CredentialType }).credential_type ?? 'api_key';
            const typeMeta = TYPE_META[credType] ?? TYPE_META.api_key;
            const TypeIcon = typeMeta.icon;

            return (
              <Card key={cred.id} className={isExpired ? 'border-destructive/30 bg-destructive/5' : isExpiring ? 'border-amber-500/20' : ''}>
                <CardContent className="flex items-center gap-3 p-4">
                  <TypeIcon className={`h-5 w-5 shrink-0 ${typeMeta.color}`} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-sm font-semibold">{cred.key_name}</span>
                      <Badge variant={status.variant} className="text-[10px]">{status.label}</Badge>
                      <Badge variant="outline" className="text-[10px]">{typeMeta.label}</Badge>
                    </div>
                    <div className="mt-0.5 flex items-center gap-3 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {isExpired ? (
                          <span className="text-destructive font-medium">Expirada</span>
                        ) : isExpiring ? (
                          <span className="text-amber-600 font-medium">Expira em {days}d</span>
                        ) : (
                          <span>{days}d restantes</span>
                        )}
                      </span>
                      {cred.notes && <span className="truncate max-w-[200px]">{cred.notes}</span>}
                    </div>
                  </div>
                  <div className="flex shrink-0 gap-1">
                    {cred.status === 'active' && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 px-2 text-xs text-amber-600 hover:text-amber-700"
                        onClick={() => handleRevoke(cred.id, cred.key_name)}
                      >
                        Revogar
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0 text-destructive/60 hover:text-destructive"
                      onClick={() => handleDelete(cred.id, cred.key_name)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default CredentialVault;
