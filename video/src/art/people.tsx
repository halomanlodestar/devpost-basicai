// Doodle stick figures. The rider is the "refined subject": bolder ink, hair tufts, a backpack
// and a coral hoodie wash. Friends are lighter and plainer, so the eye stays on him.

import { Fragment } from "react";
import type { Face, Hands, Pose } from "../types";
import { filled, INK, line, usePalette, Wash } from "./kit";

interface FaceMarksProps {
  x: number;
  y: number;
  r: number;
  face: Face;
  look?: number;
}

export function FaceMarks({ x, y, r, face, look = 0 }: FaceMarksProps) {
  const cx = x + look;
  const ex = r * 0.32;
  const ey = y - r * 0.02;
  const mouthY = y + r * 0.42;
  const eyes =
    face === "happy" ? (
      <path d={`M${cx - ex - r * 0.18} ${ey} q${r * 0.18} ${-r * 0.22} ${r * 0.36} 0 M${cx + ex - r * 0.18} ${ey} q${r * 0.18} ${-r * 0.22} ${r * 0.36} 0`} style={line(r * 0.1)} />
    ) : (
      <>
        <circle cx={cx - ex} cy={ey} r={r * 0.11} fill={INK} />
        <circle cx={cx + ex} cy={ey} r={r * 0.11} fill={INK} />
      </>
    );
  const w = r * 0.32;
  const mouth = {
    smile: <path d={`M${cx - w} ${mouthY} Q${cx} ${mouthY + r * 0.24} ${cx + w} ${mouthY}`} style={line(r * 0.09)} />,
    happy: <path d={`M${cx - w * 1.2} ${mouthY - r * 0.04} Q${cx} ${mouthY + r * 0.34} ${cx + w * 1.2} ${mouthY - r * 0.04}`} style={line(r * 0.1)} />,
    flat: <path d={`M${cx - w * 0.8} ${mouthY + r * 0.06} H${cx + w * 0.8}`} style={line(r * 0.09)} />,
    sad: <path d={`M${cx - w} ${mouthY + r * 0.14} Q${cx} ${mouthY - r * 0.06} ${cx + w} ${mouthY + r * 0.14}`} style={line(r * 0.09)} />,
    laugh: <path d={`M${cx - w * 1.1} ${mouthY - r * 0.06} Q${cx} ${mouthY + r * 0.5} ${cx + w * 1.1} ${mouthY - r * 0.06} Z`} fill={INK} />,
    wow: <circle cx={cx} cy={mouthY + r * 0.06} r={r * 0.13} fill={INK} />,
  }[face];
  return (
    <>
      {eyes}
      {mouth}
    </>
  );
}

const mitten = (x: number, y: number, w = 1.4) => <circle cx={x} cy={y} r={3} style={filled(w)} />;
const foot = (x: number, y: number, w = 1.4) => <ellipse cx={x} cy={y} rx={5.4} ry={2.7} style={filled(w)} />;

interface RiderProps {
  x: number;
  y: number;
  s?: number;
  pose: Pose;
  face?: Face;
  hands?: Hands;
  /** walk/run cycle angle in radians */
  phase?: number;
  /** the hero gets bold ink, tufts, backpack and the coral wash */
  hero?: boolean;
  look?: number;
  flip?: boolean;
}

/**
 * Origin: for "sit" it's the hip on the seat (feet land ~26 below); otherwise it's the ground
 * between the feet. Faces right.
 */
export function Rider({ x, y, s = 1, pose, face = "smile", hands = "swing", phase = 0, hero = true, look = 0, flip = false }: RiderProps) {
  const p = usePalette();
  const W = hero ? 2.6 : 2.1;
  const t = `translate(${x} ${y}) scale(${flip ? -s : s} ${s})`;

  if (pose === "sit") {
    const arms =
      hands === "phone" ? (
        <>
          <path d="M0 -24 Q5 -13 9 -11 M0 -23 Q-1 -11 6 -8" style={line(W)} />
          <rect x={5} y={-21} width={12} height={8} rx={1.5} transform="rotate(-20 11 -17)" style={filled(1.4)} />
          {mitten(10, -10.5)}
          {mitten(7, -7.5)}
        </>
      ) : hands === "chai" ? (
        <>
          <path d="M0 -22 Q9 -15 12 -22 M0 -21 Q8 -10 14 -4" style={line(W)} />
          <path d="M6.5 -34 H16 L15 -25 H7.5 Z" style={filled(1.4)} />
          {mitten(12, -23)}
          {mitten(15, -3)}
        </>
      ) : (
        <>
          <path d="M0 -23 Q7 -12 14 -4 M0 -22 Q4 -10 10 -3" style={line(W)} />
          {mitten(15, -3)}
          {mitten(11, -2)}
        </>
      );
    return (
      <g transform={t}>
        {hero && (
          <Wash>
            <ellipse cx={0} cy={-14} rx={8.5} ry={15} fill={p.coral} opacity={0.65} />
          </Wash>
        )}
        {hero && <rect x={-11} y={-27} width={8} height={18} rx={3} style={filled(1.4)} />}
        <path d="M0 -29.5 V0 M0 0 L17 -1 L20 26 M0 0 L14 -4 L11 25" style={line(W)} />
        {foot(24, 27)}
        {foot(15, 26)}
        {arms}
        <circle cx={0} cy={-42} r={12.5} style={filled(W)} />
        {hero && <path d="M-4 -54 L-5 -58 M0 -54.5 V-59 M4 -54 L5 -58" style={line(1.4)} />}
        <FaceMarks x={0} y={-41} r={12.5} face={face} look={look} />
      </g>
    );
  }

  // standing, walking and running share a skeleton; the cycle moves feet, arms and the head
  const moving = pose === "walk" || pose === "run";
  const run = pose === "run";
  const amp = !moving ? 0 : run ? 14 : 8;
  const sw = Math.sin(phase);
  const bob = moving ? Math.abs(Math.cos(phase)) * (run ? 3 : 1.2) : 0;
  const hipY = -24 - bob;
  const lift = run ? 6 : 1.5;
  const fa = { x: sw * amp, y: moving ? -Math.max(0, Math.cos(phase)) * lift : 0 };
  const fb = { x: -sw * amp, y: moving ? -Math.max(0, -Math.cos(phase)) * lift : 0 };
  const standA = pose === "stand" ? { x: -6, y: 0 } : fa;
  const standB = pose === "stand" ? { x: 6, y: 0 } : fb;
  const knee = run ? 6 : moving ? 3 : 0;
  const leg = (f: { x: number; y: number }) => `M0 ${hipY} Q${f.x * 0.5 + knee} ${hipY + 13} ${f.x} ${f.y}`;
  const lean = run ? 10 : moving ? 3 : 0;
  const neck = hipY - 25.5;
  const headY = neck - 12.5;

  const armSwing = (sign: number) => {
    const hx = moving ? sign * sw * amp * 0.7 : sign * 9;
    return { d: `M0 ${neck + 5} Q${hx * 0.5} ${neck + 11} ${hx} ${neck + 19}`, x: hx, y: neck + 20 };
  };
  const a1 = armSwing(-1);
  const a2 = armSwing(1);
  const upper =
    hands === "phone" ? (
      <>
        <path d={`${a1.d} M0 ${neck + 5} Q10 ${neck + 7} 11 ${neck - 3}`} style={line(W)} />
        <rect x={7} y={neck - 14} width={8} height={11} rx={1.5} style={filled(1.4)} />
        {mitten(a1.x, a1.y)}
        {mitten(11, neck - 4)}
      </>
    ) : hands === "up" ? (
      <>
        <path d={`M0 ${neck + 5} Q-8 ${neck - 2} -11 ${neck - 12} M0 ${neck + 5} Q8 ${neck - 2} 11 ${neck - 12}`} style={line(W)} />
        {mitten(-11, neck - 13)}
        {mitten(11, neck - 13)}
      </>
    ) : (
      <>
        <path d={`${a1.d} ${a2.d}`} style={line(W)} />
        {mitten(a1.x, a1.y)}
        {mitten(a2.x, a2.y)}
      </>
    );

  return (
    <g transform={t}>
      <path d={`${leg(standA)} ${leg(standB)}`} style={line(W)} />
      {foot(standA.x + 3, standA.y + 1)}
      {foot(standB.x + 3, standB.y + 1)}
      <g transform={`rotate(${lean} 0 ${hipY})`}>
        {hero && (
          <Wash>
            <ellipse cx={0} cy={hipY - 13} rx={8} ry={14} fill={p.coral} opacity={0.65} />
          </Wash>
        )}
        {hero && <rect x={-10} y={neck + 2} width={7} height={17} rx={3} style={filled(1.4)} />}
        <path d={`M0 ${neck} V${hipY}`} style={line(W)} />
        {upper}
        <circle cx={0} cy={headY} r={12.5} style={filled(W)} />
        {hero && <path d={`M-4 ${headY - 12} l-1 -4 M0 ${headY - 12.5} v-4.5 M4 ${headY - 12} l1 -4`} style={line(1.4)} />}
        <FaceMarks x={0} y={headY + 1} r={12.5} face={face} look={moving ? 2 + look : look} />
      </g>
    </g>
  );
}

interface FriendProps {
  x: number;
  y: number;
  s?: number;
  /** a small vertical bounce, for laughing */
  bob?: number;
  /** chai friend: holds the cup out ("want one?") instead of sipping */
  offer?: boolean;
  /** steam drift phase */
  steam?: number;
  face?: Face;
}

/** Sitting friend, waving and laughing. Origin is the hip. */
export function FriendLaugh({ x, y, s = 1, bob = 0, face = "laugh" }: FriendProps) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <path d="M0 0 L15 -2 L18 25 M0 0 L11 -4 L8 24 M0 -32 V0 M0 -24 Q9 -30 14 -39 M0 -22 Q6 -11 13 -4" style={line(2.1)} />
      {foot(22, 26)}
      {foot(12, 25)}
      {mitten(15, -41)}
      {mitten(14, -2)}
      <g transform={`translate(0 ${-bob})`}>
        <circle cx={0} cy={-43} r={11} style={filled(2.1)} />
        <FaceMarks x={0} y={-43} r={11} face={face} />
      </g>
    </g>
  );
}

/** Friend leaning back on one arm with a chai. Origin is the hip. */
export function FriendChai({ x, y, s = 1, offer = false, steam = 0, face = "smile" }: FriendProps) {
  const hand = offer ? { x: -24, y: -33 } : { x: -23, y: -15 };
  const sx = hand.x - 9;
  const sy = hand.y - 10;
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <path
        d={`M0 0 L-10 -29 M-9 -23 Q4 -13 10 -1 M0 0 Q16 7 24 24 M0 0 Q12 3 18 23 M-9 -23 Q-17 ${(hand.y - 23) / 2 - 4} ${hand.x + 1} ${hand.y}`}
        style={line(2.1)}
      />
      {foot(29, 25.5)}
      {foot(23, 24.5)}
      {mitten(11, 0)}
      <path d={`M${sx - 4} ${sy} H${sx + 4} L${sx + 3} ${sy + 8} H${sx - 3} Z`} style={filled(1.4)} />
      {mitten(hand.x, hand.y)}
      <path d={`M${sx - 2} ${sy - 3 - steam} q-2 -4 1 -7 M${sx + 2} ${sy - 3 - steam} q-2 -4 1 -7`} style={{ ...line(1.2), opacity: 0.8 - steam * 0.1 }} />
      <circle cx={-14} cy={-40} r={11} style={filled(2.1)} />
      <FaceMarks x={-14} y={-40} r={11} face={face} look={-2} />
    </g>
  );
}

/** Many little background people at once, for crowds on a map or at a stop. */
export function TinyPerson({ x, y, s = 1, color = INK }: { x: number; y: number; s?: number; color?: string }) {
  return (
    <Fragment>
      <g transform={`translate(${x} ${y}) scale(${s})`}>
        <circle cx={0} cy={-9} r={3} style={filled(1, color)} />
        <path d="M0 -6 V-2 M0 -2 L-2 2 M0 -2 L2 2 M0 -5 L-2.4 -2.6 M0 -5 L2.4 -2.6" style={line(1, color)} />
      </g>
    </Fragment>
  );
}
