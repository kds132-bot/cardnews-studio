"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { SIZE_PRESETS } from "@/lib/sizes";
import { ART_STYLES, type ArtStyle, type Quality, type SizeKey } from "@/lib/types";

export default function CreateForm() {
  const router = useRouter();
  const [brandName, setBrandName] = useState("");
  const [description, setDescription] = useState("");
  const [tone, setTone] = useState("친근하고 명확한 존댓말, 짧은 문장, 전문가답지만 딱딱하지 않게");
  const [audience, setAudience] = useState("");
  const [topic, setTopic] = useState("");
  const [count, setCount] = useState(6);
  const [sizeKey, setSizeKey] = useState<SizeKey>("square");
  const [artStyle, setArtStyle] = useState<ArtStyle>("flat");
  const [quality, setQuality] = useState<Quality>("medium");
  const [useCharacter, setUseCharacter] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [step, setStep] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  function onFile(f: File | null) {
    setFile(f);
    if (preview) URL.revokeObjectURL(preview);
    setPreview(f ? URL.createObjectURL(f) : null);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    if (useCharacter && !file) { setErr("캐릭터를 사용하려면 사진이나 캐릭터 이미지를 올려주세요."); return; }
    try {
      setStep("프로젝트 생성 중...");
      const res = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          persona: { brandName, description, tone, audience },
          topic, card_count: count, size_key: sizeKey, art_style: artStyle, quality, use_character: useCharacter,
        }),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error);
      const id = j.project.id as string;

      if (useCharacter && file) {
        setStep("캐릭터 분석 및 캐릭터 시트 생성 중... (약 1~2분)");
        const fd = new FormData();
        fd.append("projectId", id);
        fd.append("file", file);
        const r2 = await fetch("/api/character-sheet", { method: "POST", body: fd });
        const j2 = await r2.json();
        if (!r2.ok) throw new Error(j2.error);
      }
      router.push(`/projects/${id}?autogen=1`);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "오류가 발생했습니다.");
      setStep(null);
    }
  }

  return (
    <form onSubmit={submit} className="mt-6 space-y-6">
      <section className="card p-6">
        <h2 className="mb-4 font-bold text-gray-900">1. 브랜드 페르소나</h2>
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="label">브랜드/채널 이름 *</label>
            <input className="input" required value={brandName} onChange={(e) => setBrandName(e.target.value)} placeholder="예: 슬로우캠핑" />
          </div>
          <div>
            <label className="label">타깃 독자</label>
            <input className="input" value={audience} onChange={(e) => setAudience(e.target.value)} placeholder="예: 캠핑 입문 2030 직장인" />
          </div>
          <div className="md:col-span-2">
            <label className="label">브랜드 소개 *</label>
            <textarea className="input" required rows={2} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="무엇을 하는 브랜드인지, 어떤 가치를 전하는지" />
          </div>
          <div className="md:col-span-2">
            <label className="label">말투 / 톤</label>
            <input className="input" value={tone} onChange={(e) => setTone(e.target.value)} />
          </div>
        </div>
      </section>

      <section className="card p-6">
        <h2 className="mb-4 font-bold text-gray-900">2. 카드뉴스 주제</h2>
        <textarea className="input" required rows={3} value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="예: 첫 캠핑 갈 때 꼭 챙겨야 할 장비 5가지" />
        <div className="mt-4 grid gap-4 md:grid-cols-3">
          <div>
            <label className="label">카드 개수: {count}장</label>
            <input type="range" min={2} max={12} value={count} onChange={(e) => setCount(Number(e.target.value))} className="w-full" />
          </div>
          <div>
            <label className="label">이미지 크기</label>
            <select className="input" value={sizeKey} onChange={(e) => setSizeKey(e.target.value as SizeKey)}>
              {SIZE_PRESETS.map((s) => (
                <option key={s.key} value={s.key}>{s.label} · {s.width}×{s.height}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">이미지 품질</label>
            <select className="input" value={quality} onChange={(e) => setQuality(e.target.value as Quality)}>
              <option value="low">낮음 (빠름/저렴)</option>
              <option value="medium">보통</option>
              <option value="high">높음 (느림/고품질)</option>
            </select>
          </div>
        </div>
        <div className="mt-4">
          <label className="label">그림체</label>
          <div className="flex flex-wrap gap-2">
            {ART_STYLES.map((s) => (
              <button
                type="button"
                key={s.value}
                onClick={() => setArtStyle(s.value)}
                className={`rounded-full border px-3 py-1.5 text-sm ${artStyle === s.value ? "border-indigo-600 bg-indigo-600 text-white" : "border-gray-300 bg-white text-gray-700 hover:bg-gray-50"}`}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>
      </section>

      <section className="card p-6">
        <div className="flex items-center justify-between">
          <h2 className="font-bold text-gray-900">3. 내 사진 / 캐릭터 사용</h2>
          <label className="flex cursor-pointer items-center gap-2 text-sm">
            <input type="checkbox" checked={useCharacter} onChange={(e) => setUseCharacter(e.target.checked)} className="h-4 w-4" />
            카드에 캐릭터 등장
          </label>
        </div>
        <p className="mt-1 text-xs text-gray-500">
          사진이나 캐릭터 이미지를 올리면 gpt-image-2로 캐릭터 시트를 먼저 만들고, 모든 카드에서 같은 얼굴·의상·그림체를 유지합니다.
        </p>
        {useCharacter && (
          <div className="mt-4 flex items-start gap-4">
            <input type="file" accept="image/png,image/jpeg,image/webp" onChange={(e) => onFile(e.target.files?.[0] ?? null)} className="text-sm" />
            {preview && <img src={preview} alt="미리보기" className="h-32 w-32 rounded-xl object-cover" />}
          </div>
        )}
      </section>

      {err && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{err}</p>}
      <button className="btn-primary w-full py-3 text-base" disabled={!!step}>
        {step ?? "카드뉴스 생성 시작"}
      </button>
      {step && <p className="text-center text-xs text-gray-500">창을 닫지 마세요. 생성이 끝나면 편집 화면으로 이동합니다.</p>}
    </form>
  );
}
