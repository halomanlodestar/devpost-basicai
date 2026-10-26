// Framings that recur across the film: the steps wide shot, the chai close-up, the clock card.

import type { ReactNode } from "react";
import { AbsoluteFill } from "remotion";
import { filled, HandText, Ink, line, usePalette, Wash } from "../art/kit";
import { FaceMarks, FriendChai, FriendLaugh } from "../art/people";
import { StepsBackdrop } from "../art/things";

/** The college steps with both friends. Put the rider in as `children`. */
export function StepsScene({ f, offer = false, children }: { f: number; offer?: boolean; children?: ReactNode }) {
  return (
    <>
      <StepsBackdrop />
      <Ink>
        <FriendLaugh x={92} y={107} bob={Math.abs(Math.sin(f / 5)) * 1.5} />
        <FriendChai x={222} y={133} offer={offer} steam={(f / 12) % 4} />
        {children}
      </Ink>
    </>
  );
}

/** Storyboard frame 3: the big smiling face with a chai and a thought bubble. */
export function ChaiCloseUp({ f, thought, write = 1 }: { f: number; thought: string; write?: number }) {
  const p = usePalette();
  const steam = (f / 10) % 6;
  return (
    <>
      <Wash>
        <ellipse cx={160} cy={80} rx={190} ry={110} fill={p.sand} opacity={0.5} />
        <ellipse cx={160} cy={182} rx={74} ry={34} fill={p.coral} opacity={0.6} />
        <circle cx={138} cy={96} r={7} fill={p.coral} opacity={0.45} />
        <circle cx={182} cy={96} r={7} fill={p.coral} opacity={0.45} />
        <ellipse cx={219} cy={134} rx={16} ry={18} fill={p.wood} opacity={0.4} />
      </Wash>
      <Ink>
        <circle cx={160} cy={82} r={46} style={filled(2.6)} />
        <path d="M150 37 L148 29 M160 36 V27 M170 37 L172 29" style={line(2.2)} />
        <FaceMarks x={160} y={84} r={46} face="happy" />
        <path d="M160 128 V138 M106 186 Q116 146 160 139 Q204 146 214 186" style={line(2.6)} />
        <path d="M206 120 H232 L229 148 H209 Z" style={filled(2.2)} />
        <path d="M232 126 q8 2 0 12" style={line(1.4)} />
        <circle cx={207} cy={150} r={7} style={filled(2.2)} />
        <path d={`M214 ${112 - steam * 0.6} q-4 -7 2 -13 q5 -6 1 -13 M224 ${112 - steam * 0.6} q-4 -7 2 -13`} style={{ ...line(1.4), opacity: 1 - steam * 0.1 }} />
        <g opacity={write > 0 ? 1 : 0}>
          <ellipse cx={62} cy={38} rx={52} ry={20} style={filled(1.4)} />
          <circle cx={100} cy={62} r={3.5} style={filled(1.4)} />
          <circle cx={108} cy={72} r={2.2} style={filled(1.4)} />
          <HandText x={62} y={42} size={12} write={write}>
            {thought}
          </HandText>
        </g>
      </Ink>
    </>
  );
}

/** A small card with the time, pinned to the top-right corner of the frame. */
export function TimeCard({ time, opacity = 1 }: { time: string; opacity?: number }) {
  return (
    <AbsoluteFill style={{ opacity }}>
      <svg viewBox="0 0 320 180" width="100%" height="100%">
        <rect x={252} y={10} width={58} height={26} rx={6} style={filled(1.4)} />
        <HandText x={281} y={29} size={17}>
          {time}
        </HandText>
      </svg>
    </AbsoluteFill>
  );
}

/** Stacks layers with a cross-fade: each layer is visible while its opacity is above zero. */
export function Layer({ opacity, children }: { opacity: number; children: ReactNode }) {
  if (opacity <= 0) return null;
  return <AbsoluteFill style={{ opacity }}>{children}</AbsoluteFill>;
}

export const fmt = (minutes: number) => {
  const h = Math.floor(minutes / 60) % 12 || 12;
  const m = Math.floor(minutes % 60);
  return `${h}:${String(m).padStart(2, "0")}`;
};
