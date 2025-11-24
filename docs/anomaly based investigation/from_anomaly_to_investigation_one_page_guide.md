# From Anomaly to Investigation — One‑Page Guide

> Treat the **anomaly** as the smoke alarm and the **investigation** as finding the fire, sizing it, and choosing the response.

## Purpose
Turn a statistical deviation into **understanding and action**: validate the signal, explain the change, estimate impact, and decide mitigations.

---

## What the anomaly gives you (the seed)
- **Where:** cohort → `merchant • channel • geo`
- **When:** time window (e.g., 10:15–10:30) and persistence
- **What:** deviating metric (e.g., `decline_rate`, `tx_count`)
- **How weird:** observed vs expected, fused score (STL+MAD ⊕ CUSUM)
- **Evidence:** detector components, residuals, changepoints

Use these to **anchor the case** (filters, timeframe, initial evidence).

---

## Investigation goals
1. **Validate** the signal (no ingest gaps, schema/version changes, label delay)
2. **Scope** the blast radius (segments/entities driving the delta)
3. **Drivers** (reason codes, issuer/BIN, device/IP/ASN, method mix)
4. **Causality hints** (releases, config, traffic/campaign, upstream issues)
5. **Impact** (counts, $, SLA risk, user/merchant experience)
6. **Action** (temporary mitigations + owners/TTLs)
7. **Evidence** (charts/tables/logs + short incident summary)
8. **Learning** (tune detector thresholds/features; update playbooks)

---

## Flow in your Olorin / LangGraph system
**1) Seed case**  
Critical & persistent anomaly auto-creates (or links) an investigation with cohort/time/metric/score.

**2) Auto‑gather context (agents + RAG)**  
- Time‑series around the window (±1–2h)  
- Top entities & notable transactions  
- Related cases & Sumo signals  
- Neighbor periods (e.g., same day last week)

**3) Fast checks**  
Real vs artifact? Concentration by merchant/geo/channel? What changed in reason codes, method mix, issuer/BIN, device/IP/ASN?

**4) Hypothesize → test**  
Issuer outage vs routing; fraud burst vs benign release; traffic source shift.

**5) Decide & act**  
Rate limits / threshold tweaks / targeted blocks; merchant/issuer comms; monitoring rule.

**6) Summarize**  
LLM generates a concise markdown incident note from anomaly + RAG context; attach to case.

**7) Learn back**  
Tune k/persistence/min‑support, add features/rules, schedule a replay to confirm the fix.

---

## Seeded queries (useful starting points)
- Mix deltas: **reason code**, **issuer/BIN**, **payment method**, **country/geo** (before vs during)
- Entity clusters: **device fingerprint**, **IP/ASN**, **new vs historical**
- External signals: **auth/EDR/SIEM** spikes near the window
- Neighbor comparisons: **same merchant, prior week/day**

---

## Policy (open / annotate / ignore)
- **Open** if: severity = critical **and** persistence ≥ 2 **and** score ≥ 4.5 (or observed/expected ≥ 1.5×)  
- **Annotate** if: persistence ≥ 2 **and** score ≥ 3.0  
- **Ignore** if throttled by cooldown or below thresholds

---

## Evidence pack (attach to case)
- Time‑series chart around spike/dip (±2h)  
- Mix breakdown table (before vs during)  
- Logs/screens (Sumo, auth errors)  
- LLM incident summary (markdown)  
- Links: detector config, related cases, dashboard

---

## Example (compressed)
- **Anomaly:** `decline_rate` 8% → 24% for `m_001 • web • US‑CA`, 10:15–10:30, score 5.1, persisted 2  
- **Drivers:** reason `05` surge, issuer Y concentration, new /24 IP cluster  
- **Impact:** 2,400 tx, ~$180k attempted; auth success −12pp  
- **Action:** rate‑limit suspect /24; relax BIN‑X for issuer Y (12h TTL); notify merchant  
- **Learning:** add issuer‑specific baseline; raise persistence to 3 for this cohort

---

## Tuning feedback
- **False positive** → raise **k** (e.g., 3.5→4.0), increase **persistence** (2→3), enforce **min‑support**  
- **Missed issue** → lower **k** slightly or enrich features; add cohort‑specific baselines

*Keep this to one page. Mask PII. Capture decisions and owners with TTLs.*

