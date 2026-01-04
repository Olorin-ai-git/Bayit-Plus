#!/usr/bin/env node
import fs from "fs";

const apiKey = process.env.ANTHROPIC_API_KEY;
if (!apiKey) { console.error("ERROR: ANTHROPIC_API_KEY is not set"); process.exit(2); }

const MODEL = process.env.LLM_MODEL || "haiku-4-5";

const task = process.argv.slice(2).join(" ").trim();
if (!task) { console.error("Usage: codegen <task>"); process.exit(1); }

const search = fs.readFileSync("tools/reuse_guard/tmp/SEARCH_RESULTS.md", "utf8");
const utilRegistry = fs.existsSync("UTILITIES.md") ? fs.readFileSync("UTILITIES.md", "utf8") : "(none)";

const system = `ROLE: Repo Reuse Enforcer
- Read SEARCH_RESULTS and FILE_TREE; list candidates; choose REUSE | EXTEND | NEW.
- Prefer EXTEND if anything partially fits.
- If SEARCH_RESULTS not empty and you choose NEW, justify why reuse won't work.
- Output only a unified diff (git patch). Minimal changes. No generic *Util/*Helper if similar exists.
- End with "TODO (tests): ...")`;

const user = `TASK:
${task}

REPO_INDEX:
${search}

UTILITY_REGISTRY:
${utilRegistry}

OUTPUT FORMAT:
<Decision>
<Candidates...>
<Unified Diff>
<TODO (tests): ...>
`;

const body = {
  model: MODEL,
  max_tokens: 4096,
  temperature: 0.1,
  system,
  messages: [{ role: "user", content: user }]
};

const res = await fetch("https://api.anthropic.com/v1/messages", {
  method: "POST",
  headers: {
    "content-type": "application/json",
    "x-api-key": apiKey,
    "anthropic-version": "2023-06-01"
  },
  body: JSON.stringify(body)
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
