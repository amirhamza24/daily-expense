import React from "react";
import { CURRENCY_SYMBOL } from "@/lib/format";

/**
 * Taka (৳) icon with the same props as a lucide icon, so it can replace
 * `DollarSign` anywhere (input icons, category tiles). lucide has no Taka glyph.
 */
export default function TakaSign({ className, ...props }: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      width={24}
      height={24}
      fill="currentColor"
      aria-hidden="true"
      className={className}
      {...props}
    >
      <text
        x="12"
        y="19"
        textAnchor="middle"
        fontSize="21"
        fontWeight="600"
        fontFamily="'Nirmala UI', 'Noto Sans Bengali', 'Bangla Sangam MN', 'Vrinda', sans-serif"
      >
        {CURRENCY_SYMBOL}
      </text>
    </svg>
  );
}
