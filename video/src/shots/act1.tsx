// Act 1 (who he is) and Act 2 (the bad afternoon). Times are seconds from the scene's start.

import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { Draw, ease, filled, HandText, Ink, lerpCam, line, PAPER, Sketch, Stage, usePalette, Wash } from "../art/kit";
import { Rider } from "../art/people";
import { along, Bus, Clock, LockClock, MapBase, PhonePOV, RoadBackdrop, ROADS, StopSign } from "../art/things";
import type { SceneProps } from "../types";
import { fmt, Layer, StepsScene, TimeCard } from "./common";

const useSec = () => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  return { f, s: f / fps };
};

/** Fields sliding past a bus window. */
function WindowView({ slide }: { slide: number }) {
  const p = usePalette();
  const off = -((slide * 40) % 80);
  return (
    <>
      <Wash>
        <rect x={-40} y={-40} width={400} height={260} fill={p.sand} opacity={0.4} />
        <rect x={30} y={28} width={150} height={86} fill={p.sky} opacity={0.55} />
        <rect x={30} y={84} width={150} height={30} fill={p.green} opacity={0.55} />
      </Wash>
      <svg x={30} y={28} width={150} height={86} viewBox="30 28 150 86" overflow="hidden">
        <Sketch>
          <path d={`M${-50 + off} 86 Q${0 + off} 70 ${50 + off} 84 T${150 + off} 82 T${250 + off} 84 T${350 + off} 82`} />
          {[0, 80, 160, 240].map((x) => (
            <path key={x} d={`M${x + off + 20} 100 V76 M${x + off + 14} 78 h12`} />
          ))}
          {[40, 120, 200].map((x) => (
            <ellipse key={x} cx={x + off * 1.6 + 60} cy={78} rx={9} ry={8} />
          ))}
        </Sketch>
      </svg>
      <Sketch>
        <path d="M30 28 H180 V114 H30 Z M105 28 V114" strokeWidth={1.6} />
        <path d="M0 150 H320 M190 150 V100 Q190 88 204 88 H262 Q276 88 276 100 V150" />
      </Sketch>
    </>
  );
}

function Clouds({ rise }: { rise: number }) {
  const p = usePalette();
  const y = (base: number) => base + rise * 140;
  return (
    <>
      <Wash>
        <rect x={-40} y={-40} width={400} height={260} fill={p.sky} opacity={0.5} />
        {[
          [60, 40], [200, 20], [280, 80], [120, 110], [40, 160], [240, 170], [160, -10],
        ].map(([cx, cy], i) => (
          <ellipse key={i} cx={cx} cy={y(cy!)} rx={46} ry={18} fill={PAPER} opacity={0.95} />
        ))}
      </Wash>
      <Sketch>
        {[
          [60, 40], [200, 20], [280, 80], [120, 110], [40, 160], [240, 170],
        ].map(([cx, cy], i) => (
          <path key={i} d={`M${cx! - 36} ${y(cy!) + 6} q6 -14 18 -8 q8 -14 22 -6 q12 -6 16 8 q10 2 6 6 Z`} />
        ))}
      </Sketch>
    </>
  );
}

const HOME: [number, number] = [52, 138];
const COLLEGE: [number, number] = [266, 52];
const ROUTE: [number, number][] = [HOME, [100, 122], [150, 100], [200, 82], [240, 64], COLLEGE];

function RouteMap({ draw, bus, label }: { draw: number; bus: number; label: number }) {
  const [bx, by] = along(ROUTE, bus);
  return (
    <>
      <MapBase />
      <Ink>
        <Draw d={ROUTE.map(([x, y], i) => `${i ? "L" : "M"}${x} ${y}`).join(" ")} p={draw} w={2} />
        <circle cx={HOME[0]} cy={HOME[1]} r={5} style={filled(2)} />
        <circle cx={COLLEGE[0]} cy={COLLEGE[1]} r={5} style={{ ...filled(2), fill: "#1E1E26" }} />
        <HandText x={HOME[0]} y={HOME[1] + 18} size={11}>
          home
        </HandText>
        <HandText x={COLLEGE[0]} y={COLLEGE[1] - 11} size={11}>
          college
        </HandText>
        <HandText x={170} y={128} size={12} write={label}>
          ~40 km each way
        </HandText>
        {bus > 0 && (
          <g transform={`translate(${bx - 9} ${by - 9})`}>
            <rect width={18} height={9} rx={2.5} style={filled(1.2)} />
            <circle cx={4.5} cy={9.5} r={2} style={filled(1)} />
            <circle cx={13.5} cy={9.5} r={2} style={filled(1)} />
          </g>
        )}
      </Ink>
    </>
  );
}

/** 1–3: a student at a bus window, up through the clouds, down onto a map of his 80 km. */
export function Intro({ d }: SceneProps) {
  const { f, s } = useSec();
  const push = ease(s, [3.0, 4.6], [0, 1]);
  const cam = lerpCam({ x: 165, y: 96, zoom: 1.25 + s * 0.02 }, { x: 105, y: 70, zoom: 5 }, push);
  const toMap = ease(s, [4.9, 5.9], [0, 1]);
  const mapCam = lerpCam({ x: 160, y: 95, zoom: 1.6 }, { x: 160, y: 92, zoom: 1 }, ease(s, [5.2, 7], [0, 1]));
  return (
    <>
      <Layer opacity={1 - ease(s, [4.1, 4.7], [0, 1])}>
        <Stage cam={cam}>
          <WindowView slide={f / 30} />
          <Ink>
            <Rider x={222} y={146} s={1.15} pose="sit" hands="lap" face="flat" look={-3} flip />
          </Ink>
        </Stage>
      </Layer>
      <Layer opacity={ease(s, [4.1, 4.7], [0, 1]) * (1 - toMap)}>
        <Stage>
          <Clouds rise={ease(s, [4.1, 6.0], [0, 1])} />
        </Stage>
      </Layer>
      <Layer opacity={toMap}>
        <Stage cam={mapCam}>
          <RouteMap draw={ease(s, [5.6, 7.4], [0, 1])} label={ease(s, [6.6, 7.5], [0, 1], (x) => x)} bus={ease(s, [7.6, d / 30], [0, 1])} />
        </Stage>
      </Layer>
    </>
  );
}

/** 4–5: 2:15 on the classroom clock, the timetable says 2:30; he runs past his friends. */
export function Sprint({ d }: SceneProps) {
  const { f, s } = useSec();
  const run = ease(s, [2.5, d / 30], [0, 1], (x) => x);
  const minute = 14 * 60 + 15 + Math.min(s, 2.6) * 0.4;
  return (
    <>
      <Layer opacity={s < 2.6 ? 1 : 0}>
        <Stage cam={{ x: 160, y: 90, zoom: 1 + s * 0.04 }}>
          <Wash>
            <rect x={-40} y={-40} width={400} height={260} fill={usePalette().sand} opacity={0.5} />
          </Wash>
          <Sketch>
            <path d="M0 150 H320" />
          </Sketch>
          <Ink>
            <Clock x={120} y={84} r={46} minutes={minute} />
            <g transform="rotate(4 230 84)">
              <rect x={190} y={52} width={80} height={60} rx={3} style={filled(1.4)} />
              <path d="M214 48 h32 v8 h-32 Z" style={{ ...filled(1), fill: "#E9E2C8" }} />
              <HandText x={230} y={76} size={11}>
                bus 1
              </HandText>
              <HandText x={230} y={98} size={18}>
                2:30
              </HandText>
            </g>
          </Ink>
        </Stage>
      </Layer>
      <Layer opacity={s >= 2.6 ? 1 : 0}>
        <Stage cam={{ x: 165, y: 104, zoom: 1.08 }}>
          <StepsScene f={f} offer={s > 5.6}>
            <Rider x={-30 + run * 400} y={176} pose="run" phase={f * 0.55} face={s > 5.2 ? "flat" : "wow"} look={s > 5.2 ? -4 : 0} />
          </StepsScene>
          <HandText x={92} y={44} size={11} opacity={ease(s, [4.6, 4.9], [0, 1]) * (1 - ease(s, [5.6, 5.9], [0, 1]))}>
            coming?
          </HandText>
          <HandText x={190} y={88} size={11} opacity={ease(s, [5.8, 6.1], [0, 1])}>
            chai?
          </HandText>
        </Stage>
      </Layer>
    </>
  );
}

/** 6: his phone has nothing live, just a photo of a printed timetable. */
export function TimetablePOV({ d }: SceneProps) {
  const { s } = useSec();
  const swipe = ease(s, [2.9, 3.4], [0, 1]);
  const doubt = ease(s, [5.0, 6.2], [0, 1]);
  const p = usePalette();
  return (
    <>
      <Stage cam={{ x: 160, y: 95, zoom: 1.02 + (s / (d / 30)) * 0.05 }}>
        <Wash>
          <rect x={-40} y={-40} width={400} height={260} fill={p.sand} opacity={0.55} />
          <ellipse cx={40} cy={40} rx={60} ry={40} fill={p.sky} opacity={0.5} />
          <ellipse cx={290} cy={150} rx={50} ry={40} fill={p.green} opacity={0.45} />
        </Wash>
        <Sketch>
          <path d="M0 150 Q30 138 52 166 L60 180 M320 132 Q292 128 282 160 L278 180 M0 112 H90 M230 104 H320" />
        </Sketch>
        <Ink>
          <PhonePOV screen="#F4F5F6">
            <g transform={`translate(${-swipe * 84} 0)`}>
              <rect x={118} y={20} width={84} height={14} fill="#E3E6EA" />
              <HandText x={124} y={30} size={8} anchor="start">
                Maps
              </HandText>
              <Sketch>
                <path d="M120 60 Q150 50 200 70 M130 40 Q150 90 140 170 M118 120 H202 M170 34 Q190 100 200 170" />
              </Sketch>
              <rect x={126} y={86} width={68} height={30} rx={5} style={filled(1.1)} />
              <HandText x={160} y={99} size={8}>
                No live info
              </HandText>
              <HandText x={160} y={109} size={8}>
                for this bus
              </HandText>
              <g transform="translate(84 0)">
                <rect x={118} y={20} width={84} height={156} fill="#2E2F33" />
                <g transform={`rotate(${-4 + doubt * 3} 160 98)`}>
                  <rect x={124} y={34} width={72} height={124} fill="#F7F3E8" />
                  <HandText x={160} y={48} size={8}>
                    BUS 1 · TIMETABLE
                  </HandText>
                  {["12:30", "13:30", "14:30", "15:30", "16:30", "17:30"].map((t, i) => (
                    <g key={t}>
                      <HandText x={134} y={66 + i * 14} size={8.5} anchor="start">
                        {`ABES  ${t}`}
                      </HandText>
                      <path d={`M130 ${69 + i * 14} H190`} style={line(0.4, "#9A968C")} />
                    </g>
                  ))}
                  <ellipse cx={174} cy={91} rx={14} ry={7} style={{ ...line(1.2, "#C93A2B"), opacity: swipe }} />
                </g>
                {doubt > 0 && (
                  <>
                    <HandText x={128} y={70} size={14} opacity={doubt} color="#C93A2B">
                      ?
                    </HandText>
                    <HandText x={194} y={120} size={16} opacity={ease(s, [5.4, 5.8], [0, 1])} color="#C93A2B">
                      ?
                    </HandText>
                    <HandText x={136} y={150} size={12} opacity={ease(s, [5.8, 6.2], [0, 1])} color="#C93A2B">
                      ?
                    </HandText>
                  </>
                )}
              </g>
            </g>
          </PhonePOV>
        </Ink>
      </Stage>
    </>
  );
}

/** 7: the timelapse. The sun crosses, his shadow swings, the clock runs 2:30 → 2:57. */
export function Timelapse({ d }: SceneProps) {
  const { s } = useSec();
  const t = s / (d / 30);
  const sunX = 40 + t * 240;
  const sunY = 40 - Math.sin(t * Math.PI) * 18;
  const pose = t < 0.34 ? "stand" : "stand";
  const hands = t >= 0.34 && t < 0.67 ? "phone" : "swing";
  const face = t < 0.34 ? "flat" : "sad";
  const shadow = (130 - sunX) * 0.25;
  return (
    <>
      <Stage cam={{ x: 150, y: 100, zoom: 1.15 }}>
        <RoadBackdrop sun={{ x: sunX, y: sunY }} />
        <Ink>
          <StopSign x={95} ground={148} />
          <ellipse cx={130 + shadow} cy={149} rx={8 + Math.abs(shadow) * 0.6} ry={2.2} fill="#9EA3AA" opacity={0.5} />
          <Rider x={130} y={148} pose={pose} hands={hands} face={face} look={t > 0.67 ? 0 : 3} />
        </Ink>
      </Stage>
      <TimeCard time={fmt(14 * 60 + 30 + t * 27)} />
    </>
  );
}

/** 8: 2:59, the bus finally pulls in, packed. */
export function BusLate({ d }: SceneProps) {
  const { f, s } = useSec();
  const bx = ease(s, [0, 2.2], [330, 150], (x) => 1 - Math.pow(1 - x, 3));
  return (
    <>
      <Stage cam={{ x: 170, y: 104, zoom: 1.12 }}>
        <RoadBackdrop sun={{ x: 280, y: 30 }} />
        <Ink>
          <StopSign x={95} ground={148} />
          <Rider x={118} y={148} pose="stand" face="sad" look={4} />
          <Bus x={bx} y={98} packed spin={s < 2.2 ? -f * 12 : 0} />
        </Ink>
      </Stage>
      <TimeCard time="2:59" />
    </>
  );
}

export { useSec };
