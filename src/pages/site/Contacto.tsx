import React, { useState } from 'react';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import SectionPageHero from '@/components/content/SectionPageHero';
import { Mail, MapPin, Globe, CheckCircle2, Lock } from 'lucide-react';

const INFO_ITEMS = [
  {
    icon: Mail,
    label: 'Email',
    content: (
      <a
        href="mailto:contacto@vision7.pt"
        className="text-sm text-muted-foreground transition-colors hover:text-primary"
      >
        contacto@vision7.pt
      </a>
    ),
  },
  {
    icon: Globe,
    label: 'Website',
    content: <span className="text-sm text-muted-foreground">portal.vision7.pt</span>,
  },
  {
    icon: MapPin,
    label: 'País',
    content: <span className="text-sm text-muted-foreground">Portugal</span>,
  },
];

const SUBJECTS = [
  'Sugestão Editorial',
  'Colaboração / Parceria',
  'Publicidade',
  'Correção de Conteúdo',
  'Questão Técnica',
  'Outro',
];

const Contacto = () => {
  const [submitted, setSubmitted] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', subject: '', message: '' });

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>,
  ) => {
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

      <div className="py-10 sm:py-14">
        <div className="container mx-auto px-4">
          <div className="mx-auto max-w-4xl">
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-3 lg:gap-8">

              {/* Info sidebar */}
              <div className="space-y-4">
                <h2 className="font-editorial text-xl font-bold sm:text-2xl">Informações</h2>

                {INFO_ITEMS.map(({ icon: Icon, label, content }) => (
                  <Card key={label}>
                    <CardContent className="flex items-start gap-3 p-4 sm:p-5">
                      <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                        <Icon className="h-4 w-4 text-primary" />
                      </div>
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/70">
                          {label}
                        </p>
                        <div className="mt-0.5">{content}</div>
                      </div>
                    </CardContent>
                  </Card>
                ))}

                <div className="flex items-start gap-3 rounded-xl border border-border bg-muted/30 p-4 text-xs leading-relaxed text-muted-foreground">
                  <Lock className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground/60" />
                  <span>
                    Os dados submetidos são usados exclusivamente para responder ao seu contacto e não são partilhados com terceiros.
                  </span>
                </div>
              </div>

              {/* Form */}
              <div className="lg:col-span-2">
                <Card>
                  <CardHeader className="pb-4">
                    <CardTitle className="text-lg">Enviar Mensagem</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {submitted ? (
                      <div className="flex flex-col items-center gap-4 py-8 text-center">
                        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-500/10">
                          <CheckCircle2 className="h-7 w-7 text-emerald-500" />
                        </div>
                        <div>
                          <p className="font-semibold">Mensagem preparada!</p>
                          <p className="mt-1 text-sm text-muted-foreground">
                            O seu cliente de email foi aberto com a mensagem pronta a enviar.
                          </p>
                        </div>
                      </div>
                    ) : (
                      <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                          <div className="space-y-1.5">
                            <Label htmlFor="name">
                              Nome <span className="text-destructive">*</span>
                            </Label>
                            <Input
                              id="name"
                              name="name"
                              type="text"
                              required
                              value={form.name}
                              onChange={handleChange}
                              placeholder="O seu nome"
                            />
                          </div>
                          <div className="space-y-1.5">
                            <Label htmlFor="email">
                              Email <span className="text-destructive">*</span>
                            </Label>
                            <Input
                              id="email"
                              name="email"
                              type="email"
                              required
                              value={form.email}
                              onChange={handleChange}
                              placeholder="email@exemplo.com"
                            />
                          </div>
                        </div>

                        <div className="space-y-1.5">
                          <Label htmlFor="subject">Assunto</Label>
                          <select
                            id="subject"
                            name="subject"
                            value={form.subject}
                            onChange={handleChange}
                            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            <option value="">Selecionar assunto...</option>
                            {SUBJECTS.map((s) => (
                              <option key={s} value={s}>{s}</option>
                            ))}
                          </select>
                        </div>

                        <div className="space-y-1.5">
                          <Label htmlFor="message">
                            Mensagem <span className="text-destructive">*</span>
                          </Label>
                          <textarea
                            id="message"
                            name="message"
                            required
                            rows={5}
                            value={form.message}
                            onChange={handleChange}
                            placeholder="Escreva a sua mensagem aqui..."
                            className="flex w-full resize-none rounded-md border border-input bg-background px-3 py-2.5 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                          />
                        </div>

                        <Button type="submit" className="h-11 w-full rounded-xl text-sm font-semibold">
                          Enviar Mensagem
                        </Button>
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
