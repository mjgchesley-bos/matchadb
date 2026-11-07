"use client";

import NextLink from "next/link";
import type { ComponentProps } from "react";
import { useLang } from "./client";
import { localePath } from "./config";

// Drop-in for next/link: internal links keep the visitor's language (/browse -> /ja/browse).
export default function Link({ href, ...rest }: ComponentProps<typeof NextLink>) {
  const lang = useLang();
  if (typeof href === "string") return <NextLink href={localePath(lang, href)} {...rest} />;
  if (href && typeof href === "object" && typeof href.pathname === "string") return <NextLink href={{ ...href, pathname: localePath(lang, href.pathname) }} {...rest} />;
  return <NextLink href={href} {...rest} />;
}
