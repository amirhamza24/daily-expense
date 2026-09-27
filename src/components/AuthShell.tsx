import React from 'react';
import Link from 'next/link';
import { Wallet } from 'lucide-react';

interface AuthShellProps {
  title: string;
  description: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
}

/** Centered card layout shared by login, register and verify. */
export default function AuthShell({ title, description, children, footer }: AuthShellProps) {
  return (
    <div className="relative flex-1 flex items-center justify-center px-4 py-12 min-h-screen overflow-hidden">
      {/* Faint dot grid, fading out toward the edges */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-60 [background-image:radial-gradient(var(--border-strong)_1px,transparent_1px)] [background-size:20px_20px] [mask-image:radial-gradient(ellipse_at_center,black_20%,transparent_70%)]"
      />

      <div className="relative w-full max-w-sm stagger">
        <Link href="/login" className="flex items-center justify-center gap-2.5 mb-8">
          <span className="h-8 w-8 rounded-lg bg-accent text-white flex items-center justify-center shadow-sm">
            <Wallet className="h-4.5 w-4.5" />
          </span>
          <span className="font-semibold text-base tracking-tight text-fg">Expensify</span>
        </Link>

        <div className="card p-6 sm:p-7 shadow-(--shadow-md)">
          <h1 className="text-lg font-semibold tracking-tight text-fg">{title}</h1>
          <p className="text-[13px] text-muted mt-1 mb-6">{description}</p>
          {children}
        </div>

        {footer && <div className="mt-6 text-center text-[13px] text-muted">{footer}</div>}
      </div>
    </div>
  );
}
