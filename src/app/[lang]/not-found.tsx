import type { Metadata } from "next";
import { NotFoundBody } from "@/components/NotFoundBody";

// A missing product/brand page shouldn't count against the site in search
// (noindex) but should still send visitors somewhere useful rather than a dead end.
export const metadata: Metadata = {
  title: "Page Not Found",
  robots: { index: false, follow: true },
};

export default function NotFound() {
  return <NotFoundBody />;
}
