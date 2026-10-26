"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";
import { track } from "@/lib/telemetry";

/** Records one anonymous page view per route change (the admin dashboard itself is not counted). */
export function PageView() {
  const pathname = usePathname();
  useEffect(() => {
    if (!pathname.startsWith("/admin")) track("pageview");
  }, [pathname]);
  return null;
}
