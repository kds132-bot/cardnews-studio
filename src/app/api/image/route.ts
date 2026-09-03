import { requireUser } from "@/lib/supabase/server";
import { errorJson, uploadImage } from "@/lib/storage";
import { generateCardImage } from "@/lib/openai";
import { getSize } from "@/lib/sizes";
import type { Project } from "@/lib/types";

export const maxDuration = 300;

export async function POST(req: Request) {
  try {
    const { supabase, user } = await requireUser();
    if (!user) return errorJson("로그인이 필요합니다.", 401);
    const { projectId, cardId, prompt } = await req.json();
    const { data: project, error } = await supabase.from("projects").select("*").eq("id", projectId).single<Project>();
    if (error || !project) return errorJson("프로젝트를 찾을 수 없습니다.", 404);

    const idx = project.cards.findIndex((c) => c.id === cardId);
    if (idx < 0) return errorJson("카드를 찾을 수 없습니다.", 404);
    const card = project.cards[idx];
    const scene = String(prompt ?? card.imagePrompt ?? "").trim();
    if (!scene) return errorJson("이미지 프롬프트가 비어 있습니다.", 400);

    // style anchor: first already-generated card other than this one
    const styleRef = project.cards.find((c, i) => i !== idx && c.imageUrl)?.imageUrl ?? null;
    const layout = card.design?.layout ?? project.design.layout;

    const png = await generateCardImage({
      scene,
      artStyle: project.art_style,
      modelSize: getSize(project.size_key).modelSize,
      quality: project.quality,
      textArea: layout,
      characterSheetUrl: project.use_character ? project.character_sheet_url : null,
      characterDescription: project.use_character ? project.character_description : null,
      styleRefUrl: styleRef,
      accentColor: project.design.accentColor,
    });

    const url = await uploadImage(supabase, `${user.id}/${projectId}/card-${card.id}.png`, png);

    // re-read to avoid clobbering concurrent text edits
    const { data: fresh } = await supabase.from("projects").select("cards").eq("id", projectId).single<Pick<Project, "cards">>();
    const cards = (fresh?.cards ?? project.cards).map((c) => (c.id === cardId ? { ...c, imagePrompt: scene, imageUrl: url } : c));
    const allDone = cards.every((c) => c.imageUrl);
    const { error: e2 } = await supabase
      .from("projects")
      .update({ cards, status: allDone ? "done" : "generating", updated_at: new Date().toISOString() })
      .eq("id", projectId);
    if (e2) return errorJson(e2.message);
    return Response.json({ cardId, imageUrl: url });
  } catch (e) {
    return errorJson(e);
  }
}
