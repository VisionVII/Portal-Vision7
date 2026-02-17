
import React from 'react';
import { Link } from 'react-router-dom';
import NewsletterForm from './NewsletterForm';

const Footer = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-gray-900 text-white">
      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {/* Logo e Descrição */}
          <div className="space-y-4">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-portugal-red rounded-full flex items-center justify-center">
                <span className="text-white font-bold">PN</span>
              </div>
              <h3 className="text-xl font-bold">Porto Notícias</h3>
            </div>
            <p className="text-gray-300 text-sm">
              O seu portal de informação confiável em Portugal. 
              Notícias atualizadas sobre tecnologia, desporto, música, saúde e mundo.
            </p>
          </div>

          {/* Categorias */}
          <div>
            <h4 className="text-lg font-semibold mb-4">Categorias</h4>
            <ul className="space-y-2 text-gray-300">
              <li><Link to="/tecnologia" className="hover:text-white transition-colors">Tecnologia</Link></li>
              <li><Link to="/desporto" className="hover:text-white transition-colors">Desporto</Link></li>
              <li><Link to="/musica" className="hover:text-white transition-colors">Música</Link></li>
              <li><Link to="/saude" className="hover:text-white transition-colors">Saúde</Link></li>
              <li><Link to="/mundo" className="hover:text-white transition-colors">Mundo</Link></li>
            </ul>
          </div>

          {/* Links Úteis */}
          <div>
            <h4 className="text-lg font-semibold mb-4">Links Úteis</h4>
            <ul className="space-y-2 text-gray-300">
              <li><Link to="/sobre" className="hover:text-white transition-colors">Sobre Nós</Link></li>
              <li><Link to="/contacto" className="hover:text-white transition-colors">Contacto</Link></li>
              <li><Link to="/politica-privacidade" className="hover:text-white transition-colors">Política de Privacidade</Link></li>
              <li><Link to="/termos" className="hover:text-white transition-colors">Termos de Uso</Link></li>
            </ul>
          </div>

          {/* Newsletter */}
          <div>
            <h4 className="text-lg font-semibold mb-4">Newsletter</h4>
            <p className="text-gray-300 text-sm mb-4">
              Receba as últimas notícias diretamente no seu email
            </p>
            <div className="space-y-2">
              <NewsletterForm variant="footer" />
            </div>
          </div>
        </div>

        <div className="border-t border-gray-800 mt-8 pt-8 flex flex-col md:flex-row justify-between items-center">
          <p className="text-gray-400 text-sm">
            © {currentYear} Porto Notícias. Todos os direitos reservados.
          </p>
          <div className="flex space-x-6 mt-4 md:mt-0">
            <a href="#" className="text-gray-400 hover:text-white transition-colors">Facebook</a>
            <a href="#" className="text-gray-400 hover:text-white transition-colors">Twitter</a>
            <a href="#" className="text-gray-400 hover:text-white transition-colors">Instagram</a>
            <a href="#" className="text-gray-400 hover:text-white transition-colors">LinkedIn</a>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
