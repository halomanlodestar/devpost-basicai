/** @format */

import { Suspense } from "react";
import { Results } from "@/components/results";

export default function ResultsPage() {
  return (
    <main className="mx-auto w-full max-w-[480px] flex-1 px-5 pt-10 pb-8">
      <Suspense>
        <Results />
      </Suspense>
    </main>
  );
}
