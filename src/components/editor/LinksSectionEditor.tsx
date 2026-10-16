import { useRef, useState } from 'react';
import { config } from '../../config';
import { imageRef } from '../../data/supabase/mappers';
import { removeImages } from '../../data/supabase/storage';
import { describeMedia } from '../../lib/media';
import {
  DEFAULT_LINKS_TITLE,
  PAGE_LIMITS,
  isLinkUrl,
  moveLink,
  removeLink,
  setLink,
  type LinkItem,
  type LinksSection,
} from '../../lib/page';
import { ConsentBox } from '../../pages/me/editorParts';
import { LinkCardBody } from '../LinksSectionView';
import { Dialog } from './Dialog';
import { TitleEditor } from './TitleEditor';
import { usePictureUpload } from './usePictureUpload';

interface Props {
  userId: string;
  section: LinksSection;
  onChange: (section: LinksSection) => void;
  /** Called with each picture uploaded here, so the page can delete ones that end up unused. */
  onUploaded: (path: string) => void;
}

/**
 * A links section in edit mode: edit the heading in place, and see the links as the cards visitors
 * get. A card opens a small window to change it; the "Add" card opens the same window empty.
 */
export function LinksSectionEditor({ userId, section, onChange, onUploaded }: Props) {
  // An index into the links, "new", or nothing.
  const [open, setOpen] = useState<number | 'new' | null>(null);
  const item = typeof open === 'number' ? section.items[open] : undefined;

  return (
    <section className="resources resources--editing">
      <TitleEditor
        runs={section.title ?? DEFAULT_LINKS_TITLE}
        label="Section heading. Click to edit."
        onChange={(runs) => onChange({ ...section, title: runs })}
      />
      <ul className="linkgrid">
        {section.items.map((it, i) => (
          <li key={`${i}-${it.url}`}>
            <button type="button" className="linkcard linkcard--edit" onClick={() => setOpen(i)}>
              <LinkCardBody item={it} />
            </button>
          </li>
        ))}
        {section.items.length < PAGE_LIMITS.links && (
          <li>
            <button
              type="button"
              className="linkcard linkcard--edit linkcard--add"
              onClick={() => setOpen('new')}
            >
              <span className="slot__icon" aria-hidden="true">
                +
              </span>
              <span>Add a link</span>
            </button>
          </li>
        )}
      </ul>
      {section.items.length === 0 && (
        <p className="form__hint">
          Visitors won't see this section until it has at least one link.
        </p>
      )}

      {open !== null && (item || open === 'new') && (
        <LinkDialog
          key={String(open)}
          userId={userId}
          item={item}
          canMoveEarlier={typeof open === 'number' && open > 0}
          canMoveLater={typeof open === 'number' && open < section.items.length - 1}
          onSave={(next) => {
            onChange(setLink(section, next, typeof open === 'number' ? open : undefined));
            setOpen(null);
          }}
          onMove={(by) => {
            if (typeof open !== 'number') return;
            onChange(moveLink(section, open, by));
            setOpen(open + by);
          }}
          onRemove={() => {
            if (typeof open === 'number') onChange(removeLink(section, open));
            setOpen(null);
          }}
          onClose={() => setOpen(null)}
          onUploaded={onUploaded}
        />
      )}
    </section>
  );
}

/** Adds https:// to an address typed without it, so "youtube.com/x" just works. */
const withScheme = (value: string) => {
  const v = value.trim();
  if (/^https:\/\//i.test(v)) return v;
  if (/^http:\/\//i.test(v)) return 'https://' + v.slice(7);
  return v ? 'https://' + v : v;
};

function LinkDialog({
  userId,
  item,
  canMoveEarlier,
  canMoveLater,
  onSave,
  onMove,
  onRemove,
  onClose,
  onUploaded,
}: {
  userId: string;
  item: LinkItem | undefined;
  canMoveEarlier: boolean;
  canMoveLater: boolean;
  onSave: (item: LinkItem) => void;
  onMove: (by: -1 | 1) => void;
  onRemove: () => void;
  onClose: () => void;
  onUploaded: (path: string) => void;
}) {
  const [label, setLabel] = useState(item?.label ?? '');
  const [url, setUrl] = useState(item?.url ?? '');
  const [image, setImage] = useState(item?.image ?? '');
  const [blurhash, setBlurhash] = useState(item?.blurhash ?? '');
  const [consent, setConsent] = useState(item?.consent === true);
  const [problem, setProblem] = useState<string>();
  // Pictures uploaded while this window is open: any not kept are deleted again.
  const fresh = useRef<string[]>([]);

  const upload = usePictureUpload(
    userId,
    'link',
    (uploaded) => {
      fresh.current.push(uploaded.path);
      onUploaded(uploaded.path);
      setImage(uploaded.path);
      setBlurhash(uploaded.blurhash);
      setConsent(false);
      setProblem(undefined);
    },
    setProblem,
  );

  // A YouTube link already has a picture of its own, used when the fellow hasn't added one.
  const youtube = describeMedia(withScheme(url));
  const autoPicture = youtube?.kind === 'youtube' ? youtube.thumbUrl : undefined;
  const shown = image ? imageRef(image, config.supabaseUrl) : autoPicture;

  const close = () => {
    void removeImages(fresh.current);
    onClose();
  };

  const save = () => {
    const address = withScheme(url);
    if (!label.trim()) return setProblem('Give the link a name.');
    if (!address) return setProblem('Paste the link.');
    if (!isLinkUrl(address)) return setProblem("That doesn't look like a web address.");
    if (image && !consent) return setProblem('Tick the box to confirm you have consent.');
    void removeImages(fresh.current.filter((p) => p !== image));
    onSave({
      label: label.trim(),
      url: address,
      ...(image ? { image, blurhash, consent: true as const } : {}),
    });
  };

  return (
    <Dialog title={item ? 'Edit this link' : 'Add a link'} onClose={close}>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          save();
        }}
      >
        <div className="dialog__body">
          <div className="field">
            <label htmlFor="link-label">Name</label>
            <input
              id="link-label"
              maxLength={PAGE_LIMITS.linkLabel}
              placeholder="Fraction videos"
              value={label}
              onChange={(e) => {
                setLabel(e.target.value);
                setProblem(undefined);
              }}
            />
          </div>
          <div className="field">
            <label htmlFor="link-url">Link</label>
            <input
              id="link-url"
              inputMode="url"
              autoCapitalize="none"
              spellCheck={false}
              maxLength={PAGE_LIMITS.linkUrl}
              placeholder="https://…"
              value={url}
              onChange={(e) => {
                setUrl(e.target.value);
                setProblem(undefined);
              }}
            />
          </div>

          <div className="field">
            <span className="field__label">Picture (optional)</span>
            <div className="dialog__pic linkpic" {...upload.dropProps}>
              <input {...upload.inputProps} />
              {shown ? (
                <>
                  <img src={shown} alt="" referrerPolicy="no-referrer" />
                  <div className="linkpic__actions">
                    <button type="button" disabled={upload.busy} onClick={upload.open}>
                      {upload.busy ? 'Uploading…' : image ? 'Change' : 'Use my own'}
                    </button>
                    {image && (
                      <button
                        type="button"
                        onClick={() => {
                          setImage('');
                          setBlurhash('');
                          setConsent(false);
                        }}
                      >
                        Remove
                      </button>
                    )}
                  </div>
                </>
              ) : (
                <button type="button" className="slot" disabled={upload.busy} onClick={upload.open}>
                  <span className="slot__icon" aria-hidden="true">
                    +
                  </span>
                  <strong>{upload.busy ? 'Uploading…' : 'Add a picture'}</strong>
                  <span>or drop one here</span>
                </button>
              )}
            </div>
            {!image && autoPicture && (
              <p className="form__hint">This is the YouTube thumbnail. It is used automatically.</p>
            )}
          </div>
          {image && (
            <ConsentBox id="link-consent" checked={consent} invalid={false} onChange={setConsent} />
          )}

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
            <button type="submit" className="button button--accent">
              {item ? 'Done' : 'Add'}
            </button>
          </div>
        </div>
      </form>
    </Dialog>
  );
}
