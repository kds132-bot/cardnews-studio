import { requireUser } from "@/lib/supabase/server";
import { errorJson, uploadImage } from "@/lib/storage";
import type { Project } from "@/lib/types";

/** Upload a user-provided image to replace a card image. */
export async function POST(req: Request) {
  try {
    const { supabase, user } = await requireUser();
    if (!user) return errorJson("로그인이 필요합니다.", 401);
    const form = await req.formData();
    const projectId = String(form.get("projectId") ?? "");
    const cardId = String(form.get("cardId") ?? "");
    const file = form.get("file");
    if (!projectId || !cardId || !(file instanceof File)) return errorJson("잘못된 요청입니다.", 400);
    if (file.size > 20 * 1024 * 1024) return errorJson("이미지는 20MB 이하여야 합니다.", 400);

    const { data: project, error } = await supabase.from("projects").select("cards").eq("id", projectId).single<Pick<Project, "cards">>();
    if (error || !project) return errorJson("프로젝트를 찾을 수 없습니다.", 404);

    const type = file.type || "image/png";
    const ext = type.includes("jpeg") ? "jpg" : type.includes("webp") ? "webp" : "png";
    const url = await uploadImage(supabase, `${user.id}/${projectId}/card-${cardId}-custom.${ext}`, Buffer.from(await file.arrayBuffer()), type);
    const cards = project.cards.map((c) => (c.id === cardId ? { ...c, imageUrl: url } : c));
    const { error: e2 } = await supabase.from("projects").update({ cards, updated_at: new Date().toISOString() }).eq("id", projectId);
    if (e2) return errorJson(e2.message);
    return Response.json({ cardId, imageUrl: url });
  } catch (e) {
    return errorJson(e);
  }
}
