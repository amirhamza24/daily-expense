/**
 * Calendar math in the *user's* time zone (the server runs in UTC).
 * A "Ymd" is a local calendar date; month is 0-based like Date.
 */

export const DEFAULT_TIME_ZONE = 'UTC';
export const TZ_COOKIE = 'tz';
const DAY_MS = 86_400_000;

export type Ymd = { y: number; m: number; d: number };

export function isValidTimeZone(tz: string | undefined | null): tz is string {
  if (!tz || tz.length > 64) return false;
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

/** Offset of `tz` from UTC at `instant`, in ms (e.g. Asia/Dhaka → +6h). */
function tzOffsetMs(instant: Date, tz: string) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: tz,
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).formatToParts(instant);
  const p = Object.fromEntries(parts.map((x) => [x.type, x.value]));
  const asUtc = Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour, +p.minute, +p.second);
  return asUtc - Math.floor(instant.getTime() / 1000) * 1000;
}

/** Normalizes overflowing dates (e.g. d = 0 → last day of previous month). */
export function normYmd(y: number, m: number, d: number): Ymd {
  const t = new Date(Date.UTC(y, m, d));
  return { y: t.getUTCFullYear(), m: t.getUTCMonth(), d: t.getUTCDate() };
}

export const addDays = (a: Ymd, n: number) => normYmd(a.y, a.m, a.d + n);
export const addMonths = (a: Ymd, n: number) => normYmd(a.y, a.m + n, 1);

/** Whole days from a to b (b exclusive). */
export const daysBetween = (a: Ymd, b: Ymd) =>
  Math.round((Date.UTC(b.y, b.m, b.d) - Date.UTC(a.y, a.m, a.d)) / DAY_MS);

export const compareYmd = (a: Ymd, b: Ymd) => Date.UTC(a.y, a.m, a.d) - Date.UTC(b.y, b.m, b.d);

/** UTC instant of local midnight of `ymd` in `tz`. */
export function zonedMidnight(ymd: Ymd, tz: string): Date {
  const guess = Date.UTC(ymd.y, ymd.m, ymd.d);
  const first = tzOffsetMs(new Date(guess), tz);
  let t = guess - first;
  const second = tzOffsetMs(new Date(t), tz); // DST edge
  if (second !== first) t = guess - second;
  return new Date(t);
}

/** Local calendar date of an instant in `tz`. */
export function toYmd(instant: Date, tz: string): Ymd {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: tz,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(instant);
  const p = Object.fromEntries(parts.map((x) => [x.type, x.value]));
  return { y: +p.year, m: +p.month - 1, d: +p.day };
}

const pad = (n: number) => String(n).padStart(2, '0');
export const ymdKey = (a: Ymd) => `${a.y}-${pad(a.m + 1)}-${pad(a.d)}`;
export const monthKey = (a: Ymd) => `${a.y}-${pad(a.m + 1)}`;

export function parseYmd(s: string | undefined | null): Ymd | null {
  const m = s?.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return null;
  const v = normYmd(+m[1], +m[2] - 1, +m[3]);
  return ymdKey(v) === s ? v : null; // rejects 2026-02-31
}

/** Formats a "YYYY-MM-DD" key for display without any time-zone shift. */
export function formatYmd(key: string, opts: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' }) {
  const v = parseYmd(key);
  if (!v) return key;
  return new Date(Date.UTC(v.y, v.m, v.d)).toLocaleDateString('en-US', { ...opts, timeZone: 'UTC' });
}

export function formatMonthKey(key: string, opts: Intl.DateTimeFormatOptions = { month: 'short', year: '2-digit' }) {
  const m = key.match(/^(\d{4})-(\d{2})$/);
  if (!m) return key;
  return new Date(Date.UTC(+m[1], +m[2] - 1, 1)).toLocaleDateString('en-US', { ...opts, timeZone: 'UTC' });
}

// ─── Analysis periods ────────────────────────────────────────────────────────

export type RangePreset = 'today' | 'week' | 'month' | 'last-month' | '3m' | '6m' | 'year' | 'custom';

export const RANGE_PRESETS: Array<{ value: RangePreset; label: string }> = [
  { value: 'today', label: 'Today' },
  { value: 'week', label: 'This week' },
  { value: 'month', label: 'This month' },
  { value: 'last-month', label: 'Last month' },
  { value: '3m', label: 'Last 3 months' },
  { value: '6m', label: 'Last 6 months' },
  { value: 'year', label: 'This year' },
  { value: 'custom', label: 'Custom range' },
];

export interface Period {
  preset: RangePreset;
  /** Local calendar bounds; `end` is exclusive. */
  start: Ymd;
  end: Ymd;
  prevStart: Ymd;
  prevEnd: Ymd;
  /** e.g. "September 2026", "Sep 1 – Sep 28, 2026" */
  label: string;
  /** Used in sentences: "compared with {prevLabel}". */
  prevLabel: string;
  /** Days in the period up to today (never 0) — the divisor for daily averages. */
  elapsedDays: number;
  /** Last day with data to chart (period end or today, whichever is first); exclusive. */
  chartEnd: Ymd;
}

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
export const monthName = (m: number) => MONTHS[m];

function spanLabel(a: Ymd, bExclusive: Ymd) {
  const last = addDays(bExclusive, -1);
  const f = (v: Ymd, year: boolean) =>
    new Date(Date.UTC(v.y, v.m, v.d)).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      ...(year ? { year: 'numeric' } : {}),
      timeZone: 'UTC',
    });
  if (compareYmd(a, last) === 0) return f(a, true);
  return `${f(a, a.y !== last.y)} – ${f(last, true)}`;
}

/** Resolves a preset (or custom from/to, inclusive "YYYY-MM-DD") to a period and its previous equivalent. */
export function resolvePeriod(
  preset: RangePreset,
  tz: string,
  from?: string | null,
  to?: string | null,
  now = new Date(),
): Period {
  const today = toYmd(now, tz);
  const tomorrow = addDays(today, 1);
  const monthStart = normYmd(today.y, today.m, 1);

  let start: Ymd, end: Ymd, prevStart: Ymd, prevEnd: Ymd, label: string, prevLabel: string;

  switch (preset) {
    case 'today':
      start = today;
      end = tomorrow;
      prevStart = addDays(today, -1);
      prevEnd = today;
      label = spanLabel(start, end);
      prevLabel = 'yesterday';
      break;
    case 'week': {
      start = addDays(today, -new Date(Date.UTC(today.y, today.m, today.d)).getUTCDay()); // Sunday
      end = addDays(start, 7);
      prevStart = addDays(start, -7);
      prevEnd = start;
      label = `This week (${spanLabel(start, end)})`;
      prevLabel = 'last week';
      break;
    }
    case 'last-month':
      start = addMonths(monthStart, -1);
      end = monthStart;
      prevStart = addMonths(monthStart, -2);
      prevEnd = start;
      label = `${monthName(start.m)} ${start.y}`;
      prevLabel = `${monthName(prevStart.m)} ${prevStart.y}`;
      break;
    case '3m':
    case '6m': {
      const n = preset === '3m' ? 3 : 6;
      start = addMonths(monthStart, -(n - 1));
      end = addMonths(monthStart, 1);
      prevStart = addMonths(start, -n);
      prevEnd = start;
      label = `Last ${n} months (${monthName(start.m).slice(0, 3)} – ${monthName(today.m).slice(0, 3)} ${today.y})`;
      prevLabel = `the previous ${n} months`;
      break;
    }
    case 'year':
      start = normYmd(today.y, 0, 1);
      end = normYmd(today.y + 1, 0, 1);
      prevStart = normYmd(today.y - 1, 0, 1);
      prevEnd = start;
      label = `${today.y}`;
      prevLabel = `${today.y - 1}`;
      break;
    case 'custom': {
      let a = parseYmd(from) ?? monthStart;
      let b = parseYmd(to) ?? today;
      if (compareYmd(a, b) > 0) [a, b] = [b, a];
      start = a;
      end = addDays(b, 1);
      const len = daysBetween(start, end);
      prevStart = addDays(start, -len);
      prevEnd = start;
      label = spanLabel(start, end);
      prevLabel = 'the previous period';
      break;
    }
    case 'month':
    default:
      start = monthStart;
      end = addMonths(monthStart, 1);
      prevStart = addMonths(monthStart, -1);
      prevEnd = monthStart;
      label = `${monthName(start.m)} ${start.y}`;
      prevLabel = monthName(prevStart.m) + (prevStart.y !== start.y ? ` ${prevStart.y}` : '');
      preset = 'month';
  }

  const chartEnd = compareYmd(end, tomorrow) > 0 ? (compareYmd(start, tomorrow) >= 0 ? end : tomorrow) : end;
  const elapsedDays = Math.max(1, daysBetween(start, chartEnd));

  return { preset, start, end, prevStart, prevEnd, label, prevLabel, elapsedDays, chartEnd };
}

/** Safe percentage change; null when there is no meaningful base (previous = 0). */
export function pctChange(current: number, previous: number): number | null {
  if (!Number.isFinite(current) || !Number.isFinite(previous) || previous <= 0) return null;
  return ((current - previous) / previous) * 100;
}

/** Safe share; 0 when the total is 0. */
export const share = (part: number, total: number) => (total > 0 ? (part / total) * 100 : 0);
