import { useState, useEffect, useRef } from 'react';
import { Settings2, X, Loader2, Plus, Tag, Search, ChevronDown, ChevronUp } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { sanitizeStringList, type PipelineThemeRule } from '@/lib/pipelineThemes';

function parseListInput(value: string): string[] {
  return sanitizeStringList(value.split(/[\n,;]+/));
}

interface ThemeTexts {
  searchTerms: string;
  postTags: string;
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
  /** Receives the final parsed rules from this form's local state */
  onSave: (parsedRules: PipelineThemeRule[]) => void;
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
  // Local draft state for text fields — fixes cursor-jump bug caused by
  // controlled inputs that re-stringify the parsed array on every keystroke.
  // The ref mirrors state so handleSave always reads the latest value even
  // when called synchronously with a pending setState from onChange.
  const themeTextsRef = useRef<Record<string, ThemeTexts>>({});
  const [themeTexts, setThemeTexts] = useState<Record<string, ThemeTexts>>(() => {
    const init: Record<string, ThemeTexts> = {};
    editThemeRules.forEach((r) => {
      init[r.id] = {
        searchTerms: r.searchTerms.join(', '),
        postTags: r.postTags.join(', '),
      };
    });
    return init;
  });

  // Sync when new theme rules are added or removed
  useEffect(() => {
    setThemeTexts((prev) => {
      const next = { ...prev };
      editThemeRules.forEach((r) => {
        if (!next[r.id]) {
          next[r.id] = {
            searchTerms: r.searchTerms.join(', '),
            postTags: r.postTags.join(', '),
          };
        }
      });
      // Clean up removed rules
      Object.keys(next).forEach((id) => {
        if (!editThemeRules.find((r) => r.id === id)) delete next[id];
      });
      return next;
    });
  }, [editThemeRules]);

  const [expandedRules, setExpandedRules] = useState<Set<string>>(
    () => new Set(editThemeRules.map((r) => r.id)),
  );

  const toggleExpand = (id: string) => {
    setExpandedRules((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const updateThemeText = (ruleId: string, field: keyof ThemeTexts, value: string) => {
    setThemeTexts((prev) => {
      const next = {
        ...prev,
        [ruleId]: { ...(prev[ruleId] ?? { searchTerms: '', postTags: '' }), [field]: value },
      };
      themeTextsRef.current = next;
      return next;
    });
  };

  const handleAddThemeRule = () => {
    onAddThemeRule();
    // New rules are picked up by the useEffect above
  };

  /** Flush all local text drafts into parsed arrays and call parent save.
   *  Reads from the ref (not closure state) so a Save immediately after
   *  typing always includes the latest keystroke. */
  const handleSave = () => {
    const latest = themeTextsRef.current;
    const parsedRules: PipelineThemeRule[] = editThemeRules.map((rule) => {
      const texts = latest[rule.id] ?? themeTexts[rule.id];
      return {
        ...rule,
        searchTerms: texts ? parseListInput(texts.searchTerms) : rule.searchTerms,
        postTags: texts ? parseListInput(texts.postTags) : rule.postTags,
      };
    });
    onSave(parsedRules);
  };

  return (
    <div className="rounded-2xl border border-border/40 bg-card/60 backdrop-blur-xl shadow-xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 border-b border-border/30 bg-muted/20 px-5 py-4">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-500/10">
            <Settings2 className="h-4 w-4 text-blue-500" />
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground">Configuração Editorial</p>
            <p className="text-[11px] text-muted-foreground">Temas, tags e idioma do pipeline</p>
          </div>
        </div>
        <Button
          size="sm"
          variant="ghost"
          className="h-7 w-7 shrink-0 p-0 text-muted-foreground hover:text-foreground"
          onClick={onCancel}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      <div className="space-y-5 p-5">
        {/* Basic fields */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-foreground/80">Nome editorial</label>
            <Input
              value={editConfigLabel}
              onChange={(e) => setEditConfigLabel(e.target.value)}
              className="h-9 bg-muted/40 border-border/40 focus:border-blue-500/50 text-sm"
              placeholder="Ex: Portal Tecnologia"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-foreground/80">Idioma</label>
            <Input
              value={editLanguage}
              onChange={(e) => setEditLanguage(e.target.value)}
              className="h-9 bg-muted/40 border-border/40 focus:border-blue-500/50 text-sm"
              placeholder="pt-BR"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-foreground/80">Região</label>
            <Input
              value={editRegion}
              onChange={(e) => setEditRegion(e.target.value)}
              className="h-9 bg-muted/40 border-border/40 focus:border-blue-500/50 text-sm"
              placeholder="BR"
            />
          </div>
        </div>

        {/* Default post tags */}
        <div className="rounded-xl border border-border/30 bg-muted/20 p-4 space-y-3">
          <div className="flex items-center gap-2">
            <Tag className="h-3.5 w-3.5 text-primary/70" />
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Tags globais dos posts
            </span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {editDefaultPostTags.map((tag) => (
              <Badge
                key={`default-${tag}`}
                variant="outline"
                className="gap-1 cursor-pointer border-primary/30 bg-primary/5 px-2.5 py-1 text-xs text-primary transition-colors hover:border-red-400/40 hover:bg-red-500/5 hover:text-red-400"
                onClick={() => onRemoveDefaultPostTag(tag)}
                title="Clique para remover"
              >
                #{tag}
                <X className="h-2.5 w-2.5" />
              </Badge>
            ))}
          </div>
          <div className="flex gap-2">
            <Input
              placeholder="Nova tag (Enter ou vírgula para adicionar)"
              className="h-8 flex-1 bg-muted/40 border-border/40 text-xs"
              value={newDefaultPostTag}
              onChange={(e) => setNewDefaultPostTag(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ',' || e.key === ';') {
                  e.preventDefault();
                  onAddDefaultPostTag();
                }
              }}
            />
            <Button
              size="sm"
              variant="outline"
              className="h-8 px-3 text-xs border-border/40"
              onClick={onAddDefaultPostTag}
            >
              <Plus className="h-3 w-3" />
            </Button>
          </div>
        </div>

        {/* Theme rules */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Search className="h-3.5 w-3.5 text-blue-500/70" />
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Temas editoriais
              </span>
              <Badge variant="outline" className="h-4 px-1.5 text-[10px] border-border/40 text-muted-foreground">
                {editThemeRules.length}
              </Badge>
            </div>
            <Button
              size="sm"
              variant="outline"
              className="h-7 gap-1.5 px-2.5 text-[11px] border-blue-500/30 text-blue-500 hover:bg-blue-500/10"
              onClick={handleAddThemeRule}
            >
              <Plus className="h-3 w-3" />
              Novo tema
            </Button>
          </div>

          <div className="space-y-2">
            {editThemeRules.map((theme, index) => {
              const isExpanded = expandedRules.has(theme.id);
              const texts = themeTexts[theme.id] ?? { searchTerms: '', postTags: '' };
              const searchCount = parseListInput(texts.searchTerms).length;
              const tagCount = parseListInput(texts.postTags).length;

              return (
                <div
                  key={theme.id}
                  className="rounded-xl border border-border/40 bg-muted/20 overflow-hidden transition-all"
                >
                  {/* Theme header */}
                  <button
                    type="button"
                    className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-muted/30 transition-colors"
                    onClick={() => toggleExpand(theme.id)}
                  >
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-muted text-[11px] font-semibold text-muted-foreground">
                      {index + 1}
                    </span>
                    <span className="flex-1 min-w-0">
                      <span className="block truncate text-sm font-medium text-foreground">
                        {theme.label || 'Sem nome'}
                      </span>
                      <span className="block text-[11px] text-muted-foreground">
                        {searchCount} termo{searchCount !== 1 ? 's' : ''} de busca · {tagCount} tag{tagCount !== 1 ? 's' : ''}
                      </span>
                    </span>
                    <div className="flex items-center gap-2 shrink-0">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-6 px-1.5 text-[10px] text-red-400 hover:bg-red-500/10 hover:text-red-300"
                        onClick={(e) => { e.stopPropagation(); onRemoveThemeRule(theme.id); }}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                      {isExpanded
                        ? <ChevronUp className="h-3.5 w-3.5 text-muted-foreground" />
                        : <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                      }
                    </div>
                  </button>

                  {/* Theme fields */}
                  {isExpanded && (
                    <div className="border-t border-border/30 px-4 pb-4 pt-3 space-y-3">
                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                        <div className="space-y-1.5">
                          <label className="text-[11px] font-medium text-muted-foreground">Nome visível</label>
                          <Input
                            value={theme.label}
                            onChange={(e) => onUpdateThemeRule(theme.id, { label: e.target.value })}
                            className="h-8 text-xs bg-muted/40 border-border/40"
                            placeholder="Ex: Inteligência Artificial"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-[11px] font-medium text-muted-foreground">Slug</label>
                          <Input
                            value={theme.slug}
                            onChange={(e) => onUpdateThemeRule(theme.id, { slug: e.target.value })}
                            className="h-8 text-xs bg-muted/40 border-border/40"
                            placeholder="Ex: ia"
                          />
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-[11px] font-medium text-muted-foreground">
                          Termos de pesquisa
                          <span className="ml-1.5 text-[10px] text-muted-foreground/60">(separe por vírgula)</span>
                        </label>
                        <Input
                          value={texts.searchTerms}
                          onChange={(e) => updateThemeText(theme.id, 'searchTerms', e.target.value)}
                          className="h-8 text-xs bg-muted/40 border-border/40"
                          placeholder="Ex: inteligência artificial, openai, agentes IA"
                        />
                        {parseListInput(texts.searchTerms).length > 0 && (
                          <div className="flex flex-wrap gap-1">
                            {parseListInput(texts.searchTerms).map((term) => (
                              <span key={term} className="rounded-md bg-blue-500/10 px-2 py-0.5 text-[10px] text-blue-400 border border-blue-500/20">
                                {term}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-[11px] font-medium text-muted-foreground">
                          Tags finais dos posts deste tema
                          <span className="ml-1.5 text-[10px] text-muted-foreground/60">(separe por vírgula)</span>
                        </label>
                        <Input
                          value={texts.postTags}
                          onChange={(e) => updateThemeText(theme.id, 'postTags', e.target.value)}
                          className="h-8 text-xs bg-muted/40 border-border/40"
                          placeholder="Ex: ia, inteligência artificial, agentes"
                        />
                        {parseListInput(texts.postTags).length > 0 && (
                          <div className="flex flex-wrap gap-1">
                            {parseListInput(texts.postTags).map((tag) => (
                              <span key={tag} className="rounded-md bg-primary/10 px-2 py-0.5 text-[10px] text-primary/80 border border-primary/20">
                                #{tag}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}

            {editThemeRules.length === 0 && (
              <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-border/40 py-8 text-center">
                <Search className="h-6 w-6 text-muted-foreground/40" />
                <p className="text-xs text-muted-foreground">Nenhum tema. Clique em "Novo tema" para começar.</p>
              </div>
            )}
          </div>
        </div>

        <p className="text-[11px] text-muted-foreground leading-relaxed">
          Cada tema define os termos usados na coleta de notícias (RSS/RSS) e as tags aplicadas aos artigos promovidos para o portal.
        </p>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-end gap-2 border-t border-border/30 bg-muted/10 px-5 py-3">
        <Button size="sm" variant="ghost" className="h-8 text-xs text-muted-foreground" onClick={onCancel}>
          Cancelar
        </Button>
        <Button
          size="sm"
          className="h-8 gap-1.5 text-xs bg-blue-600 hover:bg-blue-700 text-white"
          disabled={isSaving}
          onClick={handleSave}
        >
          {isSaving ? <Loader2 className="h-3 w-3 animate-spin" /> : null}
          Guardar configuração
        </Button>
      </div>
    </div>
  );
}
