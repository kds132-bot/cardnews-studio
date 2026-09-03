export type SizeKey = "square" | "portrait" | "story" | "landscape";

export type ArtStyle =
  | "flat"
  | "3d"
  | "watercolor"
  | "photo"
  | "anime"
  | "lineart"
  | "pixel";

export type Quality = "low" | "medium" | "high";

export type Layout = "bottom" | "top" | "center" | "split";

export interface Persona {
  brandName: string;
  description: string;
  tone: string;
  audience: string;
}

export interface CardDesign {
  layout: Layout;
  fontFamily: string;
  titleSize: number; // px at target resolution
  bodySize: number;
  textColor: string;
  accentColor: string;
  overlayColor: string;
  overlayStrength: number; // 0..1
  align: "left" | "center";
  padding: number;
  showPageNumber: boolean;
  showBrand: boolean;
  panelColor: string; // for split layout
}

export interface Card {
  id: string;
  title: string;
  body: string;
  imagePrompt: string;
  imageUrl: string | null;
  design: Partial<CardDesign>;
}

export interface Project {
  id: string;
  user_id: string;
  title: string;
  persona: Persona;
  topic: string;
  card_count: number;
  size_key: SizeKey;
  art_style: ArtStyle;
  quality: Quality;
  use_character: boolean;
  character_source_url: string | null;
  character_sheet_url: string | null;
  character_description: string | null;
  design: CardDesign;
  cards: Card[];
  status: "draft" | "planned" | "generating" | "done";
  created_at: string;
  updated_at: string;
}

export const DEFAULT_DESIGN: CardDesign = {
  layout: "bottom",
  fontFamily: "Noto Sans KR",
  titleSize: 72,
  bodySize: 36,
  textColor: "#ffffff",
  accentColor: "#ff5a5f",
  overlayColor: "#000000",
  overlayStrength: 0.65,
  align: "left",
  padding: 72,
  showPageNumber: true,
  showBrand: true,
  panelColor: "#111111",
};

export const FONT_OPTIONS = [
  { value: "Noto Sans KR", label: "노토 산스 (기본)" },
  { value: "Nanum Myeongjo", label: "나눔명조 (세리프)" },
  { value: "Black Han Sans", label: "검은고딕 (굵은 헤드라인)" },
  { value: "Do Hyeon", label: "도현 (캐주얼)" },
  { value: "Gowun Dodum", label: "고운돋움 (부드러움)" },
  { value: "Jua", label: "주아 (귀여움)" },
];

export const ART_STYLES: { value: ArtStyle; label: string; prompt: string }[] = [
  { value: "flat", label: "플랫 일러스트", prompt: "clean modern flat vector illustration, bold shapes, minimal shading, soft pastel palette" },
  { value: "3d", label: "3D 렌더", prompt: "cute 3D rendered illustration, soft studio lighting, clay-like materials, subtle depth of field" },
  { value: "watercolor", label: "수채화", prompt: "hand-painted watercolor illustration, soft washes, paper texture, gentle colors" },
  { value: "photo", label: "실사 사진", prompt: "photorealistic editorial photograph, natural light, shallow depth of field, high detail" },
  { value: "anime", label: "애니메이션", prompt: "Japanese anime style illustration, clean line art, cel shading, vibrant colors" },
  { value: "lineart", label: "라인 드로잉", prompt: "minimal single-color line drawing on a plain background, elegant thin lines, lots of white space" },
  { value: "pixel", label: "픽셀 아트", prompt: "retro pixel art illustration, 16-bit style, limited palette" },
];

export function artStylePrompt(style: ArtStyle) {
  return ART_STYLES.find((s) => s.value === style)?.prompt ?? ART_STYLES[0].prompt;
}
