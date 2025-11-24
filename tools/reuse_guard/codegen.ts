#!/usr/bin/env ts-node
import fs from "node:fs";
import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const MODEL = process.env.LLM_MODEL ?? "claude-3-5-sonnet-20240620";

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

(async () => {
  const res = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 4096,
    temperature: 0.1,
    system,
    messages: [{ role: "user", content: user }],
  });
  const textParts = res.content
    .filter((p: any) => p.type === "text")
    .map((p: any) => p.text);
  const content = textParts.join("\n");
  fs.writeFileSync("tools/reuse_guard/tmp/PATCH.txt", content, "utf8");
  console.log("Wrote tools/reuse_guard/tmp/PATCH.txt");
})();
