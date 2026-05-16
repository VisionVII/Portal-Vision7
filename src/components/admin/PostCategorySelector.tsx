import { useState } from 'react';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { useCreateCategory } from '@/hooks/useCategories';

interface Category {
  id: string;
  name: string;
}

interface PostCategorySelectorProps {
  categories: Category[] | undefined;
  selectedIds: string[];
  onToggle: (catId: string) => void;
  onCreated: (catId: string) => void;
  generateSlug: (name: string) => string;
}

const PostCategorySelector = ({
  categories,
  selectedIds,
  onToggle,
  onCreated,
  generateSlug,
}: PostCategorySelectorProps) => {
  const [showNew, setShowNew] = useState(false);
  const [newName, setNewName] = useState('');
  const createCategory = useCreateCategory();
  const { toast } = useToast();

  const handleCreate = async () => {
    const name = newName.trim();
    if (!name) return;
    try {
      const result = await createCategory.mutateAsync({ name, slug: generateSlug(name), color: 'bg-blue-600' });
      onCreated(result.id);
      setNewName('');
      setShowNew(false);
      toast({ title: 'Categoria criada', description: `"${name}" adicionada.` });
    } catch (err) {
      toast({ title: 'Erro', description: err instanceof Error ? err.message : 'Erro ao criar categoria.', variant: 'destructive' });
    }
  };

  return (
    <div className="space-y-2">
      <Label>Categorias</Label>
      <div className="rounded-md border border-input bg-background p-3 space-y-2 max-h-40 overflow-y-auto">
        {categories?.length ? (
          categories.map((cat) => (
            <label key={cat.id} className="flex items-center gap-2 cursor-pointer">
              <Checkbox
                checked={selectedIds.includes(cat.id)}
                onCheckedChange={() => onToggle(cat.id)}
              />
              <span className="text-sm">{cat.name}</span>
            </label>
          ))
        ) : (
          <p className="text-xs text-muted-foreground">Nenhuma categoria disponível</p>
        )}
      </div>

      {selectedIds.length > 0 && (
        <p className="text-xs text-muted-foreground">
          {selectedIds.length} categoria{selectedIds.length > 1 ? 's' : ''} selecionada{selectedIds.length > 1 ? 's' : ''}
        </p>
      )}

      <Button
        type="button"
        variant="outline"
        size="sm"
        className="h-8 gap-1"
        onClick={() => setShowNew(!showNew)}
        title="Nova categoria"
      >
        <Plus className="h-3.5 w-3.5" /> Nova
      </Button>

      {showNew && (
        <div className="flex gap-2">
          <Input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Nome da nova categoria"
            className="flex-1"
          />
          <Button
            type="button"
            size="sm"
            disabled={!newName.trim() || createCategory.isPending}
            onClick={handleCreate}
          >
            {createCategory.isPending ? 'A criar...' : 'Criar'}
          </Button>
        </div>
      )}
    </div>
  );
};

export default PostCategorySelector;
