import React from 'react';

/**
 * Loading placeholders shaped like the real page sections.
 * Pages' loading.tsx files compose these as a fragment so the
 * (authenticated) template's `.stagger` fades them in like real content.
 */

function Bar({ className = '' }: { className?: string }) {
  return <div className={`skeleton ${className}`} />;
}

export function PageHeaderSkeleton({ withAction = true }: { withAction?: boolean }) {
  return (
    <div className="page-hero" aria-hidden>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3.5">
          <Bar className="skeleton-soft h-11 w-11 rounded-xl" />
          <div className="flex flex-col gap-2">
            <Bar className="skeleton-soft h-5 w-40" />
            <Bar className="skeleton-soft h-3.5 w-64 max-w-[60vw]" />
          </div>
        </div>
        {withAction && <Bar className="skeleton-soft h-9 w-36 rounded-lg" />}
      </div>
    </div>
  );
}

export function StatGridSkeleton({ count = 4, className = 'grid-cols-2 lg:grid-cols-4' }: { count?: number; className?: string }) {
  return (
    <div className={`grid gap-3 md:gap-4 ${className}`} aria-hidden>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="card p-4 md:p-5">
          <div className="flex items-center justify-between">
            <Bar className="h-3.5 w-24" />
            <Bar className="h-8 w-8 rounded-lg" />
          </div>
          <Bar className="h-7 w-32 mt-3" />
          <Bar className="h-3 w-20 mt-2" />
        </div>
      ))}
    </div>
  );
}

export function CardSkeleton({
  className = '',
  bodyHeight = 'h-48',
}: {
  className?: string;
  bodyHeight?: string;
}) {
  return (
    <div className={`card overflow-hidden ${className}`} aria-hidden>
      <div className="card-head px-5 py-4 flex flex-col gap-2">
        <Bar className="h-4 w-36" />
        <Bar className="h-3 w-48" />
      </div>
      <div className="p-5">
        <Bar className={`w-full rounded-xl ${bodyHeight}`} />
      </div>
    </div>
  );
}

/** Card with a header strip and icon-led list rows (recent transactions, etc.). */
export function ListCardSkeleton({ rows = 5, className = '' }: { rows?: number; className?: string }) {
  return (
    <div className={`card overflow-hidden ${className}`} aria-hidden>
      <div className="card-head px-5 py-4 flex items-center justify-between">
        <div className="flex flex-col gap-2">
          <Bar className="h-4 w-40" />
          <Bar className="h-3 w-28" />
        </div>
        <Bar className="h-8 w-20 rounded-lg" />
      </div>
      <ul className="divide-y divide-line">
        {Array.from({ length: rows }).map((_, i) => (
          <li key={i} className="flex items-center gap-3 px-5 py-3.5">
            <Bar className="h-9 w-9 rounded-lg shrink-0" />
            <div className="flex-1 flex flex-col gap-1.5">
              <Bar className="h-3.5" />
              <Bar className="h-3 w-1/3" />
            </div>
            <Bar className="h-4 w-20" />
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Filter bar + table rows + pagination footer. */
export function TableSkeleton({
  rows = 8,
  columns = 4,
  filters = 3,
}: {
  rows?: number;
  columns?: number;
  filters?: number;
}) {
  return (
    <div className="card overflow-hidden" aria-hidden>
      <div className="card-head p-3 md:p-4 flex flex-col lg:flex-row gap-2.5">
        <Bar className="h-9 flex-1 rounded-lg" />
        <div className="grid grid-cols-3 lg:flex gap-2.5">
          {Array.from({ length: filters }).map((_, i) => (
            <Bar key={i} className="h-9 lg:w-36 rounded-lg" />
          ))}
        </div>
      </div>
      <div className="bg-subtle border-b border-line px-4 py-3 flex gap-6">
        {Array.from({ length: columns }).map((_, i) => (
          <Bar key={i} className={`h-3 ${i === 0 ? 'w-28' : 'w-16'} ${i > 1 ? 'hidden sm:block' : ''}`} />
        ))}
      </div>
      <ul className="divide-y divide-line">
        {Array.from({ length: rows }).map((_, i) => (
          <li key={i} className="flex items-center gap-3 px-4 py-3.5" style={{ opacity: 1 - i * 0.07 }}>
            <Bar className="h-8 w-8 rounded-lg shrink-0" />
            <div className="flex-1 flex flex-col gap-1.5 min-w-0">
              <Bar className="h-3.5 w-1/2" />
              <Bar className="h-3 w-1/4" />
            </div>
            <Bar className="hidden md:block h-5 w-20 rounded-full" />
            <Bar className="hidden sm:block h-3.5 w-20" />
            <Bar className="h-4 w-20" />
          </li>
        ))}
      </ul>
      <div className="flex items-center justify-between px-4 py-3 border-t border-line">
        <Bar className="h-3.5 w-24" />
        <div className="flex gap-1.5">
          <Bar className="h-8 w-16 rounded-lg" />
          <Bar className="h-8 w-16 rounded-lg" />
        </div>
      </div>
    </div>
  );
}

/** Settings-style section: title strip + label/control rows. */
export function SectionRowsSkeleton({ rows = 2, className = '' }: { rows?: number; className?: string }) {
  return (
    <div className={`card overflow-hidden max-w-3xl ${className}`} aria-hidden>
      <div className="card-head px-5 py-4">
        <Bar className="h-4 w-28" />
      </div>
      <div className="divide-y divide-line">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="flex items-center justify-between gap-4 px-5 py-4">
            <div className="flex flex-col gap-1.5 flex-1">
              <Bar className="h-3.5 w-32" />
              <Bar className="h-3 w-56 max-w-full" />
            </div>
            <Bar className="h-8 w-24 rounded-lg" />
          </div>
        ))}
      </div>
    </div>
  );
}
