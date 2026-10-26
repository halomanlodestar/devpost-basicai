import type { FC, ReactNode } from "react";

/** Where the camera looks, in art units (the stage is 320 × 180), and how close. */
export interface Camera {
  x: number;
  y: number;
  zoom: number;
}

/** Watercolour tints for one mood of the story. `op` scales every wash. */
export interface Palette {
  sky: string;
  sand: string;
  sandDark: string;
  green: string;
  coral: string;
  road: string;
  yellow: string;
  wood: string;
  op: number;
}

export type Mood = "warm" | "cold" | "pencil";
export type Pose = "sit" | "stand" | "walk" | "run";
export type Face = "smile" | "flat" | "laugh" | "happy" | "sad" | "wow";
export type Hands = "phone" | "chai" | "lap" | "swing" | "up";

/** Every scene gets its own length in frames. */
export interface SceneProps {
  d: number;
}

export interface SceneDef {
  id: string;
  /** clip in public/audio, without extension */
  audio?: string;
  /** seconds of picture before the voice starts */
  lead: number;
  /** seconds of picture after the voice ends */
  tail: number;
  /** the scene never runs shorter than this, in seconds */
  min: number;
  mood: Mood;
  Component: FC<SceneProps>;
}

export interface FilmProps {
  /** clip lengths in seconds, by clip name */
  clips: Record<string, number>;
  [key: string]: unknown;
}

export interface Children {
  children?: ReactNode;
}
