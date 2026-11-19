import fs from "node:fs";
import path from "node:path";

// Researched write-ups for individual cafés (data/cafe-profiles.json, keyed by café id): a short story, menu highlights, hours, facts,
// links and the sources each came from. Kept apart from data/cafes/*.json because the weekly refresh rewrites those files.
// Only facts a named source states go in here; the sources are shown on the page.
export type CafeProfile = {
  about?: string;
  matcha?: string;
  menu?: { name: string; note?: string }[];
  hours?: string[];
  facts?: [string, string][];
  links?: { label: string; url: string }[];
  sources?: { label: string; url: string }[];
};

let all: Record<string, CafeProfile> | null = null;
export function getCafeProfile(id: string): CafeProfile | null {
  if (!all) {
    try {
      all = JSON.parse(fs.readFileSync(path.join(process.cwd(), "data", "cafe-profiles.json"), "utf8"));
    } catch {
      all = {};
    }
  }
  return all?.[id] ?? null;
}
