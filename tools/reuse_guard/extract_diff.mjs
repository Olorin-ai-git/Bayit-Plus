#!/usr/bin/env node
// extract_diff.mjs — robust extractor with <PATCH> markers and fallbacks
import fs from "fs";
import path from "path";

const [, , inputPath, outputPath] = process.argv;
if (!inputPath || !outputPath) {
  console.error("Usage: node tools/reuse_guard/extract_diff.mjs <PATCH.txt> <patch.diff>");
  process.exit(2);
}

let raw = fs.readFileSync(inputPath, "utf8").replace(/^\uFEFF/, "").replace(/\r\n/g, "\n");
let diff = "";

// Prefer explicit markers
const m = raw.match(/<PATCH>\n([\s\S]*?)\n<\/PATCH>/i);
if (m && m[1]) diff = m[1].trim();

// Fallback 1: fenced code blocks
if (!diff) {
  const fenceRe = /```(?:diff|patch|git)?\n([\s\S]*?)\n```/gi;
  let best = ""; let mm;
  while ((mm = fenceRe.exec(raw)) !== null) if (mm[1].length > best.length) best = mm[1];
  if (best) diff = best.trim();
}

// Fallback 2: from 'diff --git' to end
if (!diff) {
  const idx = raw.indexOf("diff --git ");
  if (idx !== -1) diff = raw.slice(idx).trim();
}

// Fallback 3: from '---' header to end
if (!diff) {
  const hdr = raw.search(/^--- [^\n]+\n\+\+\+ [^\n]+\n/m);
  if (hdr !== -1) diff = raw.slice(hdr).trim();
}

// Final cleanup
diff = diff.replace(/```/g, "");
const headerIdx = (() => {
  const a = diff.indexOf("diff --git ");
  if (a !== -1) return a;
  const b = diff.indexOf("\n--- ");
  if (b !== -1) return b + 1;
  return 0;
})();
diff = diff.slice(headerIdx);

// Sanity check
if (!/^diff --git |^--- /m.test(diff)) {
  console.error("No unified diff detected in", inputPath);
  process.exit(3);
}

fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, diff + (diff.endsWith("\n") ? "" : "\n"), "utf8");
console.log("Wrote", outputPath);
