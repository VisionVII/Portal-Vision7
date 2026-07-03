
import React, { Suspense } from 'react';
import { Link } from 'react-router-dom';
const NewsletterForm = React.lazy(() => import('@/components/content/NewsletterForm'));
import { useSiteSettings } from '@/hooks/useSiteSettings';
import BrandLogo from '@/components/system/BrandLogo';

const Footer = () => {
  const currentYear = new Date().getFullYear();
  const { data: siteSettings } = useSiteSettings();

  return (
    <footer className="border-t border-border bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(241,245,249,0.96))] text-foreground dark:bg-[linear-gradient(180deg,rgba(3,13,31,0.96),rgba(2,8,23,0.98))] dark:text-white">
      <div className="container mx-auto px-4 py-12">
        <div className="mb-8 grid grid-cols-1 gap-6 sm:grid-cols-2 sm:gap-8 lg:grid-cols-4">
          {/* Logo e Descrição */}
          <div className="space-y-4">
            <Link to="/" className="hover:opacity-90 transition-opacity">
              <BrandLogo
                siteName={siteSettings?.site_name}
                logoUrl={siteSettings?.logo_url}
                compact
                showTagline={false}
              />
            </Link>
            <p className="text-sm leading-relaxed text-muted-foreground">
              Portal editorial com curadoria premium, cobrindo tecnologia, cultura, negócios, saúde e tendências globais.
            </p>
          </div>

          {/* Categorias */}
          <div>
            <h4 className="mb-3 text-xs font-semibold uppercase tracking-wider text-foreground/60 dark:text-white/60">Categorias</h4>
            <ul className="space-y-2.5 text-sm text-muted-foreground">
              <li><Link to="/tecnologia" className="transition-colors hover:text-foreground dark:hover:text-white">Tecnologia</Link></li>
              <li><Link to="/desporto" className="transition-colors hover:text-foreground dark:hover:text-white">Desporto</Link></li>
              <li><Link to="/musica" className="transition-colors hover:text-foreground dark:hover:text-white">Música</Link></li>
              <li><Link to="/saude" className="transition-colors hover:text-foreground dark:hover:text-white">Saúde</Link></li>
              <li><Link to="/mundo" className="transition-colors hover:text-foreground dark:hover:text-white">Mundo</Link></li>
            </ul>
          </div>

          {/* Links Úteis */}
          <div>
            <h4 className="mb-3 text-xs font-semibold uppercase tracking-wider text-foreground/60 dark:text-white/60">Portal</h4>
            <ul className="space-y-2.5 text-sm text-muted-foreground">
              <li><Link to="/" className="transition-colors hover:text-foreground dark:hover:text-white">Início</Link></li>
              <li><Link to="/sobre" className="transition-colors hover:text-foreground dark:hover:text-white">Sobre</Link></li>
              <li><Link to="/contacto" className="transition-colors hover:text-foreground dark:hover:text-white">Contacto</Link></li>
              <li><Link to="/politica-privacidade" className="transition-colors hover:text-foreground dark:hover:text-white">Política de Privacidade</Link></li>
              <li><button onClick={() => window.dispatchEvent(new CustomEvent('open-cookie-preferences'))} className="transition-colors hover:text-foreground dark:hover:text-white">Gerir Cookies</button></li>
            </ul>
          </div>

          {/* Newsletter */}
          <div>
            <h4 className="mb-3 text-xs font-semibold uppercase tracking-wider text-foreground/60 dark:text-white/60">Newsletter</h4>
            <p className="mb-3 text-sm text-muted-foreground">
              Receba as notícias mais importantes
            </p>
            <Suspense fallback={<div className="h-10 animate-pulse rounded bg-muted/30" />}>
              <NewsletterForm variant="footer" />
            </Suspense>
          </div>
        </div>

        <div className="flex flex-col items-center justify-between border-t border-border pt-8 md:flex-row">
          <p className="text-sm text-muted-foreground">
            © {currentYear} Vision7. Todos os direitos reservados.
          </p>
          <div className="mt-4 flex gap-4 sm:gap-6 md:mt-0">
            <a href="https://instagram.com" target="_blank" rel="noopener noreferrer" className="text-sm text-muted-foreground transition-colors hover:text-foreground dark:hover:text-white">Instagram</a>
            <a href="https://linkedin.com" target="_blank" rel="noopener noreferrer" className="text-sm text-muted-foreground transition-colors hover:text-foreground dark:hover:text-white">LinkedIn</a>
            <a href="https://x.com" target="_blank" rel="noopener noreferrer" className="text-sm text-muted-foreground transition-colors hover:text-foreground dark:hover:text-white">X</a>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
