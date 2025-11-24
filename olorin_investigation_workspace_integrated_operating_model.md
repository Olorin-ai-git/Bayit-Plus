# Olorin Investigation Workspace — Integrated Operating Model

**Author:** Olorin.ai • **Audience:** Risk Eng, Data, App/Platform, and Ops

**Goal:** Combine two parallel efforts—the *Olorin Ops* workspace plan (canonical folders + CLI + registry) and *your data‑model/path‑template plan*—into a single, end‑to‑end operating model that covers:

- Startup analysis flow
- Script‑triggered investigations
- UI‑triggered investigations
- UI‑triggered comparisons
- Infrastructure for future augmentations

> Note: Some previously uploaded folders appear to have expired from this session. The integration below assumes the structures we reviewed (reports, comparisons, startup analysis). When you re‑upload `/logs` and `/artifacts`, the migration steps will consume them without changes to this plan.

---

## Part I — Olorin Ops (Original Plan)

**Summary:** A dependency‑light workspace with a strict **on‑disk contract**, a small **SQLite registry**, and a **single CLI (`olor`)** to ingest/import, organize, compare, and report.

### 1) Canonical layout
```
<workspace>/
  investigations/<YYYY>/<MM>/<inv_id>/
    manifest.json             # investigation facts (type, graph_type, trigger_source, tags)
    logs/                     # raw + derived logs
    artifacts/                # json, csv, traces, embeddings, images, models
    reports/                  # html/pdf/md outputs
  comparisons/<YYYY>/<MM>/<cmp_id>/
    manifest.json             # links two investigations + metadata
  reports/                    # org-level reports (e.g., startup analysis)
  registry/registry.sqlite    # investigations, files, comparisons
```

### 2) IDs & naming
- **Investigations:** `inv_YYYYMMDD_HHMMSS_<slug>`
- **Comparisons:** `cmp_YYYYMMDD_HHMMSS_<slug>`
- File names are simple inside a folder (`report.html`, `manifest.json`), keeping deep paths short.

### 3) Registry (SQLite)
- `investigations(...)` — id, title, type(`manual|structured|ui`), graph_type(`hybrid|clean`), trigger_source(`startup|script|ui`), tags, timestamps
- `files(...)` — investigation_id, path, kind(`log|artifact|report`), sha256, size, mime, relpath
- `comparisons(...)` — id, left_investigation, right_investigation, title, notes, timestamps

### 4) CLI (`olor.py`) commands
- `init` (bootstrap workspace)
- `new` (create investigation; sets type/graph/trigger)
- `add-file` (attach logs/artifacts/reports; hash + index)
- `report` (render template → HTML; registers as report)
- `compare` (register a comparison between two investigations)
- `import-logs` (sweep `/logs` + `/artifacts`, auto‑bucket by id/date; dry‑run first)
- `ls`, `show`, `index` (browse, inspect, reindex)

### 5) Flows supported
- **Startup analysis** (cron/systemd → `import-logs --trigger startup`)  
- **Script‑triggered** (pipeline calls `new`, `add-file`, `report`)
- **UI‑triggered** (UI calls same endpoints via thin API over CLI)
- **UI comparisons** (create `cmp_*` linking two `inv_*`)

---

## Part II — Your Plan (Data‑Model + Path‑Templates)

**Summary:** A config‑centric design (BaseSettings style) with **path template classes** for investigations, comparisons, and startup analysis reports; **ID normalization & validation** rules; and **safety** against path traversal.

### Highlights we’re adopting
- **Central config:** all roots + template strings in one place (env‑overridable)
- **Path templates:** deterministic locations for `investigation_*`, `comparison_*`, `startup_*` outputs
- **Normalization/validation:** strict, safe IDs; reject illegal characters
- **Flow awareness:** startup/script/ui are first‑class in the model

### Differences from Olorin Ops
- Primarily **path‑management & model**; lacks an on‑disk **registry** and a **unified CLI**
- Uses filenames like `investigation_*`/`comparison_*` rather than folder‑first `inv_*`/`cmp_*`
- Less explicit about **logs/artifacts** co‑location and deduped indexing (hashes)

---

## Part III — Comparison (Gap & Alignment)

| Area | Alignment | Gap / Difference | Risk if Unaddressed |
|---|---|---|---|
| **Flows** | Both include startup/script/ui investigations + UI comparisons | N/A | — |
| **LangGraph types** | Both support `hybrid` + `clean` | N/A | — |
| **Normalization & safety** | Your spec is explicit; Olorin Ops assumes a slugger | Need shared normalizer | Divergent IDs & brittle import rules |
| **Folder structure** | Both deterministic | Ops uses folder‑first IDs; your spec emphasizes file naming | Inconsistent lookups, longer paths |
| **Registry & catalog** | Only in Ops | Missing in spec | No inventory, hard to search/report at scale |
| **Ingestion** | Ops `import-logs` + heuristics | Not covered in spec | Manual curation, drift |
| **Reports** | Both generate HTML | Template differences; location differs | Polymorphic outputs hard to combine |

---

## Part IV — Unified Operating Model (Best of Both)

### 1) Keep your **Config & Path Templates**, layer Ops **Workspace + Registry** beneath
- **`olorin.toml`** (or `.yaml`) becomes the **single source of truth** for roots and templates.
- The CLI honors these templates: any generated path must resolve via config first.

### 2) Harmonize IDs with dual‑compat support
- Primary form: `inv_*` / `cmp_*` (short; folder‑first).  
- Accept and **map** `investigation_*` / `comparison_*` via the shared **normalizer** to avoid breaking existing names.

### 3) Single **Manifest schema** (per investigation)
```json
{
  "investigation_id": "inv_20251114_101530_caseB",
  "title": "Payment anomaly window",
  "type": "structured",                 
  "graph_type": "hybrid",               
  "trigger_source": "ui",               
  "status": "new",
  "tags": ["amount_clustering", "velocity_burst"],
  "entity_ids": ["email:moeller2media@gmail.com"],
  "run": {"run_id": "rg_01h...", "graph_version": "2025.11.1", "llm_model": "gpt-5", "policy_version": "risk-3.2"},
  "metrics": {"risk": 0.82, "confidence": 0.68},
  "created_at": "...Z",
  "updated_at": "...Z"
}
```

### 4) Registry schema (SQLite) additions
- Add `entity_ids` (JSON) to investigations for quick pivots
- Keep `files.sha256` for dedupe; add `source` (ui|script|startup) mirror
- Optional `owners` / `visibility` columns for future RBAC

### 5) Reports
- Adopt your **path templates** for all renders (startup, per‑investigation, comparison).  
- Keep Ops `templates/report.html` for brand + consistency; support overrides via config.

### 6) Ingestion & normalization
- The CLI uses your **normalizer** for **all** id/path decisions.  
- `import-logs` attaches files by probing for existing ids; if none → creates `auto-import` investigation with the normalized slug.

### 7) Comparisons
- Standardize `comparisons/<YYYY>/<MM>/<cmp_id>/manifest.json` linking two `inv_*` ids.  
- UI writes a thin manifest; renders live or exports static HTML via template.

### 8) Configuration example (`olorin.toml`)
```toml
[paths]
workspace = "./workspace"
startup_reports = "reports/startup/{date}/startup_{date}.html"
comparison_dir = "comparisons/{yyyy}/{mm}/{cmp_id}"

[id]
slug_max = 48
allowed = "A-Za-z0-9-_"

[graph]
# default graph type per trigger
startup = "hybrid"
script  = "clean"
ui      = "hybrid"
```

---

## Part V — End‑to‑End Flows (Reference)

### A) Startup analysis (automated)
```
cron/systemd → olor import-logs --trigger startup
             → creates/updates inv_* buckets for new files
             → (optional) olor report --id <inv> → HTML to startup path template
             → registry updated → dashboards consume SQLite
```

### B) Script‑triggered investigation
```
pipeline → olor new --type structured --graph clean --trigger script
         → olor add-file (attach logs/artifacts)
         → olor report (render HTML)
         → registry updated (investigation + files)
```

### C) UI‑triggered investigation
```
UI button → POST /investigations  (thin API → CLI new)
         → stream artifacts via add-file
         → optional live render → report.html
```

### D) UI‑triggered comparison
```
UI compare → POST /comparisons (cmp_* manifest links left/right)
          → render comparison report via template
```

---

## Part VI — Migration Plan

1. **Bootstrap workspace**  
   `olor init --root ./workspace`

2. **Dry‑run import of existing trees**  
   `olor import-logs --root ./workspace --logs /logs --artifacts /artifacts --dry-run`

3. **Execute import (choose strategy)**  
   - Preserve originals: `--copy`  
   - Relocate: `--move`  
   - Symlink: `--link`

4. **Map legacy reports/comparisons**  
   - Move `startup_analysis_report.html` → template path (`reports/startup/...`).  
   - Wrap each legacy `comparison_*.html` in a `cmp_*` folder with `manifest.json`.

5. **Create shells for missing investigations**  
   `olor new --root ./workspace --title "email: …" --type structured --graph hybrid --trigger ui`

6. **Attach HTMLs for provenance**  
   `olor add-file --root ./workspace --id <inv> --path ~/legacy/report.html --kind report`

7. **Reindex**  
   `olor index --root ./workspace`

> All steps honor the shared normalizer and your path templates via `olorin.toml`.

---

## Part VII — Infrastructure & Augmentations

- **Template overrides:** per‑team report look/feel without code changes
- **Plugin detectors:** parse runs to auto‑tag (e.g., `velocity_burst`, `device_ip_rotation`)
- **Storage backends:** allow `artifacts/` to be a mount (S3/GCS); registry keeps absolute + relative paths
- **RBAC:** add `owner`, `group`, `visibility` columns; gate sensitive artifacts
- **Observability:** file counts, size, ingest errors; simple Grafana over SQLite/Prometheus exporter
- **Schema migration:** alembic‑style lightweight versioning for SQLite schema

---

## Part VIII — RACI & Ownership (suggested)

- **Data/Platform:** workspace lifecycle, registry, storage backends, RBAC
- **Risk Eng:** report templates, detectors, investigation metadata standards
- **App/UI:** API wrapper over CLI, UI events → ops actions
- **Ops:** daily `import-logs` health, reindex, permissions, backup

---

## Part IX — Next Actions (1–2 weeks)

1. Land `olorin.toml` with your template strings + normalizer rules
2. Wire the CLI to read that config (done in current prototype; verify fields)
3. Migrate legacy reports into `reports/` + wrap comparisons with `cmp_*` manifests
4. Dry‑run import on a sample of `/logs` + `/artifacts`; validate registry contents
5. Approve schema for `entity_ids`, `owners`, `visibility` and implement
6. Add plugin detector hooks; tag a small set of investigations
7. Stand up an ultra‑thin API (UI→CLI) for `new`, `add-file`, `compare`, `report`

---

### Appendix A — Comparison Manifest (example)
```json
{
  "comparison_id": "cmp_20251114_104230_email_caseA_vs_caseB",
  "left_investigation": "inv_20251114_101530_caseA",
  "right_investigation": "inv_20251114_103210_caseB",
  "title": "UI comparison — caseA vs caseB",
  "created_at": "...Z",
  "notes": "seeded from legacy comparison_*.html"
}
```

### Appendix B — CLI Cheatsheet
```
# init
python olor.py init --root ./workspace

# new investigation (UI-triggered, hybrid LangGraph)
python olor.py new --root ./workspace --title "Checkout spike" \
  --type ui --graph hybrid --trigger ui

# attach files
python olor.py add-file --root ./workspace --id <inv> --path ./run.log --kind log

# render report
python olor.py report --root ./workspace --id <inv> --summary "24h spike" \
  --llm "Velocity burst + amount clustering" \
  --actions "Hold 5 tx" "ASN check" --out ./workspace/reports/<inv>.html

# create comparison
python olor.py compare --root ./workspace --left <invA> --right <invB> \
  --title "UI comparison — A vs B"

# import logs & artifacts
python olor.py import-logs --root ./workspace --logs /logs --artifacts /artifacts --copy

# index
python olor.py index --root ./workspace
```

---

**Result:** A single, coherent system that uses *your* configuration/normalization discipline while leveraging the *Olorin Ops* workspace, CLI, and registry to tame sprawl, preserve provenance, and make investigations/comparisons repeatable across startup, script, and UI workflows.

