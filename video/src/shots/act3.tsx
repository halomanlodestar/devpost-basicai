// Act 5 (same afternoon, rewound) and Act 6 (the close).

import { AbsoluteFill } from "remotion";
import { BRAND_CORAL, Draw, ease, filled, HandText, Ink, line, MoodProvider, PAPER, Sketch, Stage, usePalette, Wash } from "../art/kit";
import { Rider } from "../art/people";
import { BrandMark, Bus, Clock, LockClock, MapBase, Notification, PhonePOV, RoadBackdrop, StopSign } from "../art/things";
import type { SceneProps } from "../types";
import { useSec } from "./act1";
import { CrowdDots } from "./act2";
import { ChaiCloseUp, Layer, StepsScene } from "./common";

function SandWash() {
  const p = usePalette();
  return (
    <Wash>
      <rect x={-40} y={-40} width={400} height={260} fill={p.sand} opacity={0.5} />
    </Wash>
  );
}

/** The notification, as he sees it. `slide` 0..1 drops it onto the lock screen. */
export function LockScreenPush({ slide, buzz, time = "2:21" }: { slide: number; buzz: number; time?: string }) {
  const p = usePalette();
  return (
    <>
      <Wash>
        <rect x={-40} y={-40} width={400} height={260} fill={p.sand} opacity={0.55} />
        <ellipse cx={40} cy={40} rx={60} ry={40} fill={p.sky} opacity={0.5} />
        <ellipse cx={290} cy={150} rx={50} ry={40} fill={p.green} opacity={0.45} />
        <ellipse cx={45} cy={160} rx={40} ry={26} fill={p.coral} opacity={0.4} />
      </Wash>
      <Sketch>
        <path d="M0 150 Q30 138 52 166 L60 180 M10 180 Q24 160 40 172 M320 132 Q292 128 282 160 L278 180 M300 180 Q296 160 312 150 M0 112 H90 M230 104 H320" />
      </Sketch>
      <Ink>
        <PhonePOV buzz={buzz}>
          <LockClock time={time} />
          <g opacity={slide} transform={`translate(0 ${(1 - slide) * -30})`}>
            <Notification y={72} title={["Bus 1 is late", "by 27 min"]} body={["Be at Kavi Nagar", "by 2:57 pm"]} />
          </g>
        </PhonePOV>
      </Ink>
    </>
  );
}

/** 16–19: rewind to 2:15. This time he sits down; the push arrives; chai first. */
export function Rewind({ d }: SceneProps) {
  const { f, s } = useSec();
  const back = ease(s, [0, 1.2], [0, 1]);
  const minutes = 14 * 60 + 59 - back * 44;
  const warm = ease(s, [0.6, 1.3], [0, 1]);
  const sat = s > 3.0;
  return (
    <>
      <Layer opacity={s < 1.4 ? 1 : 0}>
        <MoodProvider mood="cold">
          <Layer opacity={1 - warm}>
            <Stage>
              <SandWash />
              <Ink>
                <Clock x={160} y={88} r={52} minutes={minutes} />
              </Ink>
            </Stage>
          </Layer>
        </MoodProvider>
        <Layer opacity={warm}>
          <Stage>
            <SandWash />
            <Ink>
              <Clock x={160} y={88} r={52} minutes={minutes} />
            </Ink>
          </Stage>
        </Layer>
        <AbsoluteFill>
          <svg viewBox="0 0 320 180" width="100%" height="100%">
            <g opacity={ease(s, [0, 0.2], [0, 1]) * ease(s, [1.0, 1.3], [1, 0])}>
              <path d="M40 30 l-12 8 l12 8 Z M54 30 l-12 8 l12 8 Z" fill="#1E1E26" />
            </g>
          </svg>
        </AbsoluteFill>
      </Layer>
      <Layer opacity={s >= 1.4 && s < 4.8 ? 1 : 0}>
        <Stage cam={{ x: 160, y: 98, zoom: 1.08 + (s - 1.4) * 0.03 }}>
          <StepsScene f={f}>
            {sat ? (
              <Rider x={150} y={132} pose="sit" hands="lap" face="smile" />
            ) : (
              <Rider x={110 + ease(s, [1.4, 2.9], [0, 40])} y={158} pose={s < 2.9 ? "walk" : "stand"} phase={f * 0.35} face="smile" />
            )}
          </StepsScene>
        </Stage>
      </Layer>
      <Layer opacity={s >= 4.8 && s < 7.4 ? 1 : 0}>
        <Stage>
          <LockScreenPush slide={ease(s, [4.9, 5.3], [0, 1])} buzz={s > 4.9 && s < 6.2 ? (s - 4.9) * 0.8 + 0.3 : 0} />
        </Stage>
      </Layer>
      <Layer opacity={s >= 7.4 ? 1 : 0}>
        <Stage cam={{ x: 160, y: 95, zoom: 1 + (s - 7.4) * 0.02 }}>
          <ChaiCloseUp f={f} thought="27 min? chai first." write={ease(s, [7.9, 9.2], [0, 1], (x) => x)} />
        </Stage>
      </Layer>
    </>
  );
}

/** 20: the screen goes quiet and white. LEAVE. 2:50. */
export function Leave({ d }: SceneProps) {
  const { s } = useSec();
  return (
    <Stage bg={PAPER}>
      <Ink>
        <HandText x={160} y={100} size={58} write={ease(s, [1.3, 2.0], [0, 1], (x) => x)}>
          LEAVE
        </HandText>
        <Draw d="M96 110 Q160 118 224 108" p={ease(s, [2.0, 2.4], [0, 1])} w={2.6} color={BRAND_CORAL} />
        <HandText x={160} y={140} size={20} opacity={ease(s, [2.4, 2.8], [0, 1])}>
          2:50
        </HandText>
      </Ink>
    </Stage>
  );
}

/** 21: storyboard frame 4. He reaches the stop at 2:57; the bus pulls in at 2:59. */
export function TwoMinutes({ d }: SceneProps) {
  const { f, s } = useSec();
  const walk = ease(s, [0, 2.2], [60, 150], (x) => x);
  const busX = ease(s, [1.8, 4.0], [340, 212], (x) => 1 - Math.pow(1 - x, 3));
  const arrived = s > 2.2;
  return (
    <Stage cam={{ x: 175, y: 104, zoom: 1.1 }}>
      <RoadBackdrop ground={148} />
      <Ink>
        <Bus x={busX} y={98} spin={s < 4 ? -f * 10 : 0} />
        <StopSign x={196} ground={148} />
        <Rider x={walk} y={148} pose={arrived ? "stand" : "walk"} phase={f * 0.35} face={arrived ? "happy" : "smile"} />
        <HandText x={150} y={56} size={11} opacity={ease(s, [2.2, 2.6], [0, 1])}>
          there at 2:57
        </HandText>
        <HandText x={262} y={88} size={11} opacity={ease(s, [3.6, 4.0], [0, 1])}>
          bus at 2:59
        </HandText>
      </Ink>
    </Stage>
  );
}

/** 22: two quick beats. A change between two lines, then Notify me with no sign-up. */
export function Montage({ d }: SceneProps) {
  const { f, s } = useSec();
  const tapAt = 3.5;
  const on = s > tapAt;
  const draw1 = ease(s, [0.1, 0.9], [0, 1]);
  const draw2 = ease(s, [0.5, 1.3], [0, 1]);
  return (
    <>
      <Layer opacity={s < 2.5 ? 1 : 0}>
        <Stage cam={{ x: 160, y: 92, zoom: 1.1 }}>
          <Sketch>
            <path d="M0 150 H320" opacity={0.3} />
          </Sketch>
          <Ink>
            <Draw d="M30 120 Q100 116 160 92 T300 60" p={draw1} w={5} color={BRAND_CORAL} />
            <Draw d="M60 30 Q120 60 160 92 T250 160" p={draw2} w={5} color="#2A9D8F" />
            <circle cx={160} cy={92} r={8} style={filled(2.4)} opacity={ease(s, [1.2, 1.4], [0, 1])} />
            <HandText x={30} y={136} size={10} anchor="start" color={BRAND_CORAL}>
              bus 1
            </HandText>
            <HandText x={60} y={24} size={10} anchor="start" color="#2A9D8F">
              bus 2
            </HandText>
            <HandText x={204} y={98} size={12} anchor="start" opacity={ease(s, [1.4, 1.8], [0, 1])}>
              change here · 6 min
            </HandText>
          </Ink>
        </Stage>
      </Layer>
      <Layer opacity={s >= 2.5 ? 1 : 0}>
        <Stage>
          <Wash>
            <rect x={-40} y={-40} width={400} height={260} fill={usePalette().sand} opacity={0.5} />
          </Wash>
          <Ink>
            <PhonePOV buzz={0} screen="#FFFFFF">
              <HandText x={124} y={40} size={8} anchor="start" color="#5A6474">
                Next bus
              </HandText>
              <HandText x={124} y={58} size={16} anchor="start">
                2:57 pm
              </HandText>
              <HandText x={124} y={70} size={7.5} anchor="start" color="#5A6474">
                be at Kavi Nagar
              </HandText>
              <rect x={124} y={84} width={72} height={20} rx={5} fill={on ? "#FFFFFF" : BRAND_CORAL} stroke={on ? "#1E1E26" : "none"} strokeWidth={1.1} />
              <HandText x={160} y={98} size={9} color={on ? "#1E1E26" : "#FFFFFF"}>
                {on ? "Alerts on ✓" : "Notify me"}
              </HandText>
            </PhonePOV>
            <g transform={`translate(${ease(s, [2.6, tapAt], [40, 0]) + ease(s, [tapAt + 0.25, tapAt + 0.7], [0, 46])} ${ease(s, [2.6, tapAt], [40, 0]) + ease(s, [tapAt + 0.25, tapAt + 0.7], [0, 40]) + (s > tapAt && s < tapAt + 0.2 ? 2 : 0)})`}>
              <ellipse cx={166} cy={104} rx={8} ry={12} transform="rotate(-20 166 104)" style={filled(2.4)} />
            </g>
            <HandText x={250} y={150} size={13} opacity={ease(s, [3.8, 4.2], [0, 1])}>
              no sign-up
            </HandText>
          </Ink>
        </Stage>
      </Layer>
    </>
  );
}

/** 23: the map again. One by one, the waiting dots turn warm. */
export function ThousandsLikeHim({ d }: SceneProps) {
  const { s } = useSec();
  return (
    <Stage cam={{ x: 160, y: 92, zoom: 1.05 - s * 0.01 }}>
      <MapBase />
      <Ink>
        <CrowdDots shown={1} warm={ease(s, [0.2, 2.8], [0, 1], (x) => x)} />
      </Ink>
    </Stage>
  );
}

/** 24–25: back on the steps with chai, phone face-down. Then the words write themselves: on the way. */
export function Finale({ d }: SceneProps) {
  const { f, s } = useSec();
  const title = s >= 4.3;
  const settle = ease(s, [6.2, 7.0], [0, 1]);
  return (
    <>
      <Layer opacity={title ? 0 : 1}>
        <Stage cam={{ x: 160, y: 100, zoom: 1.1 + s * 0.03 }}>
          <StepsScene f={f}>
            <Rider x={150} y={132} pose="sit" hands="chai" face="happy" />
            <rect x={176} y={131} width={11} height={4} rx={1} style={filled(1.2, "#1E1E26", "#1E1E26")} />
          </StepsScene>
        </Stage>
      </Layer>
      <Layer opacity={title ? 1 : 0}>
        <Stage bg={PAPER}>
          <Ink>
            <g transform={`translate(0 ${-settle * 18})`}>
              <HandText x={160} y={100} size={40} write={ease(s, [4.5, 5.7], [0, 1], (x) => x)}>
                on the way
              </HandText>
            </g>
            <g opacity={settle}>
              <BrandMark x={160} y={118} size={22} />
              <HandText x={160} y={146} size={10} color="#5A6474">
                basics.smartabeshackathon.tech
              </HandText>
            </g>
            <HandText x={160} y={172} size={6.5} color="#9AA0A8" opacity={ease(s, [7.0, 7.4], [0, 1])}>
              Voice: ElevenLabs
            </HandText>
          </Ink>
        </Stage>
      </Layer>
    </>
  );
}
