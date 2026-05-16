import React from 'react';
import { Upload, X, Image as ImageIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface PostImageUploadFieldProps {
  label: string;
  hint?: string;
  preview: string | null;
  url: string;
  isUploading: boolean;
  inputRef: React.RefObject<HTMLInputElement>;
  onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onUrlChange: (url: string) => void;
  onRemove: () => void;
  uploadLabel: string;
  urlPlaceholder: string;
  previewClass?: string;
}

const PostImageUploadField: React.FC<PostImageUploadFieldProps> = ({
  label,
  hint,
  preview,
  url,
  isUploading,
  inputRef,
  onFileChange,
  onUrlChange,
  onRemove,
  uploadLabel,
  urlPlaceholder,
  previewClass = 'h-48',
}) => (
  <div className="space-y-2">
    <Label>{label}</Label>
    {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    <div className="space-y-3">
      {preview ? (
        <div className="relative inline-block w-full">
          <img src={preview} alt="" className={`w-full max-w-md ${previewClass} object-cover rounded-lg border`} />
          <button
            type="button"
            onClick={onRemove}
            className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ) : (
        <div
          onClick={() => inputRef.current?.click()}
          className="border-2 border-dashed border-border rounded-lg p-8 text-center cursor-pointer hover:border-primary-600 dark:hover:border-primary-400 transition-colors"
        >
          <ImageIcon className="w-10 h-10 text-muted-foreground mx-auto mb-2" />
          <p className="text-sm text-foreground">
            {isUploading ? 'A carregar...' : `Clique para carregar ${uploadLabel.toLowerCase()}`}
          </p>
          <p className="text-xs text-muted-foreground mt-1">PNG, JPG até 5MB</p>
        </div>
      )}
      <input ref={inputRef} type="file" accept="image/*" onChange={onFileChange} className="hidden" />
      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => inputRef.current?.click()}
          disabled={isUploading}
        >
          <Upload className="w-4 h-4 mr-2" />
          {isUploading ? 'A carregar...' : `Carregar ${uploadLabel}`}
        </Button>
        <span className="text-xs text-muted-foreground">ou</span>
        <Input
          value={url}
          onChange={(e) => onUrlChange(e.target.value)}
          placeholder={urlPlaceholder}
          className="flex-1"
        />
      </div>
    </div>
  </div>
);

export default PostImageUploadField;
