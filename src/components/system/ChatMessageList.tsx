import React from 'react';
import { Bot, Loader2, Newspaper, Search, Sparkles, TrendingUp, User } from 'lucide-react';
import { AssistantMessageCard, MessageLinks } from './AssistantMessageCard';
import type { AssistantMessageCardData, ChatMessageLink } from './AssistantMessageCard';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  suggestions?: string[];
  links?: ChatMessageLink[];
  cards?: AssistantMessageCardData[];
  provider?: 'claude-edge' | 'local-preview';
}

interface QuickAction {
  label: string;
  icon: React.ElementType;
  query: string;
}

const quickActions: QuickAction[] = [
  { label: 'Principais notícias', icon: Newspaper, query: 'Quais são as notícias mais relevantes e recentes no Vision7?' },
  { label: 'Guiar por categorias', icon: Search, query: 'Qual categoria do portal Vision7 é melhor para encontrar análises sobre tecnologia e inovação?' },
  { label: 'Explorar cursos', icon: TrendingUp, query: 'Quais cursos ou formações aparecem atualmente no portal Vision7 e por que são relevantes?' },
];

interface ChatMessageListProps {
  messages: ChatMessage[];
  isLoading: boolean;
  scrollRef: React.RefObject<HTMLDivElement>;
  onSend: (query: string) => void;
  temperatureC: number | null;
  localTime: string;
}

export const ChatMessageList = ({
  messages,
  isLoading,
  scrollRef,
  onSend,
  temperatureC,
  localTime,
}: ChatMessageListProps) => (
  <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4">
    <div className="space-y-4">
      {messages.map((msg) => (
        <div key={msg.id} className={`flex gap-2.5 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
          {msg.role === 'assistant' && (
            <div className="mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary-100 dark:bg-primary-900/40">
              <Bot className="h-4 w-4 text-primary-600 dark:text-primary-400" />
            </div>
          )}
          <div className={`min-w-0 space-y-2 ${msg.cards && msg.cards.length > 0 ? 'max-w-full sm:max-w-[94%]' : 'max-w-[92%] sm:max-w-[85%]'} ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
            <div className={`rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
              msg.role === 'user'
                ? 'rounded-br-md bg-primary-600 text-white'
                : 'rounded-bl-md border border-border/50 bg-muted/50 text-foreground dark:bg-muted/30'
            }`}>
              {msg.text}
            </div>

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

            {msg.cards && msg.cards.length > 0 ? (
              <div className={`grid min-w-0 gap-2.5 ${msg.cards.length > 1 ? 'grid-cols-1 lg:grid-cols-2' : 'grid-cols-1'}`}>
                {msg.cards.map((card) => (
                  <AssistantMessageCard
                    key={card.id}
                    card={card}
                    temperatureC={temperatureC}
                    localTime={localTime}
                  />
                ))}
              </div>
            ) : null}

            {(!msg.cards || msg.cards.length === 0) && msg.links && msg.links.length > 0 && (
              <MessageLinks links={msg.links} />
            )}
          </div>
          {msg.role === 'user' && (
            <div className="mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary-600">
              <User className="h-4 w-4 text-white" />
            </div>
          )}
        </div>
      ))}

      {isLoading && (
        <div className="flex gap-2.5 justify-start">
          <div className="mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary-100 dark:bg-primary-900/40">
            <Bot className="h-4 w-4 text-primary-600 dark:text-primary-400" />
          </div>
          <div className="max-w-[85%] space-y-2">
            <div className="rounded-2xl rounded-bl-md border border-border/50 bg-muted/50 px-4 py-2.5 text-sm text-foreground dark:bg-muted/30">
              <span className="inline-flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin text-primary-500" />
                A organizar uma resposta contextualizada do portal...
              </span>
            </div>
          </div>
        </div>
      )}
    </div>

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
                onClick={() => { onSend(action.query); }}
                disabled={isLoading}
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
);
