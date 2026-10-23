/** @format */

import type { AppRouter } from "@app/api";
import {
  createTRPCClient,
  httpBatchLink,
  httpSubscriptionLink,
  splitLink,
} from "@trpc/client";
import { createTRPCContext } from "@trpc/tanstack-react-query";

export const API_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

export const { TRPCProvider, useTRPC } = createTRPCContext<AppRouter>();

export function makeTrpcClient() {
  return createTRPCClient<AppRouter>({
    links: [
      splitLink({
        condition: (op) => op.type === "subscription",
        true: httpSubscriptionLink({
          url: `${API_URL}/trpc`,
          eventSourceOptions: { withCredentials: true },
        }),
        false: httpBatchLink({
          url: `${API_URL}/trpc`,
          fetch: (url, init) => fetch(url, { ...init, credentials: "include" }),
        }),
      }),
    ],
  });
}
