import { useState, type KeyboardEvent } from 'react';
import { addTag, LIMITS } from '../../lib/resourceForm';

/**
 * Type a name and press Enter or comma; it becomes a chip. No duplicates. Used for tags (at most 8,
 * 40 characters each) and, with its own limits, for "What's inside".
 */
export function TagInput({
  tags,
  onChange,
  id = 'tags',
  label = 'Tags',
  noun = 'tag',
  max = LIMITS.tags,
  maxLength = LIMITS.tag,
  pills = false,
}: {
  tags: string[];
  onChange: (tags: string[]) => void;
  /** Larger, rounder chips, matching the "What's inside" tabs on the resource page. */
  pills?: boolean;
  id?: string;
  label?: string;
  /** What one chip is called, for the placeholder and the remove button. */
  noun?: string;
  max?: number;
  maxLength?: number;
}) {
  const [text, setText] = useState('');
  const full = tags.length >= max;

  const commit = () => {
    if (text.trim()) onChange(addTag(tags, text, max, maxLength));
    setText('');
  };
  // Typing or pasting "Lesson plan, Worksheet" makes a chip of everything before each comma.
  const edit = (value: string) => {
    if (!value.includes(',')) return setText(value);
    const parts = value.split(',');
    const rest = parts.pop() ?? '';
    onChange(parts.reduce((list, part) => addTag(list, part, max, maxLength), tags));
    setText(rest);
  };
  const onKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      commit();
    } else if (e.key === 'Backspace' && !text && tags.length) {
      onChange(tags.slice(0, -1));
    }
  };

  return (
    <div>
      {tags.length > 0 && (
        <ul className={`chips chips--edit ${pills ? 'chips--pill' : ''}`} aria-label={label}>
          {tags.map((t) => (
            <li key={t}>
              {t}
              <button
                type="button"
                aria-label={`Remove ${noun} ${t}`}
                onClick={() => onChange(tags.filter((x) => x !== t))}
              >
                ×
              </button>
            </li>
          ))}
        </ul>
      )}
      <input
        id={id}
        value={text}
        disabled={full}
        aria-label={label}
        placeholder={full ? `Maximum of ${max}` : `+ Add a ${noun}`}
        onChange={(e) => edit(e.target.value)}
        onKeyDown={onKey}
        onBlur={commit}
      />
    </div>
  );
}

const CONSENT_TEXT = 'I have consent for any students who can be identified here.';

/** A checkbox with the consent wording. The database refuses images and media without it. */
export function ConsentBox({
  id,
  checked,
  onChange,
  invalid,
}: {
  id: string;
  checked: boolean;
  onChange: (value: boolean) => void;
  invalid?: boolean;
}) {
  return (
    <label className={`consent ${invalid ? 'consent--invalid' : ''}`} htmlFor={id}>
      <input
        id={id}
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
      />
      <span>{CONSENT_TEXT}</span>
    </label>
  );
}
