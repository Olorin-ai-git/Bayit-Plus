# Bayit Erebor release recovery — TWOGATES-6/10/14/88

State: recovery in progress. Root coordinates all merge/deploy/routing activation; Chrome belongs to /root/palantir_release until explicit transfer.

Goal: recover and prepare remaining Bayit Erebor PR2/PR3 for release, repair confirmed remaining review finding, and produce native/browser evidence on frozen source.

Registered session worktree: /Users/olorin/.codex/worktrees/erebor-ship-20260910/bayit; branch codex/erebor-bayit-release-20260910; exact creation base 60dd6f29059fec4084e779b75b738a39a1ca0dfe. Ownership registry verified. Primary checkout is not edited.

| Phase | Model / effort | Why |
| --- | --- | --- |
| Recover exact remote stack and recorded local changes | gpt-6-astra / high | Root-assigned bounded release lane; prevent loss or unrelated source import |
| Repair pin occlusion and validate native contracts | gpt-6-astra / high | Customer-facing correctness and shared package contracts |
| Frozen-source browser/audit handoff | gpt-6-astra / high | Exact evidence binding; root coordinates independent gates |

1. Fetch/read exact PR2 c88ac8eea2ddbbe529fdd4ed17e2544008367671 and stacked PR3 fc0e2f2296122c513b410a8e0e33152ada1dea7a; integrate into new branch preserving registered base and remote provenance.
2. Recover only proven later source boundaries (TWOGATES-84 shared logger/export fixes, review overlay, TWOGATES-88 mobile editor and driver). Old temporary tree retains empty directories and cannot supply Git objects; inspect banked artifact manifests/source maps. Record hashes and missing provenance. Never copy secrets, environment files or an entire old tree.
3. Reuse recovered Glass components, shared logging/i18n/design and review overlay; fix confirmed top-right desktop/tablet pin occlusion with a product-usable placement control. No auth bypass or routing activation.
4. Run native relevant routing/package/overlay contracts and build on coherent candidate, then real UI review once Chrome ownership transfers. Account for every banked finding and preserve desktop/mobile screenshots and pinned notes.
5. Commit coherent checkpoints and report exact gates to root for independent audit/judge, PR/CI/merge/deploy coordination.

Success criteria: recovered file manifests are auditable and secret-free; native gates identify real failures without exclusions; review mode remains opt-in and local; mobile editor remains usable at320px; pins under top-right panel become pointer accessible through actual UI; exact source SHA accompanies evidence; no release-complete claim before root's full gates.

UI end state: existing Bayit Glass application plus local review panel whose placement can expose otherwise occluded numbered pins. Banked screenshots at /private/tmp/erebor-bayit-tw88-visual-08367fd10 supply the existing design reference; final real browser screenshots replace speculation.

## Confirmed audit and authenticated-journey corrections

- BAYIT-2: preserve prior-build evidence with explicit stale status, suppress its spatial pins, and reopen it on current-build reattachment; guard async capture across build changes.
- BAYIT-3: declare native icon runtime dependency on its owning package and verify emitted external imports across every exported entry.
- BAYIT-4: actual user sign-in exposed absent QueryClientProvider; mount installed TanStack Query above app routes and isolate caches by existing auth identity.
- Root explicitly authorized the authenticated journey repair. Current user session remains in isolated visible Chromium on http://localhost:3200; registered OAuth callback uses localhost, not127.0.0.1. API relay targets actual https://api.bayit.tv and JSON responses are verified. No auth/token bypass.
- Implementation and own six-dimensional re-audit: gpt-6-astra/high. Independent cold finder: gpt-5.6-sol/high. Final judge after dry audit.
- New focused checks:22review cases,2real QueryClient cases,8emitted dependency contracts. Negative control removes the native dependency declaration only in test memory and fails as expected. Full source frozen and browser review repeated after commit.
