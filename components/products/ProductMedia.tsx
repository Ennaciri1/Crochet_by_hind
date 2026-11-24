"use client";

import Image from "next/image";
import { useRef, useState } from "react";
import type { ProductContent, ProductImage } from "@/lib/product-model";
import { trackProductEvent, type ProductIdentity } from "@/lib/product-analytics";

export function ProductGallery({ images, product, preview = false }: { images: ProductImage[]; product: ProductIdentity; preview?: boolean }) {
  const [selected, setSelected] = useState(0);
  const dialog = useRef<HTMLDialogElement>(null);
  const image = images[selected];
  function choose(index: number) {
    const next = (index + images.length) % images.length;
    setSelected(next);
    trackProductEvent("view_product_gallery", product, "gallery", preview, { image_index: next + 1 });
  }
  return (
    <div className="product-gallery">
      <figure className="product-main-image">
        <button type="button" onClick={() => { dialog.current?.showModal(); trackProductEvent("view_product_gallery", product, "image_zoom", preview, { image_index: selected + 1 }); }} aria-label={`Enlarge image ${selected + 1}: ${image.alt}`}>
          <Image src={image.src} width={image.width} height={image.height} alt={image.alt} preload={selected === 0} quality={85} sizes="(max-width: 767px) 92vw, (max-width: 1200px) 52vw, 610px" />
          <span className="product-zoom-hint" aria-hidden="true">View larger ↗</span>
        </button>
        <figcaption aria-live="polite">{image.caption}</figcaption>
      </figure>
      <div className="product-thumbnails" role="group" aria-label="Product image gallery">
        {images.map((item, index) => <button key={item.src} type="button" onClick={() => choose(index)} aria-label={`View image ${index + 1}: ${item.caption}`} aria-pressed={selected === index}>
          <Image src={item.src} width={item.width} height={item.height} alt={item.alt} sizes="(max-width: 767px) 14vw, 90px" quality={75} loading="lazy" />
        </button>)}
      </div>
      <dialog className="product-image-dialog" ref={dialog} aria-label="Product image preview" onClick={(event) => { if (event.target === dialog.current) dialog.current.close(); }} onKeyDown={(event) => { if (event.key === "ArrowRight") choose(selected + 1); if (event.key === "ArrowLeft") choose(selected - 1); }}>
        <button className="product-dialog-close" type="button" onClick={() => dialog.current?.close()} autoFocus aria-label="Close image preview">×</button>
        <Image src={image.src} width={image.width} height={image.height} alt={image.alt} quality={85} sizes="(max-width: 767px) 94vw, 80vw" />
        <div className="product-dialog-controls"><button type="button" onClick={() => choose(selected - 1)} aria-label="Previous image">←</button><p>{selected + 1} / {images.length} · {image.caption}</p><button type="button" onClick={() => choose(selected + 1)} aria-label="Next image">→</button></div>
      </dialog>
    </div>
  );
}

export function ProductVideo({ video, product, preview = false }: { video: ProductContent["video"]; product: ProductIdentity; preview?: boolean }) {
  const played = useRef(false);
  return <video className="product-video" controls playsInline preload="none" poster={video.poster} width={video.width} height={video.height} aria-label={`${Math.round(video.duration)}-second silent presentation of generated Hearthside gnome design illustrations`} onPlay={() => { if (!played.current) { played.current = true; trackProductEvent("play_product_video", product, "product_video", preview); } }}><source src={video.src} type="video/mp4" />Your browser cannot play this video. The gallery above shows the same intended design.</video>;
}
