import { requireUser } from "@/lib/supabase/server";
import { errorJson } from "@/lib/storage";
import type { Card } from "@/lib/types";

const EDITABLE = [
  "title",
  "persona",
  "topic",
  "card_count",
  "size_key",
  "art_style",
  "quality",
  "use_character",
  "character_source_url",
  "character_sheet_url",
  "character_description",
  "design",
  "cards",
  "status",
] as const;

export async function GET(_req: Request, ctx: RouteContext<"/api/projects/[id]">) {
  const { id } = await ctx.params;
  const { supabase, user } = await requireUser();
  if (!user) return errorJson("로그인이 필요합니다.", 401);
  const { data, error } = await supabase.from("projects").select("*").eq("id", id).single();
  if (error) return errorJson(error.message, 404);
  return Response.json({ project: data });
}

export async function PATCH(req: Request, ctx: RouteContext<"/api/projects/[id]">) {
  try {
    const { id } = await ctx.params;
    const { supabase, user } = await requireUser();
    if (!user) return errorJson("로그인이 필요합니다.", 401);
    const body = await req.json();
    const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
    for (const k of EDITABLE) if (k in body) patch[k] = body[k];

    // Never let a stale client save wipe an image URL that the server already stored
    // (image generation and autosave can race).
    if (Array.isArray(patch.cards)) {
      const { data: existing } = await supabase.from("projects").select("cards").eq("id", id).single<{ cards: Card[] }>();
      const byId = new Map((existing?.cards ?? []).map((c) => [c.id, c]));
      patch.cards = (patch.cards as Card[]).map((c) =>
        !c.imageUrl && byId.get(c.id)?.imageUrl ? { ...c, imageUrl: byId.get(c.id)!.imageUrl } : c,
      );
    }
    const { data, error } = await supabase.from("projects").update(patch).eq("id", id).select().single();
    if (error) return errorJson(error.message);
    return Response.json({ project: data });
  } catch (e) {
    return errorJson(e);
  }
}

export async function DELETE(_req: Request, ctx: RouteContext<"/api/projects/[id]">) {
  const { id } = await ctx.params;
  const { supabase, user } = await requireUser();
  if (!user) return errorJson("로그인이 필요합니다.", 401);
  const { error } = await supabase.from("projects").delete().eq("id", id);
  if (error) return errorJson(error.message);
  // best-effort storage cleanup
  const { data: files } = await supabase.storage.from("cardnews").list(`${user.id}/${id}`);
  if (files?.length) {
    await supabase.storage.from("cardnews").remove(files.map((f) => `${user.id}/${id}/${f.name}`));
  }
  return Response.json({ ok: true });
}
