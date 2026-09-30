"use client";

import React, { useCallback, useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Check, ChevronDown } from "lucide-react";
import { useI18n } from "./I18nProvider";

/*
 * Custom replacements for the native <select> and <datalist>, styled with the
 * app's tokens. The list is portaled to <body> with fixed positioning so it is
 * never clipped by cards or scrolling modals, flips upward near the bottom of
 * the viewport, and animates in/out (.dropdown-panel in globals.css).
 */

export interface SelectOption<T extends string = string> {
  value: T;
  label: string;
  /** Muted text on the right of the option. */
  hint?: string;
  icon?: React.ComponentType<{ className?: string }>;
  /** Classes for the icon tile, e.g. a category tint. */
  iconClassName?: string;
}

type Phase = "closed" | "open" | "closing";
type Position = {
  left: number;
  width: number;
  maxHeight: number;
  top?: number;
  bottom?: number;
  placement: "bottom" | "top";
};

const CLOSE_MS = 140;

/** Positions a floating panel under (or above) an anchor and closes it on outside press. */
function useFloating(
  anchorRef: React.RefObject<HTMLElement | null>,
  visible: boolean,
  onOutside: () => void,
  minWidth = 160,
) {
  const [pos, setPos] = useState<Position | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  const place = useCallback(() => {
    const anchor = anchorRef.current;
    if (!anchor) return;
    const r = anchor.getBoundingClientRect();
    const gap = 6;
    const margin = 8;
    const below = window.innerHeight - r.bottom - gap - margin;
    const above = r.top - gap - margin;
    const placement = below < 200 && above > below ? "top" : "bottom";
    const width = Math.max(r.width, minWidth);
    setPos({
      placement,
      width,
      left: Math.min(Math.max(margin, r.left), window.innerWidth - width - margin),
      maxHeight: Math.max(120, Math.min(300, placement === "bottom" ? below : above)),
      ...(placement === "bottom"
        ? { top: r.bottom + gap }
        : { bottom: window.innerHeight - r.top + gap }),
    });
  }, [anchorRef, minWidth]);

  useEffect(() => {
    if (!visible) return;
    const frame = requestAnimationFrame(place);
    const onMove = () => place();
    const onDown = (e: PointerEvent) => {
      const t = e.target as Node;
      if (anchorRef.current?.contains(t) || panelRef.current?.contains(t)) return;
      onOutside();
    };
    window.addEventListener("resize", onMove);
    window.addEventListener("scroll", onMove, true);
    document.addEventListener("pointerdown", onDown);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("resize", onMove);
      window.removeEventListener("scroll", onMove, true);
      document.removeEventListener("pointerdown", onDown);
    };
  }, [visible, place, onOutside, anchorRef]);

  const style: React.CSSProperties | undefined = pos
    ? {
        position: "fixed",
        left: pos.left,
        width: pos.width,
        maxHeight: pos.maxHeight,
        top: pos.top,
        bottom: pos.bottom,
      }
    : undefined;

  return { pos, style, panelRef };
}

// ─── Select ──────────────────────────────────────────────────────────────────

interface SelectProps<T extends string> {
  value: T;
  onChange: (value: T) => void;
  options: SelectOption<T>[];
  /** Extra classes for the trigger (width, height…). */
  className?: string;
  id?: string;
  "aria-label"?: string;
  title?: string;
  disabled?: boolean;
  placeholder?: string;
  /** Compact trigger for tables. */
  size?: "sm" | "md";
}

export function Select<T extends string>({
  value,
  onChange,
  options,
  className = "",
  id,
  "aria-label": ariaLabel,
  title,
  disabled,
  placeholder,
  size = "md",
}: SelectProps<T>) {
  const { m } = useI18n();
  const listId = useId();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const [phase, setPhase] = useState<Phase>("closed");
  const [active, setActive] = useState(0);
  const typeahead = useRef({ text: "", at: 0 });

  const selectedIndex = options.findIndex((o) => o.value === value);
  const selected = options[selectedIndex];

  const close = useCallback(() => {
    setPhase((p) => (p === "open" ? "closing" : p));
    window.setTimeout(() => setPhase((p) => (p === "closing" ? "closed" : p)), CLOSE_MS);
  }, []);

  const { pos, style, panelRef } = useFloating(triggerRef, phase !== "closed", close);

  const openMenu = () => {
    if (disabled) return;
    setActive(Math.max(0, selectedIndex));
    setPhase("open");
  };

  const choose = (index: number) => {
    const option = options[index];
    if (option && option.value !== value) onChange(option.value);
    close();
    triggerRef.current?.focus();
  };

  // Keep the highlighted option visible while navigating with the keyboard
  useEffect(() => {
    if (phase !== "open") return;
    panelRef.current
      ?.querySelector<HTMLElement>(`[data-index="${active}"]`)
      ?.scrollIntoView({ block: "nearest" });
  }, [active, phase, pos, panelRef]);

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (disabled) return;
    const isOpen = phase === "open";

    if (!isOpen) {
      if (["ArrowDown", "ArrowUp", "Enter", " "].includes(e.key)) {
        e.preventDefault();
        openMenu();
      }
      return;
    }

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setActive((i) => Math.min(options.length - 1, i + 1));
        break;
      case "ArrowUp":
        e.preventDefault();
        setActive((i) => Math.max(0, i - 1));
        break;
      case "Home":
        e.preventDefault();
        setActive(0);
        break;
      case "End":
        e.preventDefault();
        setActive(options.length - 1);
        break;
      case "Enter":
      case " ":
        e.preventDefault();
        choose(active);
        break;
      case "Escape":
        // Close only the list, not a surrounding modal
        e.preventDefault();
        e.stopPropagation();
        close();
        break;
      case "Tab":
        close();
        break;
      default:
        if (e.key.length === 1 && !e.metaKey && !e.ctrlKey && !e.altKey) {
          const now = Date.now();
          const t = typeahead.current;
          t.text = now - t.at > 600 ? e.key.toLowerCase() : t.text + e.key.toLowerCase();
          t.at = now;
          const match = options.findIndex((o) => o.label.toLowerCase().startsWith(t.text));
          if (match >= 0) setActive(match);
        }
    }
  };

  const SelectedIcon = selected?.icon;

  return (
    <>
      <button
        ref={triggerRef}
        id={id}
        type="button"
        role="combobox"
        aria-haspopup="listbox"
        aria-expanded={phase === "open"}
        aria-controls={listId}
        aria-activedescendant={phase === "open" ? `${listId}-${active}` : undefined}
        aria-label={ariaLabel}
        title={title}
        disabled={disabled}
        onClick={() => (phase === "open" ? close() : openMenu())}
        onKeyDown={onKeyDown}
        className={`input select-trigger ${size === "sm" ? "h-8 text-[13px] px-2.5" : ""} ${className}`}
      >
        {SelectedIcon && (
          <span className={`select-trigger-icon ${selected.iconClassName ?? ""}`}>
            <SelectedIcon className="h-3.5 w-3.5" />
          </span>
        )}
        <span className={`truncate ${selected ? "" : "text-faint"}`}>{selected?.label ?? placeholder ?? m.selectPlaceholder}</span>
        <ChevronDown className="select-chevron" aria-hidden />
      </button>

      {phase !== "closed" &&
        pos &&
        createPortal(
          <div
            ref={panelRef}
            id={listId}
            role="listbox"
            aria-label={ariaLabel}
            className="dropdown-panel"
            data-state={phase === "closing" ? "closed" : "open"}
            data-placement={pos.placement}
            style={style}
            // Keep focus on the trigger so keyboard handling continues to work
            onMouseDown={(e) => e.preventDefault()}
          >
            {options.map((o, i) => {
              const Icon = o.icon;
              return (
                <div
                  key={o.value}
                  id={`${listId}-${i}`}
                  role="option"
                  data-index={i}
                  aria-selected={o.value === value}
                  data-active={i === active}
                  onMouseEnter={() => setActive(i)}
                  onClick={() => choose(i)}
                  className="dropdown-option"
                >
                  {Icon && (
                    <span className={`dropdown-option-icon ${o.iconClassName ?? ""}`}>
                      <Icon className="h-3.5 w-3.5" />
                    </span>
                  )}
                  <span className="flex-1 truncate">{o.label}</span>
                  {o.hint && <span className="text-[11px] text-faint shrink-0">{o.hint}</span>}
                  <Check className="dropdown-check" aria-hidden />
                </div>
              );
            })}
          </div>,
          document.body,
        )}
    </>
  );
}

// ─── ComboInput (text input with suggestions; replaces <datalist>) ───────────

interface ComboInputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "value" | "onChange" | "list"> {
  value: string;
  onChange: (value: string) => void;
  suggestions: string[];
  /** Leading icon, rendered like `.input-icon`. */
  icon?: React.ComponentType<{ className?: string }>;
  maxSuggestions?: number;
}

export function ComboInput({
  value,
  onChange,
  suggestions,
  icon: Icon,
  maxSuggestions = 8,
  className = "",
  onKeyDown,
  onFocus,
  ...inputProps
}: ComboInputProps) {
  const { m } = useI18n();
  const listId = useId();
  const wrapRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);

  const query = value.trim().toLowerCase();
  const matches = suggestions
    .filter((s) => s.toLowerCase() !== query && s.toLowerCase().includes(query))
    .slice(0, maxSuggestions);
  const visible = open && matches.length > 0 && !inputProps.disabled;

  const close = useCallback(() => {
    setOpen(false);
    setActive(-1);
  }, []);
  const { pos, style, panelRef } = useFloating(wrapRef, visible, close, 180);

  const choose = (s: string) => {
    onChange(s);
    close();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (visible) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setActive((i) => Math.min(matches.length - 1, i + 1));
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setActive((i) => Math.max(-1, i - 1));
        return;
      }
      if (e.key === "Enter" && active >= 0) {
        // Pick the suggestion instead of submitting the form
        e.preventDefault();
        choose(matches[active]);
        return;
      }
      if (e.key === "Escape") {
        e.preventDefault();
        e.stopPropagation();
        close();
        return;
      }
      if (e.key === "Tab") close();
    } else if (e.key === "ArrowDown" && matches.length > 0) {
      e.preventDefault();
      setOpen(true);
    }
    onKeyDown?.(e);
  };

  return (
    <div ref={wrapRef} className="relative">
      {Icon && <Icon className="input-icon" />}
      <input
        {...inputProps}
        type="text"
        role="combobox"
        aria-autocomplete="list"
        aria-expanded={visible}
        aria-controls={listId}
        aria-activedescendant={visible && active >= 0 ? `${listId}-${active}` : undefined}
        autoComplete="off"
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          setOpen(true);
          setActive(-1);
        }}
        // Suggestions appear on typing, click or ArrowDown — not on (auto)focus
        onFocus={onFocus}
        onClick={() => setOpen(true)}
        onKeyDown={handleKeyDown}
        className={`input ${Icon ? "pl-9" : ""} ${className}`}
      />

      {visible &&
        pos &&
        createPortal(
          <div
            ref={panelRef}
            id={listId}
            role="listbox"
            className="dropdown-panel"
            data-state="open"
            data-placement={pos.placement}
            style={style}
            onMouseDown={(e) => e.preventDefault()}
          >
            <p className="px-2.5 pt-1.5 pb-1 text-[11px] font-semibold uppercase tracking-[0.06em] text-faint">
              {m.previouslyUsed}
            </p>
            {matches.map((s, i) => (
              <div
                key={s}
                id={`${listId}-${i}`}
                role="option"
                aria-selected={i === active}
                data-active={i === active}
                onMouseEnter={() => setActive(i)}
                onClick={() => choose(s)}
                className="dropdown-option"
              >
                <span className="flex-1 truncate">{s}</span>
              </div>
            ))}
          </div>,
          document.body,
        )}
    </div>
  );
}
