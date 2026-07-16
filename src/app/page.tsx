import Link from "next/link";
import { getStats } from "@/lib/db";

export default async function Home() {
  const { brandCount, productCount } = await getStats();

  return (
    <main className="flex-1 flex flex-col items-center justify-center px-6 text-center gap-8">
      <div className="max-w-2xl">
        <h1 className="text-4xl sm:text-5xl font-bold tracking-tight text-green-800 dark:text-green-400">
          MatchaDB
        </h1>
        <p className="mt-4 text-lg text-neutral-600 dark:text-neutral-300">
          A research database of matcha products &mdash; {productCount.toLocaleString()} products
          across {brandCount.toLocaleString()} brands, with sourcing, pricing, grade, and
          transparency data pulled directly from each brand&apos;s own product pages.
        </p>
      </div>
      <Link
        href="/browse"
        className="rounded-full bg-green-700 hover:bg-green-800 text-white px-8 py-3 text-lg font-medium transition-colors"
      >
        Browse the database
      </Link>
      <p className="text-sm text-neutral-500 dark:text-neutral-400 max-w-lg">
        A guided matching questionnaire and a sourcing map are coming in later phases &mdash; for
        now, explore the full catalog directly.
      </p>
    </main>
  );
}
