import { useState } from 'react';
import { Shield, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useMFA } from '@/hooks/useMFA';

interface MFAChallengeProps {
  factorId: string;
  onVerified: () => void;
  onCancel: () => void;
}

export function MFAChallenge({ factorId, onVerified, onCancel }: MFAChallengeProps) {
  const mfa = useMFA();
  const [code, setCode] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (code.length !== 6) return;
    try {
      await mfa.verify(factorId, code);
      onVerified();
    } catch {
      setCode('');
    }
  };

  return (
    <div className="mx-auto max-w-sm space-y-6 rounded-2xl border border-border/50 bg-card p-6 shadow-lg">
      <div className="text-center">
        <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
          <Shield className="h-6 w-6 text-primary" />
        </div>
        <h2 className="text-lg font-semibold">Verificação em Dois Passos</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Introduza o código de 6 dígitos do seu autenticador.
        </p>
      </div>

      <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
        <Input
          type="text"
          inputMode="numeric"
          maxLength={6}
          placeholder="000000"
          value={code}
          onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
          className="text-center font-mono text-2xl tracking-[0.3em]"
          autoFocus
          autoComplete="one-time-code"
        />

        {mfa.error && (
          <p className="text-center text-xs text-red-500">{mfa.error}</p>
        )}

        <Button
          type="submit"
          className="w-full"
          disabled={code.length !== 6 || mfa.loading}
        >
          {mfa.loading ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Shield className="mr-2 h-4 w-4" />
          )}
          Verificar
        </Button>

        <Button
          type="button"
          variant="ghost"
          className="w-full text-sm"
          onClick={onCancel}
        >
          Cancelar
        </Button>
      </form>
    </div>
  );
}

export default MFAChallenge;
