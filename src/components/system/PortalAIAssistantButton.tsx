import React, { useMemo, useState } from 'react';
import { Bot, Compass, Newspaper, Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { useCategories } from '@/hooks/useCategories';
import { useCourses } from '@/hooks/useCourses';
import { usePosts } from '@/hooks/usePosts';
import {
  buildPortalAssistantReply,
  portalAssistantConfig,
  portalAssistantSkills,
} from '@/modules/portal-ai';

interface PortalAIAssistantButtonProps {
  compact?: boolean;
}

const PortalAIAssistantButton = ({ compact = false }: PortalAIAssistantButtonProps) => {
  const { data: posts = [] } = usePosts();
  const { data: courses = [] } = useCourses();
  const { data: categories = [] } = useCategories();
  const [question, setQuestion] = useState('');
  const [submittedQuestion, setSubmittedQuestion] = useState(
    'Quais conteúdos do Vision7 eu devo ver primeiro?'
  );

  const reply = useMemo(
    () =>
      buildPortalAssistantReply(submittedQuestion, {
        posts: posts.map((post) => ({
          title: post.title,
          excerpt: post.excerpt,
          slug: post.slug,
          category: post.categories?.name,
        })),
        courses: courses.map((course) => ({
          title: course.title,
          description: course.description,
          slug: course.slug,
        })),
        categories: categories.map((category) => ({
          name: category.name,
          slug: category.slug,
        })),
      }),
    [categories, courses, posts, submittedQuestion]
  );

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    setSubmittedQuestion(question.trim() || 'Quais conteúdos do Vision7 eu devo ver primeiro?');
  };

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button
          className={`shrink-0 text-white shadow-lg shadow-primary-500/20 hover:bg-primary-700 ${
            compact
              ? 'h-10 w-10 rounded-xl border border-white/15 bg-primary-600/95 p-0'
              : 'rounded-full bg-primary-600 px-3.5 py-2 text-sm'
          }`}
        >
          <Bot className={`${compact ? '' : 'mr-2 '}h-4 w-4`} />
          {!compact && 'Vision7 AI'}
        </Button>
      </SheetTrigger>

      <SheetContent side="right" className="w-[95vw] overflow-y-auto sm:max-w-xl">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary-500" />
            Assistente Vision7
          </SheetTitle>
          <SheetDescription>
            Módulo fechado para notícias, ferramentas e orientação do portal sem sair do escopo da plataforma.
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Escopo controlado</CardTitle>
              <CardDescription>
                O botão já usa um módulo interno preparado para futura conexão com API de modelo de IA.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex flex-wrap gap-2">
                {portalAssistantSkills.map((skill) => (
                  <Badge key={skill.id} variant="secondary">
                    {skill.label}
                  </Badge>
                ))}
              </div>
              <p className="text-sm text-muted-foreground">
                Estado atual: <span className="font-medium text-foreground">modo local</span>. Para um provedor externo,
                basta configurar a API neste módulo interno do portal.
              </p>
              <div className="rounded-xl border border-dashed border-border bg-muted/30 p-3 text-sm text-muted-foreground">
                Arquivos-base: <code>src/modules/portal-ai/*</code>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Consultar o portal</CardTitle>
              <CardDescription>
                Pergunte sobre notícias, categorias, cursos, podcasts e conteúdos publicados.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-3">
                <Input
                  value={question}
                  onChange={(event) => setQuestion(event.target.value)}
                  placeholder="Ex.: mostre notícias recentes sobre tecnologia"
                />
                <Button type="submit" className="w-full">
                  Consultar Vision7 AI
                </Button>
              </form>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Resposta guiada</CardTitle>
              <CardDescription>Pergunta atual: {submittedQuestion}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-foreground">{reply.summary}</p>

              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                  Sugestões
                </p>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  {reply.suggestions.map((suggestion) => (
                    <li key={suggestion} className="flex items-start gap-2">
                      <Compass className="mt-0.5 h-4 w-4 text-primary-500" />
                      <span>{suggestion}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                  Conteúdos encontrados
                </p>
                {reply.links.length ? (
                  <div className="space-y-2">
                    {reply.links.map((link) => (
                      <Link
                        key={`${link.type}-${link.href}`}
                        to={link.href}
                        className="flex items-center justify-between rounded-xl border border-border px-3 py-2 text-sm transition-colors hover:bg-muted"
                      >
                        <span className="flex items-center gap-2 text-foreground">
                          <Newspaper className="h-4 w-4 text-primary-500" />
                          {link.label}
                        </span>
                        <span className="text-xs uppercase text-muted-foreground">{link.type}</span>
                      </Link>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">Nenhum link contextual disponível para esta pergunta.</p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default PortalAIAssistantButton;
