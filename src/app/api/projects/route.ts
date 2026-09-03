import { requireUser } from "@/lib/supabase/server";
import { errorJson } from "@/lib/storage";
import { DEFAULT_DESIGN } from "@/lib/types";

export async function GET() {
  const { supabase, user } = await requireUser();
  if (!user) return errorJson("로그인이 필요합니다.", 401);
  const { data, error } = await supabase
    .from("projects")
    .select("id,title,topic,card_count,size_key,art_style,status,created_at,updated_at,cards,use_character")
    .order("updated_at", { ascending: false });
  if (error) return errorJson(error.message);
  return Response.json({ projects: data });
}

export async function POST(req: Request) {
  try {
    const { supabase, user } = await requireUser();
    if (!user) return errorJson("로그인이 필요합니다.", 401);
    const body = await req.json();
    const cardCount = Math.min(12, Math.max(2, Number(body.card_count) || 6));
    const insert = {
      user_id: user.id,
      title: String(body.topic || "새 카드뉴스").slice(0, 80),
      persona: body.persona ?? {},
      topic: String(body.topic ?? ""),
      card_count: cardCount,
      size_key: body.size_key ?? "square",
      art_style: body.art_style ?? "flat",
      quality: body.quality ?? "medium",
      use_character: !!body.use_character,
      design: { ...DEFAULT_DESIGN, ...(body.design ?? {}) },
      cards: [],
      status: "draft",
    };
    const { data, error } = await supabase.from("projects").insert(insert).select().single();
    if (error) return errorJson(error.message);
    return Response.json({ project: data });
  } catch (e) {
    return errorJson(e);
  }
}
