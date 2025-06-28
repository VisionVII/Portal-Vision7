
import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';

const CookieBanner = () => {
  const [isVisible, setIsVisible] = useState(false);
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    const cookieConsent = localStorage.getItem('cookie-consent');
    if (!cookieConsent) {
      setIsVisible(true);
    }
  }, []);

  const acceptAllCookies = () => {
    localStorage.setItem('cookie-consent', 'all');
    setIsVisible(false);
  };

  const acceptEssentialOnly = () => {
    localStorage.setItem('cookie-consent', 'essential');
    setIsVisible(false);
  };

  const rejectAll = () => {
    localStorage.setItem('cookie-consent', 'rejected');
    setIsVisible(false);
  };

  if (!isVisible) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white shadow-2xl border-t z-50">
      <div className="container mx-auto p-4">
        <div className="flex justify-between items-start">
          <div className="flex-1 pr-4">
            <h3 className="font-bold text-lg mb-2">Política de Cookies</h3>
            <p className="text-gray-700 mb-4">
              Este website utiliza cookies para melhorar a sua experiência de navegação. 
              Utilizamos cookies essenciais para o funcionamento do site e cookies de análise 
              para compreender como interage com o nosso conteúdo.
            </p>
            
            {showDetails && (
              <div className="bg-gray-50 p-4 rounded-lg mb-4 text-sm">
                <h4 className="font-semibold mb-2">Tipos de Cookies:</h4>
                <ul className="space-y-2">
                  <li><strong>Cookies Essenciais:</strong> Necessários para o funcionamento básico do website.</li>
                  <li><strong>Cookies de Análise:</strong> Ajudam-nos a compreender como utiliza o nosso website.</li>
                  <li><strong>Cookies de Publicidade:</strong> Utilizados para mostrar anúncios relevantes.</li>
                  <li><strong>Cookies de Terceiros:</strong> Serviços externos como Google Analytics.</li>
                </ul>
                <p className="mt-2">
                  Pode alterar as suas preferências a qualquer momento através das 
                  configurações do seu navegador. Para mais informações, consulte a nossa 
                  <a href="/politica-privacidade" className="text-portugal-green underline ml-1">
                    Política de Privacidade
                  </a>.
                </p>
              </div>
            )}

            <div className="flex flex-wrap gap-3">
              <button
                onClick={acceptAllCookies}
                className="bg-portugal-green text-white px-6 py-2 rounded-lg hover:bg-green-700 transition-colors"
              >
                Aceitar Todos
              </button>
              <button
                onClick={acceptEssentialOnly}
                className="bg-gray-200 text-gray-800 px-6 py-2 rounded-lg hover:bg-gray-300 transition-colors"
              >
                Apenas Essenciais
              </button>
              <button
                onClick={rejectAll}
                className="bg-portugal-red text-white px-6 py-2 rounded-lg hover:bg-red-700 transition-colors"
              >
                Rejeitar Todos
              </button>
              <button
                onClick={() => setShowDetails(!showDetails)}
                className="text-portugal-green underline px-2 py-2"
              >
                {showDetails ? 'Menos Detalhes' : 'Mais Detalhes'}
              </button>
            </div>
          </div>
          
          <button
            onClick={() => setIsVisible(false)}
            className="text-gray-500 hover:text-gray-700 p-1"
          >
            <X size={24} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default CookieBanner;
