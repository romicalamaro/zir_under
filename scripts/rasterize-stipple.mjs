/**
 * One-time rasterizer: SVG stipple → PNG at canvas size (827×2126).
 * Usage: node scripts/rasterize-stipple.mjs [input.svg] [output.png]
 */
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { Resvg } from "@resvg/resvg-js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");

const CANVAS_W = 827;
const CANVAS_H = 2126;

const inputSvg = resolve(root, process.argv[2] || "stipple-1780673179311.svg");
const outputPng = resolve(root, process.argv[3] || "stipple-1780673179311.png");

const svgText = readFileSync(inputSvg, "utf8");
const resvg = new Resvg(svgText, {
  fitTo: { mode: "width", value: CANVAS_W },
  background: "white",
});
const rendered = resvg.render();
const pngData = rendered.asPng();

writeFileSync(outputPng, pngData);
console.log("Wrote", outputPng, `(${CANVAS_W}×${CANVAS_H} target width)`);
