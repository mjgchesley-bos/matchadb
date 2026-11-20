import type { Metadata } from "next";
import { DemoCafeClient } from "@/components/DemoCafeClient";
import { langOf } from "@/i18n/params";

export const metadata: Metadata = { title: "Demo café owner", robots: { index: false, follow: false } };

export default async function DemoCafePage({ params }: { params: Promise<{ lang: string }> }) {
  await langOf(params);
  return <DemoCafeClient />;
}
