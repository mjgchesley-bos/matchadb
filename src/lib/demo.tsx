"use client";

import { createContext, useContext } from "react";
import { supabase } from "@/lib/supabase";
import { demoMedia } from "@/lib/demo-media";

// Demo mode for the staff dashboard: the real café-owner screens run against an in-memory fake of the few database calls they make, so a staff member
// can try every button without creating an account or touching real data. Nothing here is sent anywhere; a reload resets it.
export const DemoCtx = createContext(false);
export const DEMO_CAFE = { id: "demo-cafe", name: "The Demo Matcha House", city: "Nowhere", slug: "" };

// What "Fill in from public info" returns in the demo (a real café gets this from its own website).
export const DEMO_SUGGESTIONS = {
  order_url: "https://order.toasttab.com/online/demo-matcha-house",
  reservation_url: "https://www.opentable.com/r/demo-matcha-house",
  links: { facebook: "https://facebook.com/demomatchahouse", tiktok: "https://tiktok.com/@demomatchahouse", yelp: "https://yelp.com/biz/demo-matcha-house", google_maps: "https://maps.app.goo.gl/demo12345" },
  amenities: ["Ceremonial matcha", "Oat milk", "Seating", "Takeaway", "Free Wi-Fi", "Outdoor seating"],
};

type Row = Record<string, unknown>;
type Result = { data: unknown; error: { message: string } | null };
let seq = 100;
const uuid = () => `demo-${++seq}`;

function seed(): Record<string, Row[]> {
  return {
    cafe_owners: [{ cafe_id: DEMO_CAFE.id }],
    profiles: [{ id: "demo-owner", account_type: "cafe_owner", banner_path: null }],
    cafe_pages: [{
      cafe_id: DEMO_CAFE.id, tagline: "Ceremonial matcha, whisked to order", accent: "pink",
      bio: "We are a tiny, made-up matcha bar that exists only to show café owners what their page can do. Everything on this screen is editable and nothing is saved anywhere.",
      matcha_info: "Ceremonial grade from Uji, Kyoto, stone-ground and whisked to order", announcement: "Demo special: iced strawberry matcha, two for one on Fridays.",
      cover_path: null, hours: { mon: "8am to 4pm", tue: "8am to 4pm", wed: "8am to 4pm", thu: "8am to 6pm", fri: "8am to 6pm", sat: "9am to 6pm", sun: "Closed" },
      phone: "(555) 010-0199", public_email: "hello@demomatchahouse.example", website_url: "https://example.com", order_url: null, reservation_url: null,
      links: { instagram: "https://instagram.com/demomatchahouse" }, amenities: [],
    }],
    cafe_photos: [],
    cafe_menu_files: [],
    cafe_menu_items: [
      { id: 1, cafe_id: DEMO_CAFE.id, name: "Ceremonial matcha, hot", price: "$6", description: "Whisked to order, 4 g of first-flush Uji matcha", is_matcha: true },
      { id: 2, cafe_id: DEMO_CAFE.id, name: "Iced strawberry matcha latte", price: "$7.50", description: "House strawberry purée, oat milk", is_matcha: true },
      { id: 3, cafe_id: DEMO_CAFE.id, name: "Hojicha latte", price: "$6", description: null, is_matcha: false },
    ],
    business_products: [
      { id: "p1", user_id: "demo-owner", name: "House ceremonial matcha, 30 g tin", description: "The matcha we serve at the bar, packed in a light-proof tin.", price: "$28 / 30 g", url: "https://example.com/matcha" },
      { id: "p2", user_id: "demo-owner", name: "Bamboo whisk and scoop set", description: "Hand-carved chasen with a matching chashaku.", price: "$22", url: null },
      { id: "p3", user_id: "demo-owner", name: "Gift box: tin, whisk, bowl", description: "Everything to make a first bowl at home.", price: "$64", url: "https://example.com/gift" },
    ],
    account_requests: [],
  };
}

class Q {
  private op: "select" | "insert" | "upsert" | "update" | "delete" = "select";
  private payload: Row = {};
  private filters: [string, unknown][] = [];
  private one: "single" | "maybe" | null = null;
  private orderBy: string | null = null;
  private onConflict = "id";
  constructor(private db: Record<string, Row[]>, private table: string) {}
  select() { return this; }
  insert(v: Row) { this.op = "insert"; this.payload = v; return this; }
  upsert(v: Row, o?: { onConflict?: string }) { this.op = "upsert"; this.payload = v; this.onConflict = o?.onConflict ?? "id"; return this; }
  update(v: Row) { this.op = "update"; this.payload = v; return this; }
  delete() { this.op = "delete"; return this; }
  eq(c: string, v: unknown) { this.filters.push([c, v]); return this; }
  order(c: string) { this.orderBy = c; return this; }
  single() { this.one = "single"; return this; }
  maybeSingle() { this.one = "maybe"; return this; }
  private match(r: Row) { return this.filters.every(([c, v]) => r[c] === v); }
  private run(): Result {
    const rows = (this.db[this.table] ??= []);
    const limits: Record<string, number> = { cafe_photos: 16, cafe_menu_files: 6, business_products: 60 };
    let out: Row[] = [];
    if (this.op === "insert") {
      if (limits[this.table] && rows.length >= limits[this.table]) return { data: null, error: { message: "limit" } };
      const row: Row = { id: this.table === "cafe_menu_items" ? ++seq : uuid(), is_matcha: true, ...this.payload };
      rows.push(row);
      out = [row];
    } else if (this.op === "upsert") {
      const k = this.onConflict;
      let row = rows.find((r) => r[k] === this.payload[k]);
      if (row) Object.assign(row, this.payload);
      else { row = { ...this.payload }; rows.push(row); }
      out = [row];
    } else if (this.op === "update") {
      out = rows.filter((r) => this.match(r));
      out.forEach((r) => Object.assign(r, this.payload));
    } else if (this.op === "delete") {
      this.db[this.table] = rows.filter((r) => !this.match(r));
    } else out = rows.filter((r) => this.match(r));
    if (this.orderBy && this.op === "select") {
      const k = this.orderBy;
      out = [...out].sort((a, b) => String(a[k] ?? "").localeCompare(String(b[k] ?? ""), undefined, { numeric: true }));
    }
    const plain = out.map((r) => ({ ...r }));
    if (this.one) return { data: plain[0] ?? null, error: this.one === "single" && !plain[0] ? { message: "no row" } : null };
    return { data: plain, error: null };
  }
  then<T>(res: (v: Result) => T, rej?: (e: unknown) => T) { return Promise.resolve(this.run()).then(res, rej); }
}

function makeDemoClient() {
  const db = seed();
  return {
    from: (t: string) => new Q(db, t),
    storage: {
      from: () => ({
        upload: async (path: string, body: Blob) => { demoMedia.set(path, URL.createObjectURL(body)); return { data: { path }, error: null }; },
        remove: async (paths: string[]) => { paths.forEach((p) => demoMedia.delete(p)); return { data: null, error: null }; },
      }),
    },
    auth: { getSession: async () => ({ data: { session: null } }) },
  };
}

// Components call this instead of the shared client: inside the demo they get the fake, everywhere else the real one.
let fake: typeof supabase | null = null;
export function useSb(): typeof supabase {
  const demo = useContext(DemoCtx);
  if (!demo) return supabase;
  if (!fake) { const c = makeDemoClient(); fake = (() => c) as unknown as typeof supabase; }
  return fake;
}
export const resetDemo = () => { fake = null; demoMedia.clear(); };
