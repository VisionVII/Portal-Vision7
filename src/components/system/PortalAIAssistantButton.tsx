import React, { useMemo, useRef, useState, useEffect } from 'react';
import { Bot, Newspaper, Search, Send, Sparkles, TrendingUp, User } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Sheet,
  SheetContent,
  SheetTrigger,
} from '@/components/ui/sheet';
import { useCategories } from '@/hooks/useCategories';
import { useCourses } from '@/hooks/useCourses';
import { usePosts } from '@/hooks/usePosts';
import {
  buildPortalAssistantReply,
} from '@/modules/portal-ai';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  suggestions?: string[];
  links?: Array<{ label: string; href: string; type: string }>;
}

interface PortalAIAssistantButtonProps {
  compact?: boolean;
}

const PortalAIAssistantButton = ({ compact = false }: PortalAIAssistantButtonProps) => {
  const { data: posts = [] } = usePosts();
  const { data: courses = [] } = useCourses();
  const { data: categories = [] } = useCategories();
  const [question, setQuestion] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const dataContext = useMemo(() => ({
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
  }), [posts, courses, categories]);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // Welcome message on first open
  useEffect(() => {
    if (isOpen && messages.length === 0) {
      setMessages([{
        id: 'welcome',
        role: 'assistant',
        text: 'Olá! Sou o assistente do Vision7. Posso ajudá-lo a encontrar notícias, cursos e conteúdos do portal. O que procura?',
      }]);
    }
  }, [isOpen, messages.length]);

  const handleSend = (input: string) => {
    const trimmed = input.trim();
    if (!trimmed) return;

    const userMsg: ChatMessage = {
      id: `u-${Date.now()}`,
      role: 'user',
      text: trimmed,
    };

    const reply = buildPortalAssistantReply(trimmed, dataContext);

    const assistantMsg: ChatMessage = {
      id: `a-${Date.now()}`,
      role: 'assistant',
      text: reply.summary,
      suggestions: reply.suggestions,
      links: reply.links.map((l) => ({ label: l.label, href: l.href, type: l.type })),
    };

    setMessages((prev) => [...prev, userMsg, assistantMsg]);
    setQuestion('');
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    handleSend(question);
  };

  const quickActions = [
    { label: 'Notícias recentes', icon: Newspaper, query: 'Quais são as notícias mais recentes?' },
    { label: 'Cursos', icon: TrendingUp, query: 'Quais cursos estão disponíveis?' },
    { label: 'Categorias', icon: Search, query: 'Quais são as categorias do portal?' },
  ];

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
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

      <SheetContent side="right" className="flex w-[95vw] flex-col gap-0 p-0 sm:max-w-md">
        {/* Chat header */}
        <div className="shrink-0 border-b border-border bg-gradient-to-r from-primary-600 to-primary-700 px-5 py-4 dark:from-primary-800 dark:to-primary-900">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/15 backdrop-blur-sm">
              <Sparkles className="h-5 w-5 text-white" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white">Assistente Vision7</h2>
              <p className="text-[11px] text-white/60">Online — respostas instantâneas</p>
            </div>
          </div>
        </div>

        {/* Chat messages area */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4">
          <div className="space-y-4">
            {messages.map((msg) => (
              <div key={msg.id} className={`flex gap-2.5 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                {msg.role === 'assistant' && (
                  <div className="mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary-100 dark:bg-primary-900/40">
                    <Bot className="h-4 w-4 text-primary-600 dark:text-primary-400" />
                  </div>
                )}
                <div className={`max-w-[85%] space-y-2 ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                  <div className={`rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                    msg.role === 'user'
                      ? 'rounded-br-md bg-primary-600 text-white'
                      : 'rounded-bl-md border border-border/50 bg-muted/50 text-foreground dark:bg-muted/30'
                  }`}>
                    {msg.text}
                  </div>

                  {/* Suggestions */}
                  {msg.suggestions && msg.suggestions.length > 0 && (
                    <div className="space-y-1 pl-1">
                      {msg.suggestions.map((s) => (
                        <div key={s} className="flex items-start gap-1.5 text-xs text-muted-foreground">
                          <Sparkles className="mt-0.5 h-3 w-3 shrink-0 text-primary-500" />
                          <span>{s}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Links */}
                  {msg.links && msg.links.length > 0 && (
                    <div className="space-y-1 pl-1">
                      {msg.links.map((link) => (
                        <Link
                          key={`${link.type}-${link.href}`}
                          to={link.href}
                          className="flex items-center justify-between rounded-xl border border-border/50 bg-card px-3 py-2 text-xs transition-colors hover:bg-muted"
                        >
                          <span className="flex items-center gap-1.5 text-foreground">
                            <Newspaper className="h-3.5 w-3.5 text-primary-500" />
                            <span className="line-clamp-1">{link.label}</span>
                          </span>
                          <Badge variant="secondary" className="ml-2 shrink-0 text-[9px]">{link.type}</Badge>
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
                {msg.role === 'user' && (
                  <div className="mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary-600">
                    <User className="h-4 w-4 text-white" />
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Quick actions — shown when no user messages yet */}
          {messages.length <= 1 && (
            <div className="mt-4 space-y-2">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Sugestões rápidas</p>
              <div className="flex flex-wrap gap-2">
                {quickActions.map((action) => {
                  const Icon = action.icon;
                  return (
                    <button
                      key={action.label}
                      type="button"
                      onClick={() => handleSend(action.query)}
                      className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-muted"
                    >
                      <Icon className="h-3.5 w-3.5 text-primary-500" />
                      {action.label}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Chat input — fixed at bottom */}
        <div className="shrink-0 border-t border-border bg-background px-4 py-3">
          <form onSubmit={handleSubmit} className="flex gap-2">
            <Input
              value={question}
              onChange={(event) => setQuestion(event.target.value)}
              placeholder="Pergunte algo..."
              className="flex-1 rounded-xl border-border/50 bg-muted/30 text-sm"
            />
            <Button type="submit" size="icon" className="h-10 w-10 shrink-0 rounded-xl">
              <Send className="h-4 w-4" />
            </Button>
          </form>
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default PortalAIAssistantButton;
