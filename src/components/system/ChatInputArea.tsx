import React from 'react';
import { Loader2, Send, WifiOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface ChatInputAreaProps {
  question: string;
  isLoading: boolean;
  activeProvider: 'claude-edge' | 'local-preview';
  messageCount: number;
  onQuestionChange: (value: string) => void;
  onSubmit: (event: React.FormEvent) => void;
}

export const ChatInputArea = ({
  question,
  isLoading,
  activeProvider,
  messageCount,
  onQuestionChange,
  onSubmit,
}: ChatInputAreaProps) => (
  <div className="shrink-0 border-t border-border bg-background px-4 py-3">
    {activeProvider === 'local-preview' && messageCount > 1 && (
      <div className="mb-2 flex items-center gap-1.5 text-[10px] text-amber-600 dark:text-amber-400">
        <WifiOff className="h-3 w-3" />
        <span>Modo offline — respostas baseadas no conteúdo do portal</span>
      </div>
    )}
    <form onSubmit={onSubmit} className="flex gap-2">
      <Input
        value={question}
        onChange={(event) => onQuestionChange(event.target.value)}
        placeholder="Pergunte algo..."
        disabled={isLoading}
        className="flex-1 rounded-xl border-border/50 bg-muted/30 text-sm"
      />
      <Button type="submit" size="icon" disabled={isLoading} className="h-10 w-10 shrink-0 rounded-xl">
        {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
      </Button>
    </form>
  </div>
);
