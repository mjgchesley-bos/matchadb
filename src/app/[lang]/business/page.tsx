import type { Metadata } from "next";
import { CafePageEditor } from "@/components/CafePageEditor";
import { langOf } from "@/i18n/params";

export const metadata: Metadata = { title: "Your café page", description: "Edit your café's page on MatchaDB.", robots: { index: false, follow: false } };

export default async function BusinessPage({ params }: { params: Promise<{ lang: string }> }) {
  await langOf(params);
  return (
    <main className="mx-auto w-full max-w-4xl flex-1 px-6 py-10">
      <p className="mb-2 font-mono text-xs uppercase tracking-[0.2em] text-forest">For café owners</p>
      <h1 className="font-display text-3xl font-semibold text-ink sm:text-4xl">Your café page</h1>
      <p className="mt-3 max-w-2xl text-ink-muted">Make your page your own: a cover photo, your story, hours, menu, photos, every social link and the products you sell. It&apos;s live the moment you save.</p>
      <div className="mt-8">
        <CafePageEditor />
      </div>
    </main>
  );
}
