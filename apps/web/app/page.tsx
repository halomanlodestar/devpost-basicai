/** @format */

import { SearchForm } from "@/components/search-form";
import { APP_NAME } from "@/lib/brand";

export default function SearchPage() {
  return (
    <main className="mx-auto flex w-full max-w-[480px] flex-1 flex-col gap-6 px-5 pt-10 pb-8">
      <div className="flex items-center gap-2">
        <span
          aria-hidden
          className="flex h-[22px] flex-col items-center justify-between"
        >
          <span className="size-[7px] rounded-full border-2 border-route" />
          <span className="w-0.5 flex-1 bg-route" />
          <span className="size-[7px] rounded-full bg-route" />
        </span>
        <span className="text-[17px] font-extrabold tracking-tight">
          {APP_NAME}
        </span>
      </div>
      <h1 className="text-[36px] leading-none font-extrabold tracking-tight">
        Where to?
      </h1>
      <SearchForm />
    </main>
  );
}
