"use client";

import { useEffect, useRef } from "react";
import { trackProductEvent, type ProductIdentity } from "@/lib/product-analytics";

type Props = { product: ProductIdentity; etsyUrl: string; preview?: boolean };

export function EtsyButton({ product, etsyUrl, preview = false, placement, children = "Get the Pattern on Etsy", className = "" }: Props & { placement: string; children?: React.ReactNode; className?: string }) {
  return <a className={`product-etsy ${className}`} href={etsyUrl} target="_blank" rel="noopener noreferrer" onClick={() => trackProductEvent("click_etsy_buy", product, placement, preview)} data-placement={placement}>{children}<span aria-hidden="true">↗</span></a>;
}

export function PinterestShare({ product, href, title, description, preview = false }: { product: ProductIdentity; href: string; title: string; description: string; preview?: boolean }) {
  return (
    <div className="product-pin-action">
      <a href={preview ? undefined : href} className="product-pin-link" target="_blank" rel="noopener noreferrer" data-pin-description={description} data-pin-title={title} data-pin-media={new URL(href).searchParams.get("media") ?? undefined} data-pin-url={new URL(href).searchParams.get("url") ?? undefined} title={title}
        aria-disabled={preview || undefined} onClick={(event) => { if (preview) { event.preventDefault(); return; } trackProductEvent("pinterest_share", product, "pinterest", preview); }}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 2a10 10 0 0 0-3.6 19.3c-.1-.8-.2-2 0-2.9l1.2-5s-.3-.6-.3-1.5c0-1.4.8-2.5 1.8-2.5.9 0 1.3.7 1.3 1.4 0 .9-.6 2.2-.8 3.4-.3 1 .5 1.9 1.5 1.9 1.8 0 3.2-1.9 3.2-4.7 0-2.5-1.8-4.2-4.3-4.2-2.9 0-4.6 2.2-4.6 4.4 0 .9.3 1.8.8 2.3l.1.4-.3 1.2c0 .2-.2.3-.4.2-1.3-.6-2.1-2.5-2.1-4 0-3.3 2.4-6.3 6.9-6.3 3.6 0 6.4 2.6 6.4 6 0 3.6-2.3 6.5-5.4 6.5-1.1 0-2.1-.6-2.4-1.2l-.7 2.5c-.2.9-.9 2.1-1.3 2.8A10 10 0 1 0 12 2z" /></svg>
        Save this Christmas idea
      </a>
      {preview && <small>Pinterest sharing opens after publication.</small>}
    </div>
  );
}

export function MobilePurchase({ product, etsyUrl, preview = false }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const bar = ref.current;
    if (!bar) return;
    const previous = document.documentElement.style.getPropertyValue("--product-cta-height");
    document.body.classList.add("has-product-purchase-bar");
    const update = () => document.documentElement.style.setProperty("--product-cta-height", `${bar.getBoundingClientRect().height}px`);
    const observer = new ResizeObserver(update);
    observer.observe(bar); update();
    return () => { observer.disconnect(); document.body.classList.remove("has-product-purchase-bar"); document.documentElement.style.setProperty("--product-cta-height", previous); };
  }, []);
  return <div className="product-mobile-purchase no-print" ref={ref}><div><strong>Hearthside Shelf Gnome</strong><small>Digital knitting pattern · PDF</small></div><EtsyButton product={product} etsyUrl={etsyUrl} preview={preview} placement="mobile_sticky">Get the pattern</EtsyButton></div>;
}

export function ProductView({ product, preview = false }: { product: ProductIdentity; preview?: boolean }) {
  const viewed = useRef(false);
  useEffect(() => { if (viewed.current) return; viewed.current = true; trackProductEvent("view_item", product, "product_page", preview); }, [product, preview]);
  return null;
}
