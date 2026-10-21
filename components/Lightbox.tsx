"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type Zoomed = { src: string; alt: string };

/**
 * Tap a step photo to see it bigger.
 *
 * Mounted once per article. It listens on the document instead of on every
 * photo (one listener, nothing to re-bind) and uses a native <dialog>, which
 * brings Esc, focus handling and the backdrop for free. The photos are already
 * readable inline, so this is an enhancement: with JavaScript off the button
 * simply does nothing.
 */
export default function Lightbox() {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [zoomed, setZoomed] = useState<Zoomed | null>(null);

  useEffect(() => {
    function onClick(event: MouseEvent) {
      const target = event.target as HTMLElement | null;
      const button = target?.closest<HTMLButtonElement>("button.zoom-btn");
      if (!button) return;
      const img = button.querySelector("img");
      const src = img?.dataset.zoom;
      if (!src) return;
      event.preventDefault();
      setZoomed({ src, alt: img?.alt ?? "" });
    }

    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, []);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (zoomed && !dialog.open) dialog.showModal();
    if (!zoomed && dialog.open) dialog.close();
  }, [zoomed]);

  const close = useCallback(() => setZoomed(null), []);

  if (!zoomed) return null;

  return (
    <dialog ref={dialogRef} className="lightbox" onClose={close} aria-label="Larger photo">
      {/* Clicking the backdrop (anywhere outside the photo) closes it. */}
      <button type="button" className="lightbox-close" onClick={close} aria-label="Close">
        ×
      </button>
      <div className="lightbox-inner" onClick={close}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={zoomed.src} alt={zoomed.alt} />
      </div>
    </dialog>
  );
}
