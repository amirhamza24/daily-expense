'use client';

import React, { useEffect, useRef, useState } from 'react';

interface AnimatedNumberProps {
  value: number;
  format: (n: number) => string;
  duration?: number;
}

/** Counts from the currently shown value to the new one with an ease-out curve. */
export default function AnimatedNumber({ value, format, duration = 700 }: AnimatedNumberProps) {
  const [display, setDisplay] = useState(0);
  const currentRef = useRef(0);

  useEffect(() => {
    const from = currentRef.current;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    let frame = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const t = reduce ? 1 : Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - t, 3);
      const next = from + (value - from) * eased;
      currentRef.current = next;
      setDisplay(next);
      if (t < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [value, duration]);

  return <span className="tabular">{format(display)}</span>;
}
