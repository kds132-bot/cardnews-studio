import type { SizeKey } from "./types";

export interface SizePreset {
  key: SizeKey;
  label: string;
  width: number; // export resolution
  height: number;
  modelSize: string; // gpt-image-2 size (multiples of 16)
  ratio: string;
}

export const SIZE_PRESETS: SizePreset[] = [
  { key: "square", label: "정사각형 1:1 (인스타 피드)", width: 1080, height: 1080, modelSize: "1024x1024", ratio: "1:1" },
  { key: "portrait", label: "세로 4:5 (인스타 피드 세로)", width: 1080, height: 1350, modelSize: "1024x1280", ratio: "4:5" },
  { key: "story", label: "세로 9:16 (스토리/릴스)", width: 1080, height: 1920, modelSize: "1088x1920", ratio: "9:16" },
  { key: "landscape", label: "가로 16:9 (유튜브/블로그)", width: 1920, height: 1080, modelSize: "1920x1088", ratio: "16:9" },
];

export function getSize(key: SizeKey): SizePreset {
  return SIZE_PRESETS.find((s) => s.key === key) ?? SIZE_PRESETS[0];
}
