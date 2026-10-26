// Act 3 (it isn't just him) and Act 4 (nothing changes for the conductor).

import { AbsoluteFill } from "remotion";
import { BRAND_CORAL, Draw, ease, filled, HandText, Ink, line, PAPER, Sketch, Stage, usePalette, Wash } from "../art/kit";
import { Rider, TinyPerson } from "../art/people";
import { Bus, BusInterior, Conductor, crowd, MapBase, RoadBackdrop, StepsBackdrop, TicketMachine } from "../art/things";
import type { SceneProps } from "../types";
import { useSec } from "./act1";
import { Layer } from "./common";

const CROWD = crowd(170);
const HIM: [number, number] = [170, 92];

/** Dots waiting across the map. `warm` turns them coral, one by one, left to right. */
export function CrowdDots({ shown, warm = 0 }: { shown: number; warm?: number }) {
  const n = Math.floor(shown * CROWD.length);
  return (
    <>
      {CROWD.slice(0, n).map(([x, y], i) => {
        const lit = warm > 0 && x / 320 < warm * 1.15 - 0.05;
        return (
          <g key={i}>
            <circle cx={x} cy={y} r={2.1} fill={lit ? BRAND_CORAL : "#7D828A"} stroke="#1E1E26" strokeWidth={0.4} />
            {!lit && <path d={`M${x} ${y - 1.3} V${y} H${x + 1}`} stroke="#FFFFFF" strokeWidth={0.45} fill="none" />}
          </g>
        );
      })}
    </>
  );
}

/** 9–11: pull up from his stop to the map; one dot becomes thousands; "When do I leave?" */
export function Thousands({ d }: SceneProps) {
  const { s } = useSec();
  const zoom = ease(s, [0, 2.2], [7, 1]);
  const card = ease(s, [8.6, 9.1], [0, 1]);
  return (
    <>
      <Stage cam={{ x: HIM[0], y: HIM[1], zoom }}>
        <g opacity={1 - card * 0.75}>
          <MapBase />
          <Ink>
            <CrowdDots shown={ease(s, [1.6, 6.4], [0, 1], (x) => x * x)} />
            <circle cx={HIM[0]} cy={HIM[1]} r={2.6} fill={BRAND_CORAL} stroke="#1E1E26" strokeWidth={0.6} opacity={zoom > 1.6 ? 1 : 0.9} />
            <g opacity={ease(s, [0, 1.2], [1, 0])}>
              <TinyPerson x={HIM[0]} y={HIM[1] - 2} s={0.5} />
            </g>
          </Ink>
        </g>
        {card > 0 && (
          <Ink>
            <HandText x={160} y={100} size={30} write={ease(s, [9.1, 10.4], [0, 1], (x) => x)}>
              When do I leave?
            </HandText>
          </Ink>
        )}
      </Stage>
    </>
  );
}

/** 12–13: the conductor's routine, unchanged; close on the machine. */
export function ConductorScene({ d }: SceneProps) {
  const { f, s } = useSec();
  const punch = (s % 1.3) / 1.3;
  const close = ease(s, [4.0, 5.0], [0, 1]);
  const printed = Math.min(1, ((s % 1.3) / 1.3) * 2.2);
  const cam = { x: 140 + close * 16, y: 110 + close * 16, zoom: 1.15 + close * 2.05 };
  return (
    <>
      <Stage cam={cam}>
        <BusInterior slide={f / 30} />
        <Ink>
          <Conductor x={140} y={162} punch={punch} />
          <g opacity={close}>
            <TicketMachine x={150} y={-40 + 162} printed={printed} />
          </g>
        </Ink>
        <rect x={118} y={143} width={76} height={11} rx={2} fill={PAPER} opacity={ease(s, [4.6, 5.0], [0, 0.95])} />
        <HandText x={156} y={151} size={6} opacity={ease(s, [4.6, 5.0], [0, 1])}>
          same machine, same tickets
        </HandText>
      </Stage>
    </>
  );
}

/** The ticket's flight, as a path in world units: from the bus window, over trees, into his phone. */
const FLIGHT = { from: [96, 112], c1: [300, -30], c2: [560, -10], to: [801, 114] } as const;
function flightAt(t: number): [number, number] {
  const u = 1 - t;
  const pts = [FLIGHT.from, FLIGHT.c1, FLIGHT.c2, FLIGHT.to];
  const x = u * u * u * pts[0][0] + 3 * u * u * t * pts[1][0] + 3 * u * t * t * pts[2][0] + t * t * t * pts[3][0];
  const y = u * u * u * pts[0][1] + 3 * u * u * t * pts[1][1] + 3 * u * t * t * pts[2][1] + t * t * t * pts[3][1];
  return [x, y];
}

function Trees() {
  const p = usePalette();
  return (
    <>
      <Wash>
        <ellipse cx={480} cy={40} rx={240} ry={60} fill={p.sky} opacity={0.4} />
        {[360, 420, 500, 560].map((x, i) => (
          <ellipse key={x} cx={x} cy={110 - (i % 2) * 8} rx={24} ry={22} fill={p.green} opacity={0.5} />
        ))}
        <rect x={300} y={148} width={340} height={40} fill={p.green} opacity={0.35} />
      </Wash>
      <Sketch>
        {[360, 420, 500, 560].map((x, i) => (
          <path key={x} d={`M${x} ${148} V${118 - (i % 2) * 8} M${x - 18} ${110 - (i % 2) * 8} q8 -24 18 -22 q14 -2 18 22`} />
        ))}
        <path d="M300 148 H640" />
      </Sketch>
    </>
  );
}

/** 14: one continuous shot. A tap of the ticket machine flies out of the bus and lands in his phone. */
export function TicketFlight({ d }: SceneProps) {
  const { f, s } = useSec();
  const t = ease(s, [0.6, 5.0], [0, 1], (x) => (x < 0.5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2));
  const [dx, dy] = flightAt(t);
  const landed = s > 5.0;
  const camX = Math.min(Math.max(dx, 150), 805);
  const zoom = 1.5 - Math.sin(t * Math.PI) * 0.35 + (landed ? ease(s, [5.0, 6.2], [0, 0.4]) : 0);
  const trail = Array.from({ length: 14 }, (_, i) => flightAt(Math.max(0, t - i * 0.012)));
  return (
    <>
      <Stage cam={{ x: camX, y: Math.min(Math.max(dy, 70), 110), zoom }}>
        <RoadBackdrop ground={148} />
        <Trees />
        <g transform="translate(640 0)">
          <StepsBackdrop />
        </g>
        <Ink>
          <Bus x={40} y={98} spin={-f * 8} />
          <g transform="translate(640 0)">
            <Rider x={150} y={132} pose="sit" hands="phone" face={landed ? "happy" : "smile"} />
          </g>
          {trail.map(([x, y], i) => (
            <circle key={i} cx={x} cy={y} r={2.2 - i * 0.13} fill={BRAND_CORAL} opacity={(1 - i / 14) * (landed ? 0 : 0.6)} />
          ))}
          {!landed && (
            <>
              <circle cx={dx} cy={dy} r={5} fill={BRAND_CORAL} filter="url(#glow)" opacity={0.8} />
              <circle cx={dx} cy={dy} r={2.6} fill={BRAND_CORAL} stroke="#1E1E26" strokeWidth={0.5} />
            </>
          )}
          {landed && <path d="M812 103 l5 -3 M813 109 h6 M812 115 l5 3" style={{ ...line(1.4), opacity: Math.abs(Math.sin(f / 3)) }} />}
          {s < 1 && <HandText x={96} y={92} size={9} opacity={ease(s, [0, 0.3], [0, 1]) * ease(s, [0.8, 1], [1, 0])}>tap</HandText>}
        </Ink>
      </Stage>
    </>
  );
}

/** 15: the timetable learns. A dashed timetable line; the learned line bends toward reality, day by day. */
export function Learns({ d }: SceneProps) {
  const { s } = useSec();
  const days = ["Mon", "Tue", "Wed", "Thu", "Fri"];
  const xs = days.map((_, i) => 70 + i * 50);
  // later arrivals sit higher; the timetable is the low dashed line
  const TT = 128;
  const real = [72, 78, 69, 75, 73];
  const learnedY = (i: number) => {
    const k = ease(s, [0.4 + i * 0.5, 0.9 + i * 0.5], [0, 1]);
    const target = real.slice(0, i + 1).reduce((a, b) => a + b, 0) / (i + 1);
    return TT + (target - TT) * k;
  };
  const path = xs.map((x, i) => `${i ? "L" : "M"}${x} ${learnedY(i)}`).join(" ");
  return (
    <>
      <Stage cam={{ x: 165, y: 96, zoom: 1.05 }}>
        <Sketch>
          <path d="M50 30 V150 H290" strokeWidth={1.4} />
        </Sketch>
        <Ink>
          {days.map((dname, i) => (
            <HandText key={dname} x={xs[i]!} y={163} size={10} color="#5A6474">
              {dname}
            </HandText>
          ))}
          <HandText x={44} y={24} size={9} anchor="start" color="#5A6474">
            bus 1 reaches Kavi Nagar · later ↑
          </HandText>
          <Draw d={`M60 ${TT} H290`} dash="4 4" w={1.6} color="#7D828A" />
          <HandText x={292} y={TT + 14} size={10} anchor="end" color="#7D828A">
            timetable
          </HandText>
          {xs.map((x, i) => (
            <circle key={x} cx={x} cy={real[i]!} r={2.4} fill="#1E1E26" opacity={ease(s, [0.3 + i * 0.5, 0.5 + i * 0.5], [0, 1])} />
          ))}
          <path d={path} style={line(2.4, BRAND_CORAL)} />
          <HandText x={292} y={60} size={10} anchor="end" color={BRAND_CORAL} opacity={ease(s, [2.4, 2.9], [0, 1])}>
            learned
          </HandText>
        </Ink>
      </Stage>
    </>
  );
}
