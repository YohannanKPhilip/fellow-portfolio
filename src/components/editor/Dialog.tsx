import { useEffect, useRef, type ReactNode } from 'react';

interface Props {
  title: string;
  onClose: () => void;
  children: ReactNode;
}

/**
 * A small window over the page, built on the browser's own <dialog>: it traps focus, closes on
 * Esc, and dims the page behind it. Mount it only while it should be open.
 */
export function Dialog({ title, onClose, children }: Props) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (el && !el.open) el.showModal();
  }, []);

  return (
    <dialog
      ref={ref}
      className="dialog"
      aria-label={title}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      onClick={(e) => {
        // A click on the dimmed area (the dialog element itself) closes it.
        if (e.target === ref.current) onClose();
      }}
    >
      <div className="dialog__head">
        <h2 className="dialog__title">{title}</h2>
        <button type="button" className="dialog__close" aria-label="Close" onClick={onClose}>
          ×
        </button>
      </div>
      {children}
    </dialog>
  );
}
