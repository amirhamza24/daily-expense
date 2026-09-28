"use client";

import React, { useEffect, useRef } from "react";

/**
 * Drop inside any `.segmented` control to get a pill that slides to the active
 * button (`data-active="true"`). It follows the DOM, so the control's own markup
 * and state handling stay unchanged.
 */
export default function SegmentIndicator() {
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const pill = ref.current;
    const group = pill?.parentElement;
    if (!pill || !group) return;

    let placed = false;
    const move = () => {
      const active = group.querySelector<HTMLElement>(':scope > [data-active="true"]');
      if (!active) {
        pill.style.opacity = "0";
        return;
      }
      pill.style.width = `${active.offsetWidth}px`;
      pill.style.transform = `translateX(${active.offsetLeft}px)`;
      pill.style.opacity = "1";
      if (!placed) {
        // First placement jumps into position; later moves slide
        placed = true;
        requestAnimationFrame(() => pill.setAttribute("data-ready", "true"));
      }
    };

    move();
    const mutations = new MutationObserver(move);
    mutations.observe(group, { attributes: true, attributeFilter: ["data-active"], subtree: true, childList: true });
    const resize = new ResizeObserver(move);
    resize.observe(group);
    return () => {
      mutations.disconnect();
      resize.disconnect();
    };
  }, []);

  return <span ref={ref} className="segment-indicator" aria-hidden />;
}
