"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import JSZip from "jszip";
import CardCanvas from "./CardCanvas";
import DesignPanel from "./DesignPanel";
import { getSize } from "@/lib/sizes";
import { canvasToPngBlob, downloadBlob, renderCard } from "@/lib/render";
import { DEFAULT_DESIGN, type Card, type CardDesign, type Project } from "@/lib/types";

type Tab = "text" | "image" | "design";

export default function Editor({ initial, autogen }: { initial: Project; autogen: boolean }) {
  const [project, setProject] = useState<Project>({ ...initial, design: { ...DEFAULT_DESIGN, ...initial.design } });
  const [selectedId, setSelectedId] = useState<string | null>(initial.cards[0]?.id ?? null);
  const [tab, setTab] = useState<Tab>("text");
  const [designScope, setDesignScope] = useState<"global" | "card">("global");
  const [busy, setBusy] = useState<string | null>(null);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const [generating, setGenerating] = useState<Set<string>>(new Set());
  const [err, setErr] = useState<string | null>(null);
  const [saveState, setSaveState] = useState<"saved" | "saving" | "dirty">("saved");
  const [dragId, setDragId] = useState<string | null>(null);
  const projectRef = useRef(project);
  useEffect(() => { projectRef.current = project; }, [project]);

  const size = getSize(project.size_key);
  const cards = project.cards;
  const selectedIndex = Math.max(0, cards.findIndex((c) => c.id === selectedId));
  const selected = cards[selectedIndex] ?? null;

  // ---------- persistence ----------
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const persist = useCallback(async (patch: Partial<Project>) => {
    setSaveState("saving");
    try {
      const res = await fetch(`/api/projects/${projectRef.current.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      setSaveState("saved");
    } catch (e) {
      setSaveState("dirty");
      setErr(e instanceof Error ? e.message : "저장 실패");
    }
  }, []);

  const update = useCallback((patch: Partial<Project> | ((p: Project) => Partial<Project>)) => {
    setProject((p) => {
      const next = { ...p, ...(typeof patch === "function" ? patch(p) : patch) };
      projectRef.current = next;
      return next;
    });
    setSaveState("dirty");
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      const p = projectRef.current;
      persist({ title: p.title, cards: p.cards, design: p.design });
    }, 800);
  }, [persist]);

  const updateCard = useCallback((id: string, patch: Partial<Card>) => {
    update((p) => ({ cards: p.cards.map((c) => (c.id === id ? { ...c, ...patch } : c)) }));
  }, [update]);

  // ---------- generation ----------
  const generateImage = useCallback(async (cardId: string, prompt?: string) => {
    setGenerating((s) => new Set(s).add(cardId));
    try {
      // flush pending text edits first so the server has the latest prompt
      if (saveTimer.current) { clearTimeout(saveTimer.current); saveTimer.current = null; }
      const p = projectRef.current;
      await persist({ title: p.title, cards: p.cards, design: p.design });
      const res = await fetch("/api/image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId: p.id, cardId, prompt }),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error);
      setProject((prev) => ({
        ...prev,
        cards: prev.cards.map((c) => (c.id === cardId ? { ...c, imageUrl: j.imageUrl, imagePrompt: prompt ?? c.imagePrompt } : c)),
      }));
    } finally {
      setGenerating((s) => { const n = new Set(s); n.delete(cardId); return n; });
    }
  }, [persist]);

  const generateMissing = useCallback(async () => {
    const todo = projectRef.current.cards.filter((c) => !c.imageUrl);
    if (todo.length === 0) return;
    setBusy("이미지 생성 중");
    setProgress({ done: 0, total: todo.length });
    let done = 0;
    try {
      for (const c of todo) {
        await generateImage(c.id);
        done += 1;
        setProgress({ done, total: todo.length });
      }
      setProject((p) => ({ ...p, status: "done" }));
    } catch (e) {
      setErr(e instanceof Error ? e.message : "이미지 생성 실패");
    } finally {
      setBusy(null);
      setProgress(null);
    }
  }, [generateImage]);

  const plan = useCallback(async () => {
    setBusy("브랜드 톤으로 카드 글 작성 중");
    try {
      const res = await fetch("/api/plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId: projectRef.current.id }),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error);
      const p = j.project as Project;
      setProject((prev) => ({ ...prev, ...p, design: { ...DEFAULT_DESIGN, ...p.design } }));
      setSelectedId(p.cards[0]?.id ?? null);
      return true;
    } catch (e) {
      setErr(e instanceof Error ? e.message : "글 생성 실패");
      return false;
    } finally {
      setBusy(null);
    }
  }, []);

  const autogenStarted = useRef(false);
  useEffect(() => {
    if (!autogen || autogenStarted.current) return;
    autogenStarted.current = true;
    (async () => {
      let ok = true;
      if (projectRef.current.cards.length === 0) ok = await plan();
      if (ok) await generateMissing();
      history.replaceState(null, "", location.pathname);
    })();
  }, [autogen, plan, generateMissing]);

  // ---------- card ops ----------
  function move(from: number, to: number) {
    if (to < 0 || to >= cards.length || from === to) return;
    const next = [...cards];
    const [item] = next.splice(from, 1);
    next.splice(to, 0, item);
    update({ cards: next });
  }
  function addCard() {
    const c: Card = { id: `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`, title: "새 카드", body: "", imagePrompt: selected?.imagePrompt ?? "", imageUrl: null, design: {} };
    update({ cards: [...cards, c] });
    setSelectedId(c.id);
  }
  function duplicateCard(i: number) {
    const src = cards[i];
    const c: Card = { ...src, id: `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}` };
    const next = [...cards];
    next.splice(i + 1, 0, c);
    update({ cards: next });
    setSelectedId(c.id);
  }
  function removeCard(i: number) {
    if (cards.length <= 1) return;
    if (!confirm("이 카드를 삭제할까요?")) return;
    const next = cards.filter((_, idx) => idx !== i);
    update({ cards: next });
    setSelectedId(next[Math.min(i, next.length - 1)].id);
  }

  async function uploadCustom(cardId: string, file: File) {
    setGenerating((s) => new Set(s).add(cardId));
    try {
      const fd = new FormData();
      fd.append("projectId", project.id); fd.append("cardId", cardId); fd.append("file", file);
      const res = await fetch("/api/upload", { method: "POST", body: fd });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error);
      setProject((prev) => ({ ...prev, cards: prev.cards.map((c) => (c.id === cardId ? { ...c, imageUrl: j.imageUrl } : c)) }));
    } catch (e) {
      setErr(e instanceof Error ? e.message : "업로드 실패");
    } finally {
      setGenerating((s) => { const n = new Set(s); n.delete(cardId); return n; });
    }
  }

  // ---------- export ----------
  const rcFor = useCallback((i: number) => ({ width: size.width, height: size.height, index: i, total: cards.length, persona: project.persona }), [size, cards.length, project.persona]);

  async function renderBlob(i: number) {
    const canvas = document.createElement("canvas");
    await renderCard(canvas, cards[i], project.design, rcFor(i));
    return canvasToPngBlob(canvas);
  }
  const safeName = (project.title || project.topic || "cardnews").replace(/[\\/:*?"<>|]/g, "").slice(0, 40);
  async function downloadOne(i: number) {
    setBusy("PNG 만드는 중");
    try { downloadBlob(await renderBlob(i), `${safeName}-${String(i + 1).padStart(2, "0")}.png`); }
    catch (e) { setErr(e instanceof Error ? e.message : "다운로드 실패"); }
    finally { setBusy(null); }
  }
  async function downloadAll() {
    setBusy("전체 PNG 압축 중");
    try {
      const zip = new JSZip();
      for (let i = 0; i < cards.length; i++) zip.file(`${safeName}-${String(i + 1).padStart(2, "0")}.png`, await renderBlob(i));
      downloadBlob(await zip.generateAsync({ type: "blob" }), `${safeName}.zip`);
    } catch (e) { setErr(e instanceof Error ? e.message : "다운로드 실패"); }
    finally { setBusy(null); }
  }

  const effectiveDesign: CardDesign = useMemo(() => ({ ...project.design, ...(selected?.design ?? {}) }), [project.design, selected]);
  const missing = cards.filter((c) => !c.imageUrl).length;

  return (
    <div className="mx-auto max-w-[1600px] px-4 py-6">
      {/* top bar */}
      <div className="flex flex-wrap items-center gap-3">
        <input
          className="min-w-[240px] flex-1 rounded-lg border border-transparent bg-transparent px-2 py-1 text-xl font-black text-gray-900 hover:border-gray-300 focus:border-indigo-500 focus:outline-none"
          value={project.title}
          onChange={(e) => update({ title: e.target.value })}
          placeholder="카드뉴스 제목"
        />
        <span className="text-xs text-gray-500">{size.width}×{size.height} · {cards.length}장 · {saveState === "saved" ? "저장됨" : saveState === "saving" ? "저장 중..." : "변경됨"}</span>
        {missing > 0 && (
          <button className="btn-secondary" onClick={generateMissing} disabled={!!busy}>남은 이미지 {missing}장 생성</button>
        )}
        <button className="btn-primary" onClick={downloadAll} disabled={!!busy || cards.length === 0}>전체 PNG 다운로드 (ZIP)</button>
      </div>

      {(busy || progress) && (
        <div className="mt-3 flex items-center gap-3 rounded-lg bg-indigo-50 px-4 py-2 text-sm text-indigo-800">
          <span className="h-3 w-3 animate-spin rounded-full border-2 border-indigo-600 border-t-transparent" />
          {busy}{progress && ` (${progress.done}/${progress.total})`}
          {progress && <div className="ml-auto h-2 w-40 overflow-hidden rounded bg-indigo-100"><div className="h-full bg-indigo-600 transition-all" style={{ width: `${(progress.done / progress.total) * 100}%` }} /></div>}
        </div>
      )}
      {err && (
        <div className="mt-3 flex items-center justify-between rounded-lg bg-red-50 px-4 py-2 text-sm text-red-700">
          <span>{err}</span><button onClick={() => setErr(null)} className="text-xs underline">닫기</button>
        </div>
      )}

      {cards.length === 0 ? (
        <div className="card mt-8 p-12 text-center">
          <p className="text-gray-600">아직 카드 글이 없습니다.</p>
          <button className="btn-primary mt-4" onClick={async () => { if (await plan()) generateMissing(); }} disabled={!!busy}>글과 이미지 생성 시작</button>
        </div>
      ) : (
        <div className="mt-4 grid gap-4 lg:grid-cols-[220px_1fr_360px]">
          {/* card list */}
          <aside className="card max-h-[calc(100vh-140px)] overflow-y-auto p-3">
            <div className="mb-2 flex items-center justify-between text-xs font-semibold text-gray-600">
              <span>카드 순서 (드래그로 이동)</span>
              <button className="text-indigo-600 hover:underline" onClick={addCard}>+ 추가</button>
            </div>
            <ul className="space-y-2">
              {cards.map((c, i) => (
                <li
                  key={c.id}
                  draggable
                  onDragStart={() => setDragId(c.id)}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={() => { if (dragId) { const from = cards.findIndex((x) => x.id === dragId); move(from, i); setDragId(null); } }}
                  onClick={() => setSelectedId(c.id)}
                  className={`cursor-pointer rounded-xl border p-2 ${c.id === selected?.id ? "border-indigo-600 ring-2 ring-indigo-100" : "border-gray-200 hover:border-gray-300"}`}
                >
                  <div className="relative overflow-hidden rounded-lg bg-gray-100">
                    <CardCanvas card={c} design={project.design} rc={rcFor(i)} className="w-full" />
                    {generating.has(c.id) && (
                      <div className="absolute inset-0 flex items-center justify-center bg-white/70 text-xs font-semibold text-indigo-700">
                        <span className="mr-2 h-3 w-3 animate-spin rounded-full border-2 border-indigo-600 border-t-transparent" />생성 중
                      </div>
                    )}
                  </div>
                  <div className="mt-1 flex items-center justify-between text-xs text-gray-600">
                    <span className="truncate">{i + 1}. {c.title || "(제목 없음)"}</span>
                    <span className="flex gap-1">
                      <button title="위로" onClick={(e) => { e.stopPropagation(); move(i, i - 1); }} className="px-1 hover:text-indigo-600">▲</button>
                      <button title="아래로" onClick={(e) => { e.stopPropagation(); move(i, i + 1); }} className="px-1 hover:text-indigo-600">▼</button>
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          </aside>

          {/* preview */}
          <section className="card flex flex-col items-center justify-center p-4">
            {selected && (
              <>
                <CardCanvas card={selected} design={project.design} rc={rcFor(selectedIndex)} className="max-h-[calc(100vh-240px)] w-auto max-w-full rounded-xl shadow-lg" />
                <div className="mt-3 flex flex-wrap gap-2">
                  <button className="btn-secondary" onClick={() => downloadOne(selectedIndex)} disabled={!!busy}>이 카드 PNG 다운로드</button>
                  <button className="btn-secondary" onClick={() => duplicateCard(selectedIndex)}>복제</button>
                  <button className="btn-danger" onClick={() => removeCard(selectedIndex)} disabled={cards.length <= 1}>삭제</button>
                </div>
              </>
            )}
          </section>

          {/* inspector */}
          <aside className="card max-h-[calc(100vh-140px)] overflow-y-auto p-4">
            <div className="mb-4 flex rounded-lg bg-gray-100 p-1 text-sm">
              {([["text", "내용"], ["image", "이미지"], ["design", "디자인"]] as [Tab, string][]).map(([t, l]) => (
                <button key={t} onClick={() => setTab(t)} className={`flex-1 rounded-md py-1.5 font-medium ${tab === t ? "bg-white text-gray-900 shadow" : "text-gray-500"}`}>{l}</button>
              ))}
            </div>

            {selected && tab === "text" && (
              <div className="space-y-4">
                <div>
                  <label className="label">제목</label>
                  <textarea className="input" rows={2} value={selected.title} onChange={(e) => updateCard(selected.id, { title: e.target.value })} />
                </div>
                <div>
                  <label className="label">본문 (줄바꿈 가능)</label>
                  <textarea className="input" rows={6} value={selected.body} onChange={(e) => updateCard(selected.id, { body: e.target.value })} />
                </div>
                <p className="text-xs text-gray-500">한글은 이미지에 굽지 않고 브라우저 캔버스에서 합성되므로 오타 없이 정확하게 출력됩니다.</p>
              </div>
            )}

            {selected && tab === "image" && (
              <div className="space-y-4">
                {selected.imageUrl ? (
                  <img src={selected.imageUrl} alt="" className="w-full rounded-lg border border-gray-200" />
                ) : (
                  <div className="rounded-lg bg-gray-100 p-6 text-center text-sm text-gray-500">아직 이미지가 없습니다.</div>
                )}
                <div>
                  <label className="label">이미지 프롬프트 (영어 권장, 글자 없는 장면 묘사)</label>
                  <textarea className="input" rows={6} value={selected.imagePrompt} onChange={(e) => updateCard(selected.id, { imagePrompt: e.target.value })} />
                </div>
                <button
                  className="btn-primary w-full"
                  disabled={generating.has(selected.id) || !!busy}
                  onClick={() => generateImage(selected.id, selected.imagePrompt).catch((e) => setErr(e.message))}
                >
                  {generating.has(selected.id) ? "gpt-image-2 생성 중..." : selected.imageUrl ? "이미지 다시 생성" : "이미지 생성"}
                </button>
                <div>
                  <label className="label">직접 이미지 업로드로 교체</label>
                  <input type="file" accept="image/*" className="text-sm" onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadCustom(selected.id, f); e.target.value = ""; }} />
                </div>
                {project.use_character && project.character_sheet_url && (
                  <div>
                    <label className="label">캐릭터 시트 (모든 카드에 참조됨)</label>
                    <img src={project.character_sheet_url} alt="캐릭터 시트" className="w-full rounded-lg border border-gray-200" />
                    {project.character_description && <p className="mt-1 text-xs text-gray-500">{project.character_description}</p>}
                  </div>
                )}
              </div>
            )}

            {selected && tab === "design" && (
              <div className="space-y-4">
                <div className="flex rounded-lg border border-gray-200 p-1 text-xs">
                  <button onClick={() => setDesignScope("global")} className={`flex-1 rounded-md py-1 ${designScope === "global" ? "bg-indigo-600 text-white" : "text-gray-600"}`}>전체 카드</button>
                  <button onClick={() => setDesignScope("card")} className={`flex-1 rounded-md py-1 ${designScope === "card" ? "bg-indigo-600 text-white" : "text-gray-600"}`}>이 카드만</button>
                </div>
                {designScope === "global" ? (
                  <DesignPanel value={project.design} onChange={(patch) => update({ design: { ...project.design, ...patch } })} />
                ) : (
                  <>
                    <DesignPanel value={effectiveDesign} onChange={(patch) => updateCard(selected.id, { design: { ...selected.design, ...patch } })} />
                    {Object.keys(selected.design ?? {}).length > 0 && (
                      <button className="btn-secondary w-full" onClick={() => updateCard(selected.id, { design: {} })}>이 카드의 개별 설정 초기화</button>
                    )}
                  </>
                )}
              </div>
            )}
          </aside>
        </div>
      )}
    </div>
  );
}
