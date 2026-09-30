"use client";

import React, { useRef } from "react";
import { useI18n } from "./I18nProvider";
import { toAsciiDigits } from "@/lib/format";

export const OTP_LENGTH = 6;
export const emptyOtp = () => Array<string>(OTP_LENGTH).fill("");

/**
 * Six single-digit boxes with auto-advance, backspace-to-previous and paste
 * support. Remount it (change `key`) to reset focus to the first box.
 */
export default function OtpInput({
  digits,
  onChange,
  disabled,
  autoFocus = true,
}: {
  digits: string[];
  onChange: (digits: string[]) => void;
  disabled?: boolean;
  autoFocus?: boolean;
}) {
  const { m, fmt } = useI18n();
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const handleChange = (index: number, raw: string) => {
    const value = toAsciiDigits(raw); // accept Bangla-keyboard digits too
    if (isNaN(Number(value))) return; // only digits allowed

    const next = [...digits];
    // Keep only the last character entered
    next[index] = value.substring(value.length - 1);
    onChange(next);

    if (value && index < OTP_LENGTH - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !digits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLDivElement>) => {
    e.preventDefault();
    const pasted = toAsciiDigits(e.clipboardData.getData("text").trim());
    if (!/^\d+$/.test(pasted)) return; // must be only digits

    const next = [...digits];
    pasted
      .substring(0, OTP_LENGTH)
      .split("")
      .forEach((digit, i) => {
        next[i] = digit;
      });
    onChange(next);

    inputRefs.current[Math.min(pasted.length, OTP_LENGTH - 1)]?.focus();
  };

  return (
    <div className="grid grid-cols-6 gap-2" onPaste={handlePaste}>
      {digits.map((digit, idx) => (
        <input
          key={idx}
          ref={(el) => {
            inputRefs.current[idx] = el;
          }}
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          maxLength={1}
          autoComplete={idx === 0 ? "one-time-code" : "off"}
          value={fmt.digits(digit)}
          onChange={(e) => handleChange(idx, e.target.value)}
          onKeyDown={(e) => handleKeyDown(idx, e)}
          aria-label={m.auth.otpDigit(idx + 1)}
          className={`input h-13 px-0 rounded-xl text-center text-xl font-semibold tabular transition-[border-color,box-shadow,transform,background-color] duration-200 ${
            digit ? "border-accent/50 bg-accent-soft text-accent-fg" : ""
          } focus:scale-[1.05]`}
          disabled={disabled}
          autoFocus={autoFocus && idx === 0}
        />
      ))}
    </div>
  );
}
