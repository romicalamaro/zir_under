import sharp from "sharp";
import { stat } from "node:fs/promises";
import path from "node:path";

const dir = "website/home";
const targets = ["10.png"];
const MAX_WIDTH = 2048;
const QUALITY = 80;

function kb(bytes) {
  return (bytes / 1024).toFixed(0) + " KB";
}

for (const file of targets) {
  const input = path.join(dir, file);
  const base = file.replace(/\.[^.]+$/, "");
  const output = path.join(dir, `${base}.webp`);

  const before = (await stat(input)).size;

  await sharp(input)
    .resize({ width: MAX_WIDTH, withoutEnlargement: true })
    .webp({ quality: QUALITY })
    .toFile(output);

  const after = (await stat(output)).size;
  console.log(`${file} (${kb(before)}) -> ${base}.webp (${kb(after)})`);
}

console.log("Done.");
