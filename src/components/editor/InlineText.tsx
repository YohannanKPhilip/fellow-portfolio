import { useLayoutEffect, useRef } from 'react';

interface Props {
  value: string;
  onChange: (value: string) => void;
  /** Classes of the text it stands in for, e.g. "detail__title", so it looks the same while editing. */
  className?: string;
  placeholder: string;
  maxLength: number;
  /** Accessible name. */
  label: string;
  /** One line that wraps (a title): Enter does nothing. */
  singleLine?: boolean;
  invalid?: boolean;
}

/**
 * Text edited right where it is shown. It looks like the text itself (same font and size), grows
 * with what is typed, and shows a dashed outline on hover and focus.
 */
export function InlineText({
  value,
  onChange,
  className = '',
  placeholder,
  maxLength,
  label,
  singleLine = false,
  invalid = false,
}: Props) {
  const ref = useRef<HTMLTextAreaElement>(null);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${el.scrollHeight}px`;
  }, [value]);

  return (
    <textarea
      ref={ref}
      className={`inline-text ${className}`}
      rows={1}
      maxLength={maxLength}
      aria-label={label}
      aria-invalid={invalid}
      placeholder={placeholder}
      value={value}
      onChange={(e) => onChange(singleLine ? e.target.value.replace(/\n/g, ' ') : e.target.value)}
      onKeyDown={(e) => {
        if (singleLine && e.key === 'Enter') e.preventDefault();
      }}
    />
  );
}
