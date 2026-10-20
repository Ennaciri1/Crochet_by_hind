import { slugify } from "./markdown";
import { createSupabaseBrowserClient } from "./supabase/client";

/** The one image-upload path for the whole admin (single editor and bulk import). */

export const BUCKET = "images";
export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;
export const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/avif"];
export const ACCEPT_ATTR = "image/jpeg,image/png,image/webp,image/avif";

const HEIC_MESSAGE =
  "iPhone photos in HEIC format cannot be shown on the web. On your iPhone open Settings > Camera > Formats and choose 'Most Compatible', or export the photo as JPEG.";

function extensionOf(name: string) {
  const dot = name.lastIndexOf(".");
  return dot > 0 ? name.slice(dot + 1).toLowerCase() : "";
}

/** Throws a plain-language Error when the file cannot become a post photo. */
export function assertUploadable(file: File): void {
  const name = file.name || "This photo";
  const type = (file.type || "").toLowerCase();
  const ext = extensionOf(file.name);

  if (type === "image/heic" || type === "image/heif" || ext === "heic" || ext === "heif") {
    throw new Error(HEIC_MESSAGE);
  }
  if (!type.startsWith("image/")) throw new Error("Please choose an image file.");
  if (!ALLOWED_IMAGE_TYPES.includes(type)) {
    throw new Error(`${name} is not a format the web can show. Please use JPG, PNG, WebP or AVIF.`);
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    const mb = (file.size / (1024 * 1024)).toFixed(1);
    throw new Error(`${name} is ${mb} MB. Photos must be under 10 MB — please resize it first.`);
  }
}

/** Uploads one photo and returns its public URL. `slug` groups a post's photos in one folder. */
export async function uploadImage(file: File, opts?: { slug?: string }): Promise<string> {
  assertUploadable(file);

  const supabase = createSupabaseBrowserClient();
  const ext = extensionOf(file.name) || "jpg";
  const base = slugify(file.name.replace(/\.[^.]+$/, "")) || "photo";
  const folder = slugify(opts?.slug ?? "") || "misc";
  const path = `posts/${folder}/${Date.now()}-${base}.${ext}`;

  const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
    cacheControl: "31536000",
    contentType: file.type,
    upsert: false,
  });
  if (error) throw new Error(error.message);
  return supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
}

/** Pixel size of a photo, or null when the browser cannot read it. */
export async function readImageSize(file: File): Promise<{ w: number; h: number } | null> {
  if (typeof createImageBitmap === "function") {
    try {
      const bitmap = await createImageBitmap(file);
      const size = { w: bitmap.width, h: bitmap.height };
      bitmap.close();
      return size;
    } catch {
      // Falls through to the <img> probe below (older Safari cannot decode every format).
    }
  }
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const size = { w: img.naturalWidth, h: img.naturalHeight };
      URL.revokeObjectURL(url);
      resolve(size);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(null);
    };
    img.src = url;
  });
}

/** "cozy-bunny-3-stuffing-the-head.jpg" + slug "cozy-bunny" → "stuffing the head" ("" when meaningless). */
export function altFromFilename(filename: string, slug?: string) {
  let base = filename.replace(/\.[^.]+$/, "");
  if (slug && base.toLowerCase().startsWith(`${slug.toLowerCase()}-`)) base = base.slice(slug.length + 1);
  const alt = base
    .replace(/^[\d\s._-]+/, "")
    .replace(/[\d\s._-]+$/, "")
    .replace(/[-_]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return alt.length >= 3 ? alt : "";
}
