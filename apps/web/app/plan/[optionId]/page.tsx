/** @format */

import { Suspense } from "react";
import { Journeys } from "@/components/journeys";

export default function JourneysPage() {
  return (
    <main className="mx-auto w-full max-w-[480px] flex-1 px-4 pt-6 pb-8">
      <Suspense>
        <Journeys />
      </Suspense>
    </main>
  );
}
