/** @format */

import { ImageResponse } from "next/og";
import { BrandMark } from "@/lib/brand";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

// iOS rounds the corners itself, so this one is a full square
export default function AppleIcon() {
  return new ImageResponse(<BrandMark px={180} safe />, size);
}
