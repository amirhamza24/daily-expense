import React from "react";
import Link from "next/link";
import { Outfit } from "next/font/google";
import { Wallet } from "lucide-react";

const outfit = Outfit({ subsets: ["latin"], weight: ["300", "600", "700"] });

interface AuthShellProps {
  title: string;
  description: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
  /** Small icon shown above the title. */
  icon?: React.ComponentType<{ className?: string }>;
}

function Brand() {
  return (
    <Link href="/login" className="inline-flex items-center gap-2.5">
      <span className="icon-tile icon-tile-solid h-9 w-9 rounded-xl">
        <Wallet className="h-4.5 w-4.5" />
      </span>
      <span
        className={`${outfit.className} font-semibold text-xl tracking-tight text-fg`}
      >
        Expensify
      </span>
    </Link>
  );
}

/** Split layout shared by login, register and verify: brand panel + form card. */
export default function AuthShell({
  title,
  description,
  children,
  footer,
  icon: Icon,
}: AuthShellProps) {
  return (
    <div className="flex-1 min-h-screen grid lg:grid-cols-2 lg:fixed lg:inset-0 lg:min-h-0">
      {/* Brand panel (desktop) */}
      <aside className="relative hidden lg:flex lg:h-full items-center justify-center overflow-hidden text-white bg-[linear-gradient(160deg,#17703b_0%,#0f4d28_60%,#0b3b1f_100%)]">
        {/* Decorative circles */}
        <div aria-hidden className="pointer-events-none absolute inset-0">
          <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 h-[600px] w-[600px] rounded-full border border-white/10" />
          <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 h-[460px] w-[460px] rounded-full border border-white/15" />
          <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 h-[330px] w-[330px] rounded-full bg-white/5 border border-white/20" />
          <span className="absolute -top-28 -left-28 h-80 w-80 rounded-full bg-white/6" />
          <span className="absolute -bottom-36 -right-24 h-96 w-96 rounded-full bg-emerald-300/10" />
          <span className="absolute top-[18%] right-[16%] h-16 w-16 rounded-full border-2 border-white/20" />
          <span className="absolute bottom-[20%] left-[14%] h-10 w-10 rounded-full bg-emerald-200/25" />
          <span className="absolute top-[30%] left-[22%] h-3 w-3 rounded-full bg-white/40" />
          <span className="absolute bottom-[30%] right-[24%] h-2.5 w-2.5 rounded-full bg-emerald-200/60" />
        </div>

        <div className="relative flex flex-col items-center text-center animate-fade-up">
          <span className="h-16 w-16 rounded-2xl bg-white/15 ring-1 ring-white/25 backdrop-blur-sm flex items-center justify-center mb-5">
            <Wallet className="h-8 w-8" />
          </span>
          <h2
            className={`${outfit.className} text-5xl font-bold tracking-wider`}
          >
            Expensify
          </h2>
          <p
            className={`${outfit.className} mt-2 text-lg font-light tracking-wide text-emerald-100/90`}
          >
            Track your daily expenses
          </p>
        </div>
      </aside>
      {/* Form side */}
      <main className="relative overflow-hidden lg:h-full">
        <div
          aria-hidden
          className="pointer-events-none absolute -top-24 -right-24 h-80 w-80 rounded-full bg-accent/10 blur-3xl animate-drift"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -bottom-32 -left-16 h-80 w-80 rounded-full bg-accent/8 blur-3xl animate-drift [animation-delay:-6s]"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-50 [background-image:radial-gradient(var(--border-strong)_1px,transparent_1px)] [background-size:22px_22px] [mask-image:radial-gradient(ellipse_at_center,black_15%,transparent_65%)]"
        />

        {/* Only this column scrolls on desktop */}
        <div className="relative lg:h-full lg:overflow-y-auto">
          <div className="min-h-full flex items-center justify-center px-4 py-12 sm:px-8">
            <div className="relative w-full max-w-[400px] stagger">
              <div className="lg:hidden flex justify-center mb-8">
                <Brand />
              </div>

              <div className="card p-6 sm:p-8 rounded-2xl shadow-(--shadow-lg) border-line/80 bg-surface/90 backdrop-blur-xl">
                {Icon && (
                  <span className="icon-tile h-11 w-11 rounded-xl mb-4 animate-pop-in">
                    <Icon className="h-5! w-5!" />
                  </span>
                )}
                <h1 className="text-[1.375rem] font-semibold tracking-tight text-fg">
                  {title}
                </h1>
                <p className="text-[13.5px] text-muted mt-1.5 mb-7">
                  {description}
                </p>
                {children}
              </div>

              {footer && (
                <div className="mt-6 text-center text-[13px] text-muted">
                  {footer}
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

/** Suspense fallback shaped like the auth card. */
export function AuthShellSkeleton() {
  return (
    <div className="flex-1 min-h-screen grid lg:grid-cols-2 lg:fixed lg:inset-0 lg:min-h-0">
      <div className="hidden lg:block bg-[linear-gradient(160deg,#17703b_0%,#0f4d28_60%,#0b3b1f_100%)]" />
      <div className="flex items-center justify-center px-4">
        <div className="card w-full max-w-[400px] p-8 rounded-2xl flex flex-col gap-4">
          <div className="skeleton h-11 w-11 rounded-xl" />
          <div className="skeleton h-6 w-40" />
          <div className="skeleton h-4 w-60" />
          <div className="skeleton h-9 w-full mt-3" />
          <div className="skeleton h-9 w-full" />
          <div className="skeleton h-10 w-full mt-2" />
        </div>
      </div>
    </div>
  );
}
