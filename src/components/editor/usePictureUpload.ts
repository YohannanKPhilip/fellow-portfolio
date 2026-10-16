import { useRef, useState, type DragEvent } from 'react';
import { uploadImage, type ImageKind, type UploadedImage } from '../../data/supabase/storage';

/**
 * Picking or dropping a picture: shrinks and uploads it, then reports it (path, blurhash, shape). `inputProps` go on
 * a hidden file input that lives inside a position: relative box (so it can never widen the page).
 */
export function usePictureUpload(
  userId: string,
  kind: ImageKind,
  onUploaded: (image: UploadedImage) => void,
  onError: (message: string) => void,
) {
  const [busy, setBusy] = useState(false);
  const input = useRef<HTMLInputElement>(null);

  const upload = async (file: File | undefined) => {
    if (!file || busy) return;
    setBusy(true);
    try {
      onUploaded(await uploadImage(userId, kind, file));
    } catch (e) {
      onError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
      if (input.current) input.current.value = '';
    }
  };

  return {
    busy,
    open: () => input.current?.click(),
    inputProps: {
      ref: input,
      type: 'file' as const,
      accept: 'image/*',
      className: 'filepick',
      tabIndex: -1,
      'aria-hidden': true as const,
      onChange: (e: React.ChangeEvent<HTMLInputElement>) => void upload(e.target.files?.[0]),
    },
    dropProps: {
      onDragOver: (e: DragEvent) => e.preventDefault(),
      onDrop: (e: DragEvent) => {
        e.preventDefault();
        void upload(e.dataTransfer.files?.[0]);
      },
    },
  };
}
