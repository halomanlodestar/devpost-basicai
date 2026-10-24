/** @format */

import { SearchForm } from "@/components/search-form";

export default function SearchPage() {
  return (
    <main className="mx-auto flex w-full max-w-[480px] flex-1 flex-col gap-6 px-5 pt-14 pb-8">
      <h1 className="text-[36px] leading-none font-extrabold tracking-tight">
        Where to?
      </h1>
      <SearchForm />
    </main>
  );
}
