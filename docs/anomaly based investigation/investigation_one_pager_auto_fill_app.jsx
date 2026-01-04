import React, { useMemo, useState } from "react";

// Investigation One‑Pager — Auto‑Fill App
// Paste an anomaly JSON payload (and optional context) on the left,
// render a printable one‑pager on the right. Includes Copy Markdown & Print.
// Tailwind CSS expected. No external deps.

// ---------- Types (loose to be forgiving) ----------

type Cohort = { merchant_id?: string; channel?: string; geo?: string };

type Anomaly = {
  id?: string;
  metric?: string;
  cohort?: Cohort;
  window_start?: string;
  window_end?: string;
  observed?: number;
  expected?: number;
  score?: number;
  severity?: "info" | "warn" | "critical" | string;
  persisted_n?: number;
  evidence?: Record<string, unknown>;
  links?: { anomaly?: string; detector?: string; dashboard?: string; related_cases?: string };
};

type Context = {
  top_entities?: Array<{ type?: string; id?: string; score?: number }>;
  related_cases?: Array<{ id?: string; title?: string; ts?: string }>;
  notable_txns?: Array<{ id?: string; amount?: number; ts?: string; reason?: string }>;
  sumo_signals?: Array<{ type?: string; severity?: string; message?: string; ts?: string }>;
  notes?: string;
};

// ---------- Sample payload ----------
const SAMPLE: { anomaly: Anomaly; context: Context } = {
  anomaly: {
    id: "a_123",
    metric: "decline_rate",
    cohort: { merchant_id: "m_001", channel: "web", geo: "US-CA" },
    window_start: "2025-11-09T10:15:00Z",
    window_end: "2025-11-09T10:30:00Z",
    observed: 0.24,
    expected: 0.08,
    score: 5.1,
    severity: "critical",
    persisted_n: 2,
    evidence: { stl: 4.8, cusum: 3.9 },
    links: {
      anomaly: "https://example.intuit/anomalies/a_123",
      detector: "https://example.intuit/detectors/d_456",
      dashboard: "https://example.intuit/dash/decline-rate",
      related_cases: "https://example.intuit/cases?q=merchant%3Am_001",
    },
  },
  context: {
    top_entities: [
      { type: "issuer", id: "iss_12•••78", score: 0.83 },
      { type: "asn", id: "AS12345", score: 0.74 },
    ],
    related_cases: [
      { id: "INV-20251003-0912", title: "Issuer Y partial outage", ts: "2025-10-03T09:12:00Z" },
    ],
    notable_txns: [
      { id: "t_101", amount: 129.5, ts: "2025-11-09T10:19:00Z", reason: "05" },
      { id: "t_102", amount: 242.0, ts: "2025-11-09T10:22:00Z", reason: "05" },
    ],
    sumo_signals: [
      { type: "auth", severity: "high", message: "issuer auth error spike", ts: "2025-11-09T10:12:00Z" },
    ],
    notes: "Reason code 05 dominated; spike localized to web in US-CA; merchant m_001." ,
  },
};

// ---------- Helpers ----------

const maskId = (s?: string) => (s ? s.replace(/([0-9]{2})[0-9]{2,}([0-9]{2})/, "$1•••$2") : "–");
const pct = (v?: number) => (typeof v === "number" ? `${(v * 100).toFixed(1)}%` : "–");
const fmt = (s?: string) => (s ? new Date(s).toLocaleString() : "–");

function buildMarkdown(a: Anomaly, ctx: Context): string {
  const c = a.cohort || {};
  const ratio = a.expected ? (a.observed || 0) / (a.expected || 1e-9) : 0;
  return [
    `# Incident — ${a.metric || "metric"} anomaly`,
    "",
    `**Cohort:** merchant=${c.merchant_id || "–"} • channel=${c.channel || "–"} • geo=${c.geo || "–"}`,
    `**Window:** ${fmt(a.window_start)} → ${fmt(a.window_end)}`,
    `**Observed vs Expected:** ${typeof a.observed === "number" ? a.observed : "–"} vs ${typeof a.expected === "number" ? a.expected : "–"}`,
    `**Score:** ${a.score ?? "–"}  • **Severity:** ${a.severity || "–"}  • **Persistence:** ${a.persisted_n ?? "–"}`,
    "",
    "## What happened",
    `Spike/dip detected in ${a.metric}; ratio to expected ≈ ${(ratio || 0).toFixed(2)}x.`,
    "",
    "## Scope & impact",
    `Affected cohort as above; verify volumes in dashboard: ${(a.links?.dashboard) || "(add link)"}.`,
    "",
    "## Hypotheses",
    "1. Issuer-side issue or routing imbalance",
    "2. Fraud burst targeting web in US-CA",
    "3. Benign config/release nearby",
    "",
    "## Immediate checks",
    "- Reason code mix before vs during\n- Issuer & BIN splits\n- Device/IP/ASN clusters\n- Sumo auth/error signals",
    "",
    "## Context",
    `- top_entities: ${JSON.stringify(ctx.top_entities || [])}`,
    `- related_cases: ${JSON.stringify(ctx.related_cases || [])}`,
    `- notable_txns: ${JSON.stringify(ctx.notable_txns || [])}`,
    `- sumo_signals: ${JSON.stringify(ctx.sumo_signals || [])}`,
  ].join("\n");
}

// ---------- Main Component ----------

export default function OnePagerAutoFill() {
  const [jsonText, setJsonText] = useState<string>(JSON.stringify(SAMPLE, null, 2));
  const [parseErr, setParseErr] = useState<string>("");

  const { anomaly, context }: { anomaly: Anomaly; context: Context } = useMemo(() => {
    try {
      const parsed = JSON.parse(jsonText || "{}");
      setParseErr("");
      return { anomaly: parsed.anomaly || {}, context: parsed.context || {} };
    } catch (e: any) {
      setParseErr(e?.message || "Invalid JSON");
      return { anomaly: {}, context: {} } as any;
    }
  }, [jsonText]);

  const markdown = useMemo(() => buildMarkdown(anomaly, context), [anomaly, context]);

  const copyMarkdown = async () => {
    try {
      await navigator.clipboard.writeText(markdown);
      alert("Markdown copied");
    } catch (e) {
      alert("Copy failed; select and copy manually.");
    }
  };

  const ratio = anomaly.expected ? ((anomaly.observed || 0) / (anomaly.expected || 1e-9)) : undefined;

  return (
    <div className="min-h-screen px-6 py-6 bg-[radial-gradient(1200px_800px_at_80%_-10%,rgba(139,92,246,.15),transparent_60%),radial-gradient(900px_600px_at_-10%_20%,rgba(56,189,248,.12),transparent_60%),#0b0b12] text-[#e9e7ff]">
      <header className="sticky top-0 z-20 backdrop-blur border-b border-[rgba(139,92,246,.35)] bg-[#0b0b12]/70 px-4 py-3 rounded-xl">
        <div className="flex items-center justify-between gap-4">
          <div>
            <div className="text-xs text-[#a5a1c2]">Investigations</div>
            <h1 className="text-lg font-semibold">Investigation One‑Pager (Auto‑Fill)</h1>
          </div>
          <div className="flex gap-2">
            <button type="button" onClick={() => setJsonText(JSON.stringify(SAMPLE, null, 2))} className="px-3 py-2 rounded-lg border border-[rgba(139,92,246,.35)] hover:shadow-[0_0_20px_rgba(139,92,246,.25)]">Load sample</button>
            <button type="button" onClick={() => window.print()} className="px-3 py-2 rounded-lg border border-[rgba(139,92,246,.35)] bg-gradient-to-b from-[#8b5cf6] to-[#6d28d9] hover:shadow-[0_0_28px_rgba(139,92,246,.35)]">Print</button>
            <button type="button" onClick={copyMarkdown} className="px-3 py-2 rounded-lg border border-[rgba(139,92,246,.35)]">Copy Markdown</button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto mt-6 grid grid-cols-1 lg:grid-cols-[420px_1fr] gap-4">
        {/* Left: JSON input */}
        <aside className="border border-white/10 rounded-2xl bg-[#0f0f18] p-4">
          <div className="font-semibold mb-2">Paste anomaly payload</div>
          <textarea
            value={jsonText}
            onChange={(e) => setJsonText(e.target.value)}
            className="w-full h-[420px] bg-[#10101a] border border-white/15 rounded-lg p-2 font-mono text-xs"
            spellCheck={false}
          />
          {parseErr ? (
            <div className="mt-2 text-xs text-red-400">{parseErr}</div>
          ) : (
            <div className="mt-2 text-xs text-[#a5a1c2]">JSON OK</div>
          )}
          <div className="mt-3 text-xs text-[#a5a1c2]">
            Expected shape: {`{ anomaly: {...}, context: {...} }`}
          </div>
        </aside>

        {/* Right: One‑pager view */}
        <section className="border border-white/10 rounded-2xl bg-[#0f0f18] p-5 print:bg-white print:text-black print:border-0">
          <div className="flex items-start justify-between">
            <div>
              <div className="text-sm text-[#a5a1c2]">Case</div>
              <h2 className="text-xl font-semibold">Investigation from Anomaly</h2>
            </div>
            <div className="text-right text-xs text-[#a5a1c2]">
              <div>Generated: {new Date().toLocaleString()}</div>
            </div>
          </div>
          <hr className="my-3 border-white/10" />

          {/* 1) Incident Snapshot */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
            <div><span className="text-[#a5a1c2]">Metric:</span> {anomaly.metric || "–"}</div>
            <div><span className="text-[#a5a1c2]">Cohort:</span> merchant={anomaly.cohort?.merchant_id || "–"} • channel={anomaly.cohort?.channel || "–"} • geo={anomaly.cohort?.geo || "–"}</div>
            <div><span className="text-[#a5a1c2]">Window:</span> {fmt(anomaly.window_start)} → {fmt(anomaly.window_end)}</div>
            <div><span className="text-[#a5a1c2]">Observed vs Expected:</span> {typeof anomaly.observed === "number" ? anomaly.observed : "–"} vs {typeof anomaly.expected === "number" ? anomaly.expected : "–"} {anomaly.metric?.includes("rate") ? ` (${pct(anomaly.observed)} vs ${pct(anomaly.expected)})` : ""}</div>
            <div><span className="text-[#a5a1c2]">Score:</span> {anomaly.score ?? "–"}</div>
            <div><span className="text-[#a5a1c2]">Severity:</span> {anomaly.severity || "–"} • <span className="text-[#a5a1c2]">Persistence:</span> {anomaly.persisted_n ?? "–"}</div>
            <div className="col-span-2 flex flex-wrap gap-3 text-xs mt-1">
              {anomaly.links?.anomaly && (<a className="underline opacity-90 hover:opacity-100" href={anomaly.links.anomaly} target="_blank">Anomaly</a>)}
              {anomaly.links?.detector && (<a className="underline opacity-90 hover:opacity-100" href={anomaly.links.detector} target="_blank">Detector config</a>)}
              {anomaly.links?.related_cases && (<a className="underline opacity-90 hover:opacity-100" href={anomaly.links.related_cases} target="_blank">Related cases</a>)}
              {anomaly.links?.dashboard && (<a className="underline opacity-90 hover:opacity-100" href={anomaly.links.dashboard} target="_blank">Dashboard</a>)}
            </div>
          </div>

          <hr className="my-4 border-white/10" />

          {/* 2) Signal Validation */}
          <div>
            <div className="font-semibold">Signal validation</div>
            <ul className="mt-1 text-sm list-disc pl-5 text-[#c9c7de]">
              <li>Ingest complete (no gaps/late data)</li>
              <li>Schema/version unchanged</li>
              <li>Timezone alignment correct</li>
              <li>Label delay understood</li>
              <li>Min support met</li>
            </ul>
          </div>

          <hr className="my-4 border-white/10" />

          {/* 3) Scope & Decomposition */}
          <div className="text-sm">
            <div className="font-semibold mb-1">Scope & decomposition</div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              <div>Top entities: {(context.top_entities || []).map((e, i) => (
                <span key={i} className="mr-2">{e.type}:{maskId(e.id)}</span>
              ))}</div>
              <div>Related cases: {(context.related_cases || []).map((c, i) => (
                <span key={i} className="mr-2 underline">{c.id}</span>
              ))}</div>
            </div>
            <div className="mt-1 text-[#a5a1c2]">Notes: {context.notes || "—"}</div>
          </div>

          <hr className="my-4 border-white/10" />

          {/* 4) Hypotheses & Checks */}
          <div className="text-sm">
            <div className="font-semibold mb-1">Hypotheses</div>
            <ol className="list-decimal pl-5 text-[#c9c7de]">
              <li>Issuer-side issue or routing imbalance</li>
              <li>Fraud burst targeting cohort</li>
              <li>Benign config/release nearby</li>
            </ol>
            <div className="font-semibold mt-3 mb-1">Immediate checks</div>
            <ul className="list-disc pl-5 text-[#c9c7de]">
              <li>Reason code mix before vs during</li>
              <li>Issuer & BIN splits</li>
              <li>Device/IP/ASN clusters</li>
              <li>Sumo auth/error signals</li>
            </ul>
          </div>

          <hr className="my-4 border-white/10" />

          {/* 5) Impact & Action */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
            <div><span className="font-semibold">Impact</span><div className="text-[#a5a1c2]">Add counts/$ once validated in dashboard.</div></div>
            <div><span className="font-semibold">Action</span><div className="text-[#a5a1c2]">Rate-limit/threshold tweak as needed; set TTL and owner.</div></div>
          </div>

          <hr className="my-4 border-white/10" />

          {/* 6) Markdown for case note */}
          <div className="text-sm">
            <div className="font-semibold mb-1">Generated case note (markdown)</div>
            <pre className="whitespace-pre-wrap bg-black/30 p-3 rounded-lg border border-white/10 text-xs">{markdown}</pre>
          </div>
        </section>
      </main>

      <style>{`@media print { body { background: white !important; } * { color: black !important; } a { color: black !important; text-decoration: underline; } }`}</style>
    </div>
  );
}
