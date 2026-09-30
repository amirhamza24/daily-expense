"use client";

import { useSyncExternalStore } from "react";
import { CalendarDays, Sparkles } from "lucide-react";
import { useI18n } from "./I18nProvider";
import type { Messages } from "@/lib/i18n/messages";

// One shared 1s ticker; the snapshot is the current whole second so React only
// re-renders when the displayed time actually changes.
function subscribe(onTick: () => void) {
  const id = setInterval(onTick, 1000);
  return () => clearInterval(id);
}
const getSecond = () => Math.floor(Date.now() / 1000);
// Server render (and hydration) shows placeholders — avoids a time mismatch.
const getServerSecond = () => null;

function useNow(): Date | null {
  const second = useSyncExternalStore(subscribe, getSecond, getServerSecond);
  return second === null ? null : new Date(second * 1000);
}

function greetingFor(hour: number, m: Messages) {
  const g = m.welcome.greeting;
  if (hour < 5) return g.night;
  if (hour < 12) return g.morning;
  if (hour < 17) return g.afternoon;
  return g.evening;
}

const pad = (n: number) => String(n).padStart(2, "0");

// Each character gets its own fixed-width cell (see .clock-digit) so the clock
// never jitters as the seconds change.
function Digits({ value }: { value: string }) {
  return (
    <>
      {value.split("").map((ch, i) => (
        <span key={i} className="clock-digit">
          {ch}
        </span>
      ))}
    </>
  );
}

export default function WelcomeHero({ name }: { name: string }) {
  const now = useNow();
  const { m, fmt } = useI18n();

  const hours12 = now ? now.getHours() % 12 || 12 : null;
  const clock = now
    ? [pad(hours12!), pad(now.getMinutes()), pad(now.getSeconds())].map(fmt.digits)
    : ["--", "--", "--"];
  const meridiem = now ? (now.getHours() < 12 ? m.am : m.pm) : "";
  const dateLabel = now
    ? fmt.date(now, { weekday: "long", day: "numeric", month: "long", year: "numeric" })
    : " ";

  return (
    <section className="welcome-hero">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="min-w-0">
          <span className="welcome-chip">
            <Sparkles className="h-3 w-3" />
            {now ? greetingFor(now.getHours(), m) : m.welcome.fallback}
          </span>
          <h1 className="mt-1.5 font-display leading-tight tracking-tight truncate">
            <span className="text-sm md:text-base font-medium text-muted">{m.welcome.welcomeBack} </span>
            <span className="text-2xl md:text-[1.75rem] font-bold text-fg">{name}</span>
          </h1>
        </div>

        <div className="welcome-clock" aria-live="off">
          <div className="flex items-center gap-1.5 text-[11px] font-medium text-muted">
            <span className="live-dot" aria-hidden="true" />
            {m.welcome.liveTime}
          </div>
          <div className="mt-0.5 flex items-baseline gap-1">
            <time
              dateTime={now?.toISOString()}
              className="clock-time text-xl md:text-2xl font-semibold text-fg"
            >
              <Digits value={clock[0]} />
              <span className="clock-sep">:</span>
              <Digits value={clock[1]} />
              <span className="clock-sep">:</span>
              <Digits value={clock[2]} />
            </time>
            <span className="font-display text-xs font-semibold text-muted">{meridiem}</span>
          </div>
          <div className="mt-0.5 flex items-center gap-1.5 text-xs text-muted">
            <CalendarDays className="h-3 w-3 shrink-0" />
            <span className="truncate">{dateLabel}</span>
          </div>
        </div>
      </div>
    </section>
  );
}
