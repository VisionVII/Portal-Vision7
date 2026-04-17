import { useState, useEffect } from 'react';
import { Shield, ShieldCheck, ShieldOff, Copy, Loader2, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { useMFA, type MFAStatus } from '@/hooks/useMFA';

export function MFASetup() {
  const { toast } = useToast();
  const mfa = useMFA();

  const [status, setStatus] = useState<MFAStatus>('disabled');
  const [enrollData, setEnrollData] = useState<{
    factorId: string;
    qrCode: string;
    secret: string;
  } | null>(null);
  const [code, setCode] = useState('');
  const [factorId, setFactorId] = useState<string | null>(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const check = async () => {
      try {
        const s = await mfa.getStatus();
        setStatus(s);
        if (s !== 'disabled') {
          const factors = await mfa.getFactors();
          if (factors[0]) setFactorId(factors[0].id);
        }
      } catch {
        // ignore
      } finally {
        setChecking(false);
      }
    };
    void check();
  }, [mfa]);

  const handleEnroll = async () => {
    try {
      const data = await mfa.enroll('Vision7 Portal');
      setEnrollData({
        factorId: data.factorId,
        qrCode: data.qrCode,
        secret: data.secret,
      });
    } catch {
      toast({ title: 'Erro ao iniciar MFA', variant: 'destructive' });
    }
  };

  const handleVerify = async () => {
    if (!enrollData?.factorId || code.length !== 6) return;
    try {
      await mfa.verify(enrollData.factorId, code);
      setStatus('verified');
      setFactorId(enrollData.factorId);
      setEnrollData(null);
      setCode('');
      toast({ title: 'MFA ativado com sucesso!' });
    } catch {
      toast({ title: 'Código inválido', description: 'Verifique o código e tente novamente.', variant: 'destructive' });
    }
  };

  const handleDisable = async () => {
    if (!factorId) return;
    if (!confirm('Desativar autenticação de dois fatores? Isto reduz a segurança da sua conta.')) return;
    try {
      await mfa.unenroll(factorId);
      setStatus('disabled');
      setFactorId(null);
      toast({ title: 'MFA desativado' });
    } catch {
      toast({ title: 'Erro ao desativar MFA', variant: 'destructive' });
    }
  };

  const copySecret = () => {
    if (!enrollData?.secret) return;
    void navigator.clipboard.writeText(enrollData.secret);
    toast({ title: 'Chave copiada' });
  };

  if (checking) {
    return (
      <div className="flex items-center gap-2 py-4 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        Verificando estado MFA...
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {status === 'verified' ? (
            <ShieldCheck className="h-5 w-5 text-emerald-500" />
          ) : (
            <Shield className="h-5 w-5 text-muted-foreground" />
          )}
          <div>
            <h3 className="text-sm font-semibold">Autenticação de Dois Fatores (TOTP)</h3>
            <p className="text-xs text-muted-foreground">
              Proteja a sua conta com um código de verificação temporário.
            </p>
          </div>
        </div>
        <Badge
          variant="outline"
          className={status === 'verified'
            ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-600'
            : 'border-amber-500/20 bg-amber-500/10 text-amber-600'
          }
        >
          {status === 'verified' ? 'Ativo' : 'Desativado'}
        </Badge>
      </div>

      {/* Enrollment flow */}
      {status === 'disabled' && !enrollData && (
        <Button size="sm" onClick={() => void handleEnroll()} disabled={mfa.loading}>
          {mfa.loading ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <Shield className="mr-1.5 h-3.5 w-3.5" />}
          Ativar MFA
        </Button>
      )}

      {enrollData && (
        <div className="space-y-4 rounded-xl border border-border/40 bg-muted/20 p-4">
          <p className="text-sm font-medium">1. Leia o QR code com o seu autenticador (Google Authenticator, Authy, etc.)</p>
          <div className="flex justify-center">
            <img src={enrollData.qrCode} alt="QR Code MFA" className="h-48 w-48 rounded-lg border" />
          </div>

          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">Ou introduza manualmente esta chave:</p>
            <div className="flex items-center gap-2">
              <code className="flex-1 rounded border bg-muted px-3 py-1.5 text-xs font-mono break-all">
                {enrollData.secret}
              </code>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={copySecret}>
                <Copy className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="mfa-code" className="text-sm">2. Introduza o código de 6 dígitos</Label>
            <div className="flex items-center gap-2">
              <Input
                id="mfa-code"
                type="text"
                inputMode="numeric"
                maxLength={6}
                placeholder="000000"
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                className="w-32 font-mono text-center tracking-widest"
              />
              <Button
                size="sm"
                disabled={code.length !== 6 || mfa.loading}
                onClick={() => void handleVerify()}
              >
                {mfa.loading ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" />}
                Verificar
              </Button>
            </div>
          </div>

          {mfa.error && (
            <p className="text-xs text-red-500">{mfa.error}</p>
          )}
        </div>
      )}

      {/* Disable MFA */}
      {status === 'verified' && (
        <Button
          variant="outline"
          size="sm"
          className="text-destructive hover:text-destructive"
          onClick={() => void handleDisable()}
          disabled={mfa.loading}
        >
          <ShieldOff className="mr-1.5 h-3.5 w-3.5" />
          Desativar MFA
        </Button>
      )}
    </div>
  );
}

export default MFASetup;
