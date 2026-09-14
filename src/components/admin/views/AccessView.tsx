import React from 'react';
import AdminAccessManager from '@/components/admin/AdminAccessManager';
import { MFASetup } from '@/components/admin/MFASetup';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ShieldCheck } from 'lucide-react';

const AccessView: React.FC = () => (
  <div className="space-y-6">
    {/* Top card: Two-factor authentication (MFA) */}
    <Card data-tour="access-mfa" className="border-border/60 shadow-sm overflow-hidden">
      <CardHeader className="pb-3 border-b border-border/30 bg-muted/20">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <div>
            <CardTitle className="text-sm font-semibold text-foreground">Segurança da Conta & 2FA</CardTitle>
            <CardDescription className="text-xs text-muted-foreground mt-0.5">
              Autenticação de dois fatores (TOTP via Google Authenticator ou similar) para contas de gestão.
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-4">
        <MFASetup />
      </CardContent>
    </Card>

    {/* Main Access & Team management */}
    <AdminAccessManager />
  </div>
);

export default AccessView;
