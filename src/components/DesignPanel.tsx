"use client";
import { FONT_OPTIONS, type CardDesign, type Layout } from "@/lib/types";

const LAYOUTS: { value: Layout; label: string }[] = [
  { value: "bottom", label: "하단 텍스트" },
  { value: "top", label: "상단 텍스트" },
  { value: "center", label: "중앙 텍스트" },
  { value: "split", label: "이미지 + 패널" },
];

export default function DesignPanel({
  value,
  onChange,
}: {
  value: CardDesign;
  onChange: (patch: Partial<CardDesign>) => void;
}) {
  return (
    <div className="space-y-4 text-sm">
      <div>
        <label className="label">레이아웃</label>
        <div className="grid grid-cols-2 gap-2">
          {LAYOUTS.map((l) => (
            <button
              key={l.value}
              type="button"
              onClick={() => onChange({ layout: l.value })}
              className={`rounded-lg border px-2 py-1.5 text-xs ${value.layout === l.value ? "border-indigo-600 bg-indigo-50 text-indigo-700" : "border-gray-300 bg-white text-gray-700"}`}
            >
              {l.label}
            </button>
          ))}
        </div>
      </div>
      <div>
        <label className="label">글꼴</label>
        <select className="input" value={value.fontFamily} onChange={(e) => onChange({ fontFamily: e.target.value })}>
          {FONT_OPTIONS.map((f) => (
            <option key={f.value} value={f.value}>{f.label}</option>
          ))}
        </select>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Range label="제목 크기" value={value.titleSize} min={32} max={160} onChange={(v) => onChange({ titleSize: v })} />
        <Range label="본문 크기" value={value.bodySize} min={20} max={80} onChange={(v) => onChange({ bodySize: v })} />
        <Range label="여백" value={value.padding} min={24} max={200} onChange={(v) => onChange({ padding: v })} />
        <Range label="오버레이 진하기" value={Math.round(value.overlayStrength * 100)} min={0} max={100} onChange={(v) => onChange({ overlayStrength: v / 100 })} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Color label="글자색" value={value.textColor} onChange={(v) => onChange({ textColor: v })} />
        <Color label="포인트색" value={value.accentColor} onChange={(v) => onChange({ accentColor: v })} />
        <Color label="오버레이색" value={value.overlayColor} onChange={(v) => onChange({ overlayColor: v })} />
        <Color label="패널/배경색" value={value.panelColor} onChange={(v) => onChange({ panelColor: v })} />
      </div>
      <div>
        <label className="label">정렬</label>
        <div className="flex gap-2">
          {(["left", "center"] as const).map((a) => (
            <button key={a} type="button" onClick={() => onChange({ align: a })} className={`flex-1 rounded-lg border px-2 py-1.5 text-xs ${value.align === a ? "border-indigo-600 bg-indigo-50 text-indigo-700" : "border-gray-300 bg-white text-gray-700"}`}>
              {a === "left" ? "왼쪽" : "가운데"}
            </button>
          ))}
        </div>
      </div>
      <div className="flex flex-col gap-2">
        <label className="flex items-center gap-2"><input type="checkbox" checked={value.showBrand} onChange={(e) => onChange({ showBrand: e.target.checked })} /> 브랜드명 표시</label>
        <label className="flex items-center gap-2"><input type="checkbox" checked={value.showPageNumber} onChange={(e) => onChange({ showPageNumber: e.target.checked })} /> 페이지 번호 표시</label>
      </div>
    </div>
  );
}

function Range({ label, value, min, max, onChange }: { label: string; value: number; min: number; max: number; onChange: (v: number) => void }) {
  return (
    <div>
      <label className="label">{label}: {value}</label>
      <input type="range" min={min} max={max} value={value} onChange={(e) => onChange(Number(e.target.value))} className="w-full" />
    </div>
  );
}

function Color({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <label className="label">{label}</label>
      <div className="flex items-center gap-2">
        <input type="color" value={value} onChange={(e) => onChange(e.target.value)} className="h-8 w-10 cursor-pointer rounded border border-gray-300 bg-white p-0.5" />
        <input className="input" value={value} onChange={(e) => onChange(e.target.value)} />
      </div>
    </div>
  );
}
