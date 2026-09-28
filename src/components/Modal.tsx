'use client';

import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Download, Loader2, X } from 'lucide-react';
import { useToast } from './Toast';
import { downloadNodeAsImage, type ImageFormat } from '@/lib/export-image';

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
  /**
   * Adds a "Download as image" button to the header. The modal (minus buttons,
   * the footer and anything marked `data-export-ignore`) is saved as PNG/JPG.
   */
  download?: { fileName: string };
}

const sizes = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
};

const FORMATS: Array<{ format: ImageFormat; label: string; hint: string }> = [
  { format: 'png', label: 'PNG image', hint: 'Sharpest quality' },
  { format: 'jpg', label: 'JPG image', hint: 'Smaller file' },
];

function DownloadMenu({ panelRef, fileName }: { panelRef: React.RefObject<HTMLDivElement | null>; fileName: string }) {
  const { showToast } = useToast();
  const [menuOpen, setMenuOpen] = useState(false);
  const [busy, setBusy] = useState<ImageFormat | null>(null);
  const wrapRef = useRef<HTMLDivElement>(null);

  // Close the menu on outside click
  useEffect(() => {
    if (!menuOpen) return;
    const onDown = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setMenuOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [menuOpen]);

  const handleDownload = async (format: ImageFormat) => {
    const panel = panelRef.current;
    if (!panel) return;
    setMenuOpen(false);
    setBusy(format);
    try {
      await downloadNodeAsImage(panel, fileName, format);
      showToast(`Saved as ${format.toUpperCase()}.`, 'success');
    } catch (error) {
      console.error('Image export failed:', error);
      showToast("Couldn't create the image. Please try again.", 'error');
    } finally {
      setBusy(null);
    }
  };

  return (
    <div ref={wrapRef} className="relative" data-export-ignore>
      <button
        type="button"
        onClick={() => setMenuOpen((v) => !v)}
        disabled={!!busy}
        className="icon-btn -mt-1"
        title="Download as image"
        aria-label="Download as image"
        aria-haspopup="menu"
        aria-expanded={menuOpen}
      >
        {busy ? <Loader2 className="animate-spin" /> : <Download />}
      </button>

      {menuOpen && (
        <div
          role="menu"
          className="absolute right-0 top-full mt-1.5 z-10 w-48 rounded-xl border border-line bg-surface p-1 shadow-(--shadow-lg) animate-pop-in origin-top-right"
        >
          <p className="px-2.5 pt-1.5 pb-1 text-[11px] font-semibold uppercase tracking-[0.06em] text-faint">
            Download as
          </p>
          {FORMATS.map((f) => (
            <button
              key={f.format}
              type="button"
              role="menuitem"
              onClick={() => handleDownload(f.format)}
              className="w-full flex items-center justify-between gap-2 rounded-lg px-2.5 py-2 text-left hover:bg-subtle cursor-pointer transition-colors"
            >
              <span className="text-[13px] font-medium text-fg">{f.label}</span>
              <span className="text-[11px] text-faint">{f.hint}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

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
  download,
}: ModalProps) {
  const panelRef = useRef<HTMLDivElement>(null);

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
      <div ref={panelRef} className={`modal-panel ${sizes[size]}`}>
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
          <div className="flex items-center gap-0.5 -mr-1.5 shrink-0">
            {download && <DownloadMenu panelRef={panelRef} fileName={download.fileName} />}
            <button
              type="button"
              onClick={onClose}
              disabled={locked}
              className="icon-btn -mt-1"
              aria-label="Close"
              data-export-ignore
            >
              <X />
            </button>
          </div>
        </div>
        <div className="px-5 py-5">{children}</div>
        {footer && (
          <div
            className="flex items-center justify-end gap-2 px-5 py-3.5 border-t border-line bg-subtle/60 rounded-b-2xl"
            data-export-ignore
          >
            {footer}
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
}
