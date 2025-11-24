#!/usr/bin/env node
// codegen.mjs — Anthropic (marker-enforced unified diff)
import fs from "fs";

const apiKey = process.env.ANTHROPIC_API_KEY;
if (!apiKey) { console.error("ERROR: ANTHROPIC_API_KEY is not set"); process.exit(2); }

const MODEL = process.env.LLM_MODEL || "haiku-4-5";

const task = process.argv.slice(2).join(" ").trim();
if (!task) { console.error("Usage: codegen <task>"); process.exit(1); }

const search = fs.existsSync("tools/reuse_guard/tmp/SEARCH_RESULTS.md")
  ? fs.readFileSync("tools/reuse_guard/tmp/SEARCH_RESULTS.md", "utf8")
  : "(no search results provided)";
const utilRegistry = fs.existsSync("UTILITIES.md")
  ? fs.readFileSync("UTILITIES.md", "utf8")
  : "(none)";

const system = `ROLE: Repo Reuse Enforcer

RESPONSE FORMAT REQUIREMENT (STRICT):
- You MUST return ONLY the git unified diff between <PATCH> and </PATCH> markers.
- Start the diff with 'diff --git a/<path> b/<path>' for each file.
- No commentary, no code fences, no analysis outside the markers.
- If you cannot produce a valid diff, return:
<PATCH>
EMPTY
</PATCH>
`;

const user = `TASK:
${task}

REPO_INDEX:
${search}

UTILITY_REGISTRY:
${utilRegistry}

OUTPUT:
Return ONLY:
<PATCH>
<valid git unified diff here>
</PATCH>
`;

const res = await fetch("https://api.anthropic.com/v1/messages", {
  method: "POST",
  headers: {
    "content-type": "application/json",
    "x-api-key": apiKey,
    "anthropic-version": "2023-06-01"
  },
  body: JSON.stringify({
    model: MODEL,
    max_tokens: 4096,
    temperature: 0.0,
    system,
    messages: [{ role: "user", content: user }]
  })
});

if (!res.ok) {
  const text = await res.text();
  console.error("Anthropic API error:", text);
  process.exit(3);
}

const data = await res.json();
const content = (data.content || []).filter(p => p.type === "text").map(p => p.text).join("\n");
fs.writeFileSync("tools/reuse_guard/tmp/PATCH.txt", content || "", "utf8");
console.log("Wrote tools/reuse_guard/tmp/PATCH.txt");
