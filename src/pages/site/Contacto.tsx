import React, { useState } from 'react';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import SectionPageHero from '@/components/content/SectionPageHero';
import { Mail, MapPin, Globe } from 'lucide-react';

const Contacto = () => {
  const [submitted, setSubmitted] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', subject: '', message: '' });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const mailto = `mailto:contacto@vision7.pt?subject=${encodeURIComponent(form.subject || 'Contacto via Vision7')}&body=${encodeURIComponent(`Nome: ${form.name}\nEmail: ${form.email}\n\n${form.message}`)}`;
    window.location.href = mailto;
    setSubmitted(true);
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Header />

      <SectionPageHero
        title="Contacto"
        description="Tem uma sugestão, quer colaborar ou tem uma história para partilhar? Estamos disponíveis."
        align="left"
        fallbackClassName="bg-gradient-to-br from-primary-900 via-primary-800 to-secondary-800"
        media={null}
        metaSlot={(
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full border border-white/15 bg-white/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.22em] text-white/88 backdrop-blur-sm">
              Fale Connosco
            </span>
          </div>
        )}
      />

      <div className="py-12">
        <div className="container mx-auto px-4">
          <div className="mx-auto max-w-4xl">
            <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">

              {/* Info de contacto */}
              <div className="space-y-4">
                <h2 className="font-editorial text-2xl font-bold">Informações</h2>

                <Card>
                  <CardContent className="flex items-start gap-3 p-5">
                    <Mail className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
                    <div>
                      <p className="font-semibold text-sm">Email</p>
                      <a href="mailto:contacto@vision7.pt" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                        contacto@vision7.pt
                      </a>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="flex items-start gap-3 p-5">
                    <Globe className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
                    <div>
                      <p className="font-semibold text-sm">Website</p>
                      <span className="text-sm text-muted-foreground">portal.vision7.pt</span>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="flex items-start gap-3 p-5">
                    <MapPin className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
                    <div>
                      <p className="font-semibold text-sm">País</p>
                      <span className="text-sm text-muted-foreground">Portugal</span>
                    </div>
                  </CardContent>
                </Card>

                <div className="rounded-lg border border-border bg-muted/40 p-4 text-xs text-muted-foreground leading-relaxed">
                  <strong className="block mb-1">Privacidade</strong>
                  Os dados submetidos neste formulário são utilizados exclusivamente para responder ao seu contacto e não são partilhados com terceiros.
                </div>
              </div>

              {/* Formulário */}
              <div className="lg:col-span-2">
                <Card>
                  <CardHeader>
                    <CardTitle>Enviar Mensagem</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {submitted ? (
                      <div className="py-8 text-center">
                        <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400">
                          <Mail className="h-6 w-6" />
                        </div>
                        <p className="font-semibold">Mensagem preparada!</p>
                        <p className="mt-1 text-sm text-muted-foreground">O seu cliente de email foi aberto com a mensagem pronta a enviar.</p>
                      </div>
                    ) : (
                      <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                          <div>
                            <label htmlFor="name" className="mb-1.5 block text-sm font-medium">
                              Nome <span className="text-destructive">*</span>
                            </label>
                            <input
                              id="name"
                              name="name"
                              type="text"
                              required
                              value={form.name}
                              onChange={handleChange}
                              placeholder="O seu nome"
                              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none ring-offset-background placeholder:text-muted-foreground focus:ring-2 focus:ring-ring focus:ring-offset-2"
                            />
                          </div>
                          <div>
                            <label htmlFor="email" className="mb-1.5 block text-sm font-medium">
                              Email <span className="text-destructive">*</span>
                            </label>
                            <input
                              id="email"
                              name="email"
                              type="email"
                              required
                              value={form.email}
                              onChange={handleChange}
                              placeholder="email@exemplo.com"
                              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none ring-offset-background placeholder:text-muted-foreground focus:ring-2 focus:ring-ring focus:ring-offset-2"
                            />
                          </div>
                        </div>

                        <div>
                          <label htmlFor="subject" className="mb-1.5 block text-sm font-medium">Assunto</label>
                          <select
                            id="subject"
                            name="subject"
                            value={form.subject}
                            onChange={handleChange}
                            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none ring-offset-background focus:ring-2 focus:ring-ring focus:ring-offset-2"
                          >
                            <option value="">Selecionar assunto...</option>
                            <option value="Sugestão Editorial">Sugestão Editorial</option>
                            <option value="Colaboração / Parceria">Colaboração / Parceria</option>
                            <option value="Publicidade">Publicidade</option>
                            <option value="Correção de Conteúdo">Correção de Conteúdo</option>
                            <option value="Questão Técnica">Questão Técnica</option>
                            <option value="Outro">Outro</option>
                          </select>
                        </div>

                        <div>
                          <label htmlFor="message" className="mb-1.5 block text-sm font-medium">
                            Mensagem <span className="text-destructive">*</span>
                          </label>
                          <textarea
                            id="message"
                            name="message"
                            required
                            rows={6}
                            value={form.message}
                            onChange={handleChange}
                            placeholder="Escreva a sua mensagem aqui..."
                            className="w-full resize-none rounded-md border border-input bg-background px-3 py-2 text-sm outline-none ring-offset-background placeholder:text-muted-foreground focus:ring-2 focus:ring-ring focus:ring-offset-2"
                          />
                        </div>

                        <button
                          type="submit"
                          className="w-full rounded-md bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors"
                        >
                          Enviar Mensagem
                        </button>
                      </form>
                    )}
                  </CardContent>
                </Card>
              </div>

            </div>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
};

export default Contacto;
