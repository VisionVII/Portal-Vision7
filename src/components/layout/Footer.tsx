
import React from 'react';
import { Link } from 'react-router-dom';
import NewsletterForm from '@/components/content/NewsletterForm';
import { useSiteSettings } from '@/hooks/useSiteSettings';
import BrandLogo from '@/components/system/BrandLogo';

const Footer = () => {
  const currentYear = new Date().getFullYear();
  const { data: siteSettings } = useSiteSettings();

  return (
    <footer className="border-t border-primary-900/40 bg-gradient-to-br from-primary-900 via-neutral-950 to-primary-900 text-white">
      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-8">
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
            <p className="text-sm leading-relaxed text-primary-100/80">
              Portal editorial com curadoria premium, cobrindo tecnologia, cultura, negócios, saúde e tendências globais.
            </p>
          </div>

          {/* Categorias */}
          <div>
            <h4 className="text-lg font-semibold mb-4 text-white">Categorias</h4>
            <ul className="space-y-2 text-primary-100/75">
              <li><Link to="/tecnologia" className="transition-colors hover:text-secondary-200">Tecnologia</Link></li>
              <li><Link to="/desporto" className="transition-colors hover:text-secondary-200">Desporto</Link></li>
              <li><Link to="/musica" className="transition-colors hover:text-secondary-200">Música</Link></li>
              <li><Link to="/saude" className="transition-colors hover:text-secondary-200">Saúde</Link></li>
              <li><Link to="/mundo" className="transition-colors hover:text-secondary-200">Mundo</Link></li>
            </ul>
          </div>

          {/* Links Úteis */}
          <div>
            <h4 className="text-lg font-semibold mb-4 text-white">Links Úteis</h4>
            <ul className="space-y-2 text-primary-100/75">
              <li><Link to="/" className="transition-colors hover:text-secondary-200">Início</Link></li>
              <li><Link to="/podcasts" className="transition-colors hover:text-secondary-200">Podcasts</Link></li>
              <li><Link to="/admin/dashboard" className="transition-colors hover:text-secondary-200">Dashboard</Link></li>
              <li><Link to="/politica-privacidade" className="transition-colors hover:text-secondary-200">Política de Privacidade</Link></li>
            </ul>
          </div>

          {/* Newsletter */}
          <div>
            <h4 className="text-lg font-semibold mb-4 text-white">Newsletter</h4>
            <p className="mb-4 text-sm text-primary-100/80">
              Receba as notícias mais importantes
            </p>
            <NewsletterForm variant="footer" />
          </div>
        </div>

        <div className="border-t border-neutral-800 pt-8 flex flex-col md:flex-row justify-between items-center">
          <p className="text-sm text-primary-100/60">
            © {currentYear} Vision. Todos os direitos reservados.
          </p>
          <div className="mt-4 flex space-x-6 md:mt-0">
            <a href="#" className="text-sm text-primary-100/60 transition-colors hover:text-secondary-200">Facebook</a>
            <a href="#" className="text-sm text-primary-100/60 transition-colors hover:text-secondary-200">Twitter</a>
            <a href="#" className="text-sm text-primary-100/60 transition-colors hover:text-secondary-200">Instagram</a>
            <a href="#" className="text-sm text-primary-100/60 transition-colors hover:text-secondary-200">LinkedIn</a>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
