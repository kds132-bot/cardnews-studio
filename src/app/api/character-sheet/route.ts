import { requireUser } from "@/lib/supabase/server";
import { errorJson, uploadImage } from "@/lib/storage";
import { describeCharacter, generateCharacterSheet } from "@/lib/openai";
import type { Project } from "@/lib/types";

export const maxDuration = 300;

export async function POST(req: Request) {
  try {
    const { supabase, user } = await requireUser();
    if (!user) return errorJson("로그인이 필요합니다.", 401);
    const form = await req.formData();
    const projectId = String(form.get("projectId") ?? "");
    const file = form.get("file");
    if (!projectId || !(file instanceof File)) return errorJson("projectId와 file이 필요합니다.", 400);
    if (file.size > 20 * 1024 * 1024) return errorJson("이미지는 20MB 이하여야 합니다.", 400);

    const { data: project, error } = await supabase.from("projects").select("*").eq("id", projectId).single<Project>();
    if (error || !project) return errorJson("프로젝트를 찾을 수 없습니다.", 404);

    const buffer = Buffer.from(await file.arrayBuffer());
    const type = file.type || "image/png";
    const ext = type.includes("jpeg") ? "jpg" : type.includes("webp") ? "webp" : "png";
    const base = `${user.id}/${projectId}`;

    const sourceUrl = await uploadImage(supabase, `${base}/character-source.${ext}`, buffer, type);
    const dataUrl = `data:${type};base64,${buffer.toString("base64")}`;
    const description = await describeCharacter(dataUrl);

    const sheet = await generateCharacterSheet({
      source: { buffer, type, name: `source.${ext}` },
      artStyle: project.art_style,
      description,
      quality: project.quality,
    });
    const sheetUrl = await uploadImage(supabase, `${base}/character-sheet.png`, sheet);

    const { data: updated, error: e2 } = await supabase
      .from("projects")
      .update({
        use_character: true,
        character_source_url: sourceUrl,
        character_sheet_url: sheetUrl,
        character_description: description,
        updated_at: new Date().toISOString(),
      })
      .eq("id", projectId)
      .select()
      .single();
    if (e2) return errorJson(e2.message);
    return Response.json({ project: updated });
  } catch (e) {
    return errorJson(e);
  }
}
