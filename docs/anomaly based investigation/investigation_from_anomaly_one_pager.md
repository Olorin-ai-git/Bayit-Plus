# Investigation from Anomaly — One‑Pager

> Use this sheet when an anomaly event seeds a case. Keep it to one page. Mask PII.

**Case ID:** ____  
**Created:** ____  
**Owner:** ____  
**Pri:** P1 ☐  P2 ☐  P3 ☐  

---

## 1) Incident Snapshot (from anomaly seed)
- **Metric:** ____  
- **Cohort:** merchant=____ • channel=____ • geo=____  
- **Window:** ____ → ____  
- **Observed vs Expected:** ____ vs ____  
- **Score (fused):** ____  • **Severity:** info ☐ / warn ☐ / **critical ☐**  • **Persistence:** ____ windows  
- **Links:** [Anomaly](__) • [Detector config](__) • [Related cases](__) • [Dashboard](__)

---

## 2) Signal Validation (sanity checks)
- ☐ Ingest complete (no gaps/late data)  
- ☐ Schema/version unchanged  
- ☐ Timezone alignment correct  
- ☐ Label delay understood / not relevant  
- ☐ Min support met (≥ ____ tx/window)

**Notes:**  
___

---

## 3) Scope & Decomposition (who/what changed?)
**Top contributors (ranked):**

| Dimension | Segment | Δ vs baseline | Share of delta |
|---|---|---:|---:|
| merchant | ____ | ____ | ____ |
| channel | ____ | ____ | ____ |
| geo | ____ | ____ | ____ |
| issuer/bin | ____ | ____ | ____ |
| reason_code | ____ | ____ | ____ |
| device/IP/ASN | ____ | ____ | ____ |
| method (card/ach/alt) | ____ | ____ | ____ |

**Before vs During (quick mix deltas):**  
- Reason codes: ____ → ____  
- Payment method: ____ → ____  
- Device/ASN cluster: ____ → ____

---

## 4) Hypotheses (ordered)
1. ____ (malicious)  
2. ____ (benign/config)  
3. ____ (external dependency)  

**Checks to confirm/deny:** ____

---

## 5) Context & Correlation
- ☐ Release/config near window (what/when): ____  
- ☐ Traffic/campaign shift: ____  
- ☐ Auth/EDR/SIEM signals (Sumo): ____  
- ☐ Upstream gateway/issuer issues: ____

---

## 6) Impact
- **Affected tx:** ____  
- **$ amount (attempted/blocked/refunded):** ____  
- **Manual review load / SLA risk:** ____  
- **Users/merchants impacted:** ____

---

## 7) Immediate Actions & Mitigations

| Action | Blast radius | Pros | Cons / Risk | TTL | Owner |
|---|---|---|---|---|---|
| e.g., rate‑limit IP /24 | narrow | quick cut of bot traffic | may hit legit surge | 24h | ____ |
| e.g., relax rule X for issuer Y | targeted | restores auth success | raises fraud exposure | 12h | ____ |

**Decision:** escalate ☐ / monitor ☐ / close as noise ☐  
**Why:** ____

---

## 8) Evidence to Attach (links or files)
- ☐ Time‑series chart (±2h around spike/dip)  
- ☐ Mix breakdown table (before vs during)  
- ☐ Relevant logs (Sumo, auth errors)  
- ☐ LLM incident summary (markdown)  

**URLs / IDs:**  
- Chart: ____  
- Table: ____  
- Logs: ____  
- Summary: ____

---

## 9) Follow‑ups & Learning
- Detector tuning: k → ____, persistence → ____, min‑support → ____  
- Feature ideas / rules to add: ____  
- Replay window to verify fix: ____  
- Owner & due date: ____

---

**Prepared by:** ____  
**Reviewed by:** ____  
**Approved by:** ____  

