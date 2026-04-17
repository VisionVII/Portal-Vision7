import React from 'react';
import AdminAccessManager from '@/components/admin/AdminAccessManager';
import { MFASetup } from '@/components/admin/MFASetup';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ShieldCheck } from 'lucide-react';

const AccessView: React.FC = () => (
  <div className="space-y-6">
    <Card className="border-border/40">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-5 w-5 text-primary" />
          <CardTitle className="text-base">Segurança da Conta</CardTitle>
        </div>
        <CardDescription>Gerir autenticação de dois fatores para a sua conta de administrador.</CardDescription>
      </CardHeader>
      <CardContent>
        <MFASetup />
      </CardContent>
    </Card>
    <AdminAccessManager />
  </div>
);

export default AccessView;
