"use client";

import { useState, useEffect } from "react";

/**
 * A client-side only date display component to prevent Next.js hydration mismatches.
 * The server renders a placeholder or the raw date, and the client updates it to the local timezone.
 */
export default function DateDisplay({ date, style, className }: { date: Date | string, style?: React.CSSProperties, className?: string }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const dateObj = typeof date === "string" ? new Date(date) : date;

  if (!mounted) {
    // Return a consistent placeholder or the raw string during SSR
    return <span style={style} className={className}>...</span>;
  }

  return (
    <span style={style} className={className}>
      {dateObj.toLocaleString("de-DE")}
    </span>
  );
}
