"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";

declare global {
  interface Window {
    adsbygoogle?: unknown[];
  }
}

type Props = {
  /** "display" = responsive banner, "in-article" = native ad between paragraphs */
  format?: "display" | "in-article";
  className?: string;
};

const client = process.env.NEXT_PUBLIC_ADSENSE_CLIENT || "";
const slots = {
  display: process.env.NEXT_PUBLIC_ADSENSE_SLOT_DISPLAY || "",
  "in-article": process.env.NEXT_PUBLIC_ADSENSE_SLOT_IN_ARTICLE || "",
};

/**
 * One AdSense ad unit, labelled "Advertisement".
 * - Development: shows a dashed placeholder so you can see where ads go.
 * - Production without ids: renders nothing.
 */
export default function AdSlot({ format = "display", className = "" }: Props) {
  const slot = slots[format];
  const ref = useRef<HTMLModElement>(null);
  const pathname = usePathname();
  const isDev = process.env.NODE_ENV !== "production";

  useEffect(() => {
    if (!client || !slot || !ref.current) return;
    // Ask AdSense to fill this <ins> only once.
    if (ref.current.getAttribute("data-adsbygoogle-status")) return;
    try {
      (window.adsbygoogle = window.adsbygoogle || []).push({});
    } catch {
      // Ad blockers can throw here; the page must keep working.
    }
  }, [slot, pathname]);

  if (!client || !slot) {
    if (!isDev) return null;
    return (
      <aside className={`ad ${className}`} aria-label="Advertisement">
        <span className="ad-label">Advertisement</span>
        <div className="ad-placeholder">Ad slot ({format}) — set your AdSense ids in .env</div>
      </aside>
    );
  }

  return (
    <aside className={`ad ${className}`} aria-label="Advertisement">
      <span className="ad-label">Advertisement</span>
      {format === "in-article" ? (
        <ins
          key={pathname}
          ref={ref}
          className="adsbygoogle"
          style={{ display: "block", textAlign: "center" }}
          data-ad-layout="in-article"
          data-ad-format="fluid"
          data-ad-client={client}
          data-ad-slot={slot}
        />
      ) : (
        <ins
          key={pathname}
          ref={ref}
          className="adsbygoogle"
          style={{ display: "block" }}
          data-ad-client={client}
          data-ad-slot={slot}
          data-ad-format="auto"
          data-full-width-responsive="true"
        />
      )}
    </aside>
  );
}
