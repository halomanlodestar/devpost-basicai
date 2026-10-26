// The thumbnail: the rider leaning back with chai while the phone does the waiting.
// One still, two shapes: 16:9 (YouTube) and 3:2 (Devpost), the 3:2 adding paper above and below.

import { BRAND_CORAL, Draw, filled, HandText, Ink, line, MoodProvider, Sketch, Stage, usePalette, Wash } from "./art/kit";
import { FriendLaugh, Rider } from "./art/people";
import { BrandMark } from "./art/things";

function Art({ h }: { h: number }) {
  const p = usePalette();
  return (
    <Stage h={h}>
      <Wash>
        <ellipse cx={110} cy={30} rx={190} ry={70} fill={p.sky} opacity={0.42} />
        <ellipse cx={18} cy={60} rx={40} ry={34} fill={p.green} opacity={0.5} />
        <ellipse cx={90} cy={175} rx={175} ry={60} fill={p.sand} opacity={0.75} />
        <rect x={-40} y={121} width={225} height={4} fill={p.sandDark} opacity={0.5} />
        <rect x={-40} y={156} width={240} height={4} fill={p.sandDark} opacity={0.5} />
        <ellipse cx={240} cy={150} rx={56} ry={26} fill={p.coral} opacity={0.25} />
      </Wash>
      <Sketch>
        <path d="M-40 122 H180 M-40 157 H205 M18 92 V122 M10 102 L18 96 M26 105 L18 98" />
      </Sketch>
      <Ink>
        <g opacity={0.9}>
          <FriendLaugh x={38} y={121} s={0.85} face="laugh" />
        </g>
        <Rider x={100} y={121} s={1.4} pose="sit" hands="chai" face="happy" />

        {/* the phone on the step, doing the waiting */}
        <rect x={150} y={151} width={20} height={6} rx={1.5} transform="rotate(-6 160 154)" style={filled(1.4)} />
        <path d="M172 146 l5 -3 M173 151 h6" style={line(1.3)} />
        <path d="M150 112 H206 Q211 112 211 117 V129 Q211 134 206 134 H166 L160 146 L158 134 H150 Q145 134 145 129 V117 Q145 112 150 112 Z" style={filled(1.4)} />
        <rect x={149.5} y={116.5} width={8} height={8} rx={2} fill={BRAND_CORAL} />
        <HandText x={161} y={123} size={7.5} anchor="start">
          leave at 2:50
        </HandText>
        <HandText x={161} y={131} size={5.5} anchor="start" color="#5A6474">
          bus 1 is 27 min late
        </HandText>

        {/* the title side */}
        <BrandMark x={252} y={34} size={22} />
        <HandText x={252} y={74} size={30}>
          on the way
        </HandText>
        <HandText x={252} y={90} size={8.5} color="#3A404C">
          Sit back, relax,
        </HandText>
        <HandText x={252} y={101} size={8.5} color="#3A404C">
          take a little extra out of your day.
        </HandText>

        {/* the little extra in your day */}
        <g transform="rotate(-5 250 148)">
          <rect x={214} y={132} width={74} height={30} rx={3} style={filled(1.3, "#1E1E26", "#FFF3D6")} />
          <HandText x={251} y={146} size={11} color={BRAND_CORAL}>
            +27 min
          </HandText>
          <HandText x={251} y={156} size={7} color="#3A404C">
            of your day, back
          </HandText>
        </g>
        <Draw d="M214 150 Q186 168 150 166" w={1.4} />
        <path d="M156 162 L149 166 L156 170" style={line(1.4)} />
      </Ink>
    </Stage>
  );
}

export function Thumbnail({ h = 180 }: { h?: number }) {
  return (
    <MoodProvider mood="warm">
      <Art h={h} />
    </MoodProvider>
  );
}
