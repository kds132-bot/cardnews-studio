import type { SupabaseClient } from "@supabase/supabase-js";

export const BUCKET = "cardnews";

export async function uploadImage(
  supabase: SupabaseClient,
  path: string,
  data: Buffer | Blob,
  contentType = "image/png",
): Promise<string> {
  const { error } = await supabase.storage.from(BUCKET).upload(path, data, {
    contentType,
    upsert: true,
  });
  if (error) throw new Error(`이미지 저장 실패: ${error.message}`);
  const { data: pub } = supabase.storage.from(BUCKET).getPublicUrl(path);
  // cache-bust because we upsert to the same path on regeneration
  return `${pub.publicUrl}?v=${Date.now()}`;
}

export function errorJson(e: unknown, status = 500) {
  const message = e instanceof Error ? e.message : String(e);
  return Response.json({ error: message }, { status });
}
