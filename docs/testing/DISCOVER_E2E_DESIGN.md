# Discover Tab E2E Testing — Design Document

**Date:** 2026-03-10
**Status:** Approved
**Scope:** All 19 Discover tab AI features, all 4 platforms

---

## 1. Overview

Comprehensive E2E testing system for all 19 Discover tab features across iOS, tvOS, Web, and Android. Tests run against a local FastAPI backend connected to MongoDB Atlas, with BYOC Plex + YouTube content sources and Channel 13 for live TV.

### Success Criteria

- **Coverage gate:** All 19 features must have at least one passing E2E test per supported platform before merge
- **AI response validation:** AI features return meaningful, content-relevant responses (pattern matching, not exact strings)
- **Visual regression:** Screenshot comparison against versioned baselines with 1% tolerance
- **Performance baselines:** Response time tracking per feature tier (informational initially, hard gates after baseline established)

---

## 2. Feature Test Matrix

### 2.1 While Watching Movies (7 features) — Tested against BOTH Plex and YouTube

| #   | Feature ID              | UI Test                                                             | Round-Trip Test                                                        | Platforms |
| --- | ----------------------- | ------------------------------------------------------------------- | ---------------------------------------------------------------------- | --------- |
| 1   | `pause_ask`             | Open VOD → pause → avatar appears → ask question → response renders | Verify AI response contains content-relevant text                      | iOS, tvOS |
| 2   | `interactive_subtitles` | Play VOD → enable subtitles → tap word → popup appears              | Verify word definition/translation returned                            | iOS, tvOS |
| 3   | `vocabulary`            | Play VOD → open vocabulary panel → words listed                     | Verify word analysis data returned                                     | iOS, tvOS |
| 4   | `vod_moments`           | Play VOD → open moments panel → moments listed                      | Verify moment timestamps + descriptions returned                       | iOS       |
| 5   | `cultural_context`      | Play VOD → open cultural context → context card appears             | Verify cultural explanation text returned                              | iOS       |
| 6   | `bilingual_bridge`      | Play VOD → enable bilingual → dual subtitles render                 | Verify both language tracks returned                                   | iOS, tvOS |
| 7   | `ai_companion`          | Play VOD → open companion → chat + quiz tabs visible                | Send message → verify AI reply; start quiz → verify question generated | iOS       |

Each feature produces 2 test methods: `testWithPlexContent()` and `testWithYouTubeContent()`.

### 2.2 While Watching Live TV (5 features) — Channel 13

| #   | Feature ID       | UI Test                                                    | Round-Trip Test                                      | Platforms | Prerequisites |
| --- | ---------------- | ---------------------------------------------------------- | ---------------------------------------------------- | --------- | ------------- |
| 8   | `live_dubbing`   | Tune Channel 13 → enable dubbing → audio indicator appears | Verify dubbed audio stream starts                    | iOS, tvOS | Premium       |
| 9   | `live_subtitles` | Tune Channel 13 → enable live subs → text appears          | Verify subtitle text updates over 10s window         | iOS, tvOS | Premium       |
| 10  | `live_trivia`    | Tune Channel 13 → trivia overlay appears                   | Verify trivia question + answer options returned     | iOS, tvOS | —             |
| 11  | `catch_up`       | Tune Channel 13 → activate catch-up → timeline scrubber    | Verify time-shifted stream plays from past timestamp | iOS, tvOS | Premium       |
| 12  | `scene_search`   | Tune Channel 13 → open scene search → search box           | Enter query → verify scene results with timestamps   | iOS, tvOS | —             |

### 2.3 Learn Hebrew (4 features)

| #   | Feature ID            | UI Test                                               | Round-Trip Test                                     | Platforms | Special Handling                         |
| --- | --------------------- | ----------------------------------------------------- | --------------------------------------------------- | --------- | ---------------------------------------- |
| 13  | `phonetic_mirror`     | Open feature → mic prompt → recording UI              | Synthetic audio → verify pronunciation score        | iOS       | Boundary + synthetic                     |
| 14  | `talk_back`           | Open feature → conversation UI → mic prompt           | Synthetic audio → verify AI conversational response | iOS       | Boundary + synthetic                     |
| 15  | `interactive_mission` | Open feature → mission briefing → accept → first task | Synthetic audio → verify mission progresses         | iOS       | Boundary + synthetic, needs consent pref |
| 16  | `glossary`            | Open glossary → term list → tap term → definition     | Verify term data loads                              | iOS, tvOS | Static data, no AI                       |

### 2.4 Search & Discovery (2 features)

| #   | Feature ID        | UI Test                                             | Round-Trip Test                               | Platforms | Prerequisites |
| --- | ----------------- | --------------------------------------------------- | --------------------------------------------- | --------- | ------------- |
| 17  | `llm_search`      | Open search → type NL query → results render        | Verify results are content-relevant           | iOS, tvOS | —             |
| 18  | `proactive_voice` | Enable voice pref → open feature → suggestion cards | Trigger suggestion → verify AI recommendation | iOS       | Voice pref    |

### 2.5 Chat Assistants (1 feature)

| #   | Feature ID | UI Test                               | Round-Trip Test                           | Platforms | Prerequisites |
| --- | ---------- | ------------------------------------- | ----------------------------------------- | --------- | ------------- |
| 19  | `chatbot`  | Open chatbot → chat UI → send message | Verify AI response non-empty and relevant | iOS, tvOS | —             |

**Total test scenarios:** 26 (14 VOD + 5 Live + 3 Hebrew + 2 Search + 1 Chat + 1 Glossary)

---

## 3. Architecture

```
┌──────────────────────────────────────────────────────┐
│            /test-discover (Claude Code Skill)         │
│  ┌────────────────────────────────────────────────┐   │
│  │          Orchestrator (test-discover.sh)        │   │
│  │  1. Start local backend (FastAPI)               │   │
│  │  2. Run seed-test-data.py (Atlas)               │   │
│  │  3. Dispatch platform tests in parallel          │   │
│  │  4. Collect results + screenshots                │   │
│  │  5. Generate unified report                      │   │
│  └──────┬──────┬──────┬──────┬────────────────────┘   │
│         │      │      │      │                         │
│    ┌────┴──┐ ┌─┴───┐ ┌┴───┐ ┌┴─────┐                 │
│    │  iOS  │ │tvOS │ │Web │ │Droid │                 │
│    │XCUITest│ │XCUITest│ │Playwright│ │Gradle │        │
│    └───┬───┘ └──┬──┘ └─┬──┘ └──┬───┘                 │
│        └────────┴──────┴───────┘                      │
│               All hit local backend                   │
│               ↓                                       │
│          FastAPI → MongoDB Atlas                      │
│               ↓                                       │
│     BYOC Plex + YouTube + Channel 13                  │
└──────────────────────────────────────────────────────┘
```

---

## 4. Seed Data Requirements

### Test User: `e2e-test@bayit.tv`

- Premium subscription active
- Voice preference enabled
- Subtitles preference enabled
- Consent preference set
- One complete avatar with voice clone

### BYOC Sources

- **Plex source** → test Plex server, VOD with Hebrew + English subtitles
- **YouTube source** → YouTube channel/playlist as BYOC source, content with subtitles

### Content

- Channel 13 available and streamable
- Glossary terms populated

### Seed Script Behavior

- **Idempotent** — upserts, safe to run repeatedly
- **Non-destructive** — never deletes existing data
- **Validates after seeding** — queries back each fixture
- **Outputs `test-fixtures.json`** — IDs consumed by all platform test suites

---

## 5. Synthetic Audio Strategy (Features 13–15)

Two-tier testing for mic-dependent features:

### Tier 1: Boundary Test (all platforms)

Navigate to feature → assert mic permission dialog or unavailable state renders correctly.

### Tier 2: Synthetic Injection (iOS)

- `AudioInputProvider` protocol injected via DI
- Test builds swap real mic for file-based provider
- Test bundle includes 2–3 Hebrew audio clips (~5s each)
- Files: `hebrew-hello.wav`, `hebrew-phrase.wav`, `hebrew-sentence.wav`

---

## 6. Performance Baselines

| Tier        | Features                                                                                                                          | Threshold | Measurement                      |
| ----------- | --------------------------------------------------------------------------------------------------------------------------------- | --------- | -------------------------------- |
| Real-time   | Live Dubbing, Live Subtitles                                                                                                      | < 3s      | Action → first audio/text output |
| Interactive | Pause & Ask, AI Companion, Talk Back, Chatbot, LLM Search, Proactive Voice                                                        | < 5s      | Send input → response renders    |
| Background  | VOD Moments, Cultural Context, Scene Search, Bilingual Bridge, Interactive Subtitles, Vocabulary, Glossary, Live Trivia, Catch Up | < 8s      | Open panel → data populated      |
| Async       | Phonetic Mirror, Interactive Mission                                                                                              | < 10s     | Audio submit → score/progression |

**Phase 1:** Informational only — logged, not gating.
**Phase 2:** After 2–3 runs establish baselines, thresholds tighten to fail on >50% regression.

---

## 7. Visual Regression

- **iOS/tvOS:** `XCUIScreenshotProviding` at key moments
- **Android:** Compose `captureToImage()` or screenshot rules
- **Web:** Playwright `page.screenshot()` + `toMatchSnapshot()`
- **Baselines:** Stored in `tests/visual-baselines/{platform}/` per feature
- **Tolerance:** 1% pixel difference threshold
- **Diff tool:** Playwright built-in (web), image-diff script (native)

---

## 8. File Structure

```
bayit-plus/
├── scripts/
│   ├── test-discover.sh
│   ├── seed-test-data.py
│   └── collect-e2e-results.sh
│
├── tests/
│   └── e2e/
│       ├── fixtures/
│       │   ├── test-fixtures.json
│       │   └── audio/
│       │       ├── hebrew-hello.wav
│       │       ├── hebrew-phrase.wav
│       │       └── hebrew-sentence.wav
│       └── visual-baselines/
│           ├── ios/
│           ├── tvos/
│           ├── web/
│           └── android/
│
├── ios-app/BayitPlusUITests/Discover/
│   ├── DiscoverTabTests.swift
│   ├── PauseAskTests.swift
│   ├── InteractiveSubtitlesTests.swift
│   ├── VocabularyTests.swift
│   ├── VODMomentsTests.swift
│   ├── CulturalContextTests.swift
│   ├── BilingualBridgeTests.swift
│   ├── AICompanionTests.swift
│   ├── LiveDubbingTests.swift
│   ├── LiveSubtitlesTests.swift
│   ├── LiveTriviaTests.swift
│   ├── CatchUpTests.swift
│   ├── SceneSearchTests.swift
│   ├── PhoneticMirrorTests.swift
│   ├── TalkBackTests.swift
│   ├── InteractiveMissionTests.swift
│   ├── GlossaryTests.swift
│   ├── LLMSearchTests.swift
│   ├── ProactiveVoiceTests.swift
│   ├── ChatbotTests.swift
│   └── Helpers/
│       ├── DiscoverTestFixtures.swift
│       ├── ContentSourceHelper.swift
│       └── AudioInjectionHelper.swift
│
├── web/tests/e2e/discover/
│   ├── pause-ask.spec.ts
│   ├── interactive-subtitles.spec.ts
│   ├── vocabulary.spec.ts
│   ├── vod-moments.spec.ts
│   ├── cultural-context.spec.ts
│   ├── bilingual-bridge.spec.ts
│   ├── ai-companion.spec.ts
│   ├── live-dubbing.spec.ts
│   ├── live-subtitles.spec.ts
│   ├── live-trivia.spec.ts
│   ├── catch-up.spec.ts
│   ├── scene-search.spec.ts
│   ├── phonetic-mirror.spec.ts
│   ├── talk-back.spec.ts
│   ├── interactive-mission.spec.ts
│   ├── glossary.spec.ts
│   ├── llm-search.spec.ts
│   ├── proactive-voice.spec.ts
│   ├── chatbot.spec.ts
│   └── helpers/
│       ├── discover-fixtures.ts
│       └── content-source-helper.ts
│
├── android-app/app/src/androidTest/discover/
│   ├── PauseAskTest.kt
│   ├── ... (same 19 features)
│   └── helpers/
│       ├── DiscoverTestFixtures.kt
│       └── ContentSourceHelper.kt
│
└── .github/workflows/
    └── e2e-discover.yml
```

---

## 9. CI Pipeline: `e2e-discover.yml`

**Trigger:** PR to main/develop + manual dispatch

**Runner:** Self-hosted macOS with Xcode, Android SDK, Node.js 18+, Python 3.11, Poetry

### Jobs

1. **setup-backend** (sequential)
   - Poetry install
   - Start FastAPI on localhost:8000
   - Run `seed-test-data.py`
   - Health check

2. **test-platforms** (parallel matrix)
   - `ios`: `xcodebuild test` → iPhone 17 Pro simulator
   - `tvos`: `xcodebuild test` → Apple TV 4K simulator
   - `web`: `npx playwright test`
   - `android`: `./gradlew connectedAndroidTest` → emulator

3. **collect-results** (sequential)
   - Merge 4 platform reports
   - Upload screenshots + diffs as artifacts
   - Post summary comment on PR
   - Fail PR if any feature has 0 passing tests

---

## 10. Claude Code Skill: `/test-discover`

- Runs the same `test-discover.sh` orchestrator
- Options: `--platform ios|tvos|web|android|all`
- Options: `--feature pause_ask|live_dubbing|...|all`
- Output: `/tmp/discover-e2e-report/`

---

## 11. Decision Log

| #   | Decision                                   | Alternatives                        | Rationale                                  |
| --- | ------------------------------------------ | ----------------------------------- | ------------------------------------------ |
| 1   | Native test frameworks per platform        | Maestro, Appium                     | Best reliability, leverages existing infra |
| 2   | Local backend against Atlas                | Local MongoDB, staging, mock server | Realistic data, no mock drift              |
| 3   | BYOC Plex + YouTube as VOD sources         | Native content, mock content        | Tests real content provider integrations   |
| 4   | Channel 13 for live TV                     | Mock stream                         | Known reliable, works on simulator         |
| 5   | Synthetic audio via DI protocol            | simctl hacks, Appium injection      | Clean architecture, testable               |
| 6   | Boundary + synthetic for mic features      | Skip or boundary only               | Maximum coverage                           |
| 7   | One test file per feature per platform     | Grouped, mega-file                  | Clear ownership, parallelizable            |
| 8   | VOD features run twice (Plex + YouTube)    | Single source                       | Both are real user paths                   |
| 9   | Performance thresholds informational first | Hard gates from day one             | Need baselines first                       |
| 10  | Shared test-fixtures.json                  | Hardcoded IDs, env vars             | Single source of truth                     |
| 11  | Claude Code skill + CI pipeline            | Manual only, CI only                | Local dev + automated gating               |
| 12  | Self-hosted macOS CI runner                | Linux + cloud sims                  | Only option for all 4 platforms            |
| 13  | Visual baselines in repo                   | External storage                    | Versioned, reviewable in PRs               |

---

## 12. Assumptions

- Self-hosted macOS CI runner available or will be provisioned
- AI features return deterministic-enough responses for pattern matching
- Test Plex server is available and has suitable content
- Local backend can run all 19 features with Atlas connectivity
- ElevenLabs and other external AI services are accessible from local/CI environments

---

## 13. Risks

| Risk                                                       | Mitigation                                              |
| ---------------------------------------------------------- | ------------------------------------------------------- |
| Synthetic audio may not fully replicate mic input behavior | Boundary tests provide fallback coverage                |
| External AI services may be slow/unavailable               | Generous timeouts + retry logic in tests                |
| Self-hosted runner provisioning delay                      | /test-discover skill works locally in the meantime      |
| Atlas test data could drift or be modified                 | Seed script is idempotent, runs before every test suite |
| YouTube content may be taken down                          | Seed script validates content availability              |
