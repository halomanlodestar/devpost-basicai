/** @format */

"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { pushSupport, storeDevice, storedDevice, subscribe } from "@/lib/push";
import { useTRPC } from "@/lib/trpc";
import type {
  NotifyState,
  NotifyTarget,
  PushSupport,
  StoredDevice,
} from "@/types/alerts";

/** Notify me for one journey, on this device: no accounts, the push subscription is the identity. */
export function useNotify(target: NotifyTarget | null): NotifyState {
  const trpc = useTRPC();
  const [device, setDevice] = useState<StoredDevice | null>(null);
  const [support, setSupport] = useState<PushSupport>("unsupported");
  const [failed, setFailed] = useState(false);

  // localStorage and Notification only exist in the browser
  useEffect(() => {
    setDevice(storedDevice());
    setSupport(pushSupport());
  }, []);

  const creds = {
    deviceId: device?.deviceId ?? "",
    secret: device?.secret ?? "",
  };
  const mine = useQuery({
    ...trpc.alerts.mine.queryOptions(creds),
    enabled: Boolean(device),
  });
  const register = useMutation(trpc.alerts.register.mutationOptions());
  const create = useMutation(trpc.alerts.create.mutationOptions());
  const cancel = useMutation(trpc.alerts.cancel.mutationOptions());

  const active = target
    ? mine.data?.find(
        (a) =>
          a.journeyId === target.journeyId &&
          a.serviceDate === target.serviceDate,
      )
    : undefined;

  async function ensureDevice(force: boolean): Promise<StoredDevice | null> {
    const sub = await subscribe();

    setSupport(pushSupport());

    if (!sub?.endpoint || !sub.keys?.p256dh || !sub.keys.auth) return null;
    if (device && device.endpoint === sub.endpoint && !force) return device;

    const r = await register.mutateAsync({
      endpoint: sub.endpoint,
      keys: { p256dh: sub.keys.p256dh, auth: sub.keys.auth },
    });
    const d = { ...r, endpoint: sub.endpoint };

    storeDevice(d);
    setDevice(d);

    return d;
  }

  async function turnOn() {
    if (!target) return;
    setFailed(false);

    try {
      let d = await ensureDevice(false);

      if (!d) return;

      try {
        await create.mutateAsync({
          deviceId: d.deviceId,
          secret: d.secret,
          ...target,
        });
      } catch {
        // the server forgot this device (e.g. its push subscription died): register again once
        d = await ensureDevice(true);
        if (!d) return;
        await create.mutateAsync({
          deviceId: d.deviceId,
          secret: d.secret,
          ...target,
        });
      }

      await mine.refetch();
    } catch {
      setFailed(true);
    }
  }

  async function turnOff() {
    if (!device || !active) return;
    setFailed(false);

    try {
      await cancel.mutateAsync({ ...creds, alertId: active.id });
      await mine.refetch();
    } catch {
      setFailed(true);
    }
  }

  return {
    support,
    on: Boolean(active),
    busy: register.isPending || create.isPending || cancel.isPending,
    failed,
    turnOn,
    turnOff,
  };
}
