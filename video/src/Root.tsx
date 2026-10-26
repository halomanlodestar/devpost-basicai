import { Composition, staticFile } from "remotion";
import { getAudioDurationInSeconds } from "@remotion/media-utils";
import { Film } from "./Film";
import { FADE, FPS, sceneFrames, SCENES } from "./scenes";
import type { FilmProps } from "./types";

export function Root() {
  return (
    <Composition
      id="OnTheWay"
      component={Film}
      width={1920}
      height={1080}
      fps={FPS}
      durationInFrames={FPS * 120}
      defaultProps={{ clips: {} } satisfies FilmProps}
      calculateMetadata={async ({ props }) => {
        const clips: Record<string, number> = {};
        for (const sc of SCENES) {
          if (sc.audio) clips[sc.audio] = await getAudioDurationInSeconds(staticFile(`audio/${sc.audio}.mp3`));
        }
        const frames = sceneFrames(clips);
        const total = frames.reduce((a, b) => a + b, 0) - FADE * (frames.length - 1);
        return { durationInFrames: total, props: { ...props, clips } };
      }}
    />
  );
}
