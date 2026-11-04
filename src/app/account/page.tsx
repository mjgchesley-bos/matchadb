import type { Metadata } from "next";
import { AccountClient } from "@/components/AccountClient";

export const metadata: Metadata = {
  title: "My matcha",
  description: "Your saved products, ratings and reviews.",
  robots: { index: false, follow: false },
};

export default function AccountPage() {
  return <AccountClient />;
}
