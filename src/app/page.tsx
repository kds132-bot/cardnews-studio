import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

export default async function Home() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const cta = user ? "/new" : "/login?next=/new";

  return (
    <div className="mx-auto max-w-6xl px-4 py-16">
      <section className="grid items-center gap-12 md:grid-cols-2">
        <div>
          <p className="mb-3 inline-block rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700">gpt-image-2 기반 카드뉴스 생성</p>
          <h1 className="text-4xl font-black leading-tight text-gray-900 md:text-5xl">
            브랜드 페르소나와 주제만 입력하면<br />카드뉴스가 완성됩니다
          </h1>
          <p className="mt-5 text-lg text-gray-600">
            글은 브랜드 말투로, 이미지는 gpt-image-2로. 내 사진이나 캐릭터를 올리면 캐릭터 시트를 먼저 만들고
            모든 카드에서 같은 얼굴·의상·그림체를 유지합니다. 한글은 이미지에 굽지 않고 웹에서 정확하게 합성해 PNG로 내려받으세요.
          </p>
          <div className="mt-8 flex gap-3">
            <Link href={cta} className="btn-primary px-6 py-3 text-base">지금 만들기</Link>
            {user && <Link href="/projects" className="btn-secondary px-6 py-3 text-base">내 기록 보기</Link>}
          </div>
        </div>
        <div className="grid grid-cols-3 gap-3">
          {[
            ["표지", "from-indigo-500 to-violet-600"],
            ["핵심 1", "from-pink-500 to-rose-500"],
            ["핵심 2", "from-amber-400 to-orange-500"],
            ["핵심 3", "from-emerald-400 to-teal-600"],
            ["팁", "from-sky-400 to-blue-600"],
            ["CTA", "from-gray-700 to-gray-900"],
          ].map(([t, g], i) => (
            <div key={t} className={`aspect-square rounded-2xl bg-gradient-to-br ${g} p-4 text-white shadow-lg`}>
              <div className="text-xs opacity-80">{i + 1} / 6</div>
              <div className="mt-8 text-xl font-black">{t}</div>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-20 grid gap-6 md:grid-cols-4">
        {[
          ["1. 페르소나 입력", "브랜드명, 말투, 타깃을 적으면 카피가 브랜드 톤으로 나옵니다."],
          ["2. 캐릭터 시트", "사진/캐릭터를 올리면 gpt-image-2가 캐릭터 시트를 만들고 모든 카드에 참조합니다."],
          ["3. 편집", "제목·본문·이미지·순서·디자인을 카드별로 자유롭게 수정합니다."],
          ["4. PNG 다운로드", "한글은 캔버스에서 정확히 합성해 원본 해상도 PNG로 저장합니다."],
        ].map(([t, d]) => (
          <div key={t} className="card p-5">
            <h3 className="font-bold text-gray-900">{t}</h3>
            <p className="mt-2 text-sm text-gray-600">{d}</p>
          </div>
        ))}
      </section>
    </div>
  );
}
