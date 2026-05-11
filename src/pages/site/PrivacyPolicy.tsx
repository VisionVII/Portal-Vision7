import React, { useMemo } from 'react';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import SectionPageHero from '@/components/content/SectionPageHero';
import { useSiteSettings } from '@/hooks/useSiteSettings';
import { parseSectionPageBanners, SECTION_PAGE_BANNERS_KEY } from '@/lib/sectionPageConfig';

const PrivacyPolicy = () => {
  const { data: siteSettings } = useSiteSettings();
  const sectionPageBanners = useMemo(
    () => parseSectionPageBanners(siteSettings?.[SECTION_PAGE_BANNERS_KEY]),
    [siteSettings],
  );
  const privacyHero = sectionPageBanners.privacy;
  const updatedAt = new Date().toLocaleDateString('pt-PT');

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Header />

      <SectionPageHero
        title="Política de Privacidade"
        description="Explicamos com transparência como o portal recolhe, utiliza e protege dados, preferências e permissões do utilizador em conformidade com RGPD e LGPD."
        align="left"
        fallbackClassName="bg-gradient-to-br from-primary-900 via-primary-800 to-secondary-800"
        media={privacyHero.bannerUrl || privacyHero.mobileBannerUrl ? {
          desktopUrl: privacyHero.bannerUrl,
          mobileUrl: privacyHero.mobileBannerUrl,
          alt: 'Banner da página de política de privacidade',
        } : null}
        metaSlot={(
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full border border-white/15 bg-white/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.22em] text-white/88 backdrop-blur-sm">
              Legal & Transparência
            </span>
            <span className="rounded-full bg-white/12 px-3 py-1 text-xs font-semibold text-white/90 backdrop-blur-sm">
              Atualizado em {updatedAt}
            </span>
          </div>
        )}
      />

      <div className="py-12">
        <div className="container mx-auto px-4">
          <div className="mx-auto max-w-4xl">

          <div className="space-y-8">
            {/* Introdução */}
            <Card>
              <CardHeader>
                <CardTitle>1. Introdução</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p>
                  Bem-vindo ao Vision7 ("nós", "nosso"). Estamos comprometidos em proteger a sua privacidade e garantir transparência sobre como tratamos os seus dados. Esta política descreve como recolhemos, utilizamos, divulgamos e protegemos as suas informações pessoais.
                </p>
                <p>
                  Conformamo-nos com o Regulamento Geral de Proteção de Dados (RGPD) da União Europeia (UE 2016/679) e com a Lei Geral de Proteção de Dados (LGPD) do Brasil (Lei 13.709/2018), uma vez que o portal serve utilizadores em Portugal e no Brasil.
                </p>
              </CardContent>
            </Card>

            {/* Informações que Recolhemos */}
            <Card>
              <CardHeader>
                <CardTitle>2. Informações que Recolhemos</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h4 className="font-semibold mb-2">Informações de Navegação</h4>
                  <p className="text-sm text-muted-foreground">
                    Recolhemos automaticamente informações sobre como utiliza o nosso site, incluindo:
                  </p>
                  <ul className="list-disc list-inside mt-2 space-y-1 text-sm text-muted-foreground">
                    <li>Endereço IP</li>
                    <li>Tipo de navegador e versão</li>
                    <li>Páginas visitadas</li>
                    <li>Tempo gasto em cada página</li>
                    <li>Informação de referência</li>
                    <li>Data e hora da visita</li>
                  </ul>
                </div>

                <div>
                  <h4 className="font-semibold mb-2">Informações de Localização</h4>
                  <p className="text-sm text-muted-foreground">
                    Com a sua permissão explícita, podemos recolher informações sobre a sua localização geográfica (timezone, país, cidade) para fornecer conteúdo personalizado e melhorar a experiência do utilizador.
                  </p>
                </div>

                <div>
                  <h4 className="font-semibold mb-2">Informações de Newsletter</h4>
                  <p className="text-sm text-muted-foreground">
                    Quando se subscreve à nossa newsletter, recolhemos o seu endereço de email e a data de subscrição.
                  </p>
                </div>

                <div>
                  <h4 className="font-semibold mb-2">Cookies</h4>
                  <p className="text-sm text-muted-foreground">
                    Utilizamos cookies para melhorar a sua experiência no site. Pode consultar a nossa Política de Cookies para mais informações.
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Como Utilizamos as Suas Informações */}
            <Card>
              <CardHeader>
                <CardTitle>3. Como Utilizamos as Suas Informações</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p>Utilizamos as informações recolhidas para:</p>
                <ul className="list-disc list-inside space-y-2 text-sm text-muted-foreground">
                  <li>Fornecer, manter e melhorar o nosso serviço</li>
                  <li>Enviar comunicações relacionadas com a newsletters</li>
                  <li>Personalizar o conteúdo baseado na sua localização (com consentimento)</li>
                  <li>Análise de tendências, administração do site e recolha de informações demográficas</li>
                  <li>Cumprir obrigações legais</li>
                  <li>Proteger contra atividades fraudulentas</li>
                </ul>
              </CardContent>
            </Card>

            {/* Geolocalização */}
            <Card>
              <CardHeader>
                <CardTitle>4. Geolocalização e Dados de Localização</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p>
                  Utilizamos a Geolocalização da sua localização (timezone, coordenadas geográficas) apenas após obter o seu consentimento explícito através do nosso popup de permissões.
                </p>
                <p className="text-sm text-muted-foreground">
                  A geolocalização é utilizada para:
                </p>
                <ul className="list-disc list-inside mt-2 space-y-1 text-sm text-muted-foreground">
                  <li>Exibir a hora atual da sua localização</li>
                  <li>Fornecer informações de notícias localizadas</li>
                  <li>Melhorias personalizadas da experiência do utilizador</li>
                </ul>
              </CardContent>
            </Card>

            {/* Política de Cookies */}
            <Card>
              <CardHeader>
                <CardTitle>5. Política de Cookies</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p>Utilizamos três tipos de cookies:</p>
                
                <div className="space-y-3">
                  <div>
                    <h5 className="font-semibold text-sm">Cookies Essenciais</h5>
                    <p className="text-sm text-muted-foreground">
                      Necessários para o funcionamento básico do site. Não requerem consentimento.
                    </p>
                  </div>

                  <div>
                    <h5 className="font-semibold text-sm">Cookies de Análise</h5>
                    <p className="text-sm text-muted-foreground">
                      Utilizados para entender como utiliza o nosso site e melhorar o serviço.
                    </p>
                  </div>

                  <div>
                    <h5 className="font-semibold text-sm">Cookies de Marketing</h5>
                    <p className="text-sm text-muted-foreground">
                      Utilizados para rastrear anúncios e entender a eficácia das campanhas de marketing.
                    </p>
                  </div>

                  <div>
                    <h5 className="font-semibold text-sm">Cookies de Publicidade (Google AdSense)</h5>
                    <p className="text-sm text-muted-foreground">
                      O Vision7 utiliza o Google AdSense para apresentar publicidade. O Google pode utilizar cookies de terceiros (incluindo o cookie DoubleClick) para exibir anúncios personalizados com base nas suas visitas a este e outros sites. Pode desativar a publicidade personalizada em <a href="https://www.google.com/settings/ads" target="_blank" rel="noopener noreferrer nofollow" className="underline hover:text-foreground">google.com/settings/ads</a>.
                    </p>
                  </div>
                </div>

                <p className="text-sm text-muted-foreground mt-4">
                  Todos os cookies, exceto os essenciais, requerem o seu consentimento explícito.
                </p>

                <button
                  onClick={() => window.dispatchEvent(new CustomEvent('open-cookie-preferences'))}
                  className="mt-2 inline-flex items-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
                >
                  Gerir as minhas preferências de cookies
                </button>
              </CardContent>
            </Card>

            {/* Segurança de Dados */}
            <Card>
              <CardHeader>
                <CardTitle>6. Segurança de Dados</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p>
                  Implementamos medidas de segurança técnicas e organizacionais apropriadas para proteger as suas informações pessoais contra acesso não autorizado, alteração, divulgação ou destruição. Isto inclui:
                </p>
                <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                  <li>Encriptação de dados em trânsito (SSL/TLS)</li>
                  <li>Controlo de acesso rigoroso</li>
                  <li>Auditorias de segurança regulares</li>
                  <li>Conformidade com normas internacionais de segurança</li>
                </ul>
              </CardContent>
            </Card>

            {/* Retenção de Dados */}
            <Card>
              <CardHeader>
                <CardTitle>7. Retenção de Dados</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p>
                  Retemos as suas informações pessoais apenas pelo tempo necessário para:
                </p>
                <ul className="list-disc list-inside mt-2 space-y-1 text-sm text-muted-foreground">
                  <li>Cumprir as finalidades descritas nesta política</li>
                  <li>Cumprir obrigações legais</li>
                  <li>Resolver disputas</li>
                </ul>
                <p className="text-sm text-muted-foreground mt-4">
                  Quando os dados já não são necessários, são eliminados ou anonimizados de forma segura.
                </p>
              </CardContent>
            </Card>

            {/* Direitos do Utilizador */}
            <Card>
              <CardHeader>
                <CardTitle>8. Os Seus Direitos</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="font-semibold text-sm">De acordo com o RGPD e LGPD, tem o direito a:</p>
                <ul className="list-disc list-inside space-y-2 text-sm text-muted-foreground">
                  <li><strong>Direito de Acesso:</strong> Solicitar acesso aos dados pessoais que mantemos</li>
                  <li><strong>Direito de Retificação:</strong> Corrigir dados incorretos ou incompletos</li>
                  <li><strong>Direito de Eliminação:</strong> Solicitar a eliminação dos teus dados (direito ao esquecimento)</li>
                  <li><strong>Direito à Portabilidade:</strong> Receber e transferir os teus dados para outro serviço</li>
                  <li><strong>Direito de Oposição:</strong> Objetar ao processamento dos teus dados</li>
                  <li><strong>Direito de Consentimento:</strong> Retirar o consentimento a qualquer momento</li>
                </ul>
              </CardContent>
            </Card>

            {/* Terceiros */}
            <Card>
              <CardHeader>
                <CardTitle>9. Partilha com Terceiros</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p>
                  Não vendemos, comercializamos ou transferimos os seus dados pessoais para terceiros sem o seu consentimento explícito, exceto quando obrigados por lei.
                </p>
                <p className="text-sm text-muted-foreground">
                  Podemos partilhar dados com fornecedores de serviços que nos ajudam a operar o website e gerir o nosso negócio, sob acordos de proteção de dados apropriados.
                </p>
              </CardContent>
            </Card>

            {/* Contacto */}
            <Card>
              <CardHeader>
                <CardTitle>10. Contacto</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p>
                  Se tem perguntas sobre esta Política de Privacidade ou sobre como processamos os seus dados, por favor contacte-nos:
                </p>
                <div className="bg-muted p-4 rounded-lg text-sm space-y-2">
                  <p><strong>Email:</strong> privacidade@vision7.pt</p>
                  <p><strong>Website:</strong> vision7.pt</p>
                  <p><strong>País:</strong> Portugal</p>
                </div>
                <p className="text-sm text-muted-foreground">
                  Pode apresentar uma reclamação junto da autoridade de proteção de dados competente: <strong>CNPD</strong> (Portugal) ou <strong>ANPD</strong> (Brasil).
                </p>
              </CardContent>
            </Card>

            {/* Alterações */}
            <Card>
              <CardHeader>
                <CardTitle>11. Alterações a Esta Política</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Podemos atualizar esta Política de Privacidade periodicamente. Notificar-lhe-emos de alterações significativas publicando a nova política no website e atualizando a data de "Última atualização" acima.
                </p>
              </CardContent>
            </Card>
          </div>

          <div className="mt-12 rounded-lg border border-primary-200 bg-primary-50 p-6 dark:border-primary-800 dark:bg-primary-900/30">
            <p className="text-sm text-primary-900 dark:text-primary-100">
              <strong>Conformidade:</strong> Esta política está em conformidade com o RGPD (UE 2016/679), a LGPD brasileira (Lei 13.709/2018) e as Políticas do Programa Google AdSense.
            </p>
          </div>
        </div>
        </div>
      </div>

      <Footer />
    </div>
  );
};

export default PrivacyPolicy;
