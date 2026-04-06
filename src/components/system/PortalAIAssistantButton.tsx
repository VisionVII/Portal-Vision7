import React, { useMemo, useState } from 'react';
import { Bot, Compass, MessageCircle, Newspaper, Search, Sparkles, TrendingUp } from 'lucide-react';
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

  const handleQuickAction = (q: string) => {
    setQuestion(q);
    setSubmittedQuestion(q);
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
            <Sparkles className="h-5 w-5 text-primary-500" />
            Assistente Vision7
          </SheetTitle>
          <SheetDescription>
            Descubra notícias, cursos e conteúdos do portal. Pergunte-me qualquer coisa!
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-4">
          {/* Quick Actions */}
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => handleQuickAction('Quais são as notícias mais recentes?')}
              className="flex items-center gap-2 rounded-xl border border-border bg-card px-3 py-2.5 text-left text-sm font-medium text-foreground transition-colors hover:bg-muted"
            >
              <Newspaper className="h-4 w-4 shrink-0 text-primary-500" />
              Notícias recentes
            </button>
            <button
              type="button"
              onClick={() => handleQuickAction('Quais cursos estão disponíveis?')}
              className="flex items-center gap-2 rounded-xl border border-border bg-card px-3 py-2.5 text-left text-sm font-medium text-foreground transition-colors hover:bg-muted"
            >
              <TrendingUp className="h-4 w-4 shrink-0 text-primary-500" />
              Cursos disponíveis
            </button>
            <button
              type="button"
              onClick={() => handleQuickAction('Quais são as categorias do portal?')}
              className="flex items-center gap-2 rounded-xl border border-border bg-card px-3 py-2.5 text-left text-sm font-medium text-foreground transition-colors hover:bg-muted"
            >
              <Search className="h-4 w-4 shrink-0 text-primary-500" />
              Explorar categorias
            </button>
            <button
              type="button"
              onClick={() => handleQuickAction('Quais são os conteúdos mais populares?')}
              className="flex items-center gap-2 rounded-xl border border-border bg-card px-3 py-2.5 text-left text-sm font-medium text-foreground transition-colors hover:bg-muted"
            >
              <MessageCircle className="h-4 w-4 shrink-0 text-primary-500" />
              Mais populares
            </button>
          </div>

          {/* Search */}
          <Card>
            <CardContent className="pt-5">
              <form onSubmit={handleSubmit} className="flex gap-2">
                <Input
                  value={question}
                  onChange={(event) => setQuestion(event.target.value)}
                  placeholder="Pergunte sobre notícias, cursos, categorias…"
                  className="flex-1"
                />
                <Button type="submit" size="icon" className="shrink-0">
                  <Search className="h-4 w-4" />
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Results */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Compass className="h-4 w-4 text-primary-500" />
                Resultado
              </CardTitle>
              <CardDescription className="text-xs">{submittedQuestion}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-foreground">{reply.summary}</p>

              {reply.suggestions.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-[0.15em] text-muted-foreground">
                    Sugestões
                  </p>
                  <ul className="space-y-1.5 text-sm text-muted-foreground">
                    {reply.suggestions.map((suggestion) => (
                      <li key={suggestion} className="flex items-start gap-2">
                        <Sparkles className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary-500" />
                        <span>{suggestion}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {reply.links.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-[0.15em] text-muted-foreground">
                    Conteúdos relacionados
                  </p>
                  <div className="space-y-1.5">
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
                        <Badge variant="secondary" className="text-[10px]">{link.type}</Badge>
                      </Link>
                    ))}
                  </div>
                </div>
              )}

              {reply.links.length === 0 && (
                <p className="text-sm text-muted-foreground">Nenhum conteúdo encontrado para esta pergunta. Tente outra busca.</p>
              )}
            </CardContent>
          </Card>
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default PortalAIAssistantButton;
