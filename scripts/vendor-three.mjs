/**
 * Copies three.module.js into js/vendor/ for offline 3D preview.
 * Usage: npm run vendor:three
 */
import { copyFileSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const THREE_VERSION_MODULE = "0.170.0";
const THREE_VERSION_RUNTIME = "0.160.1";
const srcModule = join(root, "node_modules", "three", "build", "three.module.js");
const srcMin = join(root, "node_modules", "three", "build", "three.min.js");
const vendorDir = join(root, "js", "vendor");
const destModule = join(vendorDir, "three.module.js");
const destMin = join(vendorDir, "three.min.js");
const versionFile = join(vendorDir, "three.version.txt");

function copyIfExists(src, dest, label) {
  try {
    readFileSync(src);
  } catch {
    console.warn("Skip " + label + " — not in node_modules. Use unpkg if needed.");
    return false;
  }
  copyFileSync(src, dest);
  console.log("Wrote", dest);
  return true;
}

mkdirSync(vendorDir, { recursive: true });
copyIfExists(srcModule, destModule, "three.module.js");
copyIfExists(srcMin, destMin, "three.min.js");
writeFileSync(
  versionFile,
  "module: " +
    THREE_VERSION_MODULE +
    " (three.module.js)\nruntime: " +
    THREE_VERSION_RUNTIME +
    " (three.min.js)\n",
  "utf8"
);

console.log("Version module:", THREE_VERSION_MODULE);
console.log("Version runtime:", THREE_VERSION_RUNTIME);
