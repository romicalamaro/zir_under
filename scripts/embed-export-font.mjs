import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const fontPath = path.join(root, "fonts/DIN Condensed Bold.ttf");
const buf = fs.readFileSync(fontPath);
const dataUri = "data:font/ttf;base64," + buf.toString("base64");
const out =
  "/** Auto-generated embedded DIN Condensed Bold for SVG export (Illustrator-safe outlines) */\n" +
  "(function (global) {\n" +
  '  "use strict";\n' +
  '  global.DIN_CONDENSED_EXPORT_FONT_DATA_URI = "' +
  dataUri +
  '";\n' +
  "})(typeof window !== \"undefined\" ? window : this);\n";
fs.writeFileSync(path.join(root, "js/exportFontData.js"), out);
console.log(
  "Wrote js/exportFontData.js (" +
    Math.round(buf.length / 1024) +
    " KB, DIN Condensed Bold)"
);
