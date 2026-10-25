/** @format */

// Browser side of "Notify me": permission, the push subscription, and the
// device credentials the API hands back (kept in localStorage: no accounts).

import type { PushSupport, StoredDevice } from "@/types/alerts";

const KEY = "otw.device";
const VAPID = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? "";

export function pushSupport(): PushSupport {
  if (
    typeof window === "undefined" ||
    !("serviceWorker" in navigator) ||
    !("PushManager" in window) ||
    !("Notification" in window) ||
    !VAPID
  )
    return "unsupported";

  return Notification.permission;
}

export function storedDevice(): StoredDevice | null {
  try {
    const raw = localStorage.getItem(KEY);

    return raw ? (JSON.parse(raw) as StoredDevice) : null;
  } catch {
    return null;
  }
}

export function storeDevice(d: StoredDevice) {
  try {
    localStorage.setItem(KEY, JSON.stringify(d));
  } catch {
    // private mode: alerts still work this session, they just can't be listed later
  }
}

function vapidKey(base64url: string) {
  const pad = "=".repeat((4 - (base64url.length % 4)) % 4);
  const raw = atob((base64url + pad).replace(/-/g, "+").replace(/_/g, "/"));

  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
}

/** Asks for permission if needed and returns this browser's push subscription, or null if refused. */
export async function subscribe(): Promise<PushSubscriptionJSON | null> {
  if (pushSupport() === "unsupported") return null;
  if ((await Notification.requestPermission()) !== "granted") return null;

  const reg = await navigator.serviceWorker.ready;
  const sub =
    (await reg.pushManager.getSubscription()) ??
    (await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: vapidKey(VAPID),
    }));

  return sub.toJSON();
}
