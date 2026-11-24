import assert from "node:assert/strict";
import { readFileSync, existsSync, readdirSync } from "node:fs";
import Module, { createRequire } from "node:module";
import path from "node:path";
import { test } from "node:test";
import sharp from "sharp";

const require = createRequire(import.meta.url);
const ts = require("typescript");
const root = path.resolve(import.meta.dirname, "..");
function load(file, mocks = {}) {
  const filename = path.resolve(root, file);
  const module = new Module(filename);
  module.filename = filename; module.paths = Module._nodeModulePaths(path.dirname(filename));
  module.require = (name) => {
    if (name in mocks) return mocks[name];
    if (name.startsWith(".") || name.startsWith("@/")) {
      const target = name.startsWith("@/") ? path.resolve(root, name.slice(2)) : path.resolve(path.dirname(filename), name);
      if (target.endsWith(".json")) return JSON.parse(readFileSync(target, "utf8"));
      if (existsSync(target + ".ts")) return load(path.relative(root, target + ".ts"), mocks);
    }
    return require(name);
  };
  module._compile(ts.transpileModule(readFileSync(filename, "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true } }).outputText, filename);
  return module.exports;
}
const model = load("lib/product-model.ts");
const seed = JSON.parse(readFileSync(path.join(root, "data/products/hearthside-shelf-gnome.json"), "utf8"));
const content = () => structuredClone(seed);
const origin = "https://www.crochethenouda.com";
const record = () => ({ id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa", slug: seed.slug, title: seed.headline, content: JSON.stringify(seed), tags: [model.PRODUCT_TAG], status: "draft", published_at: null, updated_at: "2026-11-24T00:00:00Z", product: content() });

test("supplied media exists, has real dimensions, and includes a 2:3 Pinterest image", async () => {
  for (const image of [...seed.gallery, seed.decorImage, seed.pinImage]) {
    const meta = await sharp(path.join(root, "public", image.src)).metadata();
    assert.equal(meta.width, image.width); assert.equal(meta.height, image.height); assert.equal(meta.format, "webp");
    assert.ok(image.alt.length > 20);
  }
  assert.equal(seed.gallery.length, 6);
  assert.equal(seed.pinImage.width / seed.pinImage.height, 2 / 3);
  const video = readFileSync(path.join(root, "public", seed.video.src));
  assert.equal(video.toString("ascii", 4, 8), "ftyp");
  assert.ok(video.indexOf(Buffer.from("moov")) < video.indexOf(Buffer.from("mdat")));
  assert.ok(!readdirSync(path.join(root, "public/images/products/hearthside-shelf-gnome")).some((name) => /\.pdf$/i.test(name)));
});

test("drafts, unvalidated records, missing confirmations and future dates cannot be published", () => {
  const draft = record();
  assert.equal(model.isPublishedProduct(draft), false);
  draft.status = "published"; draft.published_at = "2026-01-01T00:00:00Z";
  assert.equal(model.isPublishedProduct(draft), false);
  draft.product.validated = true;
  assert.equal(model.isPublishedProduct(draft), false);
  draft.product.validatedAt = "2999-01-01T00:00:00Z";
  assert.equal(model.isPublishedProduct(draft), false);
  draft.product.validatedAt = "2026-01-01T00:00:00Z";
  assert.equal(model.isPublishedProduct(draft), true);
  draft.published_at = "2999-01-01T00:00:00Z";
  assert.equal(model.isPublishedProduct(draft), false);
});

test("public queries discard malformed, draft and unvalidated product records", async () => {
  const valid = record(); valid.status = "published"; valid.published_at = "2026-01-01T00:00:00Z";
  valid.product.validated = true; valid.product.validatedAt = "2026-01-01T00:00:00Z"; valid.content = JSON.stringify(valid.product);
  const rows = [record(), { ...valid, id: "valid" }, { ...valid, id: "malformed", content: "not JSON" }, { ...valid, id: "unvalidated", content: JSON.stringify(seed) }];
  const calls = [];
  const query = { select(...args) { calls.push(["select", ...args]); return this; }, contains(...args) { calls.push(["contains", ...args]); return this; }, eq(...args) { calls.push(["eq", ...args]); return this; }, lte(...args) { calls.push(["lte", ...args]); return this; }, order() { return this; }, limit() { return Promise.resolve({ data: rows, error: null }); } };
  const products = load("lib/products.ts", { "@/lib/supabase/public": { getPublicClient: () => ({ from: () => query }) }, "./supabase/public": { getPublicClient: () => ({ from: () => query }) } });
  assert.deepEqual((await products.getPublishedProducts()).map((item) => item.id), ["valid"]);
  assert.ok(calls.some(([name, key, value]) => name === "eq" && key === "status" && value === "published"));
  assert.ok(calls.some(([name, key]) => name === "contains" && key === "tags"));
});

test("product parsing rejects redirected Etsy URLs, unsafe assets and malformed galleries", () => {
  assert.ok(model.parseProductContent(JSON.stringify(seed)));
  for (const update of [
    (p) => { p.etsyUrl += "?other=1"; }, (p) => { p.gallery[0].src = "javascript:alert(1)"; },
    (p) => { p.gallery.pop(); }, (p) => { p.pinImage.height = p.pinImage.width; },
    (p) => { p.pdfPages = 0; }, (p) => { p.validatedAt = "not a date"; },
  ]) { const product = content(); update(product); assert.equal(model.parseProductContent(JSON.stringify(product)), null); }
  assert.equal(model.parseProductContent("An ordinary blog post"), null);
});

test("metadata and structured data use the product canonical without invented offers or reviews", () => {
  const meta = model.productMetadata(seed, origin);
  assert.equal(meta.title.absolute, "Christmas Gnome Knitting Pattern PDF | Crochet by Hind");
  assert.equal(meta.description, seed.seoDescription);
  assert.equal(meta.alternates.canonical, origin + "/patterns/" + seed.slug);
  assert.equal(meta.twitter.card, "summary_large_image");
  assert.equal(model.productMetadata(seed, origin, true).robots.index, false);
  const json = model.productStructuredData(seed, origin);
  assert.equal(json["@type"], "Product"); assert.equal(json.brand.name, "Crochet by Hind");
  for (const field of ["offers", "aggregateRating", "review", "availability", "price"]) assert.ok(!(field in json));
  assert.ok(json.image.every((url) => url.startsWith(origin + "/images/products/")));
  const faq = model.productFaq(seed);
  assert.ok(faq.some((item) => item.a.includes("6 pages")));
  assert.ok(faq.some((item) => item.a.includes("not yet been physically test-knit")));
  const words = [seed.intro, seed.story, ...seed.included, ...seed.materials, seed.skills, seed.decorating, ...faq.flatMap((item) => [item.q, item.a]), seed.closing].join(" ").split(/\s+/).length;
  assert.ok(words >= 700 && words <= 1000, `Product copy has ${words} words`);
});

test("Pinterest sends readers to the website and uses the supplied vertical design image", () => {
  const url = new URL(model.pinterestUrl(seed, origin));
  assert.equal(url.searchParams.get("url"), origin + "/patterns/" + seed.slug);
  assert.equal(url.searchParams.get("media"), origin + seed.pinImage.src);
  assert.ok(url.searchParams.get("description").includes(seed.pinterestTitle));
  assert.ok(url.searchParams.get("description").includes(seed.pinterestDescription));
});

function saveHarness(authorized = true) {
  const updates = [], revalidated = [];
  const query = { select() { return this; }, eq() { return this; }, contains() { return this; }, maybeSingle: async () => ({ data: record(), error: null }), update(payload) { updates.push(payload); return this; }, error: null };
  const actions = load("app/admin/(panel)/products/actions.ts", {
    "@/lib/admin": { requireAdmin: async () => { if (!authorized) throw new Error("Not an admin"); return { from: () => query }; } },
    "next/cache": { revalidatePath: (path) => revalidated.push(path) },
  });
  return { save: actions.saveProduct, updates, revalidated };
}
function form(intent = "publish", confirmed = false) {
  const result = new FormData(); result.set("id", record().id); result.set("intent", intent); result.set("product", JSON.stringify(seed));
  if (confirmed) result.set("test_knit_confirmed", "on");
  return result;
}

test("the server action requires an admin and refuses publication without physical validation", async () => {
  const blocked = saveHarness(false);
  await assert.rejects(blocked.save(null, form()), /Not an admin/); assert.equal(blocked.updates.length, 0);
  const admin = saveHarness();
  assert.ok((await admin.save(null, form())).error); assert.equal(admin.updates.length, 0);
});

test("saving a draft clears publication; explicit confirmation records the validation date", async () => {
  const draft = saveHarness(); assert.equal((await draft.save(null, form("draft"))).ok, true);
  assert.equal(draft.updates[0].status, "draft"); assert.equal(draft.updates[0].published_at, null);
  assert.equal(JSON.parse(draft.updates[0].content).validated, false);
  const published = saveHarness(); assert.equal((await published.save(null, form("publish", true))).ok, true);
  const product = JSON.parse(published.updates[0].content);
  assert.equal(published.updates[0].status, "published"); assert.equal(product.validated, true); assert.ok(product.validatedAt);
  assert.equal(product.etsyUrl, model.HEARTHSIDE_ETSY_URL);
  assert.ok(published.revalidated.includes("/sitemap.xml"));
  assert.ok(published.revalidated.includes("/patterns/" + seed.slug));
});

test("all five analytics hooks respect explicit consent, preview mode and privacy choices", () => {
  const windowDescriptor = Object.getOwnPropertyDescriptor(globalThis, "window");
  const navigatorDescriptor = Object.getOwnPropertyDescriptor(globalThis, "navigator");
  const originalFlag = process.env.NEXT_PUBLIC_VERCEL_CUSTOM_EVENTS;
  const ga = [], vercel = [];
  const browser = { dataLayer: [], gtag: (...args) => ga.push(args) };
  Object.defineProperty(globalThis, "window", { configurable: true, value: browser });
  Object.defineProperty(globalThis, "navigator", { configurable: true, value: { doNotTrack: "0", globalPrivacyControl: false } });
  process.env.NEXT_PUBLIC_VERCEL_CUSTOM_EVENTS = "false";
  try {
    const analytics = load("lib/product-analytics.ts", { "@vercel/analytics": { track: (...args) => vercel.push(args) } });
    analytics.trackProductEvent("view_item", seed, "product_page"); assert.equal(ga.length, 0);
    browser.dataLayer.push(["consent", "default", { analytics_storage: "granted", region: ["US"] }]);
    analytics.trackProductEvent("view_item", seed, "product_page"); assert.equal(ga.length, 0);
    browser.dataLayer.push(["consent", "update", { analytics_storage: "granted" }]);
    for (const event of ["view_item", "view_product_gallery", "play_product_video", "pinterest_share", "click_etsy_buy"]) analytics.trackProductEvent(event, seed, "hero");
    assert.equal(ga.length, 5); assert.equal(ga.at(-1)[1], "click_etsy_buy");
    assert.equal(ga.at(-1)[2].product_id, seed.sku); assert.equal(ga.at(-1)[2].button_placement, "hero");
    analytics.trackProductEvent("view_item", seed, "product_page", true); assert.equal(ga.length, 5);
    browser.dataLayer.push(["consent", "update", { analytics_storage: "denied" }]);
    analytics.trackProductEvent("view_item", seed, "product_page"); assert.equal(ga.length, 5);
    process.env.NEXT_PUBLIC_VERCEL_CUSTOM_EVENTS = "true";
    analytics.trackProductEvent("view_item", seed, "product_page"); assert.equal(vercel.length, 0);
    browser.dataLayer = [];
    navigator.globalPrivacyControl = true; analytics.trackProductEvent("view_item", seed, "product_page"); assert.equal(vercel.length, 0);
    navigator.globalPrivacyControl = false; analytics.trackProductEvent("view_item", seed, "product_page"); assert.equal(vercel.length, 1);
  } finally {
    if (windowDescriptor) Object.defineProperty(globalThis, "window", windowDescriptor); else delete globalThis.window;
    if (navigatorDescriptor) Object.defineProperty(globalThis, "navigator", navigatorDescriptor); else delete globalThis.navigator;
    if (originalFlag === undefined) delete process.env.NEXT_PUBLIC_VERCEL_CUSTOM_EVENTS; else process.env.NEXT_PUBLIC_VERCEL_CUSTOM_EVENTS = originalFlag;
  }
});
