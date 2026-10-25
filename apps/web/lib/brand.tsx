/** @format */

// "On the way": the name, and the mark drawn for ImageResponse icons.
// The mark is the From → To rail from the Search screen: hollow dot, line, filled dot.

import type { BrandMarkProps } from "@/types/brand";

export const APP_NAME = "On the way";
export const APP_TAGLINE =
  "Carry on with your day. We'll tell you when to leave.";
export const BRAND_CORAL = "#ff7a45";
export const BRAND_INK = "#1c0f08";
export const BRAND_PAPER = "#fbfbf6";

/** The icon at `px` square. `safe` shrinks the mark into the maskable safe zone (80%). */
export function BrandMark({ px, safe = false }: BrandMarkProps) {
  const unit = (px * (safe ? 0.6 : 0.78)) / 10;

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: BRAND_CORAL,
        borderRadius: safe ? 0 : px * 0.22,
      }}
    >
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
        }}
      >
        <div
          style={{
            width: unit * 2.6,
            height: unit * 2.6,
            borderRadius: "50%",
            border: `${unit * 0.5}px solid ${BRAND_INK}`,
          }}
        />
        <div
          style={{
            width: unit * 0.55,
            height: unit * 3.4,
            background: BRAND_INK,
          }}
        />
        <div
          style={{
            width: unit * 2.6,
            height: unit * 2.6,
            borderRadius: "50%",
            background: BRAND_INK,
          }}
        />
      </div>
    </div>
  );
}
