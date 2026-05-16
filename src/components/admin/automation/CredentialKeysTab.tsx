import { useState, useCallback, useEffect } from 'react';
import { Trash2, Loader2, CheckCircle2, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import {
  listN8nCredentials,
  createN8nCredential,
  activateN8nCredential,
  deleteN8nCredential,
  type N8nCredentialRow,
} from '@/services/n8nSettings';

type KeyName = 'ANTHROPIC_API_KEY' | 'SUPABASE_SERVICE_ROLE_KEY';

function validateDraft(keyName: KeyName, value: string): string | null {
  const v = value.trim();
  if (!v) return 'Insira a chave API.';
  if (/\{\{|\$env|=\{|^=/.test(v)) return 'Use o valor bruto da chave, sem =, {{ }} ou $env.';
  if (keyName === 'SUPABASE_SERVICE_ROLE_KEY') {
    if (v.startsWith('eyJ') || v.split('.').length === 3)
      return 'Use a secret key sb_secret..., não a JWT service_role.';
    if (!v.startsWith('sb_secret'))
      return 'A chave Supabase deve começar com sb_secret.';
  }
  if (keyName === 'ANTHROPIC_API_KEY' && !v.startsWith('sk-ant-'))
    return 'ANTHROPIC_API_KEY deve começar com sk-ant-.';
  return null;
}

export function CredentialKeysTab() {
  const { toast } = useToast();
  const [credentials, setCredentials] = useState<N8nCredentialRow[]>([]);
  const [loadingCreds, setLoadingCreds] = useState(true);
  const [credentialsError, setCredentialsError] = useState<string | null>(null);
  const [newKeyName, setNewKeyName] = useState<KeyName>('ANTHROPIC_API_KEY');
  const [newKeyValue, setNewKeyValue] = useState('');
  const [saving, setSaving] = useState(false);

  const loadCredentials = useCallback(async () => {
    setLoadingCreds(true);
    setCredentialsError(null);
    try {
      setCredentials(await listN8nCredentials());
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erro ao carregar chaves';
      setCredentialsError(msg);
      toast({ title: 'Falha ao carregar chaves', description: msg, variant: 'destructive' });
    } finally {
      setLoadingCreds(false);
    }
  }, [toast]);

  useEffect(() => { void loadCredentials(); }, [loadCredentials]);

  const handleSaveKey = async () => {
    const err = validateDraft(newKeyName, newKeyValue);
    if (err) { toast({ title: 'Chave inválida', description: err, variant: 'destructive' }); return; }
    setSaving(true);
    try {
      const expiresAt = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString();
      const cred = await createN8nCredential({
        keyName: newKeyName, value: newKeyValue.trim(), expiresAt,
        notes: `Adicionada via dashboard em ${new Date().toLocaleDateString('pt-PT')}`,
        remindDaysBefore: 30,
      });
      await activateN8nCredential(cred.id, true);
      toast({ title: `${newKeyName} guardada`, description: 'Chave ativa e disponível para os workflows.' });
      setNewKeyValue('');
      void loadCredentials();
    } catch (err) {
      toast({ title: 'Erro ao guardar', description: err instanceof Error ? err.message : 'Erro', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteKey = async (id: string) => {
    if (!confirm('Remover esta chave permanentemente?')) return;
    try {
      await deleteN8nCredential(id);
      toast({ title: 'Chave removida' });
      void loadCredentials();
    } catch (err) {
      toast({ title: 'Erro', description: err instanceof Error ? err.message : 'Erro', variant: 'destructive' });
    }
  };

  const anthropicKey = credentials.find((c) => c.key_name === 'ANTHROPIC_API_KEY' && c.status === 'active');
  const n8nKey = credentials.find((c) => c.key_name === 'N8N_API_KEY' && c.status === 'active');
  const supabaseKey = credentials.find((c) => c.key_name === 'SUPABASE_SERVICE_ROLE_KEY' && c.status === 'active');
  const draftError = validateDraft(newKeyName, newKeyValue);

  return (
    <div className="space-y-4">
      <p className="text-xs text-muted-foreground">
        Chaves encriptadas com AES-GCM. Os workflows leem do Supabase em runtime.
      </p>

      {loadingCreds && (
        <div className="flex items-center gap-2 py-3 text-xs text-muted-foreground">
          <Loader2 className="h-3.5 w-3.5 animate-spin" />A carregar chaves…
        </div>
      )}

      {!loadingCreds && credentialsError && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3">
          <p className="text-xs text-destructive">{credentialsError}</p>
          <Button size="sm" variant="ghost" className="mt-2 h-7 text-xs" onClick={() => void loadCredentials()}>
            Tentar novamente
          </Button>
        </div>
      )}

      {!loadingCreds && !credentialsError && (
        <div className="space-y-2">
          <div className="divide-y divide-border/40 rounded-xl border border-border/40 bg-muted/20">
            {[
              { key: anthropicKey, label: 'ANTHROPIC_API_KEY', warn: false },
              { key: supabaseKey, label: 'SUPABASE_SERVICE_ROLE_KEY', warn: false },
              { key: n8nKey, label: 'N8N_API_KEY', warn: true },
            ].map(({ key, label, warn }) => (
              <div key={label} className="flex min-w-0 items-center gap-2 px-3 py-2.5">
                {key ? (
                  <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-emerald-500" />
                ) : (
                  <AlertTriangle className={`h-3.5 w-3.5 shrink-0 ${warn ? 'text-amber-500' : 'text-destructive'}`} />
                )}
                <span className={`min-w-0 truncate text-xs font-mono font-medium ${key ? 'text-foreground' : warn ? 'text-amber-600 dark:text-amber-400' : 'text-destructive'}`}>
                  {label}
                </span>
                {key && (
                  <span className="ml-auto shrink-0 text-[11px] text-muted-foreground">
                    ativa · {new Date(key.activated_at ?? key.created_at).toLocaleDateString('pt-PT')}
                  </span>
                )}
                {!key && warn && (
                  <span className="ml-auto shrink-0 text-[11px] text-muted-foreground">env var (fallback)</span>
                )}
                {key && (
                  <Button size="icon" variant="ghost" className="h-6 w-6 shrink-0 text-muted-foreground hover:text-destructive" onClick={() => void handleDeleteKey(key.id)}>
                    <Trash2 className="h-3 w-3" />
                  </Button>
                )}
              </div>
            ))}
          </div>

          {supabaseKey && (
            <p className="rounded-lg border border-amber-500/20 bg-amber-500/5 px-3 py-2 text-[11px] text-amber-700 dark:text-amber-400">
              Guardar a chave aqui ativa o vault do portal, mas não altera a variável de ambiente do n8n. WF-01 e WF-02 leem <code className="font-mono">$env.SUPABASE_SERVICE_ROLE_KEY</code> no runtime do n8n.
            </p>
          )}
        </div>
      )}

      <form
        className="space-y-2 rounded-xl border border-border/50 bg-card p-3"
        onSubmit={(e) => { e.preventDefault(); void handleSaveKey(); }}
        autoComplete="off"
      >
        <p className="text-xs font-medium text-foreground">Adicionar / atualizar chave</p>
        <select
          className="h-8 w-full rounded-lg border border-border bg-muted px-2 text-xs text-foreground"
          value={newKeyName}
          onChange={(e) => setNewKeyName(e.target.value as KeyName)}
        >
          <option value="ANTHROPIC_API_KEY">ANTHROPIC_API_KEY (Claude IA)</option>
          <option value="SUPABASE_SERVICE_ROLE_KEY">SUPABASE_SERVICE_ROLE_KEY</option>
        </select>
        <div className="flex gap-2">
          <Input
            type="password"
            placeholder={newKeyName === 'ANTHROPIC_API_KEY' ? 'sk-ant-...' : 'sb_secret_...'}
            className="h-8 flex-1 font-mono text-xs"
            value={newKeyValue}
            onChange={(e) => setNewKeyValue(e.target.value)}
            autoComplete="new-password"
          />
          <Button type="submit" size="sm" className="h-8 shrink-0 text-xs" disabled={saving || Boolean(draftError)}>
            {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Guardar'}
          </Button>
        </div>
        {draftError && newKeyValue && (
          <p className="text-[11px] text-destructive">{draftError}</p>
        )}
        <p className="text-[11px] text-muted-foreground">
          {newKeyName === 'ANTHROPIC_API_KEY'
            ? 'console.anthropic.com → API Keys. Usado pelo WF-03 para gerar artigos.'
            : 'Supabase → Settings → API → Secret keys. Use sb_secret..., não eyJ...'}
        </p>
      </form>
    </div>
  );
}
