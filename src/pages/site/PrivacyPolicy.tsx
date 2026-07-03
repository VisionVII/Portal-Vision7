import React, { useMemo } from 'react';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import SectionPageHero from '@/components/content/SectionPageHero';
import { useSiteSettings } from '@/hooks/useSiteSettings';
import { parseSectionPageBanners, SECTION_PAGE_BANNERS_KEY } from '@/lib/sectionPageConfig';

const TOC = [
  { id: 'section-1', label: '1. Introdução' },
  { id: 'section-2', label: '2. Informações que Recolhemos' },
  { id: 'section-3', label: '3. Como Utilizamos as Suas Informações' },
  { id: 'section-4', label: '4. Geolocalização' },
  { id: 'section-5', label: '5. Política de Cookies' },
  { id: 'section-6', label: '6. Segurança de Dados' },
  { id: 'section-7', label: '7. Retenção de Dados' },
  { id: 'section-8', label: '8. Os Seus Direitos' },
  { id: 'section-9', label: '9. Partilha com Terceiros' },
  { id: 'section-10', label: '10. Contacto' },
  { id: 'section-11', label: '11. Alterações a Esta Política' },
];

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

      <div className="py-10 sm:py-14">
        <div className="container mx-auto px-4">
          <div className="mx-auto max-w-5xl">
            <div className="flex gap-8 lg:gap-12">

              {/* Sticky TOC — desktop only */}
              <aside className="hidden w-56 shrink-0 lg:block">
                <div className="sticky top-24">
                  <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground/60">
                    Nesta página
                  </p>
                  <nav className="space-y-1">
                    {TOC.map(({ id, label }) => (
                      <a
                        key={id}
                        href={`#${id}`}
                        className="block rounded-md px-2 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                      >
                        {label}
                      </a>
                    ))}
                  </nav>
                </div>
              </aside>

              {/* Content */}
              <div className="min-w-0 flex-1 space-y-6">

                <Card id="section-1">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base sm:text-lg">1. Introdução</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3 text-sm leading-relaxed text-muted-foreground">
                    <p>
                      Bem-vindo ao Vision7 ("nós", "nosso"). Estamos comprometidos em proteger a sua privacidade e garantir transparência sobre como tratamos os seus dados. Esta política descreve como recolhemos, utilizamos, divulgamos e protegemos as suas informações pessoais.
                    </p>
                    <p>
                      Conformamo-nos com o Regulamento Geral de Proteção de Dados (RGPD) da União Europeia (UE 2016/679) e com a Lei Geral de Proteção de Dados (LGPD) do Brasil (Lei 13.709/2018), uma vez que o portal serve utilizadores em Portugal e no Brasil.
                    </p>
                  </CardContent>
                </Card>

                <Card id="section-2">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base sm:text-lg">2. Informações que Recolhemos</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4 text-sm">
                    <div>
                      <h4 className="mb-1.5 font-semibold text-foreground">Informações de Navegação</h4>
                      <p className="mb-2 text-muted-foreground">Recolhemos automaticamente informações sobre como utiliza o nosso site, incluindo:</p>
                      <ul className="space-y-1 text-muted-foreground">
                        {['Endereço IP', 'Tipo de navegador e versão', 'Páginas visitadas', 'Tempo gasto em cada página', 'Informação de referência', 'Data e hora da visita'].map((item) => (
                          <li key={item} className="flex items-start gap-2">
                            <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-muted-foreground/40" />
                            {item}
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <h4 className="mb-1.5 font-semibold text-foreground">Informações de Localização</h4>
                      <p className="text-muted-foreground">Com a sua permissão explícita, podemos recolher informações sobre a sua localização geográfica (timezone, país, cidade) para fornecer conteúdo personalizado.</p>
                    </div>
                    <div>
                      <h4 className="mb-1.5 font-semibold text-foreground">Informações de Newsletter</h4>
                      <p className="text-muted-foreground">Quando se subscreve à nossa newsletter, recolhemos o seu endereço de email e a data de subscrição.</p>
                    </div>
                    <div>
                      <h4 className="mb-1.5 font-semibold text-foreground">Cookies</h4>
                      <p className="text-muted-foreground">Utilizamos cookies para melhorar a sua experiência no site. Consulte a secção 5 para mais informações.</p>
                    </div>
                  </CardContent>
                </Card>

                <Card id="section-3">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base sm:text-lg">3. Como Utilizamos as Suas Informações</CardTitle>
                  </CardHeader>
                  <CardContent className="text-sm">
                    <p className="mb-3 text-foreground">Utilizamos as informações recolhidas para:</p>
                    <ul className="space-y-2 text-muted-foreground">
                      {[
                        'Fornecer, manter e melhorar o nosso serviço',
                        'Enviar comunicações relacionadas com a newsletter',
                        'Personalizar o conteúdo com base na sua localização (com consentimento)',
                        'Análise de tendências, administração do site e recolha de informações demográficas',
                        'Cumprir obrigações legais',
                        'Proteger contra atividades fraudulentas',
                      ].map((item) => (
                        <li key={item} className="flex items-start gap-2">
                          <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-muted-foreground/40" />
                          {item}
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>

                <Card id="section-4">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base sm:text-lg">4. Geolocalização e Dados de Localização</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3 text-sm text-muted-foreground">
                    <p>Utilizamos a Geolocalização (timezone, coordenadas geográficas) apenas após obter o seu consentimento explícito através do nosso popup de permissões.</p>
                    <p>A geolocalização é utilizada para:</p>
                    <ul className="space-y-1">
                      {['Exibir a hora atual da sua localização', 'Fornecer informações de notícias localizadas', 'Melhorias personalizadas da experiência do utilizador'].map((item) => (
                        <li key={item} className="flex items-start gap-2">
                          <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-muted-foreground/40" />
                          {item}
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>

                <Card id="section-5">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base sm:text-lg">5. Política de Cookies</CardTitle>
                  </CardHeader>
                  <CardContent className="text-sm">
                    <p className="mb-4 text-muted-foreground">Utilizamos três tipos de cookies:</p>
                    <div className="space-y-3">
                      {[
                        { title: 'Cookies Essenciais', body: 'Necessários para o funcionamento básico do site. Não requerem consentimento.' },
                        { title: 'Cookies de Análise', body: 'Utilizados para entender como utiliza o nosso site e melhorar o serviço.' },
                        { title: 'Cookies de Marketing', body: 'Utilizados para rastrear anúncios e entender a eficácia de campanhas de marketing.' },
                      ].map(({ title, body }) => (
                        <div key={title} className="rounded-lg border border-border/60 bg-muted/20 px-4 py-3">
                          <p className="font-semibold text-foreground">{title}</p>
                          <p className="mt-1 text-muted-foreground">{body}</p>
                        </div>
                      ))}
                      <div className="rounded-lg border border-border/60 bg-muted/20 px-4 py-3">
                        <p className="font-semibold text-foreground">Cookies de Publicidade (Google AdSense)</p>
                        <p className="mt-1 text-muted-foreground">
                          O Vision7 utiliza o Google AdSense para apresentar publicidade. O Google pode utilizar cookies de terceiros para exibir anúncios personalizados. Pode desativar em{' '}
                          <a
                            href="https://www.google.com/settings/ads"
                            target="_blank"
                            rel="noopener noreferrer nofollow"
                            className="break-all text-primary underline underline-offset-2 hover:text-primary/80"
                          >
                            google.com/settings/ads
                          </a>.
                        </p>
                      </div>
                    </div>
                    <p className="mt-4 text-muted-foreground">Todos os cookies, exceto os essenciais, requerem o seu consentimento explícito.</p>
                    <button
                      onClick={() => window.dispatchEvent(new CustomEvent('open-cookie-preferences'))}
                      className="mt-4 inline-flex h-9 items-center rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
                    >
                      Gerir preferências de cookies
                    </button>
                  </CardContent>
                </Card>

                <Card id="section-6">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base sm:text-lg">6. Segurança de Dados</CardTitle>
                  </CardHeader>
                  <CardContent className="text-sm">
                    <p className="mb-3 text-muted-foreground">Implementamos medidas de segurança técnicas e organizacionais para proteger as suas informações pessoais. Isto inclui:</p>
                    <ul className="space-y-1 text-muted-foreground">
                      {['Encriptação de dados em trânsito (SSL/TLS)', 'Controlo de acesso rigoroso', 'Auditorias de segurança regulares', 'Conformidade com normas internacionais de segurança'].map((item) => (
                        <li key={item} className="flex items-start gap-2">
                          <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-muted-foreground/40" />
                          {item}
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>

                <Card id="section-7">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base sm:text-lg">7. Retenção de Dados</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3 text-sm text-muted-foreground">
                    <p>Retemos as suas informações pessoais apenas pelo tempo necessário para cumprir as finalidades descritas nesta política, cumprir obrigações legais e resolver disputas.</p>
                    <p>Quando os dados já não são necessários, são eliminados ou anonimizados de forma segura.</p>
                  </CardContent>
                </Card>

                <Card id="section-8">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base sm:text-lg">8. Os Seus Direitos</CardTitle>
                  </CardHeader>
                  <CardContent className="text-sm">
                    <p className="mb-3 text-foreground font-medium">De acordo com o RGPD e LGPD, tem o direito a:</p>
                    <ul className="space-y-2 text-muted-foreground">
                      {[
                        ['Direito de Acesso', 'Solicitar acesso aos dados pessoais que mantemos'],
                        ['Direito de Retificação', 'Corrigir dados incorretos ou incompletos'],
                        ['Direito de Eliminação', 'Solicitar a eliminação dos seus dados (direito ao esquecimento)'],
                        ['Direito à Portabilidade', 'Receber e transferir os seus dados para outro serviço'],
                        ['Direito de Oposição', 'Objetar ao processamento dos seus dados'],
                        ['Direito de Consentimento', 'Retirar o consentimento a qualquer momento'],
                      ].map(([title, desc]) => (
                        <li key={title} className="flex items-start gap-2">
                          <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-muted-foreground/40" />
                          <span><strong className="text-foreground">{title}:</strong> {desc}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>

                <Card id="section-9">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base sm:text-lg">9. Partilha com Terceiros</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3 text-sm text-muted-foreground">
                    <p>Não vendemos, comercializamos ou transferimos os seus dados pessoais para terceiros sem o seu consentimento explícito, exceto quando obrigados por lei.</p>
                    <p>Podemos partilhar dados com fornecedores de serviços que nos ajudam a operar o website, sob acordos de proteção de dados apropriados.</p>
                  </CardContent>
                </Card>

                <Card id="section-10">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base sm:text-lg">10. Contacto</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4 text-sm">
                    <p className="text-muted-foreground">Se tem perguntas sobre esta Política de Privacidade, contacte-nos:</p>
                    <div className="rounded-lg border border-border bg-muted/30 p-4">
                      <div className="space-y-1.5 text-sm">
                        <p><span className="font-semibold text-foreground">Email:</span> <span className="text-muted-foreground">privacidade@vision7.pt</span></p>
                        <p><span className="font-semibold text-foreground">Website:</span> <span className="text-muted-foreground">portal.vision7.pt</span></p>
                        <p><span className="font-semibold text-foreground">País:</span> <span className="text-muted-foreground">Portugal</span></p>
                      </div>
                    </div>
                    <p className="text-muted-foreground">
                      Pode apresentar uma reclamação junto da autoridade competente: <strong className="text-foreground">CNPD</strong> (Portugal) ou <strong className="text-foreground">ANPD</strong> (Brasil).
                    </p>
                  </CardContent>
                </Card>

                <Card id="section-11">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base sm:text-lg">11. Alterações a Esta Política</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">
                      Podemos atualizar esta Política de Privacidade periodicamente. Notificaremos de alterações significativas publicando a nova política no website e atualizando a data acima.
                    </p>
                  </CardContent>
                </Card>

                {/* Compliance banner */}
                <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 sm:p-5">
                  <p className="text-sm text-foreground/80">
                    <strong className="text-foreground">Conformidade:</strong> Esta política está em conformidade com o RGPD (UE 2016/679), a LGPD brasileira (Lei 13.709/2018) e as Políticas do Programa Google AdSense.
                  </p>
                </div>

              </div>
            </div>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
};

export default PrivacyPolicy;
