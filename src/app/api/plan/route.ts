import { requireUser } from "@/lib/supabase/server";
import { errorJson } from "@/lib/storage";
import { planCards } from "@/lib/openai";
import type { Card, Project } from "@/lib/types";

export const maxDuration = 120;

export async function POST(req: Request) {
  try {
    const { supabase, user } = await requireUser();
    if (!user) return errorJson("로그인이 필요합니다.", 401);
    const { projectId } = await req.json();
    const { data: project, error } = await supabase.from("projects").select("*").eq("id", projectId).single<Project>();
    if (error || !project) return errorJson("프로젝트를 찾을 수 없습니다.", 404);

    const plan = await planCards({
      persona: project.persona,
      topic: project.topic,
      count: project.card_count,
      artStyle: project.art_style,
      useCharacter: project.use_character,
      characterDescription: project.character_description,
    });

    const cards: Card[] = plan.cards.map((c, i) => ({
      id: `${Date.now().toString(36)}-${i}`,
      title: c.title,
      body: c.body,
      imagePrompt: c.imagePrompt,
      imageUrl: null,
      design: i === 0 ? { titleSize: Math.round(project.design.titleSize * 1.25) } : {},
    }));

    const patch = {
      title: plan.title,
      cards,
      design: { ...project.design, accentColor: plan.accentColor },
      status: "planned",
      updated_at: new Date().toISOString(),
    };
    const { data: updated, error: e2 } = await supabase.from("projects").update(patch).eq("id", projectId).select().single();
    if (e2) return errorJson(e2.message);
    return Response.json({ project: updated });
  } catch (e) {
    return errorJson(e);
  }
}
