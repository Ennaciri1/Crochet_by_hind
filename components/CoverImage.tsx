import Image from "next/image";

type Props = {
  src: string | null;
  alt: string;
  sizes: string;
  priority?: boolean;
};

/**
 * A post photo, always via next/image (responsive sizes, lazy loading,
 * AVIF/WebP). SVG illustrations (like the seed post) are served as-is.
 */
export default function CoverImage({ src, alt, sizes, priority = false }: Props) {
  if (!src) return null;
  return (
    <Image
      src={src}
      alt={alt}
      fill
      sizes={sizes}
      priority={priority}
      unoptimized={src.endsWith(".svg")}
    />
  );
}
