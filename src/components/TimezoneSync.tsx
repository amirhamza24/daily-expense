"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { TZ_COOKIE } from "@/lib/dates";

/**
 * Stores the browser's IANA time zone in a cookie so server-side analytics
 * bucket days/months in the user's local time. Refreshes once if it changed.
 */
export default function TimezoneSync() {
  const router = useRouter();

  useEffect(() => {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (!tz) return;
    const current = document.cookie
      .split("; ")
      .find((c) => c.startsWith(`${TZ_COOKIE}=`))
      ?.split("=")[1];
    if (current && decodeURIComponent(current) === tz) return;
    document.cookie = `${TZ_COOKIE}=${encodeURIComponent(tz)}; path=/; max-age=31536000; samesite=lax`;
    router.refresh();
  }, [router]);

  return null;
}
