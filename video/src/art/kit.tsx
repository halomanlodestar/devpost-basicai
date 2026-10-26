// The paper, the camera and the three pens: watercolour washes, loose pencil, and the
// clean ink the rider is drawn in. Everything is drawn on a 320 × 180 stage.

import { createContext, useContext, type CSSProperties, type ReactNode } from "react";
import { AbsoluteFill, Easing, interpolate, useCurrentFrame } from "remotion";
import { loadFont } from "@remotion/google-fonts/PatrickHand";
import type { Camera, Mood, Palette } from "../types";

export const { fontFamily: HAND } = loadFont();

export const INK = "#1E1E26";
export const PENCIL = "#8E939C";
export const PAPER = "#FFFFFF";
export const BRAND_CORAL = "#FF7A45";

export const PALETTES: Record<Mood, Palette> = {
  warm: { sky: "#A9CDEB", sand: "#E8D7BD", sandDark: "#C7AF89", green: "#8FBF7A", coral: "#F08A73", road: "#BFC3C9", yellow: "#F2B33D", wood: "#C98A4B", op: 1 },
  cold: { sky: "#C2CBD2", sand: "#DCD8D0", sandDark: "#BDB6A9", green: "#AEB7A8", coral: "#B9B5B3", road: "#C5C8CC", yellow: "#D6CCB0", wood: "#B5A897", op: 0.85 },
  pencil: { sky: "#C9D6E0", sand: "#E9E2D6", sandDark: "#D3C7B3", green: "#C3D3BA", coral: "#F3B3A4", road: "#D5D7DA", yellow: "#F3D9A0", wood: "#D9BFA4", op: 0.5 },
};

const MoodContext = createContext<Palette>(PALETTES.warm);
export const usePalette = () => useContext(MoodContext);

interface MoodProps {
  mood: Mood;
  children: ReactNode;
}
export function MoodProvider({ mood, children }: MoodProps) {
  return <MoodContext.Provider value={PALETTES[mood]}>{children}</MoodContext.Provider>;
}

/** Clamped, eased interpolation: the default motion everywhere. */
export function ease(f: number, from: [number, number], to: [number, number], easing = Easing.inOut(Easing.cubic)) {
  return interpolate(f, from, to, { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing });
}

/** Mixes two cameras, so a shot can glide between framings. */
export function lerpCam(a: Camera, b: Camera, t: number): Camera {
  return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t, zoom: a.zoom * Math.pow(b.zoom / a.zoom, t) };
}

export const WIDE: Camera = { x: 160, y: 90, zoom: 1 };

interface StageProps {
  cam?: Camera;
  bg?: string;
  /** visible art height; taller than 180 for frames squarer than 16:9 (adds paper above and below) */
  h?: number;
  children: ReactNode;
}

/**
 * One frame of paper. Line filters "boil" (re-seed every few frames) like hand-drawn animation,
 * so even a still shot feels alive.
 */
export function Stage({ cam = WIDE, bg = PAPER, h = 180, children }: StageProps) {
  const frame = useCurrentFrame();
  const boil = Math.floor(frame / 5) % 3;

  return (
    <AbsoluteFill style={{ background: bg }}>
      <svg viewBox={`0 ${(180 - h) / 2} 320 ${h}`} width="100%" height="100%" style={{ display: "block" }}>
        <defs>
          <filter id="wash" x="-20%" y="-20%" width="140%" height="140%">
            <feTurbulence type="fractalNoise" baseFrequency="0.035" numOctaves={3} seed={4} />
            <feDisplacementMap in="SourceGraphic" scale={18} />
            <feGaussianBlur stdDeviation={1.5} />
          </filter>
          <filter id="sketch" x="-5%" y="-5%" width="110%" height="110%">
            <feTurbulence type="fractalNoise" baseFrequency="0.03" numOctaves={2} seed={7 + boil} />
            <feDisplacementMap in="SourceGraphic" scale={3} />
          </filter>
          <filter id="ink" x="-5%" y="-5%" width="110%" height="110%">
            <feTurbulence type="fractalNoise" baseFrequency="0.015" numOctaves={1} seed={2 + boil} />
            <feDisplacementMap in="SourceGraphic" scale={1.2} />
          </filter>
          <filter id="glow" x="-100%" y="-100%" width="300%" height="300%">
            <feGaussianBlur stdDeviation={2.5} />
          </filter>
        </defs>
        <g transform={`translate(160 90) scale(${cam.zoom}) translate(${-cam.x} ${-cam.y})`}>{children}</g>
      </svg>
    </AbsoluteFill>
  );
}

interface GroupProps {
  children: ReactNode;
  opacity?: number;
}

/** Watercolour layer: shapes inside get the bleeding-edge wash. */
export function Wash({ children, opacity = 1 }: GroupProps) {
  const p = usePalette();
  return (
    <g filter="url(#wash)" opacity={opacity * p.op}>
      {children}
    </g>
  );
}

/** Loose grey pencil for the world around the subject. */
export function Sketch({ children, opacity = 1 }: GroupProps) {
  return (
    <g filter="url(#sketch)" opacity={opacity} fill="none" stroke={PENCIL} strokeWidth={1.1} strokeLinecap="round" strokeLinejoin="round">
      {children}
    </g>
  );
}

/** Clean ink for whatever the eye should land on. */
export function Ink({ children, opacity = 1 }: GroupProps) {
  return (
    <g filter="url(#ink)" opacity={opacity}>
      {children}
    </g>
  );
}

export const line = (w = 2.2, color = INK): CSSProperties => ({
  fill: "none",
  stroke: color,
  strokeWidth: w,
  strokeLinecap: "round",
  strokeLinejoin: "round",
});

export const filled = (w = 1.4, color = INK, fill = PAPER): CSSProperties => ({ ...line(w, color), fill });

interface DrawProps {
  d: string;
  /** 0 = not drawn yet, 1 = fully drawn */
  p?: number;
  w?: number;
  color?: string;
  dash?: string;
}

/** A path that draws itself as `p` goes from 0 to 1. */
export function Draw({ d, p = 1, w = 2.2, color = INK, dash }: DrawProps) {
  if (dash) {
    return <path d={d} style={{ ...line(w, color), strokeDasharray: dash, opacity: p > 0 ? 1 : 0 }} />;
  }
  return <path d={d} pathLength={1} style={{ ...line(w, color), strokeDasharray: 1, strokeDashoffset: 1 - p }} />;
}

interface HandTextProps {
  x: number;
  y: number;
  size: number;
  children: ReactNode;
  anchor?: "start" | "middle" | "end";
  color?: string;
  opacity?: number;
  /** 0..1 reveals the words left to right, like they're being written */
  write?: number;
}

/** Handwritten text. `write` reveals it left to right. */
export function HandText({ x, y, size, children, anchor = "middle", color = INK, opacity = 1, write = 1 }: HandTextProps) {
  const id = `w${Math.round(x * 7 + y * 13)}`;
  const span = size * 0.55 * (typeof children === "string" ? children.length : 20);
  const start = anchor === "middle" ? x - span / 2 : anchor === "end" ? x - span : x;
  return (
    <g opacity={opacity}>
      {write < 1 && (
        <clipPath id={id}>
          <rect x={start} y={y - size * 1.2} width={span * write} height={size * 1.6} />
        </clipPath>
      )}
      <text
        x={x}
        y={y}
        textAnchor={anchor}
        fontFamily={HAND}
        fontSize={size}
        fill={color}
        clipPath={write < 1 ? `url(#${id})` : undefined}
      >
        {children}
      </text>
    </g>
  );
}
