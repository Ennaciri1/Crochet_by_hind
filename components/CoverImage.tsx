import Image from "next/image";
import { QUALITY_COVER } from "@/lib/images";

type Props = {
  src: string | null;
  alt: string;
  sizes: string;
  priority?: boolean;
  quality?: number;
};

/**
 * A post photo, always via next/image (responsive srcset, lazy loading,
 * AVIF/WebP). The parent supplies the aspect-ratio box, so there is no layout
 * shift. SVG illustrations (like the seed post) are served as-is.
 */
export default function CoverImage({ src, alt, sizes, priority = false, quality = QUALITY_COVER }: Props) {
  if (!src) return null;
  const isSvg = src.endsWith(".svg");
  return (
    <Image
      src={src}
      alt={alt}
      fill
      sizes={sizes}
      priority={priority}
      quality={isSvg ? undefined : quality}
      unoptimized={isSvg}
    />
  );
}
