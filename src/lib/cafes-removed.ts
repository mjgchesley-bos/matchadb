import fs from "node:fs";
import path from "node:path";

// Venues taken off the map: id -> [name, city, country, why]. Written by scripts/cafes/weekly/export_removed.py.
// Lets the staff log and a member's profile still say what a rated or commented café was after it left the map.
export type RemovedCafe = [name: string, city: string, cc: string, why: string];
let removed: Record<string, RemovedCafe> | null = null;
export function removedIndex(): Record<string, RemovedCafe> {
  if (removed) return removed;
  try {
    removed = JSON.parse(fs.readFileSync(path.join(process.cwd(), "data", "cafes-removed.json"), "utf8"));
  } catch {
    removed = {};
  }
  return removed!;
}
