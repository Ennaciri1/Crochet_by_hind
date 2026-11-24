import { track } from "@vercel/analytics";

export type ProductEvent = "view_item" | "view_product_gallery" | "play_product_video" | "pinterest_share" | "click_etsy_buy";
export type ProductIdentity = { sku: string; name: string };
type TrackingWindow = Window & {
  gtag?: (...args: unknown[]) => void;
  dataLayer?: Array<ArrayLike<unknown>>;
};

/** No analytics cookies, inferred consent, purchase events, or personal data. */
export function analyticsConsentState(dataLayer: Array<ArrayLike<unknown>> = []): "granted" | "denied" | "unknown" {
  let state: "granted" | "denied" | "unknown" = "unknown";
  for (const value of dataLayer) {
    if (!value || typeof value !== "object") continue;
    const entry = Array.from(value);
    if (entry[0] !== "consent" || !["default", "update"].includes(String(entry[1]))) continue;
    const settings = entry[2] as { analytics_storage?: string; region?: unknown } | undefined;
    if (!settings?.analytics_storage) continue;
    // A regional default cannot establish this visitor's consent here.
    if (settings.region) { if (settings.analytics_storage === "denied") state = "denied"; continue; }
    if (settings.analytics_storage === "granted" || settings.analytics_storage === "denied") state = settings.analytics_storage;
  }
  return state;
}

export const analyticsConsentGranted = (dataLayer?: Array<ArrayLike<unknown>>) => analyticsConsentState(dataLayer) === "granted";

export function trackProductEvent(event: ProductEvent, product: ProductIdentity, placement: string, preview = false, extra: Record<string, string | number> = {}) {
  if (preview || typeof window === "undefined") return;
  const browser = window as TrackingWindow;
  if (navigator.doNotTrack === "1" || (navigator as Navigator & { globalPrivacyControl?: boolean }).globalPrivacyControl) return;
  const properties = { product_id: product.sku, product_name: product.name, button_placement: placement, ...extra };
  try {
    // Custom events require a Vercel Pro/Enterprise plan; opt in explicitly.
    const consent = analyticsConsentState(browser.dataLayer);
    if (process.env.NEXT_PUBLIC_VERCEL_CUSTOM_EVENTS === "true" && consent !== "denied") track(event, properties);
    if (typeof browser.gtag === "function" && consent === "granted") {
      browser.gtag("event", event, {
        ...properties, items: [{ item_id: product.sku, item_name: product.name }], transport_type: "beacon",
      });
    }
  } catch { /* Analytics must never block browsing, playback, sharing or Etsy. */ }
}
