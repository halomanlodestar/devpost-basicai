/** @format */

// Web Push (VAPID): one message to one browser's push subscription.
// Bad or missing VAPID keys disable push only: search and live times keep working.

import webpush from "web-push";
import { env } from "../env";
import type { PushOutcome, PushPayload, PushTarget } from "../types";

export const pushEnabled = (() => {
  try {
    webpush.setVapidDetails(
      env.VAPID_SUBJECT,
      env.VAPID_PUBLIC_KEY,
      env.VAPID_PRIVATE_KEY,
    );

    return true;
  } catch (err) {
    console.warn(
      `push disabled: ${(err as Error).message} ` +
        "Generate a pair with `bunx web-push generate-vapid-keys` and set VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY.",
    );

    return false;
  }
})();

/** "gone" means the subscription is dead (permission revoked, app removed): drop the device. */
export async function sendPush(
  to: PushTarget,
  payload: PushPayload,
): Promise<PushOutcome> {
  if (!pushEnabled) return "failed";

  try {
    await webpush.sendNotification(
      { endpoint: to.endpoint, keys: { p256dh: to.p256dh, auth: to.auth } },
      JSON.stringify(payload),
      { TTL: 15 * 60, urgency: "high" },
    );

    return "sent";
  } catch (err) {
    const status = (err as { statusCode?: number }).statusCode;

    if (status === 404 || status === 410) return "gone";

    console.error("push failed", status ?? err);

    return "failed";
  }
}
