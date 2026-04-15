/**
 * העלאת תמונת מוצר ל־Supabase Storage, או Data URL במצב dev ללא Supabase.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import { isSupabaseConfigured } from "@/lib/auth";

export const PRODUCT_IMAGES_BUCKET = "product-images";

const MAX_BYTES = 5 * 1024 * 1024;

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => {
      const s = r.result;
      if (typeof s === "string") resolve(s);
      else reject(new Error("קריאת הקובץ נכשלה"));
    };
    r.onerror = () => reject(new Error("קריאת הקובץ נכשלה"));
    r.readAsDataURL(file);
  });
}

function safeImageExt(file: File): string {
  const fromName = file.name.split(".").pop()?.toLowerCase() || "";
  if (["jpg", "jpeg", "png", "webp", "gif", "avif"].includes(fromName)) return fromName === "jpeg" ? "jpg" : fromName;
  const t = file.type;
  if (t === "image/jpeg") return "jpg";
  if (t === "image/png") return "png";
  if (t === "image/webp") return "webp";
  if (t === "image/gif") return "gif";
  if (t === "image/avif") return "avif";
  return "jpg";
}

export async function uploadProductImage(
  sb: SupabaseClient<Database>,
  file: File
): Promise<string> {
  if (!file.type.startsWith("image/")) {
    throw new Error("יש לבחור קובץ תמונה");
  }
  if (file.size > MAX_BYTES) {
    throw new Error("הקובץ גדול מדי (מקסימום 5MB)");
  }

  if (!isSupabaseConfigured()) {
    return readFileAsDataUrl(file);
  }

  const ext = safeImageExt(file);
  const path = `uploads/${Date.now()}-${crypto.randomUUID().slice(0, 8)}.${ext}`;
  const contentType = file.type || `image/${ext === "jpg" ? "jpeg" : ext}`;

  const { error } = await sb.storage.from(PRODUCT_IMAGES_BUCKET).upload(path, file, {
    cacheControl: "31536000",
    upsert: false,
    contentType,
  });

  if (error) {
    throw new Error(
      error.message.includes("Bucket not found")
        ? "אין באקט תמונות בפרויקט. הרץ את מיגרציית Storage (קובץ 003) או צור באקט product-images ב-Supabase."
        : error.message
    );
  }

  const { data } = sb.storage.from(PRODUCT_IMAGES_BUCKET).getPublicUrl(path);
  return data.publicUrl;
}
