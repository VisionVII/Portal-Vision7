
import React from 'react';
import { Link } from 'react-router-dom';
import NewsletterForm from '@/components/content/NewsletterForm';
import { useSiteSettings } from '@/hooks/useSiteSettings';
import BrandLogo from '@/components/system/BrandLogo';

const Footer = () => {
  const currentYear = new Date().getFullYear();
  const { data: siteSettings } = useSiteSettings();

  return (
    <footer className="border-t border-white/10 bg-[#0c1529] text-white">
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
            <p className="text-sm leading-relaxed text-slate-400">
              Portal editorial com curadoria premium, cobrindo tecnologia, cultura, negócios, saúde e tendências globais.
            </p>
          </div>

          {/* Categorias */}
          <div>
            <h4 className="text-lg font-semibold mb-4 text-white">Categorias</h4>
            <ul className="space-y-2 text-slate-400">
              <li><Link to="/tecnologia" className="transition-colors hover:text-white">Tecnologia</Link></li>
              <li><Link to="/desporto" className="transition-colors hover:text-white">Desporto</Link></li>
              <li><Link to="/musica" className="transition-colors hover:text-white">Música</Link></li>
              <li><Link to="/saude" className="transition-colors hover:text-white">Saúde</Link></li>
              <li><Link to="/mundo" className="transition-colors hover:text-white">Mundo</Link></li>
            </ul>
          </div>

          {/* Links Úteis */}
          <div>
            <h4 className="text-lg font-semibold mb-4 text-white">Links Úteis</h4>
            <ul className="space-y-2 text-slate-400">
              <li><Link to="/" className="transition-colors hover:text-white">Início</Link></li>
              <li><Link to="/podcasts" className="transition-colors hover:text-white">Podcasts</Link></li>
              <li><Link to="/admin/dashboard" className="transition-colors hover:text-white">Dashboard</Link></li>
              <li><Link to="/politica-privacidade" className="transition-colors hover:text-white">Política de Privacidade</Link></li>
            </ul>
          </div>

          {/* Newsletter */}
          <div>
            <h4 className="text-lg font-semibold mb-4 text-white">Newsletter</h4>
            <p className="mb-4 text-sm text-slate-400">
              Receba as notícias mais importantes
            </p>
            <NewsletterForm variant="footer" />
          </div>
        </div>

        <div className="border-t border-white/10 pt-8 flex flex-col md:flex-row justify-between items-center">
          <p className="text-sm text-slate-500">
            © {currentYear} Vision. Todos os direitos reservados.
          </p>
          <div className="mt-4 flex space-x-6 md:mt-0">
            <a href="#" className="text-sm text-slate-500 transition-colors hover:text-white">Facebook</a>
            <a href="#" className="text-sm text-slate-500 transition-colors hover:text-white">Twitter</a>
            <a href="#" className="text-sm text-slate-500 transition-colors hover:text-white">Instagram</a>
            <a href="#" className="text-sm text-slate-500 transition-colors hover:text-white">LinkedIn</a>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
