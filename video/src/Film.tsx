import { Fragment } from "react";
import { AbsoluteFill, Html5Audio, Sequence, staticFile } from "remotion";
import { linearTiming, TransitionSeries } from "@remotion/transitions";
import { fade } from "@remotion/transitions/fade";
import { MoodProvider, PAPER } from "./art/kit";
import { FADE, FPS, sceneFrames, SCENES } from "./scenes";
import type { FilmProps } from "./types";

export function Film({ clips }: FilmProps) {
  const frames = sceneFrames(clips);
  return (
    <AbsoluteFill style={{ background: PAPER }}>
      <TransitionSeries>
        {SCENES.map((sc, i) => (
          <Fragment key={sc.id}>
            {i > 0 && <TransitionSeries.Transition presentation={fade()} timing={linearTiming({ durationInFrames: FADE })} />}
            <TransitionSeries.Sequence durationInFrames={frames[i]!} name={sc.id}>
              <MoodProvider mood={sc.mood}>
                <sc.Component d={frames[i]!} />
              </MoodProvider>
              {sc.audio && (
                <Sequence from={Math.round(sc.lead * FPS)} name={`${sc.id} voice`}>
                  <Html5Audio src={staticFile(`audio/${sc.audio}.mp3`)} />
                </Sequence>
              )}
            </TransitionSeries.Sequence>
          </Fragment>
        ))}
      </TransitionSeries>
    </AbsoluteFill>
  );
}
