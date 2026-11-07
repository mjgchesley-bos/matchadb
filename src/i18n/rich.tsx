import { Fragment, type ReactNode } from "react";

// Put links or bold text inside a translated sentence: rich("Tell us {link}.", { link: <a>…</a> }).
// Placeholders without a matching part are left as written.
export function rich(msg: string, parts: Record<string, ReactNode>): ReactNode {
  const pieces = msg.split(/(\{\w+\})/g);
  return pieces.map((p, i) => {
    const m = /^\{(\w+)\}$/.exec(p);
    if (m && m[1] in parts) return <Fragment key={i}>{parts[m[1]]}</Fragment>;
    return <Fragment key={i}>{p}</Fragment>;
  });
}
