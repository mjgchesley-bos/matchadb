import fs from "node:fs/promises";
import path from "node:path";
import { createHash } from "node:crypto";
import { GetObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";

// Community star ratings for products. One document per product holds every voter's
// rating, keyed by a hash of an anonymous browser id, so a returning voter updates
// their rating instead of adding a second one. In production each document is an S3
// object written with a conditional PutObject (If-Match on the ETag), so two people
// rating at once can never overwrite each other. In development a local file stands in
// so nothing touches the real bucket. The storage is behind two small functions
// (readDoc/writeDoc) so it can move to DynamoDB later without touching anything else.

// A score is only shown publicly once this many people have rated, so one person's mood
// is never mistaken for the product's score.
export const MIN_RATINGS_TO_SHOW = 5;
const MAX_VOTERS_PER_PRODUCT = 20000;

type Doc = { v: 1; votes: Record<string, number> };

export type RatingState = {
  // Whether ratings can be saved right now (storage configured and reachable).
  available: boolean;
  count: number;
  // Present only when count has reached MIN_RATINGS_TO_SHOW.
  average: number | null;
  // This browser's own rating, if it has rated.
  mine: number | null;
};

const bucket = process.env.RATINGS_S3_BUCKET || "";
const accessKeyId = process.env.RATINGS_ACCESS_KEY_ID || "";
const secretAccessKey = process.env.RATINGS_SECRET_ACCESS_KEY || "";
const region = process.env.RATINGS_AWS_REGION || "us-east-1";
const prefix = (process.env.RATINGS_PREFIX || "ratings").replace(/^\/+|\/+$/g, "");

const useS3 = Boolean(bucket && accessKeyId && secretAccessKey);
const useFile = !useS3 && process.env.NODE_ENV !== "production";
export const ratingsConfigured = useS3 || useFile;

let s3: S3Client | null = null;
function client(): S3Client {
  s3 ??= new S3Client({ region, credentials: { accessKeyId, secretAccessKey } });
  return s3;
}

const keyFor = (productId: number) => `${prefix}/product-${productId}.json`;
const devFile = (productId: number) => path.join(process.cwd(), ".ratings-dev", `product-${productId}.json`);

// Anonymous voter ids are never stored as-is.
const voterKey = (voterId: string) => createHash("sha256").update("matchadb-ratings:" + voterId).digest("hex").slice(0, 32);

async function readDoc(productId: number): Promise<{ doc: Doc; etag: string | null }> {
  if (useS3) {
    try {
      const res = await client().send(new GetObjectCommand({ Bucket: bucket, Key: keyFor(productId) }));
      const doc = JSON.parse((await res.Body?.transformToString()) ?? "{}") as Doc;
      return { doc: { v: 1, votes: doc.votes ?? {} }, etag: res.ETag ?? null };
    } catch (err) {
      if ((err as { name?: string }).name === "NoSuchKey") return { doc: { v: 1, votes: {} }, etag: null };
      throw err;
    }
  }
  try {
    const doc = JSON.parse(await fs.readFile(devFile(productId), "utf8")) as Doc;
    return { doc: { v: 1, votes: doc.votes ?? {} }, etag: null };
  } catch {
    return { doc: { v: 1, votes: {} }, etag: null };
  }
}

// Returns false when another write got in first (the caller re-reads and retries).
async function writeDoc(productId: number, doc: Doc, etag: string | null): Promise<boolean> {
  if (useS3) {
    try {
      await client().send(
        new PutObjectCommand({
          Bucket: bucket,
          Key: keyFor(productId),
          Body: JSON.stringify(doc),
          ContentType: "application/json",
          ...(etag ? { IfMatch: etag } : { IfNoneMatch: "*" }),
        })
      );
      return true;
    } catch (err) {
      const status = (err as { $metadata?: { httpStatusCode?: number } }).$metadata?.httpStatusCode;
      if (status === 412 || status === 409) return false;
      throw err;
    }
  }
  await fs.mkdir(path.dirname(devFile(productId)), { recursive: true });
  await fs.writeFile(devFile(productId), JSON.stringify(doc));
  return true;
}

function stateFrom(doc: Doc, voterId: string | null): RatingState {
  const values = Object.values(doc.votes);
  const count = values.length;
  const average = count >= MIN_RATINGS_TO_SHOW ? Math.round((values.reduce((a, b) => a + b, 0) / count) * 10) / 10 : null;
  const mine = voterId ? (doc.votes[voterKey(voterId)] ?? null) : null;
  return { available: true, count, average, mine };
}

export async function getRatingState(productId: number, voterId: string | null): Promise<RatingState> {
  if (!ratingsConfigured) return { available: false, count: 0, average: null, mine: null };
  try {
    return stateFrom((await readDoc(productId)).doc, voterId);
  } catch {
    return { available: false, count: 0, average: null, mine: null };
  }
}

// Ratings are half-star steps from 0.5 to 5.
export const isValidRating = (r: unknown): r is number => typeof r === "number" && Number.isFinite(r) && r >= 0.5 && r <= 5 && Math.round(r * 2) === r * 2;

export async function submitRating(productId: number, voterId: string, rating: number): Promise<RatingState> {
  if (!ratingsConfigured) throw new Error("ratings not configured");
  const key = voterKey(voterId);
  // A conditional write loses the race when someone else saved first; re-read and try again,
  // waiting a random, growing moment so simultaneous raters spread out instead of colliding again.
  for (let attempt = 0; attempt < 12; attempt++) {
    const { doc, etag } = await readDoc(productId);
    if (!(key in doc.votes) && Object.keys(doc.votes).length >= MAX_VOTERS_PER_PRODUCT) throw new Error("ratings full");
    doc.votes[key] = rating;
    if (await writeDoc(productId, doc, etag)) return stateFrom(doc, voterId);
    await new Promise((r) => setTimeout(r, Math.random() * 40 * (attempt + 1)));
  }
  throw new Error("ratings busy");
}
