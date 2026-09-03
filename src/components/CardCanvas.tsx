"use client";
import { useEffect, useRef } from "react";
import { renderCard, type RenderContext } from "@/lib/render";
import type { Card, CardDesign } from "@/lib/types";

export default function CardCanvas({
  card,
  design,
  rc,
  className,
  style,
}: {
  card: Card;
  design: CardDesign;
  rc: RenderContext;
  className?: string;
  style?: React.CSSProperties;
}) {
  const ref = useRef<HTMLCanvasElement>(null);
  const key = JSON.stringify({ card, design, rc });
  useEffect(() => {
    let cancelled = false;
    const canvas = ref.current;
    if (!canvas) return;
    renderCard(canvas, card, design, rc).catch(() => {
      if (cancelled) return;
    });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  return <canvas ref={ref} className={className} style={{ aspectRatio: `${rc.width} / ${rc.height}`, ...style }} />;
}
