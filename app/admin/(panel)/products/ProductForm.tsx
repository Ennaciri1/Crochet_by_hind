"use client";

import Image from "next/image";
import { useActionState, useState } from "react";
import type { ProductContent, ProductImage } from "@/lib/product-model";
import { uploadImage, readImageSize, ACCEPT_ATTR, BUCKET } from "@/lib/upload";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { saveProduct, type ProductSaveState } from "./actions";

type ProductTextKey = { [Key in keyof ProductContent]: ProductContent[Key] extends string ? Key : never }[keyof ProductContent];

export default function ProductForm({ id, product: initial, status }: { id: string; product: ProductContent; status: string }) {
  const [product, setProduct] = useState(initial);
  const [state, action, pending] = useActionState<ProductSaveState, FormData>(saveProduct, null);
  const [uploading, setUploading] = useState("");
  const [uploadError, setUploadError] = useState("");
  const [confirmed, setConfirmed] = useState(product.validated);
  const update = <K extends keyof ProductContent>(key: K, value: ProductContent[K]) => setProduct((current) => ({ ...current, [key]: value }));

  async function imageUpload(file: File | undefined, target: number | "pinImage" | "decorImage") {
    if (!file) return;
    setUploading(String(target)); setUploadError("");
    try {
      const dimensions = await readImageSize(file);
      if (!dimensions) throw new Error("This image could not be read. Choose another file.");
      if (target === "pinImage" && Math.abs(dimensions.w / dimensions.h - 2 / 3) > 0.001) throw new Error("Choose a vertical Pinterest image with a 2:3 ratio, such as 1000 × 1500 pixels.");
      const src = await uploadImage(file, { slug: product.slug });
      const values = { src, width: dimensions.w, height: dimensions.h };
      if (typeof target === "number") update("gallery", product.gallery.map((image, index) => index === target ? { ...image, ...values } : image));
      else update(target, { ...product[target], ...values });
    } catch (error) { setUploadError(error instanceof Error ? error.message : "The image could not be uploaded."); }
    finally { setUploading(""); }
  }

  async function videoUpload(file: File | undefined) {
    if (!file) return;
    setUploading("video"); setUploadError("");
    try {
      if (file.type !== "video/mp4" || file.size > 20 * 1024 * 1024) throw new Error("Choose an MP4 video under 20 MB.");
      const dimensions = await new Promise<{ width: number; height: number; duration: number }>((resolve, reject) => {
        const source = URL.createObjectURL(file); const video = document.createElement("video"); video.preload = "metadata";
        video.onloadedmetadata = () => { resolve({ width: video.videoWidth, height: video.videoHeight, duration: video.duration }); URL.revokeObjectURL(source); };
        video.onerror = () => { URL.revokeObjectURL(source); reject(new Error("This video could not be read.")); }; video.src = source;
      });
      const supabase = createSupabaseBrowserClient(); const path = `products/${product.slug}/${Date.now()}-preview.mp4`;
      const { error } = await supabase.storage.from(BUCKET).upload(path, file, { contentType: "video/mp4", cacheControl: "31536000", upsert: false });
      if (error) throw new Error(error.message);
      update("video", { ...product.video, ...dimensions, src: supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl });
    } catch (error) { setUploadError(error instanceof Error ? error.message : "The video could not be uploaded."); }
    finally { setUploading(""); }
  }

  function textField(key: ProductTextKey, label: string, multiline = false, maxLength = 2000) {
    return <div className="field" key={key}><label htmlFor={`product-${key}`}>{label}</label>{multiline
      ? <textarea id={`product-${key}`} rows={key === "story" || key === "decorating" ? 6 : 4} required maxLength={maxLength} value={product[key]} onChange={(event) => update(key, event.target.value)} />
      : <input id={`product-${key}`} type="text" required maxLength={maxLength} value={product[key]} onChange={(event) => update(key, event.target.value)} />}</div>;
  }
  function imageFields(image: ProductImage, target: number | "pinImage" | "decorImage", label: string) {
    const change = (values: Partial<ProductImage>) => typeof target === "number"
      ? update("gallery", product.gallery.map((current, index) => index === target ? { ...current, ...values } : current))
      : update(target, { ...product[target], ...values });
    return <fieldset className="product-editor-image" key={target}><legend>{label}</legend><Image src={image.src} width={100} height={125} alt={image.alt} /><div className="field"><label htmlFor={`upload-${target}`}>Replace image</label><input id={`upload-${target}`} type="file" accept={ACCEPT_ATTR} disabled={!!uploading || pending} onChange={(event) => imageUpload(event.target.files?.[0], target)} /></div><div className="field"><label htmlFor={`alt-${target}`}>Describe the image for readers who cannot see it</label><textarea id={`alt-${target}`} rows={2} required maxLength={500} value={image.alt} onChange={(event) => change({ alt: event.target.value })} /></div><div className="field"><label htmlFor={`caption-${target}`}>Caption</label><input id={`caption-${target}`} type="text" required maxLength={200} value={image.caption} onChange={(event) => change({ caption: event.target.value })} /></div></fieldset>;
  }

  return <form action={action}>
    <input type="hidden" name="id" value={id} /><input type="hidden" name="product" value={JSON.stringify(product)} />
    {state?.error && <p className="notice notice-error" role="alert">{state.error}</p>}
    {state?.ok && <p className="notice notice-ok" role="status">{state.message}</p>}
    {uploadError && <p className="notice notice-error" role="alert">{uploadError}</p>}
    {uploading && <p role="status">Uploading…</p>}
    <section className="panel"><h2>Product introduction</h2>{textField("name", "Product name", false, 160)}{textField("headline", "Page heading", false, 200)}{textField("intro", "Short introduction", true)}<p className="hint">Purchase buttons always open the verified Hearthside listing on Etsy.</p></section>
    <section className="panel"><h2>Pattern details</h2><div className="grid-2"><div className="field"><label htmlFor="product-pages">Verified PDF page count</label><input id="product-pages" type="number" min={1} max={300} required value={product.pdfPages} onChange={(event) => update("pdfPages", Number(event.target.value))} /></div>{textField("skillLevel", "Skill level", false, 100)}{textField("language", "Language", false, 80)}{textField("terminology", "Terminology", false, 100)}{textField("yarn", "Yarn", false, 200)}{textField("needles", "Knitting needles", false, 200)}</div></section>
    <section className="panel"><h2>Page content</h2>{textField("story", "The design story", true, 10000)}{([['included', 'What is included — one item per line'], ['materials', 'Materials — one item per line']] as const).map(([key, label]) => <div className="field" key={key}><label htmlFor={`product-${key}`}>{label}</label><textarea id={`product-${key}`} rows={5} required value={product[key].join('\n')} onChange={(event) => update(key, event.target.value.split('\n'))} /></div>)}{textField("skills", "Knitting skills", true, 10000)}{textField("decorating", "Christmas decorating ideas", true, 10000)}{textField("closing", "Final invitation", true, 3000)}</section>
    <section className="panel"><h2>Six gallery images</h2><div className="product-editor-images">{product.gallery.map((image, index) => imageFields(image, index, `Gallery image ${index + 1}`))}</div>{imageFields(product.decorImage, "decorImage", "Decorating image")}</section>
    <section className="panel"><h2>Presentation video</h2><p className="hint">Current video: {Math.round(product.video.duration)} seconds. Generated design illustrations; keep this clear in your page copy.</p><label htmlFor="product-video">Replace MP4 video</label><input id="product-video" type="file" accept="video/mp4" disabled={!!uploading || pending} onChange={(event) => videoUpload(event.target.files?.[0])} /></section>
    <section className="panel"><h2>Questions &amp; answers</h2>{product.faq.map((item, index) => <fieldset className="product-editor-faq" key={index}><legend>Question {index + 1}</legend><div className="field"><label htmlFor={`faq-q-${index}`}>Question</label><input id={`faq-q-${index}`} type="text" required maxLength={300} value={item.q} onChange={(event) => update("faq", product.faq.map((value, i) => i === index ? { ...value, q: event.target.value } : value))} /></div><div className="field"><label htmlFor={`faq-a-${index}`}>Answer</label><textarea id={`faq-a-${index}`} rows={4} required maxLength={2000} value={item.a} onChange={(event) => update("faq", product.faq.map((value, i) => i === index ? { ...value, a: event.target.value } : value))} /></div></fieldset>)}</section>
    <section className="panel"><h2>Search &amp; Pinterest</h2>{textField("seoTitle", "Search title", false, 180)}{textField("seoDescription", "Search description", true, 500)}{textField("pinterestTitle", "Pinterest title", false, 200)}{textField("pinterestDescription", "Pinterest description", true, 600)}{imageFields(product.pinImage, "pinImage", "Vertical Pinterest image — 2:3")}</section>
    <section className="panel"><h2>Validation &amp; publication</h2><label className="product-validation-label"><input type="checkbox" name="test_knit_confirmed" checked={confirmed} onChange={(event) => setConfirmed(event.target.checked)} /> I confirm this pattern has been physically test-knit and corrected, and I have checked the final PDF page count, instructions and product claims.</label><p className="hint">Generated-image disclosures remain visible after publication. Saving a draft keeps the page private.</p><div className="button-row"><button className="btn" type="submit" name="intent" value="draft" disabled={pending || !!uploading}>{pending ? "Saving…" : status === "published" ? "Save as draft and unpublish" : "Save draft"}</button><button className="btn btn-primary" type="submit" name="intent" value="publish" disabled={pending || !!uploading || !confirmed}>Publish validated pattern</button></div></section>
  </form>;
}
