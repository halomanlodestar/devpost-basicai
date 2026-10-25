/** @format */

import { Suspense } from "react";
import { LineViewScreen } from "@/components/line-view";

export default function LinePage() {
  return (
    <main className="mx-auto w-full max-w-[480px] flex-1 px-5 pt-10 pb-8">
      <Suspense>
        <LineViewScreen />
      </Suspense>
    </main>
  );
}
