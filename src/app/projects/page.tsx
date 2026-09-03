import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getSize } from "@/lib/sizes";
import type { Project } from "@/lib/types";
import DeleteProjectButton from "@/components/DeleteProjectButton";

export const dynamic = "force-dynamic";

export default async function ProjectsPage() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("projects")
    .select("id,title,topic,card_count,size_key,status,created_at,updated_at,cards,use_character")
    .order("updated_at", { ascending: false });
  const projects = (data ?? []) as Pick<Project, "id" | "title" | "topic" | "card_count" | "size_key" | "status" | "created_at" | "updated_at" | "cards" | "use_character">[];
  const statusLabel: Record<string, string> = { draft: "준비 중", planned: "글 완성", generating: "이미지 생성 중", done: "완성" };

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-black text-gray-900">내 카드뉴스 기록</h1>
        <Link href="/new" className="btn-primary">새 카드뉴스</Link>
      </div>
      {projects.length === 0 ? (
        <div className="card mt-8 p-12 text-center text-gray-500">아직 만든 카드뉴스가 없습니다. 첫 카드뉴스를 만들어 보세요.</div>
      ) : (
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {projects.map((p) => {
            const thumb = p.cards?.find((c) => c.imageUrl)?.imageUrl;
            const size = getSize(p.size_key);
            return (
              <div key={p.id} className="card overflow-hidden">
                <Link href={`/projects/${p.id}`} className="block">
                  <div className="aspect-[4/3] bg-gray-100">
                    {thumb ? <img src={thumb} alt="" className="h-full w-full object-cover" /> : <div className="flex h-full items-center justify-center text-sm text-gray-400">이미지 없음</div>}
                  </div>
                  <div className="p-4">
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                      <span className="rounded-full bg-gray-100 px-2 py-0.5">{statusLabel[p.status] ?? p.status}</span>
                      <span>{p.card_count}장 · {size.ratio}</span>
                      {p.use_character && <span>· 캐릭터</span>}
                    </div>
                    <h3 className="mt-2 line-clamp-1 font-bold text-gray-900">{p.title || p.topic}</h3>
                    <p className="mt-1 line-clamp-2 text-sm text-gray-600">{p.topic}</p>
                    <p className="mt-2 text-xs text-gray-400">{new Date(p.updated_at).toLocaleString("ko-KR")}</p>
                  </div>
                </Link>
                <div className="border-t border-gray-100 px-4 py-2 text-right">
                  <DeleteProjectButton id={p.id} />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
