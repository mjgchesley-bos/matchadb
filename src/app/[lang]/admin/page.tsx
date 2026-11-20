import type { Metadata } from "next";
import { AdminClient } from "@/components/AdminClient";
import { langOf } from "@/i18n/params";

export const metadata: Metadata = { title: "Dashboard", robots: { index: false, follow: false } };

export default async function AdminPage({ params }: { params: Promise<{ lang: string }> }) {
  await langOf(params);
  return <AdminClient />;
}
