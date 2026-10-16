import { config } from '../../config';
import { imageRef } from '../../data/supabase/mappers';
import { ConsentBox } from '../../pages/me/editorParts';
import { Cover } from '../Cover';
import { usePictureUpload } from './usePictureUpload';

interface Props {
  userId: string;
  value: string;
  /** The blurhash that goes with `value` ('' for a link or no picture). */
  blurhash: string;
  consent: boolean;
  error?: string;
  onChange: (path: string, blurhash: string) => void;
  onConsent: (value: boolean) => void;
  onError: (message: string) => void;
}

/**
 * The cover picture as a picture slot. Empty, it is one big "Add a cover picture" area (click, or
 * drop a photo on it). Filled, it shows the picture with Change and Remove. Covers are always
 * uploaded; a cover that came in as a link from the old Sheet still shows and can be replaced.
 */
export function CoverSlot({
  userId,
  value,
  blurhash,
  consent,
  error,
  onChange,
  onConsent,
  onError,
}: Props) {
  const upload = usePictureUpload(
    userId,
    'cover',
    (image) => {
      onChange(image.path, image.blurhash);
      onConsent(false);
    },
    onError,
  );
  const url = value ? imageRef(value, config.supabaseUrl) : '';

  return (
    <div className="coverslot">
      <div className="coverslot__box" {...upload.dropProps}>
        <input {...upload.inputProps} />
        {url ? (
          <>
            <Cover url={url} className="cover cover--detail" width={1000} blurhash={blurhash} />
            <div className="coverslot__actions">
              <button type="button" disabled={upload.busy} onClick={upload.open}>
                {upload.busy ? 'Uploading…' : 'Change'}
              </button>
              <button
                type="button"
                aria-label="Remove cover picture"
                onClick={() => onChange('', '')}
              >
                Remove
              </button>
            </div>
          </>
        ) : (
          <button type="button" className="slot" disabled={upload.busy} onClick={upload.open}>
            <span className="slot__icon" aria-hidden="true">
              +
            </span>
            <strong>{upload.busy ? 'Uploading…' : 'Add a cover picture'}</strong>
            <span>Choose a photo, or drop one here</span>
          </button>
        )}
      </div>

      {url && (
        <ConsentBox
          id="cover-consent"
          checked={consent}
          onChange={onConsent}
          invalid={Boolean(error)}
        />
      )}
      {error && (
        <p className="form__error" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
