import { Link } from 'react-router-dom';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';

const NotFound = () => {
  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <Header />

      <main className="flex flex-1 items-center justify-center px-4 py-20">
        <div className="text-center max-w-md">
          <p className="text-8xl font-bold text-primary/20 dark:text-primary/10 select-none leading-none mb-2">
            404
          </p>
          <h1 className="text-2xl font-bold text-foreground mb-3">
            Página não encontrada
          </h1>
          <p className="text-muted-foreground mb-8 leading-relaxed">
            O endereço que procura não existe ou foi removido.
            Verifique o URL ou volte ao início.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              to="/"
              className="inline-flex items-center rounded-md bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              Voltar ao início
            </Link>
            <Link
              to="/tecnologia"
              className="inline-flex items-center rounded-md border border-border bg-background px-5 py-2.5 text-sm font-semibold text-foreground hover:bg-muted transition-colors"
            >
              Ver artigos
            </Link>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default NotFound;
