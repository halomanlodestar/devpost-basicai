// Bundles once and renders sample frames to out/stills, for checking the art without a full render.
//   node scripts/stills.mjs 60 140 170 ...
import { bundle } from "@remotion/bundler";
import { renderStill, selectComposition } from "@remotion/renderer";
import { mkdirSync } from "node:fs";
import path from "node:path";

const frames = process.argv.slice(2).map(Number);
const serveUrl = await bundle({ entryPoint: path.resolve("src/index.ts") });
const composition = await selectComposition({ serveUrl, id: "OnTheWay", port: 3123 });
console.log(`duration ${composition.durationInFrames} frames (${(composition.durationInFrames / composition.fps).toFixed(1)}s)`);
mkdirSync("out/stills", { recursive: true });
let i = 0;
for (const frame of frames) {
  i++;
  const output = `out/stills/s${String(i).padStart(2, "0")}.png`;
  await renderStill({ serveUrl, composition, frame: Math.min(frame, composition.durationInFrames - 1), output, scale: 0.5, port: 3123 });
  console.log(`${output} ← frame ${frame}`);
}
