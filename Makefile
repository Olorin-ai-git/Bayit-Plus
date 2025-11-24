# ---- Reuse Guard Makefile (Anthropic + npm + JS, TASK_FILE support) ----
SHELL := /usr/bin/env bash -o pipefail -c
.DEFAULT_GOAL := reuse

# Paths
FE_ROOT := olorin-front
BE_ROOT := olorin-server
CODEGEN_DIR := tools/reuse_guard
SEARCH_SCRIPT := $(CODEGEN_DIR)/search_repo.mjs
CODEGEN_SCRIPT := $(CODEGEN_DIR)/codegen.mjs
EXTRACT_SCRIPT := $(CODEGEN_DIR)/extract_diff.mjs
TMP_DIR := $(CODEGEN_DIR)/tmp
SEARCH_MD := $(TMP_DIR)/SEARCH_RESULTS.md
PATCH_TXT := $(TMP_DIR)/PATCH.txt
PATCH_DIFF := $(TMP_DIR)/patch.diff

# Config
LLM_MODEL ?= claude-haiku-4-5
FRONTEND_TEST ?= cd $(FE_ROOT) && npx playwright test
BACKEND_TEST  ?= cd $(BE_ROOT) && pytest -q

# Optional duplicate checks (best-effort)
JSCPD ?= npx jscpd --threshold 0.3 --min-lines 18 $(FE_ROOT) $(BE_ROOT)
RUFF  ?= cd $(BE_ROOT) && ruff --select TID .
PYLINT_DUP ?= cd $(BE_ROOT) && pylint --disable=all --enable=duplicate-code .

# -------- Helpers --------
.PHONY: guard-env guard-task write-task apply-patch test-changed dup-check reuse clean

guard-env:
	@if [[ -z "$$ANTHROPIC_API_KEY" ]]; then echo "ERROR: ANTHROPIC_API_KEY not set"; exit 2; fi

guard-task:
	@if [[ -z "$(TASK)" && -z "$(TASK_FILE)" ]]; then \
	  echo 'Usage: make reuse TASK="..."  OR  make reuse TASK_FILE=tools/reuse_guard/task.txt'; exit 2; \
	fi

write-task:
	@mkdir -p "$(TMP_DIR)"
	@if [[ -n "$(TASK_FILE)" ]]; then \
	  cp "$(TASK_FILE)" "$(TMP_DIR)/TASK.txt"; \
	else \
	  printf "%s" "$(TASK)" > "$(TMP_DIR)/TASK.txt"; \
	fi

# -------- Pipeline --------
$(SEARCH_MD): guard-task write-task
	@mkdir -p "$(TMP_DIR)"
	@echo "🔎 Searching repo using task from $(TMP_DIR)/TASK.txt"
	@node "$(SEARCH_SCRIPT)" "$$(cat "$(TMP_DIR)/TASK.txt")" >/dev/null

$(PATCH_TXT): $(SEARCH_MD) guard-env
	@echo "🤖 Codegen (Anthropic model: $(LLM_MODEL))"
	@LLM_MODEL="$(LLM_MODEL)" node "$(CODEGEN_SCRIPT)" "$$(cat "$(TMP_DIR)/TASK.txt")" >/dev/null
	@echo "📝 Wrote $(PATCH_TXT)"

apply-patch: $(PATCH_TXT)
	@echo "🧩 Extracting unified diff (robust)…"
	@node "$(EXTRACT_SCRIPT)" "$(PATCH_TXT)" "$(PATCH_DIFF)"
	@test -s "$(PATCH_DIFF)" || { echo "ERROR: No unified diff found in $(PATCH_TXT)"; exit 3; }
	@decision=$$(grep -m1 -E '^(Decision:)?[[:space:]]*(REUSE|EXTEND|NEW)' -oi "$(PATCH_TXT)" | tail -n1 | tr '[:lower:]' '[:upper:]' | sed -E 's/.*(REUSE|EXTEND|NEW).*/\1/'); \
	echo "📌 Decision: $$decision"; \
	if [[ "$$decision" == "NEW" && -z "$$ALLOW_NEW" ]]; then \
	  if ! grep -q "(no matches)" "$(SEARCH_MD)"; then \
	    echo "⚠️  Decision==NEW but search had matches. Review $(PATCH_TXT) or set ALLOW_NEW=1."; exit 4; \
	  fi; \
	fi; \
	echo "📥 Applying patch…"; \
	git apply --index --reject "$(PATCH_DIFF)" || { echo "❌ git apply failed (see *.rej)"; exit 5; }
	@echo "✅ Patch staged."

test-changed:
	@set -e; run_fe=0; run_be=0; \
	grep -q "a/$(FE_ROOT)/" "$(PATCH_DIFF)" && run_fe=1 || true; \
	grep -q "a/$(BE_ROOT)/" "$(PATCH_DIFF)" && run_be=1 || true; \
	if [[ $$run_fe -eq 1 ]]; then echo "🧪 Frontend tests…"; $(FRONTEND_TEST); fi; \
	if [[ $$run_be -eq 1 ]]; then echo "🧪 Backend tests…";  $(BACKEND_TEST);  fi; \
	if [[ $$run_fe -eq 0 && $$run_be -eq 0 ]]; then echo "ℹ️  No known test roots touched; skipping tests."; fi

dup-check:
	@echo "🔁 Duplicate-code checks (best-effort)…"
	@if command -v npx >/dev/null 2>&1; then $(JSCPD) || true; else echo "(skip jscpd — npx not found)"; fi
	@if command -v ruff >/dev/null 2>&1; then $(RUFF) || true; else echo "(skip ruff — not found)"; fi
	@if command -v pylint >/dev/null 2>&1; then $(PYLINT_DUP) || true; else echo "(skip pylint — not found)"; fi

reuse: $(SEARCH_MD) $(PATCH_TXT) apply-patch test-changed dup-check
	@echo "🎉 Review staged changes, then commit:"
	@echo "    git commit -m \"$$(tr -d '\n' <"$(TMP_DIR)/TASK.txt" | cut -c -80)\""

clean:
	@rm -rf "$(TMP_DIR)"
	@echo "🧹 Cleaned reuse guard artifacts."
