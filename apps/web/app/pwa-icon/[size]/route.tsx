/** @format */

import { ImageResponse } from "next/og";
import { BrandMark } from "@/lib/brand";

// Install icons for the web app manifest: /pwa-icon/192, /pwa-icon/512, /pwa-icon/maskable
const SIZES: Record<string, { px: number; safe: boolean }> = {
  "192": { px: 192, safe: false },
  "512": { px: 512, safe: false },
  maskable: { px: 512, safe: true },
};

export function generateStaticParams() {
  return Object.keys(SIZES).map((size) => ({ size }));
}

export async function GET(
  _req: Request,
  ctx: RouteContext<"/pwa-icon/[size]">,
) {
  const icon = SIZES[(await ctx.params).size];

  if (!icon) return new Response("Not found", { status: 404 });

  return new ImageResponse(<BrandMark px={icon.px} safe={icon.safe} />, {
    width: icon.px,
    height: icon.px,
  });
}
