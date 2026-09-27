'use client';

import React, { useEffect } from 'react';
import { X } from 'lucide-react';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: React.ReactNode;
  description?: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
  size?: 'sm' | 'md' | 'lg';
  /** Prevents closing via overlay / Escape (e.g. while saving). */
  locked?: boolean;
}

const sizes = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
};

export default function Modal({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  size = 'md',
  locked = false,
}: ModalProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !locked) onClose();
    };
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [open, locked, onClose]);

  if (!open) return null;

  return (
    <div className="modal-root" role="dialog" aria-modal="true">
      <div className="modal-overlay" onClick={() => !locked && onClose()} />
      <div className={`modal-panel ${sizes[size]}`}>
        <div className="flex items-start justify-between gap-4 px-5 pt-5">
          <div className="min-w-0">
            <h3 className="text-base font-semibold tracking-tight text-fg">{title}</h3>
            {description && <p className="text-[13px] text-muted mt-1">{description}</p>}
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={locked}
            className="icon-btn -mr-1.5 -mt-1"
            aria-label="Close"
          >
            <X />
          </button>
        </div>
        <div className="px-5 py-4">{children}</div>
        {footer && (
          <div className="flex items-center justify-end gap-2 px-5 py-3.5 border-t border-line bg-subtle/60 rounded-b-[14px]">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
