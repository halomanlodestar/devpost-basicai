// The film, in order. Each scene lasts lead + its clip + tail (never less than `min`),
// so retiming a line only means re-recording its clip.

import type { SceneDef } from "./types";
import { BusLate, Intro, Sprint, Timelapse, TimetablePOV } from "./shots/act1";
import { ConductorScene, Learns, Thousands, TicketFlight } from "./shots/act2";
import { Finale, Leave, Montage, Rewind, ThousandsLikeHim, TwoMinutes } from "./shots/act3";

export const FPS = 30;
export const FADE = 8;

export const SCENES: SceneDef[] = [
  { id: "intro", audio: "01-03-intro", lead: 0.5, tail: 1.4, min: 0, mood: "warm", Component: Intro },
  { id: "sprint", audio: "04-05-sprint", lead: 0.3, tail: 0.6, min: 0, mood: "cold", Component: Sprint },
  { id: "timetable", audio: "06-timetable", lead: 0.3, tail: 0.5, min: 0, mood: "cold", Component: TimetablePOV },
  { id: "timelapse", lead: 0, tail: 0, min: 4.5, mood: "cold", Component: Timelapse },
  { id: "bus-late", audio: "08-two-fifty-nine", lead: 0.3, tail: 0.6, min: 0, mood: "cold", Component: BusLate },
  { id: "thousands", audio: "09-11-thousands", lead: 0.3, tail: 0.8, min: 0, mood: "cold", Component: Thousands },
  { id: "conductor", audio: "12-13-conductor", lead: 0.3, tail: 0.4, min: 0, mood: "pencil", Component: ConductorScene },
  { id: "flight", audio: "14-ticket-flight", lead: 0.3, tail: 0.9, min: 0, mood: "warm", Component: TicketFlight },
  { id: "learns", audio: "15-learns", lead: 0.2, tail: 1.2, min: 0, mood: "pencil", Component: Learns },
  { id: "rewind", audio: "16-19-rewind", lead: 0.2, tail: 0.6, min: 0, mood: "warm", Component: Rewind },
  { id: "leave", audio: "20-leave", lead: 0.3, tail: 1.4, min: 0, mood: "warm", Component: Leave },
  { id: "two-minutes", audio: "21-two-minutes", lead: 0.8, tail: 1.3, min: 0, mood: "warm", Component: TwoMinutes },
  { id: "montage", audio: "22-montage", lead: 0.2, tail: 0.6, min: 0, mood: "warm", Component: Montage },
  { id: "like-him", audio: "23-thousands-like-him", lead: 0.3, tail: 1.2, min: 0, mood: "warm", Component: ThousandsLikeHim },
  { id: "finale", audio: "24-25-on-the-way", lead: 0.3, tail: 3.0, min: 0, mood: "warm", Component: Finale },
];

/** Frames per scene, from the measured clip lengths. */
export function sceneFrames(clips: Record<string, number>) {
  return SCENES.map((sc) => {
    const clip = sc.audio ? (clips[sc.audio] ?? 0) : 0;
    return Math.round(Math.max(sc.min, sc.lead + clip + sc.tail) * FPS);
  });
}
