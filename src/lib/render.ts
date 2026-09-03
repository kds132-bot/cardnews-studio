import type { Card, CardDesign, Persona } from "./types";

export interface RenderContext {
  width: number;
  height: number;
  index: number;
  total: number;
  persona: Persona;
}

const imageCache = new Map<string, Promise<HTMLImageElement>>();

export function loadImage(url: string): Promise<HTMLImageElement> {
  const cached = imageCache.get(url);
  if (cached) return cached;
  const p = new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("이미지를 불러오지 못했습니다."));
    img.src = url;
  });
  imageCache.set(url, p);
  p.catch(() => imageCache.delete(url));
  return p;
}

const fontLoads = new Map<string, Promise<void>>();
export function ensureFont(family: string): Promise<void> {
  const key = family;
  const cached = fontLoads.get(key);
  if (cached) return cached;
  const p = (async () => {
    if (typeof document === "undefined" || !document.fonts) return;
    const sample = "카드뉴스 만들기 ABC 123";
    await Promise.all([
      document.fonts.load(`700 40px "${family}"`, sample),
      document.fonts.load(`400 40px "${family}"`, sample),
    ]);
  })();
  fontLoads.set(key, p);
  return p;
}

function hexToRgba(hex: string, alpha: number) {
  const h = hex.replace("#", "");
  const n = parseInt(h.length === 3 ? h.split("").map((c) => c + c).join("") : h, 16);
  const r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
  return `rgba(${r},${g},${b},${alpha})`;
}

/** Wrap text: prefer breaking at spaces, fall back to per-character (Korean friendly). */
export function wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const lines: string[] = [];
  for (const para of text.replace(/\r/g, "").split("\n")) {
    if (para.trim() === "") { lines.push(""); continue; }
    const words = para.split(" ");
    let line = "";
    for (const word of words) {
      const test = line ? `${line} ${word}` : word;
      if (ctx.measureText(test).width <= maxWidth) { line = test; continue; }
      if (line) lines.push(line);
      // word itself too long → break by character
      if (ctx.measureText(word).width > maxWidth) {
        let chunk = "";
        for (const ch of word) {
          if (ctx.measureText(chunk + ch).width > maxWidth && chunk) { lines.push(chunk); chunk = ch; }
          else chunk += ch;
        }
        line = chunk;
      } else line = word;
    }
    lines.push(line);
  }
  return lines;
}

function drawCover(ctx: CanvasRenderingContext2D, img: HTMLImageElement, x: number, y: number, w: number, h: number) {
  const s = Math.max(w / img.width, h / img.height);
  const dw = img.width * s, dh = img.height * s;
  ctx.drawImage(img, x + (w - dw) / 2, y + (h - dh) / 2, dw, dh);
}

export async function renderCard(
  canvas: HTMLCanvasElement,
  card: Card,
  baseDesign: CardDesign,
  rc: RenderContext,
): Promise<void> {
  const d: CardDesign = { ...baseDesign, ...card.design };
  const { width: W, height: H } = rc;
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d")!;
  await ensureFont(d.fontFamily);

  let img: HTMLImageElement | null = null;
  if (card.imageUrl) {
    try { img = await loadImage(card.imageUrl); } catch { img = null; }
  }

  // background
  ctx.fillStyle = d.panelColor;
  ctx.fillRect(0, 0, W, H);

  const pad = d.padding;
  const textW = W - pad * 2;
  const isSplit = d.layout === "split";
  const imgH = isSplit ? Math.round(H * 0.58) : H;

  if (img) drawCover(ctx, img, 0, 0, W, imgH);
  else {
    const g = ctx.createLinearGradient(0, 0, W, imgH);
    g.addColorStop(0, hexToRgba(d.accentColor, 0.9));
    g.addColorStop(1, hexToRgba(d.accentColor, 0.4));
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, imgH);
  }

  // measure text block
  ctx.textBaseline = "top";
  const titleFont = `700 ${d.titleSize}px "${d.fontFamily}", "Noto Sans KR", sans-serif`;
  const bodyFont = `400 ${d.bodySize}px "${d.fontFamily}", "Noto Sans KR", sans-serif`;
  ctx.font = titleFont;
  const titleLines = card.title ? wrapText(ctx, card.title, textW) : [];
  ctx.font = bodyFont;
  const bodyLines = card.body ? wrapText(ctx, card.body, textW) : [];
  const titleLH = d.titleSize * 1.25;
  const bodyLH = d.bodySize * 1.55;
  const gap = titleLines.length && bodyLines.length ? d.bodySize * 0.9 : 0;
  const accentBarH = titleLines.length ? Math.round(d.titleSize * 0.18) : 0;
  const blockH = accentBarH + (accentBarH ? d.titleSize * 0.4 : 0) + titleLines.length * titleLH + gap + bodyLines.length * bodyLH;

  // overlay + text position
  let textTop: number;
  if (isSplit) {
    const panelTop = imgH;
    ctx.fillStyle = d.panelColor;
    ctx.fillRect(0, panelTop, W, H - panelTop);
    // accent line separating
    ctx.fillStyle = d.accentColor;
    ctx.fillRect(0, panelTop, W, Math.max(6, Math.round(H * 0.006)));
    textTop = panelTop + (H - panelTop - blockH) / 2;
  } else {
    const overlayH = Math.min(H, blockH + pad * 2.2);
    const g =
      d.layout === "top"
        ? ctx.createLinearGradient(0, 0, 0, overlayH)
        : d.layout === "center"
          ? ctx.createLinearGradient(0, 0, 0, H)
          : ctx.createLinearGradient(0, H - overlayH, 0, H);
    if (d.layout === "top") {
      g.addColorStop(0, hexToRgba(d.overlayColor, d.overlayStrength));
      g.addColorStop(0.7, hexToRgba(d.overlayColor, d.overlayStrength * 0.7));
      g.addColorStop(1, hexToRgba(d.overlayColor, 0));
      ctx.fillStyle = g; ctx.fillRect(0, 0, W, overlayH);
      textTop = pad;
    } else if (d.layout === "center") {
      ctx.fillStyle = hexToRgba(d.overlayColor, d.overlayStrength * 0.75);
      ctx.fillRect(0, 0, W, H);
      textTop = (H - blockH) / 2;
    } else {
      g.addColorStop(0, hexToRgba(d.overlayColor, 0));
      g.addColorStop(0.3, hexToRgba(d.overlayColor, d.overlayStrength * 0.7));
      g.addColorStop(1, hexToRgba(d.overlayColor, d.overlayStrength));
      ctx.fillStyle = g; ctx.fillRect(0, H - overlayH, W, overlayH);
      textTop = H - pad - blockH;
    }
  }

  const x = d.align === "center" ? W / 2 : pad;
  ctx.textAlign = d.align;
  let y = textTop;
  if (accentBarH) {
    ctx.fillStyle = d.accentColor;
    const barW = Math.round(d.titleSize * 1.2);
    ctx.fillRect(d.align === "center" ? W / 2 - barW / 2 : pad, y, barW, accentBarH);
    y += accentBarH + d.titleSize * 0.4;
  }
  ctx.fillStyle = d.textColor;
  ctx.font = titleFont;
  ctx.shadowColor = "rgba(0,0,0,0.25)";
  ctx.shadowBlur = isSplit ? 0 : d.titleSize * 0.15;
  for (const line of titleLines) { ctx.fillText(line, x, y); y += titleLH; }
  y += gap;
  ctx.font = bodyFont;
  ctx.shadowBlur = isSplit ? 0 : d.bodySize * 0.15;
  ctx.fillStyle = hexToRgba(d.textColor, 0.92);
  for (const line of bodyLines) { ctx.fillText(line, x, y); y += bodyLH; }
  ctx.shadowBlur = 0;

  // meta: brand + page number
  const metaSize = Math.round(Math.max(20, d.bodySize * 0.7));
  ctx.font = `500 ${metaSize}px "${d.fontFamily}", "Noto Sans KR", sans-serif`;
  const metaColor = d.layout === "top" ? d.textColor : (isSplit ? d.textColor : d.textColor);
  ctx.fillStyle = hexToRgba(metaColor, 0.85);
  const metaY = d.layout === "top" ? H - pad - metaSize : pad;
  if (d.layout === "top" || isSplit || d.layout === "center" || d.layout === "bottom") {
    // subtle pill background for readability on images
    if (d.showBrand && rc.persona.brandName) {
      ctx.textAlign = "left";
      const label = rc.persona.brandName;
      const tw = ctx.measureText(label).width;
      if (!(isSplit && metaY > imgH)) {
        ctx.fillStyle = hexToRgba(d.overlayColor, 0.35);
        roundRect(ctx, pad - metaSize * 0.6, metaY - metaSize * 0.35, tw + metaSize * 1.2, metaSize * 1.7, metaSize * 0.85);
        ctx.fill();
      }
      ctx.fillStyle = hexToRgba(metaColor, 0.95);
      ctx.fillText(label, pad, metaY);
    }
    if (d.showPageNumber) {
      ctx.textAlign = "right";
      const label = `${rc.index + 1} / ${rc.total}`;
      const tw = ctx.measureText(label).width;
      if (!(isSplit && metaY > imgH)) {
        ctx.fillStyle = hexToRgba(d.overlayColor, 0.35);
        roundRect(ctx, W - pad - tw - metaSize * 0.6, metaY - metaSize * 0.35, tw + metaSize * 1.2, metaSize * 1.7, metaSize * 0.85);
        ctx.fill();
      }
      ctx.fillStyle = hexToRgba(metaColor, 0.95);
      ctx.fillText(label, W - pad, metaY);
    }
  }
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

export function canvasToPngBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("PNG 변환 실패"))), "image/png");
  });
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}
