import { Settings2, X, Loader2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { sanitizeStringList, type PipelineThemeRule } from '@/lib/pipelineThemes';

function parseListInput(value: string): string[] {
  return sanitizeStringList(value.split(/[\n,;]+/));
}

interface EditorialConfigFormProps {
  editConfigLabel: string;
  setEditConfigLabel: (v: string) => void;
  editLanguage: string;
  setEditLanguage: (v: string) => void;
  editRegion: string;
  setEditRegion: (v: string) => void;
  editDefaultPostTags: string[];
  newDefaultPostTag: string;
  setNewDefaultPostTag: (v: string) => void;
  editThemeRules: PipelineThemeRule[];
  isSaving: boolean;
  onAddDefaultPostTag: () => void;
  onRemoveDefaultPostTag: (tag: string) => void;
  onAddThemeRule: () => void;
  onUpdateThemeRule: (id: string, patch: Partial<PipelineThemeRule>) => void;
  onRemoveThemeRule: (id: string) => void;
  onSave: () => void;
  onCancel: () => void;
}

export function EditorialConfigForm({
  editConfigLabel,
  setEditConfigLabel,
  editLanguage,
  setEditLanguage,
  editRegion,
  setEditRegion,
  editDefaultPostTags,
  newDefaultPostTag,
  setNewDefaultPostTag,
  editThemeRules,
  isSaving,
  onAddDefaultPostTag,
  onRemoveDefaultPostTag,
  onAddThemeRule,
  onUpdateThemeRule,
  onRemoveThemeRule,
  onSave,
  onCancel,
}: EditorialConfigFormProps) {
  return (
    <div className="rounded-xl border border-border/40 bg-muted/30 backdrop-blur-xl p-5 space-y-4 shadow-xl">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-lg bg-blue-500/5">
            <Settings2 className="w-4 h-4 text-blue-500" />
          </div>
          <span className="text-sm font-semibold text-foreground">Configuração Editorial</span>
        </div>
        <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground hover:bg-muted/30" onClick={onCancel}>
          <X className="w-4 h-4" />
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div>
          <span className="text-xs font-medium text-foreground/80 block mb-1.5">Nome editorial</span>
          <Input
            value={editConfigLabel}
            onChange={(e) => setEditConfigLabel(e.target.value)}
            className="h-9 text-sm bg-muted/40 border-border/40 focus:border-primary/50"
            placeholder="Ex: Tecnologia Portugal"
          />
        </div>
        <div>
          <span className="text-xs font-medium text-foreground/80 block mb-1.5">Idioma</span>
          <Input
            value={editLanguage}
            onChange={(e) => setEditLanguage(e.target.value)}
            className="h-9 text-sm bg-muted/40 border-border/40 focus:border-primary/50"
            placeholder="pt-PT"
          />
        </div>
        <div>
          <span className="text-xs font-medium text-foreground/80 block mb-1.5">Região</span>
          <Input
            value={editRegion}
            onChange={(e) => setEditRegion(e.target.value)}
            className="mt-1 h-8 text-xs bg-muted border-border"
            placeholder="PT"
          />
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Tags finais dos posts</span>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {editDefaultPostTags.map((tag) => (
            <Badge
              key={`default-${tag}`}
              variant="outline"
              className="text-xs px-2 py-0.5 border-primary/25 text-primary gap-1 cursor-pointer hover:border-red-500/30 hover:text-red-400"
              onClick={() => onRemoveDefaultPostTag(tag)}
            >
              {tag} <X className="w-2.5 h-2.5" />
            </Badge>
          ))}
        </div>
        <div className="flex gap-1.5">
          <Input
            placeholder="Ex: portal, tecnologia, portugal"
            className="h-7 text-xs bg-muted border-border"
            value={newDefaultPostTag}
            onChange={(e) => setNewDefaultPostTag(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ',' || e.key === ';') {
                e.preventDefault();
                onAddDefaultPostTag();
              }
            }}
          />
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Temas editoriais</span>
          <Button size="sm" variant="ghost" className="h-6 px-2 text-[10px] text-blue-500 hover:text-blue-400" onClick={onAddThemeRule}>
            Novo tema
          </Button>
        </div>
        <div className="space-y-2">
          {editThemeRules.map((theme, index) => (
            <div key={theme.id} className="rounded-lg border border-border/50 bg-muted/20 p-2.5 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[10px] text-muted-foreground">Tema {index + 1}</span>
                <Button size="sm" variant="ghost" className="h-5 px-1 text-[10px] text-red-400 hover:text-red-300" onClick={() => onRemoveThemeRule(theme.id)}>
                  Remover
                </Button>
              </div>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                <div>
                  <span className="text-[10px] text-muted-foreground">Nome visível</span>
                  <Input
                    value={theme.label}
                    onChange={(e) => onUpdateThemeRule(theme.id, { label: e.target.value })}
                    className="mt-1 h-7 text-xs bg-muted border-border"
                    placeholder="Ex: Inteligência Artificial"
                  />
                </div>
                <div>
                  <span className="text-[10px] text-muted-foreground">Slug do tema</span>
                  <Input
                    value={theme.slug}
                    onChange={(e) => onUpdateThemeRule(theme.id, { slug: e.target.value })}
                    className="mt-1 h-7 text-xs bg-muted border-border"
                    placeholder="Ex: ia"
                  />
                </div>
              </div>
              <div>
                <span className="text-[10px] text-muted-foreground">Termos de pesquisa</span>
                <Input
                  value={theme.searchTerms.join(', ')}
                  onChange={(e) => onUpdateThemeRule(theme.id, { searchTerms: parseListInput(e.target.value) })}
                  className="mt-1 h-7 text-xs bg-muted border-border"
                  placeholder="Ex: inteligência artificial, openai, agentes IA"
                />
              </div>
              <div>
                <span className="text-[10px] text-muted-foreground">Tags finais desse tema</span>
                <Input
                  value={theme.postTags.join(', ')}
                  onChange={(e) => onUpdateThemeRule(theme.id, { postTags: parseListInput(e.target.value) })}
                  className="mt-1 h-7 text-xs bg-muted border-border"
                  placeholder="Ex: ia, inteligência artificial, agentes"
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      <p className="text-[10px] text-muted-foreground">
        Cada tema controla os termos usados na coleta e as tags finais aplicadas aos posts promovidos para o portal.
      </p>

      <div className="flex justify-end gap-1.5">
        <Button size="sm" variant="ghost" className="h-6 text-xs" onClick={onCancel}>
          Cancelar
        </Button>
        <Button size="sm" className="h-6 text-xs bg-cyan-600 hover:bg-cyan-700" disabled={isSaving} onClick={onSave}>
          {isSaving ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : null}
          Guardar
        </Button>
      </div>
    </div>
  );
}
