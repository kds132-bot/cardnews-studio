import OpenAI, { toFile } from "openai";
import { artStylePrompt, type ArtStyle, type Persona, type Quality } from "./types";

export const TEXT_MODEL = process.env.OPENAI_TEXT_MODEL || "gpt-5.6-terra";
export const IMAGE_MODEL = process.env.OPENAI_IMAGE_MODEL || "gpt-image-2";

let _client: OpenAI | null = null;
export function openai() {
  if (!process.env.OPENAI_API_KEY) throw new Error("OPENAI_API_KEY 환경변수가 설정되지 않았습니다.");
  if (!_client) _client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  return _client;
}

export interface PlannedCard {
  title: string;
  body: string;
  imagePrompt: string;
}
export interface Plan {
  title: string;
  accentColor: string;
  cards: PlannedCard[];
}

const NO_TEXT_RULE =
  "ABSOLUTELY NO text, letters, numbers, typography, logos, watermarks, signs, captions, speech bubbles, or UI elements anywhere in the image. The image must be completely text-free.";

export async function planCards(opts: {
  persona: Persona;
  topic: string;
  count: number;
  artStyle: ArtStyle;
  useCharacter: boolean;
  characterDescription?: string | null;
}): Promise<Plan> {
  const { persona, topic, count, artStyle, useCharacter, characterDescription } = opts;
  const schema = {
    type: "object",
    additionalProperties: false,
    properties: {
      title: { type: "string", description: "카드뉴스 전체 제목 (한국어, 20자 이내)" },
      accentColor: { type: "string", description: "브랜드 분위기에 맞는 포인트 색상 HEX (예: #FF5A5F)" },
      cards: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: false,
          properties: {
            title: { type: "string" },
            body: { type: "string" },
            imagePrompt: { type: "string" },
          },
          required: ["title", "body", "imagePrompt"],
        },
      },
    },
    required: ["title", "accentColor", "cards"],
  };

  const system = `당신은 SNS 카드뉴스 전문 카피라이터이자 아트디렉터입니다.
브랜드 페르소나와 주제를 받아 정확히 ${count}장의 카드뉴스를 기획합니다.

규칙:
- 모든 title/body는 한국어로 작성합니다. 브랜드의 말투(tone)를 그대로 반영하세요.
- 1번 카드는 표지(후킹 제목 + 짧은 부제, body는 1문장). 마지막 카드는 마무리/CTA(행동 유도).
- 중간 카드는 한 장에 하나의 메시지만. title은 18자 이내, body는 2~3문장, 최대 90자.
- 이모지는 사용하지 마세요. 줄바꿈은 body 안에서 \\n 으로 표현할 수 있습니다.
- imagePrompt는 영어로, 이미지 생성 모델을 위한 장면 묘사입니다. 구체적인 피사체, 구도, 분위기, 색감을 40~70단어로 씁니다.
  카드마다 장면이 달라야 하지만 전체적으로 하나의 시리즈처럼 통일된 색감/분위기를 유지하세요.
  imagePrompt에는 절대 텍스트/글자/간판/로고를 그리라는 내용을 넣지 마세요 (텍스트는 웹에서 별도로 합성합니다).
  ${useCharacter ? "이미지에는 브랜드의 마스코트 캐릭터가 등장합니다. 각 imagePrompt에서 'the character'가 무엇을 하고 어떤 표정/포즈인지 묘사하세요. 캐릭터 외모(얼굴, 머리, 옷)는 별도로 고정되므로 다시 묘사하지 마세요." : "사람이 등장할 경우 얼굴이 크게 나오지 않게 하세요."}
- 그림체 참고: ${artStylePrompt(artStyle)}`;

  const user = `브랜드 페르소나:
- 브랜드명: ${persona.brandName}
- 소개: ${persona.description}
- 말투/톤: ${persona.tone}
- 타깃: ${persona.audience}
${characterDescription ? `\n캐릭터 설명(참고용): ${characterDescription}\n` : ""}
카드뉴스 주제: ${topic}
카드 개수: ${count}장`;

  const res = await openai().responses.create({
    model: TEXT_MODEL,
    input: [
      { role: "system", content: system },
      { role: "user", content: user },
    ],
    text: { format: { type: "json_schema", name: "cardnews_plan", strict: true, schema } },
  });

  const plan = JSON.parse(res.output_text) as Plan;
  if (!Array.isArray(plan.cards) || plan.cards.length === 0) throw new Error("카드 기획 결과가 비어 있습니다.");
  plan.cards = plan.cards.slice(0, count);
  while (plan.cards.length < count) {
    plan.cards.push({ title: `카드 ${plan.cards.length + 1}`, body: "", imagePrompt: plan.cards[plan.cards.length - 1]?.imagePrompt ?? topic });
  }
  if (!/^#[0-9a-fA-F]{6}$/.test(plan.accentColor)) plan.accentColor = "#ff5a5f";
  return plan;
}

/** Describe the uploaded person/character so every prompt can restate the identity. */
export async function describeCharacter(imageDataUrl: string): Promise<string> {
  const res = await openai().responses.create({
    model: TEXT_MODEL,
    input: [
      {
        role: "user",
        content: [
          {
            type: "input_text",
            text: "Describe this person or character for an illustrator who must redraw them consistently. In English, one paragraph, max 80 words: gender presentation, apparent age, face shape, skin tone, hair (color, length, style), eyes, glasses/accessories, and the exact outfit (colors, garments). Do not mention the background.",
          },
          { type: "input_image", image_url: imageDataUrl, detail: "high" },
        ],
      },
    ],
  });
  return res.output_text.trim();
}

async function fetchAsFile(url: string, name: string) {
  const r = await fetch(url);
  if (!r.ok) throw new Error(`참고 이미지를 불러오지 못했습니다: ${url}`);
  const buf = Buffer.from(await r.arrayBuffer());
  const type = r.headers.get("content-type")?.split(";")[0] || "image/png";
  return toFile(buf, name, { type });
}

export async function generateCharacterSheet(opts: {
  source: { buffer: Buffer; type: string; name: string };
  artStyle: ArtStyle;
  description: string;
  quality: Quality;
}): Promise<Buffer> {
  const { source, artStyle, description, quality } = opts;
  const prompt = `Create a professional character reference sheet (model sheet) of the person in the reference photo, redrawn in this art style: ${artStylePrompt(artStyle)}.
Keep the likeness faithful: ${description}
Layout on a plain flat light-gray background: a full-body front view, a 3/4 view, and a side view standing in a neutral pose, plus a row of four head close-ups with different expressions (neutral, big smile, surprised, thinking). Identical face, hairstyle, proportions, and outfit in every view. Even lighting, no shadows on the background. ${NO_TEXT_RULE}`;

  const file = await toFile(source.buffer, source.name, { type: source.type });
  const res = await openai().images.edit({
    model: IMAGE_MODEL,
    image: file,
    prompt,
    size: "1536x1024",
    quality,
    output_format: "png",
    background: "opaque",
  });
  const b64 = res.data?.[0]?.b64_json;
  if (!b64) throw new Error("캐릭터 시트 생성에 실패했습니다.");
  return Buffer.from(b64, "base64");
}

export async function generateCardImage(opts: {
  scene: string;
  artStyle: ArtStyle;
  modelSize: string;
  quality: Quality;
  textArea: "bottom" | "top" | "center" | "split";
  characterSheetUrl?: string | null;
  characterDescription?: string | null;
  styleRefUrl?: string | null;
  accentColor?: string;
}): Promise<Buffer> {
  const { scene, artStyle, modelSize, quality, textArea, characterSheetUrl, characterDescription, styleRefUrl, accentColor } = opts;

  const areaText =
    textArea === "top"
      ? "the top 40% of the frame"
      : textArea === "center"
        ? "the central area of the frame"
        : textArea === "split"
          ? "the bottom third of the frame"
          : "the bottom 40% of the frame";

  const refs: { url: string; name: string }[] = [];
  const refNotes: string[] = [];
  if (characterSheetUrl) {
    refs.push({ url: characterSheetUrl, name: "character-sheet.png" });
    refNotes.push(
      `Reference image ${refs.length} is the official character sheet. The main subject MUST be this exact character: identical face, skin tone, hairstyle, body proportions, and the same outfit and colors shown on the sheet. Do not redesign or restyle the character.${characterDescription ? ` (Character: ${characterDescription})` : ""}`,
    );
  }
  if (styleRefUrl) {
    refs.push({ url: styleRefUrl, name: "style-ref.png" });
    refNotes.push(
      `Reference image ${refs.length} is a previous card of the same series. Match its rendering style, line quality, color palette, lighting, and level of detail so the new image looks like it belongs to the same set. Do not copy its composition.`,
    );
  }

  const prompt = `Social media card illustration for a Korean brand, one image in a series.
Art style: ${artStylePrompt(artStyle)}.${accentColor ? ` Use ${accentColor} as a subtle accent color in the palette.` : ""}
Scene: ${scene}
Composition: keep ${areaText} clean, simple and uncluttered (soft background, no important details there) because a text overlay will be placed on top later. Main subject placed away from that area.
${refNotes.join("\n")}
${NO_TEXT_RULE}`;

  const client = openai();
  let b64: string | undefined;
  if (refs.length > 0) {
    const files = await Promise.all(refs.map((r) => fetchAsFile(r.url, r.name)));
    const res = await client.images.edit({
      model: IMAGE_MODEL,
      image: files,
      prompt,
      size: modelSize as never,
      quality,
      output_format: "png",
      background: "opaque",
    });
    b64 = res.data?.[0]?.b64_json;
  } else {
    const res = await client.images.generate({
      model: IMAGE_MODEL,
      prompt,
      size: modelSize as never,
      quality,
      output_format: "png",
      background: "opaque",
    });
    b64 = res.data?.[0]?.b64_json;
  }
  if (!b64) throw new Error("이미지 생성에 실패했습니다.");
  return Buffer.from(b64, "base64");
}
