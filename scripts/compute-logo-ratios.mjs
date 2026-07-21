// One-off: reads each logo file's real intrinsic dimensions and bakes a
// width/height ratio into brand-logos.json. Needed because CSS width:auto
// height:auto on an <img> is underdetermined for SVGs with no explicit
// width/height attribute (Ippodo's logo has only a viewBox) -- browsers
// resolve that case inconsistently, which is what caused it to render as
// a near-invisible sliver. Baking a concrete ratio removes the ambiguity.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const logosDir = path.join(__dirname, "..", "public", "logos");
const manifestPath = path.join(__dirname, "..", "src", "lib", "brand-logos.json");

const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));

function pngDimensions(buf) {
  // IHDR chunk: 8-byte signature, then 4-byte length, 4-byte "IHDR", then
  // width (4 bytes BE) and height (4 bytes BE).
  const width = buf.readUInt32BE(16);
  const height = buf.readUInt32BE(20);
  return { width, height };
}

function jpegDimensions(buf) {
  let offset = 2; // skip SOI marker
  while (offset < buf.length) {
    if (buf[offset] !== 0xff) {
      offset++;
      continue;
    }
    const marker = buf[offset + 1];
    // SOFn markers (baseline/progressive), excluding DHT/JPG/DAC
    const isSOF =
      (marker >= 0xc0 && marker <= 0xc3) ||
      (marker >= 0xc5 && marker <= 0xc7) ||
      (marker >= 0xc9 && marker <= 0xcb) ||
      (marker >= 0xcd && marker <= 0xcf);
    if (isSOF) {
      const height = buf.readUInt16BE(offset + 5);
      const width = buf.readUInt16BE(offset + 7);
      return { width, height };
    }
    const segmentLength = buf.readUInt16BE(offset + 2);
    offset += 2 + segmentLength;
  }
  return null;
}

function webpDimensions(buf) {
  const fourCC = buf.toString("ascii", 12, 16);
  if (fourCC === "VP8X") {
    const width = 1 + (buf[24] | (buf[25] << 8) | (buf[26] << 16));
    const height = 1 + (buf[27] | (buf[28] << 8) | (buf[29] << 16));
    return { width, height };
  }
  if (fourCC === "VP8 ") {
    const width = buf.readUInt16LE(26) & 0x3fff;
    const height = buf.readUInt16LE(28) & 0x3fff;
    return { width, height };
  }
  if (fourCC === "VP8L") {
    const bits = buf.readUInt32LE(21);
    const width = (bits & 0x3fff) + 1;
    const height = ((bits >> 14) & 0x3fff) + 1;
    return { width, height };
  }
  return null;
}

function icoDimensions(buf) {
  // ICONDIR: reserved(2) type(2) count(2), then ICONDIRENTRY[count]: width(1) height(1) ...
  const width = buf[6] || 256;
  const height = buf[7] || 256;
  return { width, height };
}

function svgDimensions(text) {
  const viewBoxMatch = text.match(/viewBox=["']\s*([\d.+-]+)\s+([\d.+-]+)\s+([\d.+-]+)\s+([\d.+-]+)\s*["']/i);
  if (viewBoxMatch) {
    const width = parseFloat(viewBoxMatch[3]);
    const height = parseFloat(viewBoxMatch[4]);
    if (width > 0 && height > 0) return { width, height };
  }
  const widthMatch = text.match(/\bwidth=["']\s*([\d.]+)/i);
  const heightMatch = text.match(/\bheight=["']\s*([\d.]+)/i);
  if (widthMatch && heightMatch) {
    const width = parseFloat(widthMatch[1]);
    const height = parseFloat(heightMatch[1]);
    if (width > 0 && height > 0) return { width, height };
  }
  return null;
}

const result = {};
const missing = [];

for (const [slug, entry] of Object.entries(manifest)) {
  const filename = typeof entry === "string" ? entry : entry.file;
  const filePath = path.join(logosDir, filename);
  const ext = path.extname(filename).toLowerCase();
  let dims = null;
  try {
    if (ext === ".png") {
      dims = pngDimensions(fs.readFileSync(filePath));
    } else if (ext === ".svg") {
      dims = svgDimensions(fs.readFileSync(filePath, "utf8"));
    } else if (ext === ".jpg" || ext === ".jpeg") {
      dims = jpegDimensions(fs.readFileSync(filePath));
    } else if (ext === ".webp") {
      dims = webpDimensions(fs.readFileSync(filePath));
    } else if (ext === ".ico") {
      dims = icoDimensions(fs.readFileSync(filePath));
    }
  } catch (err) {
    console.error(`${slug} (${filename}): ${err.message}`);
  }
  if (!dims) {
    missing.push(`${slug} (${filename})`);
    result[slug] = { file: filename, ratio: 1 };
    continue;
  }
  result[slug] = { file: filename, ratio: Math.round((dims.width / dims.height) * 1000) / 1000 };
}

fs.writeFileSync(manifestPath, JSON.stringify(result, null, 2) + "\n");

console.log(`Wrote ratios for ${Object.keys(result).length} logos.`);
if (missing.length > 0) {
  console.log(`Could not determine dimensions (defaulted to ratio 1) for:`);
  missing.forEach((m) => console.log(`  - ${m}`));
}
