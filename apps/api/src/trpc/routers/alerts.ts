/** @format */

// No accounts: a device (one browser's push subscription) owns its alerts.
// The browser keeps { deviceId, secret }; only a hash of the secret is stored.

import { serviceDate } from "@app/core";
import { TRPCError } from "@trpc/server";
import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { z } from "zod";
import type {
  CancelAlertInput,
  Context,
  CreateAlertInput,
  DeviceCredentials,
  RegisterDeviceInput,
} from "../../types";
import { publicProcedure, router } from "../init";

const hash = (secret: string) =>
  createHash("sha256").update(secret).digest("hex");

const Credentials = z.object({
  deviceId: z.string().min(1),
  secret: z.string().min(16),
}) satisfies z.ZodType<DeviceCredentials>;

const RegisterSchema = z.object({
  endpoint: z.url().max(2048),
  keys: z.object({ p256dh: z.string().min(1), auth: z.string().min(1) }),
}) satisfies z.ZodType<RegisterDeviceInput>;

const CreateSchema = Credentials.extend({
  journeyId: z.string().min(1),
  serviceDate: z.iso.date(),
  fromStopId: z.string().min(1),
  toStopId: z.string().min(1),
  url: z.string().startsWith("/").max(500),
}) satisfies z.ZodType<CreateAlertInput>;

const CancelSchema = Credentials.extend({
  alertId: z.string().min(1),
}) satisfies z.ZodType<CancelAlertInput>;

async function ownDevice(ctx: Context, c: DeviceCredentials) {
  const device = await ctx.db.device.findUnique({ where: { id: c.deviceId } });
  const given = Buffer.from(hash(c.secret), "hex");
  const stored = Buffer.from(device?.secretHash ?? "", "hex");

  if (
    !device ||
    given.length !== stored.length ||
    !timingSafeEqual(given, stored)
  )
    throw new TRPCError({ code: "UNAUTHORIZED", message: "Unknown device" });

  return device;
}

export const alertsRouter = router({
  /** Once per browser: store its push subscription, hand back the device's credentials. */
  register: publicProcedure
    .input(RegisterSchema)
    .mutation(async ({ ctx, input }) => {
      const secret = randomBytes(24).toString("base64url");
      const data = {
        endpoint: input.endpoint,
        p256dh: input.keys.p256dh,
        auth: input.keys.auth,
        secretHash: hash(secret),
      };
      const device = await ctx.db.device.upsert({
        where: { endpoint: input.endpoint },
        create: data,
        update: data,
      });

      return { deviceId: device.id, secret };
    }),

  /** Notify me for one journey: 45/30/15 min before "be there by", plus delay pushes. */
  create: publicProcedure
    .input(CreateSchema)
    .mutation(async ({ ctx, input }) => {
      const device = await ownDevice(ctx, input);
      const journey = ctx.state.net.journeys.get(input.journeyId);

      if (
        !journey ||
        !ctx.state.net.seqOf.get(journey.routeId)!.has(input.fromStopId)
      )
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "That bus doesn't stop there",
        });

      const key = {
        deviceId: device.id,
        journeyId: input.journeyId,
        serviceDate: input.serviceDate,
      };
      const row = await ctx.db.alert.upsert({
        where: { deviceId_journeyId_serviceDate: key },
        create: {
          ...key,
          fromStopId: input.fromStopId,
          toStopId: input.toStopId,
          url: input.url,
        },
        update: {
          closedAt: null,
          fromStopId: input.fromStopId,
          toStopId: input.toStopId,
          url: input.url,
        },
      });

      await ctx.alerts.add(row);

      return { alertId: row.id };
    }),

  cancel: publicProcedure
    .input(CancelSchema)
    .mutation(async ({ ctx, input }) => {
      const device = await ownDevice(ctx, input);

      await ctx.db.alert.updateMany({
        where: { id: input.alertId, deviceId: device.id },
        data: { closedAt: new Date() },
      });
      ctx.alerts.remove(input.alertId);

      return { ok: true };
    }),

  /** This device's open alerts, so the app can show which journeys have the bell on. */
  mine: publicProcedure.input(Credentials).query(async ({ ctx, input }) => {
    const device = await ownDevice(ctx, input);
    const today = serviceDate(Date.now(), ctx.tz);

    return ctx.db.alert.findMany({
      where: {
        deviceId: device.id,
        closedAt: null,
        serviceDate: { gte: today },
      },
      select: { id: true, journeyId: true, serviceDate: true },
    });
  }),
});
