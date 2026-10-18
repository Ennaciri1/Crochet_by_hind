"use client";

/**
 * Prints ONLY the pattern card: it copies the card into a hidden iframe
 * (with the site styles) and prints that iframe. No ads, header or footer.
 */
export default function PrintButton({ targetId = "pattern-card" }: { targetId?: string }) {
  function handlePrint() {
    const card = document.getElementById(targetId);
    if (!card) return window.print();

    const iframe = document.createElement("iframe");
    iframe.setAttribute("aria-hidden", "true");
    iframe.style.cssText = "position:fixed;right:0;bottom:0;width:0;height:0;border:0;";
    document.body.appendChild(iframe);

    const doc = iframe.contentDocument;
    const win = iframe.contentWindow;
    if (!doc || !win) return window.print();

    // Re-use the site CSS (fonts + pattern card styles).
    const styles = Array.from(document.querySelectorAll('link[rel="stylesheet"], style'))
      .map((node) => node.outerHTML)
      .join("");

    doc.open();
    doc.write(`<!doctype html><html lang="en" class="${document.documentElement.className}">
      <head><meta charset="utf-8"><title>${document.title}</title>${styles}
      <style>
        @page { margin: 14mm; }
        body { background: #fff; color: #000; margin: 0; }
        .pattern-card { margin: 0; box-shadow: none; }
        .no-print { display: none !important; }
      </style></head>
      <body>${card.outerHTML}</body></html>`);
    doc.close();

    const print = () => {
      win.focus();
      win.print();
      setTimeout(() => iframe.remove(), 1000);
    };
    // Wait for styles and fonts before printing.
    if (doc.readyState === "complete") setTimeout(print, 300);
    else iframe.onload = () => setTimeout(print, 300);
  }

  return (
    <button type="button" className="btn btn-small no-print" onClick={handlePrint}>
      <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M6 9V2h12v7M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2M6 14h12v8H6z" />
      </svg>
      Print pattern
    </button>
  );
}
