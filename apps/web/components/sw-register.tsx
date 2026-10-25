/** @format */

"use client";

import { useEffect } from "react";

/** Registers /sw.js once, so the app can be installed (and, later, receive push). */
export function ServiceWorkerRegister() {
  useEffect(() => {
    if ("serviceWorker" in navigator)
      navigator.serviceWorker.register("/sw.js").catch(() => {});
  }, []);

  return null;
}
