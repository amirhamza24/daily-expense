'use client';

import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
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
  /** Icon shown in a tile beside the title. */
  icon?: React.ReactNode;
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
  icon,
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

  if (!open || typeof document === 'undefined') return null;

  // Portal to <body>: page sections animate `transform`, which would otherwise
  // make this fixed overlay position (and clip) relative to its parent card.
  return createPortal(
    <div className="modal-root" role="dialog" aria-modal="true">
      <div className="modal-overlay" onClick={() => !locked && onClose()} />
      <div className={`modal-panel ${sizes[size]}`}>
        <div className="modal-head flex items-start justify-between gap-4 px-5 py-4">
          <div className="flex items-start gap-3 min-w-0">
            {icon && (
              <span className="icon-tile icon-tile-solid h-10 w-10 rounded-xl animate-pop-in">{icon}</span>
            )}
            <div className="min-w-0 pt-0.5">
              <h3 className="text-base font-semibold tracking-tight text-fg">{title}</h3>
              {description && <p className="text-[13px] text-muted mt-0.5">{description}</p>}
            </div>
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
        <div className="px-5 py-5">{children}</div>
        {footer && (
          <div className="flex items-center justify-end gap-2 px-5 py-3.5 border-t border-line bg-subtle/60 rounded-b-2xl">
            {footer}
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
}
