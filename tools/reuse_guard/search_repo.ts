#!/usr/bin/env ts-node
import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const task = process.argv.slice(2).join(" ").trim();
if (!task) { console.error("Usage: search_repo <task>"); process.exit(1); }

const SYNONYMS: Record<string, string[]> = {
  slugify: ["toSlug", "kebab", "urlId", "normalizeSlug"],
  fetch: ["request", "axios", "useQuery", "query", "SWR"],
  auth: ["login", "token", "jwt", "session"],
  date: ["time", "parseISO", "format", "tz", "timezone"],
};

const terms = new Set(
  task.toLowerCase().split(/[^a-z0-9_]+/).filter(Boolean)
);
for (const t of Array.from(terms)) for (const s of SYNONYMS[t] ?? []) terms.add(s);

// Search in your two roots
const SEARCH_GLOBS = ["olorin-front", "olorin-server"].filter(fs.existsSync);

const rgQuery = Array.from(terms).map((t) => `-e ${JSON.stringify(t)}`).join(" ");
const rgCmd = `rg -n --no-heading --hidden --glob '!**/dist/**' --glob '!**/build/**' ${rgQuery} ${SEARCH_GLOBS.join(" ")} | head -n 300`;

let hits = "";
try { hits = execSync(rgCmd, { encoding: "utf8" }); } catch { hits = ""; }

let tree = "";
try {
  tree = execSync(`git ls-files | egrep '^(${SEARCH_GLOBS.join("|")})/' | head -n 2000`, { encoding: "utf8" });
} catch {
  const walk = (d: string): string[] =>
    fs.readdirSync(d).flatMap((n) => {
      const p = path.join(d, n); const st = fs.statSync(p);
      return st.isDirectory() ? walk(p) : [p];
    });
  tree = SEARCH_GLOBS.flatMap(walk).slice(0, 2000).join("\n");
}

const out = `# TASK
${task}

# FILE_TREE (partial)
${tree}

# SEARCH_RESULTS (file:line: text)
${hits || "(no matches)"}\n`;

fs.mkdirSync("tools/reuse_guard/tmp", { recursive: true });
fs.writeFileSync("tools/reuse_guard/tmp/SEARCH_RESULTS.md", out, "utf8");
console.log("Wrote tools/reuse_guard/tmp/SEARCH_RESULTS.md");
