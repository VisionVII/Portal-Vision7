import { Link } from 'react-router-dom';
import { Home, Cpu, Globe, Heart, Music, Trophy, ArrowRight } from 'lucide-react';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';

const CATEGORIES = [
  { label: 'Tecnologia', href: '/tecnologia', icon: Cpu, color: 'text-blue-500', bg: 'bg-blue-500/8 hover:bg-blue-500/15 border-blue-500/20' },
  { label: 'Mundo', href: '/mundo', icon: Globe, color: 'text-amber-500', bg: 'bg-amber-500/8 hover:bg-amber-500/15 border-amber-500/20' },
  { label: 'Saúde', href: '/saude', icon: Heart, color: 'text-emerald-500', bg: 'bg-emerald-500/8 hover:bg-emerald-500/15 border-emerald-500/20' },
  { label: 'Música', href: '/musica', icon: Music, color: 'text-violet-500', bg: 'bg-violet-500/8 hover:bg-violet-500/15 border-violet-500/20' },
  { label: 'Desporto', href: '/desporto', icon: Trophy, color: 'text-red-500', bg: 'bg-red-500/8 hover:bg-red-500/15 border-red-500/20' },
];

const NotFound = () => (
  <div className="flex min-h-screen flex-col bg-background">
    <Header />

    <main className="flex flex-1 flex-col items-center justify-center px-4 py-16 sm:py-24">
      {/* Background orbs */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute left-1/4 top-1/4 h-64 w-64 -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/6 blur-3xl sm:h-96 sm:w-96" />
        <div className="absolute right-1/4 bottom-1/3 h-48 w-48 rounded-full bg-violet-500/5 blur-3xl sm:h-72 sm:w-72" />
      </div>

      <div className="relative z-10 mx-auto w-full max-w-2xl text-center">
        {/* 404 number */}
        <div className="relative mb-4 select-none">
          <p className="bg-gradient-to-b from-foreground/20 to-transparent bg-clip-text text-[8rem] font-black leading-none tracking-tighter text-transparent sm:text-[12rem]">
            404
          </p>
          <div className="absolute inset-0 flex items-center justify-center">
            <p className="text-[8rem] font-black leading-none tracking-tighter text-primary/10 blur-sm sm:text-[12rem]">
              404
            </p>
          </div>
        </div>

        {/* Message */}
        <h1 className="mb-3 text-2xl font-bold text-foreground sm:text-3xl">
          Página não encontrada
        </h1>
        <p className="mx-auto mb-8 max-w-md text-sm leading-relaxed text-muted-foreground sm:text-base">
          O endereço que procura não existe ou foi removido. Explore uma das nossas categorias ou volte ao início.
        </p>

        {/* Primary CTAs */}
        <div className="mb-12 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Link
            to="/"
            className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-primary px-6 text-sm font-semibold text-primary-foreground shadow-md shadow-primary/20 transition-all hover:bg-primary/90 hover:shadow-primary/30 sm:w-auto"
          >
            <Home className="h-4 w-4" />
            Voltar ao início
          </Link>
          <Link
            to="/tecnologia"
            className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-border bg-card px-6 text-sm font-semibold text-foreground transition-colors hover:bg-muted sm:w-auto"
          >
            Ver artigos
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        {/* Category grid */}
        <div>
          <p className="mb-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground/60">
            Explore as categorias
          </p>
          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-5">
            {CATEGORIES.map(({ label, href, icon: Icon, color, bg }) => (
              <Link
                key={href}
                to={href}
                className={`flex flex-col items-center gap-2 rounded-xl border px-3 py-4 text-xs font-semibold transition-all ${bg}`}
              >
                <Icon className={`h-5 w-5 ${color}`} />
                <span className="text-foreground">{label}</span>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </main>

    <Footer />
  </div>
);

export default NotFound;
