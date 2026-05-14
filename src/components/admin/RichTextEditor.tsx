import React, { useEffect, useState } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import Link from '@tiptap/extension-link';
import TextAlign from '@tiptap/extension-text-align';
import ImageExtension from '@tiptap/extension-image';
import Placeholder from '@tiptap/extension-placeholder';
import { Table } from '@tiptap/extension-table';
import { TableRow } from '@tiptap/extension-table-row';
import { TableHeader } from '@tiptap/extension-table-header';
import { TableCell } from '@tiptap/extension-table-cell';
import { CodeBlockLowlight } from '@tiptap/extension-code-block-lowlight';
import { common, createLowlight } from 'lowlight';
import {
  Bold, Italic, Underline as UnderlineIcon, Strikethrough,
  List, ListOrdered, Quote, Code, Heading1, Heading2, Heading3,
  AlignLeft, AlignCenter, AlignRight, Link as LinkIcon, Image as ImageIcon,
  Undo, Redo, Minus, Grid3x3, Layers, GitBranch, BarChart3,
  ChevronDown,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';

const lowlight = createLowlight(common);

interface RichTextEditorProps {
  content: string;
  onChange: (content: string) => void;
  placeholder?: string;
  featuredImageUrl?: string | null;
}

const ToolbarButton: React.FC<{
  onClick: () => void;
  isActive?: boolean;
  disabled?: boolean;
  title: string;
  children: React.ReactNode;
}> = ({ onClick, isActive, disabled, title, children }) => (
  <Button
    type="button"
    variant="ghost"
    size="sm"
    onClick={onClick}
    disabled={disabled}
    title={title}
    className={cn(
      'h-8 w-8 p-0',
      isActive && 'bg-muted text-foreground'
    )}
  >
    {children}
  </Button>
);

const RichTextEditor: React.FC<RichTextEditorProps> = ({
  content,
  onChange,
  placeholder,
  featuredImageUrl,
}) => {
  const [showDiagramMenu, setShowDiagramMenu] = useState(false);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3, 4],
        },
        codeBlock: false,
      }),
      Underline,
      Link.configure({ openOnClick: false }),
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      ImageExtension,
      Placeholder.configure({ placeholder: placeholder || 'Escreva o conteúdo...' }),
      Table.configure({ resizable: true }),
      TableRow,
      TableHeader,
      TableCell,
      CodeBlockLowlight.configure({
        lowlight,
        defaultLanguage: null,
      }),
    ],
    content,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
  });

  useEffect(() => {
    if (!editor) return;

    const currentHtml = editor.getHTML();
    if (content !== currentHtml) {
      editor.commands.setContent(content || '', { emitUpdate: false });
    }
  }, [content, editor]);

  if (!editor) return null;

  const getSafeUrl = (value: string | null, type: 'link' | 'image') => {
    if (!value) return null;

    const trimmed = value.trim();
    if (!trimmed) return null;

    const candidate = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;

    try {
      const parsed = new URL(candidate);
      if (!['http:', 'https:'].includes(parsed.protocol)) {
        throw new Error('invalid_protocol');
      }
      return parsed.toString();
    } catch {
      window.alert(`Insira uma URL válida e segura para ${type === 'link' ? 'o link' : 'a imagem'}.`);
      return null;
    }
  };

  const addLink = () => {
    const url = getSafeUrl(window.prompt('URL do link (https://...)'), 'link');
    if (url) {
      editor.chain().focus().extendMarkRange('link').setLink({ href: url, target: '_blank', rel: 'noopener noreferrer nofollow' }).run();
    }
  };

  const addImage = () => {
    const url = getSafeUrl(window.prompt('URL da imagem (https://...)'), 'image');
    if (url) {
      editor.chain().focus().setImage({ src: url, alt: 'Imagem inserida no editor' }).run();
    }
  };

  const insertLeadBlock = () => {
    editor.chain().focus().insertContent('<p><strong>Lide:</strong> escreva aqui a abertura do artigo em 2 a 3 linhas.</p>').run();
  };

  const insertSectionBlock = () => {
    editor.chain().focus().insertContent('<h2>Intertitulo</h2><p>Desenvolva aqui a proxima secao do artigo.</p>').run();
  };

  const insertSourcesBlock = () => {
    editor.chain().focus().insertContent('<h3>Fontes consultadas</h3><ul><li>Fonte principal - link</li><li>Fonte complementar - link</li></ul>').run();
  };

  const insertFeaturedImage = () => {
    const fallbackUrl = getSafeUrl(featuredImageUrl || '', 'image');
    if (!fallbackUrl) {
      addImage();
      return;
    }

    editor
      .chain()
      .focus()
      .insertContent(`<p><img src="${fallbackUrl}" alt="Imagem destacada do artigo" /></p><p><em>Legenda: detalhe o contexto desta imagem.</em></p>`)
      .run();
  };

  const clearFormatting = () => {
    editor.chain().focus().unsetAllMarks().clearNodes().run();
  };

  const insertTable = (rows: number = 3, cols: number = 3) => {
    editor.chain().focus().insertTable({ rows, cols, withHeaderRow: true }).run();
  };

  const insertArchitectureLayersDiagram = () => {
    const diagram = `<pre><code>
┌────────────────────────────────────────────────┐
│        CAMADA 3 – AGENTES AUTÓNOMOS             │
│   Processos geridos de ponta a ponta por IA   │
│     (Claude Code, n8n, Make avançado)         │
└─────────────────────────────────────────────────┘
           │
┌────────────────────────────────────────────────┐
│        CAMADA 2 – AUTOMAÇÃO ASSISTIDA           │
│    Tarefas repetitivas aceleradas com IA      │
│      (Claude, ChatGPT, Zapier, Make)          │
└─────────────────────────────────────────────────┘
           │
┌────────────────────────────────────────────────┐
│     CAMADA 1 – AUMENTAÇÃO INDIVIDUAL            │
│   Cada colaborador usa IA no seu trabalho     │
│       (Claude, Gemini, Copilot)               │
└─────────────────────────────────────────────────┘</code></pre>`;
    editor.chain().focus().insertContent(diagram).run();
  };

  const insertSystemArchitectureDiagram = () => {
    const diagram = `<pre><code>
┌──────────────────────────────────────────┐
│      FRONTEND (Vite + React)             │
│  ┌────────┐  ┌────────┐  ┌────────────┐ │
│  │ Homepage│  │Category│  │Admin Dash  │ │
│  └────┬───┘  └───┬────┘  └──────┬─────┘ │
└───────┼──────────┼──────────────┼────────┘
        │          │              │
┌───────┴──────────┴──────────────┴────────┐
│        TanStack Query + State             │
└───────┬──────────────────────────────────┘
        │
┌───────┴──────────────────────────────────┐
│      SUPABASE PLATFORM                    │
│  Auth | PostgREST | Storage | Edge Fn    │
│           │     PostgreSQL              │
│           └─ posts, categories, audit ─┘
└──────────────────────────────────────────┘</code></pre>`;
    editor.chain().focus().insertContent(diagram).run();
  };

  const insertComparisonTable = () => {
    editor
      .chain()
      .focus()
      .insertTable({ rows: 4, cols: 3, withHeaderRow: true })
      .run();
    setTimeout(() => {
      editor
        .chain()
        .focus()
        .insertContent('<table><thead><tr><th>Recurso</th><th>Opção A</th><th>Opção B</th></tr></thead><tbody><tr><td>Feature 1</td><td>Sim</td><td>Não</td></tr><tr><td>Feature 2</td><td>Não</td><td>Sim</td></tr><tr><td>Preço</td><td>€10</td><td>€15</td></tr></tbody></table>')
        .run();
    }, 100);
  };

  const insertProcessFlowDiagram = () => {
    const diagram = `<pre><code>
┌─────────────┐
│   Entrada   │
└──────┬──────┘
       │
       ▼
┌─────────────────────┐
│  Processamento 1    │
└──────┬──────────────┘
       │
       ▼
┌─────────────────────┐
│  Processamento 2    │
└──────┬──────────────┘
       │
       ▼
┌─────────────────────┐
│  Validação          │
└──────┬──────────────┘
       │
       ▼
┌─────────────┐
│   Saída     │
└─────────────┘</code></pre>`;
    editor.chain().focus().insertContent(diagram).run();
  };

  const insertDataFlowDiagram = () => {
    const diagram = `<pre><code>
RSS Feed ──→ n8n Workflow ──→ AI Curation ──→ Post Draft
                                                   │
Admin Editor ──→ TipTap ──→ PostForm ──→ Supabase INSERT
                                              │
                                              ▼
                              TanStack Query Invalidation
                                              │
                                              ▼
                             Public Page ──→ DOMPurify ──→ DOM</code></pre>`;
    editor.chain().focus().insertContent(diagram).run();
  };

  return (
    <div className="border border-input rounded-md overflow-hidden bg-background">
      <div className="flex flex-wrap items-center gap-0.5 p-1.5 border-b border-input bg-muted/30">
        <ToolbarButton onClick={() => editor.chain().focus().toggleBold().run()} isActive={editor.isActive('bold')} title="Negrito">
          <Bold className="w-4 h-4" />
        </ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().toggleItalic().run()} isActive={editor.isActive('italic')} title="Itálico">
          <Italic className="w-4 h-4" />
        </ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().toggleUnderline().run()} isActive={editor.isActive('underline')} title="Sublinhado">
          <UnderlineIcon className="w-4 h-4" />
        </ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().toggleStrike().run()} isActive={editor.isActive('strike')} title="Riscado">
          <Strikethrough className="w-4 h-4" />
        </ToolbarButton>

        <div className="w-px h-6 bg-border mx-1" />

        <ToolbarButton onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} isActive={editor.isActive('heading', { level: 1 })} title="Título 1">
          <Heading1 className="w-4 h-4" />
        </ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} isActive={editor.isActive('heading', { level: 2 })} title="Título 2">
          <Heading2 className="w-4 h-4" />
        </ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} isActive={editor.isActive('heading', { level: 3 })} title="Título 3">
          <Heading3 className="w-4 h-4" />
        </ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().toggleHeading({ level: 4 }).run()} isActive={editor.isActive('heading', { level: 4 })} title="Título 4">
          <span className="text-[10px] font-semibold">H4</span>
        </ToolbarButton>

        <div className="w-px h-6 bg-border mx-1" />

        <ToolbarButton onClick={() => editor.chain().focus().toggleBulletList().run()} isActive={editor.isActive('bulletList')} title="Lista">
          <List className="w-4 h-4" />
        </ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().toggleOrderedList().run()} isActive={editor.isActive('orderedList')} title="Lista numerada">
          <ListOrdered className="w-4 h-4" />
        </ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().toggleBlockquote().run()} isActive={editor.isActive('blockquote')} title="Citação">
          <Quote className="w-4 h-4" />
        </ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().toggleCodeBlock().run()} isActive={editor.isActive('codeBlock')} title="Bloco de Código">
          <Code className="w-4 h-4" />
        </ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().setHorizontalRule().run()} title="Linha horizontal">
          <Minus className="w-4 h-4" />
        </ToolbarButton>

        <div className="w-px h-6 bg-border mx-1" />

        <ToolbarButton onClick={() => editor.chain().focus().setTextAlign('left').run()} isActive={editor.isActive({ textAlign: 'left' })} title="Alinhar à esquerda">
          <AlignLeft className="w-4 h-4" />
        </ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().setTextAlign('center').run()} isActive={editor.isActive({ textAlign: 'center' })} title="Centralizar">
          <AlignCenter className="w-4 h-4" />
        </ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().setTextAlign('right').run()} isActive={editor.isActive({ textAlign: 'right' })} title="Alinhar à direita">
          <AlignRight className="w-4 h-4" />
        </ToolbarButton>

        <div className="w-px h-6 bg-border mx-1" />

        <ToolbarButton onClick={addLink} isActive={editor.isActive('link')} title="Inserir link">
          <LinkIcon className="w-4 h-4" />
        </ToolbarButton>
        <ToolbarButton onClick={addImage} title="Inserir imagem">
          <ImageIcon className="w-4 h-4" />
        </ToolbarButton>

        <div className="w-px h-6 bg-border mx-1" />

        {/* Tabelas Dropdown */}
        <DropdownMenu open={showDiagramMenu} onOpenChange={setShowDiagramMenu}>
          <DropdownMenuTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              title="Inserir tabela"
              className="h-8 w-8 p-0"
            >
              <Grid3x3 className="w-4 h-4" />
              <ChevronDown className="w-3 h-3 ml-0.5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-48">
            <DropdownMenuItem onClick={() => insertTable(2, 2)}>
              Tabela 2x2
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => insertTable(3, 3)}>
              Tabela 3x3
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => insertTable(4, 5)}>
              Tabela 4x5
            </DropdownMenuItem>
            <DropdownMenuItem onClick={insertComparisonTable}>
              Tabela de Comparação
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Diagramas Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              title="Inserir diagrama"
              className="h-8 w-8 p-0"
            >
              <Layers className="w-4 h-4" />
              <ChevronDown className="w-3 h-3 ml-0.5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-56">
            <DropdownMenuItem onClick={insertArchitectureLayersDiagram}>
              <Layers className="w-4 h-4 mr-2" />
              Camadas de Arquitetura
            </DropdownMenuItem>
            <DropdownMenuItem onClick={insertSystemArchitectureDiagram}>
              <GitBranch className="w-4 h-4 mr-2" />
              Arquitetura de Sistema
            </DropdownMenuItem>
            <DropdownMenuItem onClick={insertProcessFlowDiagram}>
              <BarChart3 className="w-4 h-4 mr-2" />
              Fluxo de Processo
            </DropdownMenuItem>
            <DropdownMenuItem onClick={insertDataFlowDiagram}>
              <GitBranch className="w-4 h-4 mr-2" />
              Fluxo de Dados
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <div className="w-px h-6 bg-border mx-1" />

        <ToolbarButton onClick={insertLeadBlock} title="Inserir lide">
          <span className="text-[10px] font-semibold">LIDE</span>
        </ToolbarButton>
        <ToolbarButton onClick={insertSectionBlock} title="Inserir secao">
          <span className="text-[10px] font-semibold">H2+</span>
        </ToolbarButton>
        <ToolbarButton onClick={insertSourcesBlock} title="Inserir bloco de fontes">
          <span className="text-[10px] font-semibold">FNT</span>
        </ToolbarButton>
        <ToolbarButton onClick={insertFeaturedImage} title="Inserir imagem destacada">
          <span className="text-[10px] font-semibold">IMG</span>
        </ToolbarButton>
        <ToolbarButton onClick={clearFormatting} title="Limpar formatacao">
          <span className="text-[10px] font-semibold">TX</span>
        </ToolbarButton>

        <div className="w-px h-6 bg-border mx-1" />

        <ToolbarButton onClick={() => editor.chain().focus().undo().run()} disabled={!editor.can().undo()} title="Desfazer">
          <Undo className="w-4 h-4" />
        </ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().redo().run()} disabled={!editor.can().redo()} title="Refazer">
          <Redo className="w-4 h-4" />
        </ToolbarButton>
      </div>

      <div className="border-b border-input bg-muted/20 px-4 py-2 text-xs text-muted-foreground">
        <span className="font-semibold text-foreground">Formatação completa:</span> H1-H4 para hierarquia, negrito, itálico, listas, citações. 
        <span className="font-semibold text-foreground ml-2">Tabelas:</span> Insira tabelas de comparação (2x2, 3x3, etc). 
        <span className="font-semibold text-foreground ml-2">Diagramas:</span> Arquitetura, fluxos de processo e dados. 
        <span className="font-semibold text-foreground ml-2">Atalhos:</span> LIDE, H2+, FNT, IMG para estrutura editorial.
      </div>

      <EditorContent
        editor={editor}
        className="prose prose-sm max-w-none min-h-[250px] p-4 focus-within:outline-none [&_.tiptap]:min-h-[250px] [&_.tiptap]:outline-none [&_.tiptap_h1]:mb-4 [&_.tiptap_h1]:text-3xl [&_.tiptap_h1]:font-extrabold [&_.tiptap_h1]:leading-tight [&_.tiptap_h2]:mt-8 [&_.tiptap_h2]:mb-3 [&_.tiptap_h2]:text-2xl [&_.tiptap_h2]:font-bold [&_.tiptap_h2]:leading-snug [&_.tiptap_h3]:mt-6 [&_.tiptap_h3]:mb-2 [&_.tiptap_h3]:text-xl [&_.tiptap_h3]:font-bold [&_.tiptap_h3]:leading-snug [&_.tiptap_h4]:mt-5 [&_.tiptap_h4]:mb-2 [&_.tiptap_h4]:text-base [&_.tiptap_h4]:font-bold [&_.tiptap_h4]:uppercase [&_.tiptap_h4]:tracking-wide [&_.tiptap_p]:my-4 [&_.tiptap_p]:leading-7 [&_.tiptap_strong]:font-bold [&_.tiptap_ul]:my-4 [&_.tiptap_ul]:list-disc [&_.tiptap_ul]:pl-6 [&_.tiptap_ol]:my-4 [&_.tiptap_ol]:list-decimal [&_.tiptap_ol]:pl-6 [&_.tiptap_li]:my-1.5 [&_.tiptap_blockquote]:my-6 [&_.tiptap_blockquote]:border-l-4 [&_.tiptap_blockquote]:border-primary/35 [&_.tiptap_blockquote]:bg-muted/30 [&_.tiptap_blockquote]:py-1 [&_.tiptap_blockquote]:pl-4 [&_.tiptap_blockquote]:italic [&_.tiptap_a]:font-semibold [&_.tiptap_a]:text-primary [&_.tiptap_a]:underline [&_.tiptap_a]:underline-offset-4 [&_.tiptap_img]:rounded-xl [&_.tiptap_img]:border [&_.tiptap_img]:border-border [&_.tiptap_img]:shadow-sm [&_.tiptap_p.is-editor-empty:first-child::before]:pointer-events-none [&_.tiptap_p.is-editor-empty:first-child::before]:float-left [&_.tiptap_p.is-editor-empty:first-child::before]:h-0 [&_.tiptap_p.is-editor-empty:first-child::before]:text-muted-foreground [&_.tiptap_p.is-editor-empty:first-child::before]:content-[attr(data-placeholder)] [&_.tiptap_pre]:my-4 [&_.tiptap_pre]:rounded-lg [&_.tiptap_pre]:bg-neutral-950 dark:[&_.tiptap_pre]:bg-white [&_.tiptap_pre]:text-neutral-100 dark:[&_.tiptap_pre]:text-neutral-900 [&_.tiptap_pre]:p-4 [&_.tiptap_pre]:overflow-x-auto [&_.tiptap_pre_code]:bg-transparent [&_.tiptap_pre_code]:text-neutral-100 dark:[&_.tiptap_pre_code]:text-neutral-900 [&_.tiptap_code]:font-mono [&_.tiptap_code]:text-sm [&_.tiptap_table]:my-4 [&_.tiptap_table]:border-collapse [&_.tiptap_table]:w-full [&_.tiptap_table]:border [&_.tiptap_table]:border-border [&_.tiptap_table]:rounded-lg [&_.tiptap_table]:overflow-hidden [&_.tiptap_th]:bg-muted/50 [&_.tiptap_th]:px-3 [&_.tiptap_th]:py-2 [&_.tiptap_th]:text-left [&_.tiptap_th]:font-semibold [&_.tiptap_th]:border [&_.tiptap_th]:border-border [&_.tiptap_td]:px-3 [&_.tiptap_td]:py-2 [&_.tiptap_td]:border [&_.tiptap_td]:border-border"
      />
    </div>
  );
};

export default RichTextEditor;
