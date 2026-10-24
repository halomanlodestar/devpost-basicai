/** @format */

import { SearchForm } from "@/components/search-form";

export default function SearchPage() {
  return (
    <main className="mx-auto w-full max-w-[480px] flex-1 px-4 pt-10 pb-8">
      <h1 className="mb-6 text-2xl font-semibold tracking-tight">
        Where are you headed?
      </h1>
      <SearchForm />
    </main>
  );
}
