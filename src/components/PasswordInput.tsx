'use client';

import React, { useState } from 'react';
import { Eye, EyeOff, Lock } from 'lucide-react';

type PasswordInputProps = Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'>;

export default function PasswordInput({ className = '', ...props }: PasswordInputProps) {
  const [show, setShow] = useState(false);

  return (
    <div className="relative">
      <Lock className="input-icon" />
      <input {...props} type={show ? 'text' : 'password'} className={`input pl-9 pr-10 ${className}`} />
      <button
        type="button"
        onClick={() => setShow((v) => !v)}
        tabIndex={-1}
        aria-label={show ? 'Hide password' : 'Show password'}
        className="absolute right-1 top-1/2 -translate-y-1/2 icon-btn h-7 w-7"
      >
        {show ? <EyeOff /> : <Eye />}
      </button>
    </div>
  );
}
