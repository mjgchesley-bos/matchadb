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

// Cafés that also sell packaged matcha to take home (public/data/take-home.json, the list the Matcha map's "Shop" filter reads). One profile, two roles.
let takeHome: Set<string> | null = null;
export function isTakeHome(id: string): boolean {
  if (!takeHome) {
    try {
      takeHome = new Set(JSON.parse(fs.readFileSync(path.join(process.cwd(), "public", "data", "take-home.json"), "utf8")) as string[]);
    } catch {
      takeHome = new Set();
    }
  }
  return takeHome.has(id);
}

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

// Facts read from a café's own website by the crawl (data/cafe-extras.json, keyed by café id): phone, opening hours, a one-line
// description and social profiles. Hours and phone are only kept for cafés that have a website of their own (not shared by a chain).
export type CafeExtras = { phone?: string; hours?: string[]; desc?: string; social?: Record<string, string>; host?: string };
let extras: Record<string, CafeExtras> | null = null;
export function getCafeExtras(id: string): CafeExtras | null {
  if (!extras) {
    try {
      extras = JSON.parse(fs.readFileSync(path.join(process.cwd(), "data", "cafe-extras.json"), "utf8"));
    } catch {
      extras = {};
    }
  }
  return extras?.[id] ?? null;
}
