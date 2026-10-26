// Props and places: the college steps, the bus, the stop, the clock, the phone, the map,
// and the conductor with his ticket machine.

import type { ReactNode } from "react";
import { random } from "remotion";
import { BRAND_CORAL, filled, HandText, INK, line, PAPER, Sketch, usePalette, Wash } from "./kit";

/** The college steps from storyboard frame 1: three steps, a tree, a block, a railing. */
export function StepsBackdrop() {
  const p = usePalette();
  return (
    <>
      <Wash>
        <ellipse cx={160} cy={18} rx={210} ry={52} fill={p.sky} opacity={0.45} />
        <ellipse cx={38} cy={46} rx={46} ry={38} fill={p.green} opacity={0.55} />
        <rect x={-30} y={106} width={380} height={90} fill={p.sand} opacity={0.7} />
        <rect x={-30} y={109} width={380} height={4} fill={p.sandDark} opacity={0.6} />
        <rect x={-30} y={134} width={380} height={4} fill={p.sandDark} opacity={0.6} />
        <rect x={-30} y={159} width={380} height={4} fill={p.sandDark} opacity={0.6} />
      </Wash>
      <Sketch>
        <path d="M-30 110 H350 M-30 135 H350 M-30 160 H350" />
        <path d="M38 82 V110 M30 92 L38 86 M46 95 L38 88" />
        <path d="M205 10 H312 V58 M205 10 V58 M220 22 h14 M244 22 h14 M268 22 h14 M292 22 h12 M220 40 h14 M244 40 h14 M268 40 h14" />
        <path d="M268 62 L330 93 M276 66 V110 M300 78 V122" />
      </Sketch>
    </>
  );
}

/** A roadside stop: sky, road, a little shelter of trees and buildings. `ground` is the kerb line. */
export function RoadBackdrop({ ground = 148, sun }: { ground?: number; sun?: { x: number; y: number } }) {
  const p = usePalette();
  return (
    <>
      <Wash>
        <ellipse cx={160} cy={16} rx={230} ry={56} fill={p.sky} opacity={0.45} />
        {sun && <circle cx={sun.x} cy={sun.y} r={13} fill={p.yellow} opacity={0.75} />}
        <ellipse cx={40} cy={ground - 78} rx={44} ry={36} fill={p.green} opacity={0.5} />
        <rect x={-40} y={ground} width={400} height={22} fill={p.road} opacity={0.5} />
        <rect x={-40} y={ground + 22} width={400} height={30} fill={p.green} opacity={0.4} />
      </Wash>
      <Sketch>
        <path d={`M-40 ${ground} H360 M-40 ${ground + 22} H360 M20 ${ground + 11} h18 M70 ${ground + 11} h18 M120 ${ground + 11} h18 M170 ${ground + 11} h18 M220 ${ground + 11} h18 M270 ${ground + 11} h18`} />
        <path d={`M40 ${ground - 44} V${ground} M30 ${ground - 30} L40 ${ground - 38} M50 ${ground - 28} L40 ${ground - 36}`} />
        <path d={`M70 ${ground - 118} H150 V${ground - 48} M70 ${ground - 118} V${ground - 48} M84 ${ground - 104} h14 M110 ${ground - 104} h14 M84 ${ground - 84} h14 M110 ${ground - 84} h14`} />
      </Sketch>
    </>
  );
}

interface BusProps {
  x: number;
  y: number;
  s?: number;
  /** heads in the windows: a packed bus */
  packed?: boolean;
  /** wheel spin, in degrees */
  spin?: number;
}

/** Bus 1, front on the left. Origin is the top-left corner; body is 100 × 46. */
export function Bus({ x, y, s = 1, packed = false, spin = 0 }: BusProps) {
  const p = usePalette();
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <Wash>
        <ellipse cx={50} cy={24} rx={58} ry={30} fill={p.yellow} opacity={0.55} />
      </Wash>
      <rect x={0} y={0} width={100} height={46} rx={8} style={filled(1.8)} />
      {[10, 38, 66].map((wx) => (
        <g key={wx}>
          <rect x={wx} y={8} width={22} height={16} rx={3} style={line(1.4)} />
          {packed && (
            <>
              {[6, 15].map((hx) => (
                <g key={hx}>
                  <path d={`M${wx + hx - 4.5} 24 Q${wx + hx} 17.5 ${wx + hx + 4.5} 24`} style={line(1)} />
                  <circle cx={wx + hx} cy={15} r={2.6} style={filled(1)} />
                </g>
              ))}
            </>
          )}
        </g>
      ))}
      {[20, 80].map((cx) => (
        <g key={cx} transform={`rotate(${spin} ${cx} 47)`}>
          <circle cx={cx} cy={47} r={8} style={filled(1.8)} />
          <path d={`M${cx - 5} 47 H${cx + 5}`} style={line(1.1)} />
        </g>
      ))}
      <HandText x={7} y={39} size={13} anchor="start">
        1
      </HandText>
    </g>
  );
}

export function StopSign({ x, ground }: { x: number; ground: number }) {
  return (
    <>
      <path d={`M${x} ${ground} V${ground - 64}`} style={line(1.4)} />
      <circle cx={x} cy={ground - 74} r={10} style={filled(1.4)} />
      <HandText x={x} y={ground - 71} size={7}>
        BUS
      </HandText>
    </>
  );
}

interface ClockProps {
  x: number;
  y: number;
  r: number;
  /** minutes past midnight */
  minutes: number;
}

export function Clock({ x, y, r, minutes }: ClockProps) {
  const m = minutes % 60;
  const h = (minutes / 60) % 12;
  const hand = (deg: number, len: number, w: number) => {
    const a = ((deg - 90) * Math.PI) / 180;
    return <path d={`M${x} ${y} L${x + Math.cos(a) * len} ${y + Math.sin(a) * len}`} style={line(w)} />;
  };
  return (
    <g>
      <circle cx={x} cy={y} r={r} style={filled(r * 0.07)} />
      {Array.from({ length: 12 }, (_, i) => {
        const a = (i * 30 * Math.PI) / 180;
        return <path key={i} d={`M${x + Math.sin(a) * r * 0.82} ${y - Math.cos(a) * r * 0.82} L${x + Math.sin(a) * r * 0.92} ${y - Math.cos(a) * r * 0.92}`} style={line(r * 0.05)} />;
      })}
      {hand(h * 30, r * 0.5, r * 0.08)}
      {hand(m * 6, r * 0.75, r * 0.05)}
      <circle cx={x} cy={y} r={r * 0.06} fill={INK} />
    </g>
  );
}

interface PhoneProps {
  /** 0..1: how hard it's buzzing right now */
  buzz?: number;
  screen?: string;
  children?: ReactNode;
}

/**
 * The rider's phone, seen through his eyes (storyboard frame 2). Screen content is drawn in the
 * phone's own coordinates: the screen spans x 118–202, y 20–176.
 */
export function PhonePOV({ buzz = 0, screen = "#FFF4EF", children }: PhoneProps) {
  const jx = buzz ? Math.sin(buzz * 60) * 1.2 : 0;
  return (
    <g transform={`translate(${jx} 0)`}>
      <g transform="rotate(-6 160 95)">
        <rect x={112} y={12} width={96} height={170} rx={14} style={filled(2.6)} />
        <rect x={118} y={20} width={84} height={156} rx={9} fill={screen} stroke={INK} strokeWidth={1.1} />
        <circle cx={160} cy={16} r={1.5} fill={INK} />
        <svg x={118} y={20} width={84} height={156} viewBox="118 20 84 156" overflow="hidden">
          {children}
        </svg>
      </g>
      {buzz > 0 && <path d="M214 30 l8 -4 M216 39 h9 M214 48 l8 4" style={{ ...line(2.2), opacity: buzz }} />}
      <path d="M150 186 Q138 166 150 156 Q170 146 196 152 Q222 160 226 186 Z" style={filled(2.6)} />
      <ellipse cx={118} cy={150} rx={8} ry={15} transform="rotate(-22 118 150)" style={filled(2.6)} />
    </g>
  );
}

export function LockClock({ time, date = "Mon, 26 Oct" }: { time: string; date?: string }) {
  return (
    <>
      <HandText x={160} y={50} size={22}>
        {time}
      </HandText>
      <HandText x={160} y={61} size={7.5} color="#5A6474">
        {date}
      </HandText>
    </>
  );
}

interface NotificationProps {
  y: number;
  title: [string, string];
  body: [string, string];
}

/** An On the way push on the lock screen. */
export function Notification({ y, title, body }: NotificationProps) {
  return (
    <g transform={`translate(0 ${y - 72})`}>
      <rect x={122} y={72} width={76} height={64} rx={7} fill={PAPER} stroke={INK} strokeWidth={1.3} />
      <rect x={127} y={78} width={11} height={11} rx={3} fill={BRAND_CORAL} />
      <circle cx={132.5} cy={81.5} r={1.8} fill="none" stroke={INK} strokeWidth={0.8} />
      <path d="M132.5 83.3 V85.5" stroke={INK} strokeWidth={0.8} />
      <circle cx={132.5} cy={87} r={1.5} fill={INK} />
      <HandText x={142} y={86} size={7} anchor="start" color="#5A6474">
        On the way · now
      </HandText>
      <HandText x={127} y={101} size={9.5} anchor="start">
        {title[0]}
      </HandText>
      <HandText x={127} y={111} size={9.5} anchor="start">
        {title[1]}
      </HandText>
      <HandText x={127} y={123} size={7.5} anchor="start" color="#3A404C">
        {body[0]}
      </HandText>
      <HandText x={127} y={131} size={7.5} anchor="start" color="#3A404C">
        {body[1]}
      </HandText>
    </g>
  );
}

/** Roads on the big map, as polylines (art units). Dots and routes are placed along them. */
export const ROADS: [number, number][][] = [
  [[20, 140], [70, 120], [120, 112], [170, 92], [230, 70], [290, 46]],
  [[30, 40], [80, 60], [130, 70], [170, 92], [210, 130], [260, 160]],
  [[0, 95], [60, 90], [120, 112], [180, 140], [240, 150], [320, 140]],
  [[110, 10], [125, 50], [130, 70], [150, 120], [160, 175]],
  [[220, 10], [230, 40], [230, 70], [250, 110], [300, 130]],
];

export function roadPath(pts: [number, number][]) {
  return pts.map(([x, y], i) => `${i ? "L" : "M"}${x} ${y}`).join(" ");
}

/** A point `t` (0..1) along a polyline. */
export function along(pts: [number, number][], t: number): [number, number] {
  const seg = pts.slice(1).map((b, i) => Math.hypot(b[0] - pts[i]![0], b[1] - pts[i]![1]));
  let left = seg.reduce((a, b) => a + b, 0) * Math.min(Math.max(t, 0), 1);
  for (let i = 0; i < seg.length; i++) {
    if (left <= seg[i]! || i === seg.length - 1) {
      const k = seg[i] ? left / seg[i]! : 0;
      const a = pts[i]!;
      const b = pts[i + 1]!;
      return [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k];
    }
    left -= seg[i]!;
  }
  return pts[pts.length - 1]!;
}

/** Hand-drawn region map: fields, a river, roads. */
export function MapBase() {
  const p = usePalette();
  return (
    <>
      <Wash>
        <rect x={-40} y={-40} width={400} height={260} fill={p.sand} opacity={0.35} />
        <ellipse cx={60} cy={50} rx={60} ry={34} fill={p.green} opacity={0.45} />
        <ellipse cx={250} cy={120} rx={70} ry={40} fill={p.green} opacity={0.4} />
        <ellipse cx={180} cy={30} rx={50} ry={22} fill={p.green} opacity={0.35} />
        <path d="M-10 70 Q80 30 160 60 T330 40" stroke={p.sky} strokeWidth={9} fill="none" opacity={0.6} />
      </Wash>
      <Sketch>
        {ROADS.map((r, i) => (
          <path key={i} d={roadPath(r)} strokeWidth={1.6} />
        ))}
        <path d="M-10 70 Q80 30 160 60 T330 40" strokeDasharray="2 3" />
      </Sketch>
    </>
  );
}

/** People waiting at stops across the map: `n` seeded positions along the roads. */
export function crowd(n: number): [number, number][] {
  return Array.from({ length: n }, (_, i) => {
    const r = ROADS[Math.floor(random(`road${i}`) * ROADS.length)]!;
    const [x, y] = along(r, random(`t${i}`));
    return [x + (random(`dx${i}`) - 0.5) * 6, y + (random(`dy${i}`) - 0.5) * 6];
  });
}

/** The conductor, standing in the aisle with his ticket machine. Origin is his feet. */
export function Conductor({ x, y, punch = 0 }: { x: number; y: number; punch?: number }) {
  const tap = Math.sin(punch * Math.PI);
  return (
    <g transform={`translate(${x} ${y})`}>
      <path d="M0 -24 L-6 0 M0 -24 L6 0 M0 -49.5 V-24" style={line(2.1)} />
      <ellipse cx={-6} cy={1} rx={5.4} ry={2.7} style={filled(1.4)} />
      <ellipse cx={9} cy={1} rx={5.4} ry={2.7} style={filled(1.4)} />
      <circle cx={0} cy={-62} r={12} style={filled(2.1)} />
      <path d="M-11.5 -67 Q-11 -82 0 -82 Q11 -82 11.5 -67 Z" style={filled(1.6, INK, "#3A5A8C")} />
      <path d="M-13 -67 H17" style={line(2)} />
      <circle cx={2} cy={-60} r={1.3} fill={INK} />
      <circle cx={8} cy={-60} r={1.3} fill={INK} />
      <path d="M2 -54 H8" style={line(1.2)} />
      <path d="M0 -44 Q8 -40 12 -35" style={line(2.1)} />
      <path d={`M0 -44 Q10 ${-46 + tap * 3} ${15 - tap * 2} ${-44 + tap * 6}`} style={line(2.1)} />
      <circle cx={15 - tap * 2} cy={-44 + tap * 6} r={3} style={filled(1.4)} />
      <TicketMachine x={10} y={-40} />
      <circle cx={12} cy={-34} r={3} style={filled(1.4)} />
    </g>
  );
}

/** The handheld ticket machine. Origin is its top-left; body is 12 × 16. */
export function TicketMachine({ x, y, s = 1, printed = 0 }: { x: number; y: number; s?: number; printed?: number }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      {printed > 0 && (
        <g>
          <rect x={2.5} y={-printed * 12} width={7} height={printed * 12 + 2} style={filled(0.8)} />
          {printed > 0.5 && <path d={`M4 ${-printed * 12 + 3} h4 M4 ${-printed * 12 + 5.5} h3`} style={line(0.5)} />}
        </g>
      )}
      <rect x={0} y={0} width={12} height={16} rx={2} style={filled(1.4)} />
      <rect x={2} y={2} width={8} height={5} rx={1} style={filled(0.8, INK, "#DDEBD9")} />
      <path d="M3 10 h2 M7 10 h2 M3 13 h2 M7 13 h2" style={line(1)} />
    </g>
  );
}

/** Inside the bus: windows with trees sliding past, seat backs, a grab pole. */
export function BusInterior({ slide = 0 }: { slide?: number }) {
  const p = usePalette();
  const tree = (x: number) => (
    <g key={x}>
      <ellipse cx={x} cy={58} rx={10} ry={9} fill={p.green} opacity={0.6} />
    </g>
  );
  const off = -((slide * 60) % 60);
  return (
    <>
      <Wash>
        <rect x={-40} y={-40} width={400} height={260} fill={p.sand} opacity={0.35} />
        <rect x={20} y={30} width={280} height={50} fill={p.sky} opacity={0.4} />
        {[0, 60, 120, 180, 240, 300, 360].map((t) => tree(t + off + 10))}
      </Wash>
      <Sketch>
        <path d="M20 30 H300 V80 H20 Z M90 30 V80 M160 30 V80 M230 30 V80" />
        <path d="M0 150 H320 M30 150 V110 Q30 100 40 100 H70 Q80 100 80 110 V150 M240 150 V110 Q240 100 250 100 H280 Q290 100 290 110 V150" />
        <path d="M190 20 V170" strokeWidth={1.6} />
      </Sketch>
    </>
  );
}

/** The app's mark: hollow dot, rail, filled dot, on a coral tile. */
export function BrandMark({ x, y, size }: { x: number; y: number; size: number }) {
  const u = size / 10;
  return (
    <g transform={`translate(${x - size / 2} ${y - size / 2})`}>
      <rect width={size} height={size} rx={size * 0.22} fill={BRAND_CORAL} />
      <circle cx={size / 2} cy={u * 2.6} r={u * 1.05} fill="none" stroke="#1C0F08" strokeWidth={u * 0.5} />
      <rect x={size / 2 - u * 0.27} y={u * 3.65} width={u * 0.55} height={u * 2.8} fill="#1C0F08" />
      <circle cx={size / 2} cy={u * 7.5} r={u * 1.3} fill="#1C0F08" />
    </g>
  );
}
