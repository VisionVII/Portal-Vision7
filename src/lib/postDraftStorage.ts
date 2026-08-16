// Autosave client-side para o editor de posts (RichTextEditor v2.1 — P0).
// Nunca toca o Supabase: é só uma rede de segurança em localStorage contra
// refresh/fecho acidental/crash antes de um guardar manual. O guardar real
// continua a ser feito por useCreatePost/useUpdatePost em usePosts.ts.

const KEY_PREFIX = 'post-draft:';

export interface PostDraftPayload<TFormData> {
  formData: TFormData;
  selectedCategoryIds: string[];
  savedAt: number;
}

function hasLocalStorage(): boolean {
  try {
    const k = '__post_draft_test__';
    localStorage.setItem(k, '1');
    localStorage.removeItem(k);
    return true;
  } catch {
    return false;
  }
}

function draftKey(postId: string | null | undefined): string {
  return `${KEY_PREFIX}${postId ?? 'new'}`;
}

export function saveDraft<TFormData>(
  postId: string | null | undefined,
  data: { formData: TFormData; selectedCategoryIds: string[] },
): void {
  if (!hasLocalStorage()) return;
  const payload: PostDraftPayload<TFormData> = { ...data, savedAt: Date.now() };
  try {
    localStorage.setItem(draftKey(postId), JSON.stringify(payload));
  } catch {
    // quota exceeded or other write failure — autosave is best-effort, never throw
  }
}

export function loadDraft<TFormData>(
  postId: string | null | undefined,
): PostDraftPayload<TFormData> | null {
  if (!hasLocalStorage()) return null;
  const raw = localStorage.getItem(draftKey(postId));
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed.savedAt === 'number' && parsed.formData) {
      return parsed as PostDraftPayload<TFormData>;
    }
    return null;
  } catch {
    return null;
  }
}

export function clearDraft(postId: string | null | undefined): void {
  if (!hasLocalStorage()) return;
  localStorage.removeItem(draftKey(postId));
}
