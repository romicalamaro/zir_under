/**
 * Convert shop source JPGs to resized WebP for the site.
 * Usage: node scripts/convert-shop-webp.mjs [sourceDir] [outputDir]
 */
import { mkdirSync, readdirSync, statSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");

const MAX_LONG_EDGE = 1600;
const WEBP_QUALITY = 82;

const sourceDir = resolve(root, process.argv[2] || "website/shop/name 1 big");
const outputDir = resolve(root, process.argv[3] || "website/shop/name 01");
mkdirSync(outputDir, { recursive: true });

function formatBytes(bytes) {
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
  return (bytes / (1024 * 1024)).toFixed(2) + " MB";
}

function naturalSort(a, b) {
  return a.localeCompare(b, undefined, { numeric: true, sensitivity: "base" });
}

const inputs = readdirSync(sourceDir)
  .filter((name) => /^\d+\.(jpe?g|png)$/i.test(name))
  .sort(naturalSort);

if (!inputs.length) {
  console.error("No JPEG files found in:", sourceDir);
  process.exit(1);
}

const rows = [];
let totalBefore = 0;
let totalAfter = 0;

for (const filename of inputs) {
  const inputPath = join(sourceDir, filename);
  const baseName = filename.replace(/\.[^.]+$/, "");
  const outputPath = join(outputDir, baseName + ".webp");
  const beforeBytes = statSync(inputPath).size;
  totalBefore += beforeBytes;

  const inputMeta = await sharp(inputPath).metadata();
  const beforeDims = inputMeta.width + "×" + inputMeta.height;

  await sharp(inputPath)
    .rotate()
    .resize({
      width: MAX_LONG_EDGE,
      height: MAX_LONG_EDGE,
      fit: "inside",
      withoutEnlargement: true,
    })
    .webp({ quality: WEBP_QUALITY })
    .toFile(outputPath);

  const outputMeta = await sharp(outputPath).metadata();
  const afterBytes = statSync(outputPath).size;
  totalAfter += afterBytes;
  const afterDims = outputMeta.width + "×" + outputMeta.height;
  const savings =
    beforeBytes > 0
      ? (((beforeBytes - afterBytes) / beforeBytes) * 100).toFixed(1) + "%"
      : "—";

  rows.push({
    file: baseName + ".webp",
    beforeDims,
    beforeBytes,
    afterDims,
    afterBytes,
    savings,
  });
}

console.log("\nShop image conversion report");
console.log("Source:", sourceDir);
console.log("Output:", outputDir);
console.log("Settings: max " + MAX_LONG_EDGE + "px long edge, WebP quality " + WEBP_QUALITY);
console.log("");

const header = [
  "File".padEnd(12),
  "Source dims".padEnd(14),
  "Source size".padEnd(12),
  "Output dims".padEnd(14),
  "Output size".padEnd(12),
  "Saved",
].join("  ");
console.log(header);
console.log("-".repeat(header.length));

for (const row of rows) {
  console.log(
    [
      row.file.padEnd(12),
      row.beforeDims.padEnd(14),
      formatBytes(row.beforeBytes).padEnd(12),
      row.afterDims.padEnd(14),
      formatBytes(row.afterBytes).padEnd(12),
      row.savings,
    ].join("  ")
  );
}

console.log("-".repeat(header.length));
console.log(
  "Total:".padEnd(12) +
    "  " +
    "".padEnd(14) +
    formatBytes(totalBefore).padEnd(12) +
    "  " +
    "".padEnd(14) +
    formatBytes(totalAfter).padEnd(12) +
    "  " +
    (((totalBefore - totalAfter) / totalBefore) * 100).toFixed(1) +
    "%"
);
