
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, LogIn } from 'lucide-react';

const AdminLogin = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    // TODO: Implementar autenticação com Supabase
    console.log('Login attempt:', { email, password });
    
    // Simulação de login
    setTimeout(() => {
      setIsLoading(false);
      alert('Funcionalidade de login será implementada após conectar ao Supabase');
    }, 1000);
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <Link to="/" className="inline-flex items-center text-portugal-green hover:text-portugal-green/80 mb-4">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Voltar ao site
          </Link>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Porto Notícias</h1>
          <p className="text-gray-600">Área administrativa</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <LogIn className="mr-2 h-5 w-5" />
              Login Administrativo
            </CardTitle>
            <CardDescription>
              Acesso restrito para administradores do site
            </CardDescription>
          </CardHeader>
          
          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="admin@portonoticias.pt"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="password">Senha</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Digite sua senha"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
            </CardContent>
            
            <CardFooter>
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? 'Entrando...' : 'Entrar'}
              </Button>
            </CardFooter>
          </form>
        </Card>

        <div className="mt-6 text-center text-sm text-gray-500">
          <p>⚠️ Para ativar a funcionalidade de login, conecte o projeto ao Supabase</p>
        </div>
      </div>
    </div>
  );
};

export default AdminLogin;
