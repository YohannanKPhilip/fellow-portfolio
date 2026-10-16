import { useRef, useState } from 'react';
import { config } from '../../config';
import { imageRef } from '../../data/supabase/mappers';
import { removeImages } from '../../data/supabase/storage';
import { safeUrl } from '../../lib/links';
import { describeMedia } from '../../lib/media';
import { LIMITS, moveItem, newKey, type MediaDraft } from '../../lib/resourceForm';
import { ConsentBox } from '../../pages/me/editorParts';
import { BlurImg } from '../BlurImg';
import { Dialog } from './Dialog';
import { usePictureUpload } from './usePictureUpload';

const viewOf = (m: Pick<MediaDraft, 'url' | 'hint'>) =>
  describeMedia(safeUrl(imageRef(m.url.trim(), config.supabaseUrl)) ?? '', m.hint);

interface Props {
  userId: string;
  media: MediaDraft[];
  error?: string;
  onChange: (media: MediaDraft[]) => void;
  onError: (message: string) => void;
}

/**
 * "In the classroom": the photos and videos as small tiles. A tile opens a window to change its
 * caption, move it or remove it; the "Add" tile opens the same window empty.
 */
export function MediaEditor({ userId, media, error, onChange, onError }: Props) {
  // A key, "new", or nothing.
  const [open, setOpen] = useState<string | null>(null);
  const current = media.find((m) => m.key === open);
  const index = current ? media.indexOf(current) : -1;

  const save = (item: MediaDraft) => {
    onChange(
      media.some((m) => m.key === item.key)
        ? media.map((m) => (m.key === item.key ? item : m))
        : [...media, item],
    );
    setOpen(null);
  };

  return (
    <>
      <div className="mediagrid">
        {media.map((m) => {
          const view = viewOf(m);
          return (
            <button type="button" className="mediatile" key={m.key} onClick={() => setOpen(m.key)}>
              <span className="mediatile__thumb">
                {view?.thumbUrl ? (
                  <BlurImg
                    src={view.thumbUrl}
                    alt=""
                    blurhash={m.blurhash}
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <span>{view?.source ?? 'Link'}</span>
                )}
                {view && view.kind !== 'image' && (
                  <span className="mediatile__kind" aria-hidden="true">
                    ▶
                  </span>
                )}
              </span>
              <span className="mediatile__caption">{m.caption || 'No caption'}</span>
              {!m.consent && <span className="mediatile__warn">Needs consent</span>}
            </button>
          );
        })}
        <button type="button" className="mediatile mediatile--add" onClick={() => setOpen('new')}>
          <span className="slot__icon" aria-hidden="true">
            +
          </span>
          <span>Add a photo or video</span>
        </button>
      </div>
      {error && (
        <p className="form__error" role="alert">
          {error}
        </p>
      )}

      {open && (current || open === 'new') && (
        <MediaDialog
          key={open}
          userId={userId}
          item={current}
          canMoveEarlier={index > 0}
          canMoveLater={index >= 0 && index < media.length - 1}
          onSave={save}
          onMove={(by) => onChange(moveItem(media, index, by))}
          onRemove={() => {
            onChange(media.filter((m) => m.key !== open));
            setOpen(null);
          }}
          onClose={() => setOpen(null)}
          onError={onError}
        />
      )}
    </>
  );
}

function MediaDialog({
  userId,
  item,
  canMoveEarlier,
  canMoveLater,
  onSave,
  onMove,
  onRemove,
  onClose,
  onError,
}: {
  userId: string;
  item: MediaDraft | undefined;
  canMoveEarlier: boolean;
  canMoveLater: boolean;
  onSave: (item: MediaDraft) => void;
  onMove: (by: -1 | 1) => void;
  onRemove: () => void;
  onClose: () => void;
  onError: (message: string) => void;
}) {
  const [url, setUrl] = useState(item?.url ?? '');
  const [caption, setCaption] = useState(item?.caption ?? '');
  const [consent, setConsent] = useState(item?.consent ?? false);
  // What goes with an uploaded photo; both are emptied when the address is typed in by hand.
  const [blurhash, setBlurhash] = useState(item?.blurhash ?? '');
  const [ratio, setRatio] = useState(item?.ratio ?? 0);
  const [mode, setMode] = useState<'photo' | 'link'>(
    item && item.url && !item.url.startsWith(userId) ? 'link' : 'photo',
  );
  const [problem, setProblem] = useState<string>();
  // Pictures uploaded while this window is open: any not kept are deleted again.
  const fresh = useRef<string[]>([]);

  const upload = usePictureUpload(
    userId,
    'media',
    (image) => {
      fresh.current.push(image.path);
      setUrl(image.path);
      setBlurhash(image.blurhash);
      setRatio(image.ratio);
      setConsent(false);
      setProblem(undefined);
    },
    onError,
  );

  const view = viewOf({ url, hint: mode === 'photo' ? 'image' : '' });

  const close = () => {
    void removeImages(fresh.current);
    onClose();
  };

  const save = () => {
    if (!url.trim()) return setProblem('Add a photo or paste a link first.');
    if (mode === 'link' && !view) return setProblem('That link should start with https://');
    if (!consent) return setProblem('Tick the box to confirm you have consent.');
    void removeImages(fresh.current.filter((p) => p !== url));
    onSave({
      key: item?.key ?? newKey(),
      url: url.trim(),
      caption: caption.trim(),
      hint: mode === 'photo' ? 'image' : '',
      blurhash,
      ratio,
      consent,
    });
  };

  return (
    <Dialog title={item ? 'Edit this item' : 'Add to the classroom'} onClose={close}>
      <div className="dialog__body">
        <div className="seg" role="group" aria-label="Kind of item">
          <button type="button" aria-pressed={mode === 'photo'} onClick={() => setMode('photo')}>
            Upload a photo
          </button>
          <button type="button" aria-pressed={mode === 'link'} onClick={() => setMode('link')}>
            Paste a link
          </button>
        </div>

        {mode === 'photo' ? (
          <div className="dialog__pic" {...upload.dropProps}>
            <input {...upload.inputProps} />
            {view?.thumbUrl && url.startsWith(userId) ? (
              <BlurImg src={view.thumbUrl} alt="" blurhash={blurhash} ratio={ratio} />
            ) : (
              <button type="button" className="slot" disabled={upload.busy} onClick={upload.open}>
                <span className="slot__icon" aria-hidden="true">
                  +
                </span>
                <strong>{upload.busy ? 'Uploading…' : 'Choose a photo'}</strong>
                <span>or drop one here</span>
              </button>
            )}
            {view?.thumbUrl && url.startsWith(userId) && (
              <button
                type="button"
                className="dialog__change"
                disabled={upload.busy}
                onClick={upload.open}
              >
                {upload.busy ? 'Uploading…' : 'Change photo'}
              </button>
            )}
          </div>
        ) : (
          <div className="field">
            <label htmlFor="media-link">Link to a video or picture</label>
            <input
              id="media-link"
              inputMode="url"
              placeholder="https://youtu.be/…"
              value={url.startsWith(userId) ? '' : url}
              onChange={(e) => {
                setUrl(e.target.value);
                setBlurhash('');
                setRatio(0);
                setProblem(undefined);
              }}
            />
            <p className="form__hint">
              {view
                ? `Found: ${view.source}.`
                : 'YouTube, Instagram, Google Drive or an image link.'}
            </p>
          </div>
        )}

        <div className="field">
          <label htmlFor="media-caption">Caption (optional)</label>
          <input
            id="media-caption"
            maxLength={LIMITS.caption}
            placeholder="Group work in Grade 4"
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
          />
        </div>

        <ConsentBox id="media-consent" checked={consent} invalid={false} onChange={setConsent} />

        {problem && (
          <p className="form__error" role="alert">
            {problem}
          </p>
        )}
      </div>

      <div className="dialog__foot">
        {item && (
          <div className="dialog__more">
            <button
              type="button"
              aria-label="Move earlier"
              disabled={!canMoveEarlier}
              onClick={() => onMove(-1)}
            >
              ←
            </button>
            <button
              type="button"
              aria-label="Move later"
              disabled={!canMoveLater}
              onClick={() => onMove(1)}
            >
              →
            </button>
            <button type="button" className="dialog__remove" onClick={onRemove}>
              Remove
            </button>
          </div>
        )}
        <div className="dialog__buttons">
          <button type="button" className="button button--ghost" onClick={close}>
            Cancel
          </button>
          <button type="button" className="button button--accent" onClick={save}>
            {item ? 'Done' : 'Add'}
          </button>
        </div>
      </div>
    </Dialog>
  );
}
