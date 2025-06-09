## [1.21.11](https://github.intuit.com/cas-hri/gaia-webplugin/compare/v1.21.10...v1.21.11) (2025-06-03)

### Bug Fixes

- css for sodebar
  ([77e27ad](https://github.intuit.com/cas-hri/gaia-webplugin/commit/77e27adb3ff3e39c0abdf1b053871c932583ae39))

## [1.21.10](https://github.intuit.com/cas-hri/gaia-webplugin/compare/v1.21.9...v1.21.10) (2025-05-31)

### Bug Fixes

- use RestService.get for investigation API
  ([94da839](https://github.intuit.com/cas-hri/gaia-webplugin/commit/94da839ba1ec1b83cf1a8851b1260e1dbc7a2e6f))

## [1.21.9](https://github.intuit.com/cas-hri/gaia-webplugin/compare/v1.21.8...v1.21.9) (2025-05-31)

### Bug Fixes

- use /api/investigation for investigation GET call
  ([470d970](https://github.intuit.com/cas-hri/gaia-webplugin/commit/470d9706c909b01d1a742950474bfc6ffde29c50))

## [1.21.8](https://github.intuit.com/cas-hri/gaia-webplugin/compare/v1.21.7...v1.21.8) (2025-05-31)

### Bug Fixes

- use user_id as query parameter for investigation API call
  ([f38878b](https://github.intuit.com/cas-hri/gaia-webplugin/commit/f38878b435d92fe673f74e6fa564caded65f8537))

## [1.21.7](https://github.intuit.com/cas-hri/gaia-webplugin/compare/v1.21.6...v1.21.7) (2025-05-31)

### Bug Fixes

- log API risk score and LLM thoughts in agent log
  ([5f82568](https://github.intuit.com/cas-hri/gaia-webplugin/commit/5f825682ddfb83d90bfc7bbdd6c798a84b5094e6))
- use correct API risk score in RiskScoreDisplay UI
  ([8b05459](https://github.intuit.com/cas-hri/gaia-webplugin/commit/8b0545926fb25789f35d60581401e61050df9b79))

## [1.21.6](https://github.intuit.com/cas-hri/gaia-webplugin/compare/v1.21.5...v1.21.6) (2025-05-29)

### Bug Fixes

- use latest investigationId for API calls after investigation start
  ([aed9b59](https://github.intuit.com/cas-hri/gaia-webplugin/commit/aed9b595857f90884cbd4158b73c96ce850bd8c2))
- **location:** use llm_thoughts and timestamp in processLocationData
  ([e7d1d83](https://github.intuit.com/cas-hri/gaia-webplugin/commit/e7d1d83b2caf0b2a50f2e53b3bc0d9905045a7d7))
- remove investigationId from URL params on mount
  ([c81cbe3](https://github.intuit.com/cas-hri/gaia-webplugin/commit/c81cbe39371c3cc272b4f24e4cee7123c72b327c))

## [1.21.5](https://github.intuit.com/cas-hri/gaia-webplugin/compare/v1.21.4...v1.21.5) (2025-05-29)

### Bug Fixes

- **test:** add missing timeRange props to InvestigationHeader tests
  ([329ed42](https://github.intuit.com/cas-hri/gaia-webplugin/commit/329ed4279401cbab3aad2e1eedb2a930c7852856))
- **test:** add required timeRange props to InvestigationHeader tests
  ([f6fa04e](https://github.intuit.com/cas-hri/gaia-webplugin/commit/f6fa04eaf8e0cbc6a080bf77d64352552cd5101e))
- handle Unicode in btoa for InvestigationStep list keys
  ([ea68897](https://github.intuit.com/cas-hri/gaia-webplugin/commit/ea68897e350f8d69486638c00203f551103dc332))

## [1.21.4](https://github.intuit.com/cas-hri/gaia-webplugin/compare/v1.21.3...v1.21.4) (2025-05-29)

### Bug Fixes

- **test:** add missing timeRange props to InvestigationHeader tests
  ([684889c](https://github.intuit.com/cas-hri/gaia-webplugin/commit/684889cb65b16f94a9b98210335a9c56fcf4589a))

## [1.21.3](https://github.intuit.com/cas-hri/gaia-webplugin/compare/v1.21.2...v1.21.3) (2025-05-29)

### Bug Fixes

- **test:** resolve all type errors in tests and mocks
  ([f3ec3f1](https://github.intuit.com/cas-hri/gaia-webplugin/commit/f3ec3f1fbbb2b63801b400c025c8b59a8bc3bb8d))

## [1.21.2](https://github.intuit.com/cas-hri/gaia-webplugin/compare/v1.21.1...v1.21.2) (2025-05-27)

### Bug Fixes

- **layout:** use min-h-0 and h-full for flexbox scrolling
  ([a635d3c](https://github.intuit.com/cas-hri/gaia-webplugin/commit/a635d3c4f6c2bc2073c48e4aad7c4adba2908dcf))

## [1.21.1](https://github.intuit.com/cas-hri/gaia-webplugin/compare/v1.21.0...v1.21.1) (2025-05-26)

### Bug Fixes

- test null checks, clipboard mocks, risk/LLM labels
  ([645fb2b](https://github.intuit.com/cas-hri/gaia-webplugin/commit/645fb2baa952a59c7e050c0960f5a9b5169df41a))

# [1.21.0](https://github.intuit.com/cas-hri/gaia-webplugin/compare/v1.20.2...v1.21.0) (2025-05-26)

### Features

- center risk score, agent cards left/right, user_id fix
  ([44ad7dd](https://github.intuit.com/cas-hri/gaia-webplugin/commit/44ad7ddde1412b7fc1bc0cf9adf3aaf0af3e83d8))

## [1.20.2](https://github.intuit.com/cas-hri/gaia-webplugin/compare/v1.20.1...v1.20.2) (2025-05-26)

### Bug Fixes

- risk log and UI
  ([fd96652](https://github.intuit.com/cas-hri/gaia-webplugin/commit/fd9665259d802c7c69a0919f1171809301af0c41))

## [1.20.1](https://github.intuit.com/cas-hri/gaia-webplugin/compare/v1.20.0...v1.20.1) (2025-05-26)

### Bug Fixes

- mandatory investigationid in api calls
  ([9bf04cf](https://github.intuit.com/cas-hri/gaia-webplugin/commit/9bf04cf82c4cfd30687658c192c00c780182cc90))
- mandatory investigationid in api calls
  ([e611c1e](https://github.intuit.com/cas-hri/gaia-webplugin/commit/e611c1efc2bb77b2c3ed5822a39c4a7d9e05f9b6))
- require user_id for investigation creation and update API usage
  ([f869b80](https://github.intuit.com/cas-hri/gaia-webplugin/commit/f869b800d5dc914dae225b88a4c1dd15fb3fc57a))
- tests
  ([994fad9](https://github.intuit.com/cas-hri/gaia-webplugin/commit/994fad931cbe2802e5d38cd42ba7c98ecec5b46d))
- user_id
  ([72b668d](https://github.intuit.com/cas-hri/gaia-webplugin/commit/72b668d32a565194fd27b822fac483ff04ea7c76))

# [1.20.0](https://github.intuit.com/cas-hri/gaia-webplugin/compare/v1.19.0...v1.20.0) (2025-05-25)

### Bug Fixes

- correct AgentLogSidebar drag direction and resolve linter issues
  ([2f7baf5](https://github.intuit.com/cas-hri/gaia-webplugin/commit/2f7baf5b43a337c2f0e256f0719b150ec557f4fe))

### Features

- improve sidebar animation, add close button to ChatSidebar
  ([4cfdd7c](https://github.intuit.com/cas-hri/gaia-webplugin/commit/4cfdd7c3a607e75254b2ad10a79f32a72074c336))

# [1.19.0](https://github.intuit.com/cas-hri/gaia-webplugin/compare/v1.18.3...v1.19.0) (2025-05-25)

### Bug Fixes

- use default export for createInvestigationRecord
  ([e567580](https://github.intuit.com/cas-hri/gaia-webplugin/commit/e567580b16878934277ea1d2d952ce6d9ed45672))
- **components:** remove unused variable warning in EditStepsModal
  ([15d70b7](https://github.intuit.com/cas-hri/gaia-webplugin/commit/15d70b707eb36269f2d72a06151160eee9a32a54))
- remove investigationId from agent API calls and clean up code
  ([d7f9da4](https://github.intuit.com/cas-hri/gaia-webplugin/commit/d7f9da497e8f19f3b35b5c25f410cca76c9b7dc7))

### Features

- switch to tab-based navigation for investigation pages (no router)
  ([0b92ab7](https://github.intuit.com/cas-hri/gaia-webplugin/commit/0b92ab7e6f914bab3369abe96c9fb7c2866f71ac))

## [1.18.3](https://github.intuit.com/cas-hri/gaia-webplugin/compare/v1.18.2...v1.18.3) (2025-05-25)

### Bug Fixes

- limit DI BB parsed data width to prevent UI stretching
  ([68c4a15](https://github.intuit.com/cas-hri/gaia-webplugin/commit/68c4a1572c3c9e71e0ef21077ec09db85ba1bcb4))

## [1.18.2](https://github.intuit.com/cas-hri/gaia-webplugin/compare/v1.18.1...v1.18.2) (2025-05-24)

### Bug Fixes

- expand chat bar
  ([0cc00aa](https://github.intuit.com/cas-hri/gaia-webplugin/commit/0cc00aada811d3d095c903bce891f88eb133babb))

## [1.18.1](https://github.intuit.com/cas-hri/gaia-webplugin/compare/v1.18.0...v1.18.1) (2025-05-24)

### Bug Fixes

- update configs and remove style-loader for Plugin CLI compatibility
  ([f38bb78](https://github.intuit.com/cas-hri/gaia-webplugin/commit/f38bb784f77c9d376a316f5c8b480e01a9e6a3d5))

# [1.16.0](https://github.intuit.com/cas-hri/gaia-webplugin/compare/v1.15.0...v1.16.0) (2025-05-22)

### Features

- **logs-agent:** log chronos_data in agent and mock responses
  ([545b9e5](https://github.intuit.com/cas-hri/gaia-webplugin/commit/545b9e52bd6a01eaf7639e0998b62c8504dc9b9c))

# [1.15.0](https://github.intuit.com/cas-hri/gaia-webplugin/compare/v1.14.0...v1.15.0) (2025-05-22)

### Features

- include investigation_id in all agent API calls
  ([4315ae0](https://github.intuit.com/cas-hri/gaia-webplugin/commit/4315ae0952e8805d85ffc8f4d8bd8e20a4cd7123))
- log LLM prompt trimming warnings in agent logs
  ([a4a5ed5](https://github.intuit.com/cas-hri/gaia-webplugin/commit/a4a5ed5194da56db86d6777b4a6a8447071b5173))
- **ui:** add icons to toggles, unify sidebar heights
  ([148c28a](https://github.intuit.com/cas-hri/gaia-webplugin/commit/148c28a14936f8cca3d1c96f0df9237c7aef8474))

# [1.14.0](https://github.intuit.com/cas-hri/gaia-webplugin/compare/v1.13.0...v1.14.0) (2025-05-20)

### Features

- **fpar-1767:** move risk-assessment to frontend
  ([9b27bac](https://github.intuit.com/cas-hri/gaia-webplugin/commit/9b27bac397e79f5b643454f99d2867e9363e1389))

# [1.13.0](https://github.intuit.com/cas-hri/gaia-webplugin/compare/v1.12.1...v1.13.0) (2025-05-20)

### Features

- **fpar-1767:** change time_range to 30d
  ([458cabf](https://github.intuit.com/cas-hri/gaia-webplugin/commit/458cabf833402d90867de663f5ea5374a52eb85f))

## [1.12.1](https://github.intuit.com/cas-hri/gaia-webplugin/compare/v1.12.0...v1.12.1) (2025-05-20)

### Bug Fixes

- added popout modal fur full agent details
  ([63f1024](https://github.intuit.com/cas-hri/gaia-webplugin/commit/63f10245f92ce446fc878a93fa48586656928038))
- show device locations on map and add React 18 compatibility
  ([ec30a22](https://github.intuit.com/cas-hri/gaia-webplugin/commit/ec30a2228994a78db56084c7f7e6b09d0c434fbe))

# [1.12.0](https://github.intuit.com/cas-hri/gaia-webplugin/compare/v1.11.0...v1.12.0) (2025-05-19)

### Features

- added modal for llm thoughts
  ([2c436dd](https://github.intuit.com/cas-hri/gaia-webplugin/commit/2c436dd4accb237c336b209e5b11d02974b5ecad))

# [1.11.0](https://github.intuit.com/cas-hri/gaia-webplugin/compare/v1.10.1...v1.11.0) (2025-05-19)

### Bug Fixes

- added final thoughts
  ([8332961](https://github.intuit.com/cas-hri/gaia-webplugin/commit/833296179670b82674ace9e688e1e744546e1171))
- risk score displayed only once step is completed
  ([6ea1c63](https://github.intuit.com/cas-hri/gaia-webplugin/commit/6ea1c63484a99ea6eb9b55cd3f76e7b4032a1b7f))
- ui
  ([8357ca7](https://github.intuit.com/cas-hri/gaia-webplugin/commit/8357ca7d917dacb850e9139f7a830d3a9f0119db))

### Features

- added fade in animations
  ([e82a8a8](https://github.intuit.com/cas-hri/gaia-webplugin/commit/e82a8a82c5cabd2de8e8f47b3d86cb2feb9b39f1))

### Reverts

- rollback all commits after 03a31c3 (from d08a2cc)
  ([928bcf2](https://github.intuit.com/cas-hri/gaia-webplugin/commit/928bcf2cded8dd584d57ca6e73820fe9bc5eba0d))

# [1.10.0](https://github.intuit.com/cas-hri/gaia-webplugin/compare/v1.9.1...v1.10.0) (2025-05-18)

### Features

- add 2s delay and success log before agent analysis step
  ([c41711c](https://github.intuit.com/cas-hri/gaia-webplugin/commit/c41711c600e261351903a7192e46304b57d0b38f))
- show newest log messages at top and remove auto-scroll
  ([d3a82cc](https://github.intuit.com/cas-hri/gaia-webplugin/commit/d3a82ccdc94a020b6f8e5804fd95a098d8820f85))

## [1.10.1](https://github.intuit.com/cas-hri/gaia-webplugin/compare/v1.10.0...v1.10.1) (2025-05-18)

### Bug Fixes

- set step as fialed if exception is thrown
  ([324f4f5](https://github.intuit.com/cas-hri/gaia-webplugin/commit/324f4f5eb7d53c861d0a4e2e349c9d11e5aecdce))

## [1.9.1](https://github.intuit.com/cas-hri/gaia-webplugin/compare/v1.9.0...v1.9.1) (2025-05-18)

### Bug Fixes

- demo files
  ([5d09827](https://github.intuit.com/cas-hri/gaia-webplugin/commit/5d098273efdaa11ca8ad5fdf374d8b59d1250e5d))
- normalize and display all agent risk assessments
  ([e6bce3a](https://github.intuit.com/cas-hri/gaia-webplugin/commit/e6bce3af4592c20d53650df1e62971d61145e965))
- resolve TS2339 error with response.error type assertion
  ([66ae873](https://github.intuit.com/cas-hri/gaia-webplugin/commit/66ae873327926a879917c719f1143118cdec8a7f))
- show agent risk scores only after agent is active
  ([c345ae3](https://github.intuit.com/cas-hri/gaia-webplugin/commit/c345ae38a2913e109af692d93ce0efda8f818a01))
- show agent risk scores only after agent is active
  ([2962434](https://github.intuit.com/cas-hri/gaia-webplugin/commit/2962434e87fc4cef04951fddcf42e516cdceb361))
- show log_risk_assessment in Log Agent, fallback to risk_assessment
  ([e25bd14](https://github.intuit.com/cas-hri/gaia-webplugin/commit/e25bd14711303dd6609dda428ea04239550a576d))

# [1.9.0](https://github.intuit.com/cas-hri/gaia-webplugin/compare/v1.8.0...v1.9.0) (2025-05-17)

### Bug Fixes

- **types:** remove duplicate enums and update log agent types
  ([53fc0d3](https://github.intuit.com/cas-hri/gaia-webplugin/commit/53fc0d35829acfb10dee7759ee07d6ad53c25949))

### Features

- **investigation:** add agent thoughts to log messages
  ([ff59b25](https://github.intuit.com/cas-hri/gaia-webplugin/commit/ff59b25bc31346ae258d34e46eb0a4795cf6bf52))
- **investigation:** add demo mode support with URL parameters
  ([d40405a](https://github.intuit.com/cas-hri/gaia-webplugin/commit/d40405a41581e9c2aa628b42faee1fbf7bdd3617))
- show 'waiting for data...' log after agent logs before API call
  ([791f1b4](https://github.intuit.com/cas-hri/gaia-webplugin/commit/791f1b4a1001fe8b3f41cad1d38a5e90f3a562d2))
- **types:** migrate to new agent response types
  ([1d5171d](https://github.intuit.com/cas-hri/gaia-webplugin/commit/1d5171da48864170b050967ae3a69841c392c167))

# [1.8.0](https://github.intuit.com/cas-hri/gaia-webplugin/compare/v1.7.1...v1.8.0) (2025-05-13)

### Bug Fixes

- add anything() import from ts-mockito to fix logger mock setup
  ([6ac34fb](https://github.intuit.com/cas-hri/gaia-webplugin/commit/6ac34fb98e913c1873993f0791e6f2ab56bb2905))
- update logger mock and manifest version types
  ([66714be](https://github.intuit.com/cas-hri/gaia-webplugin/commit/66714bee834f8d2544e6071ccb5391c12c5baf88))

### Features

- change scroll max-height from 600px to 200px
  ([16df0a8](https://github.intuit.com/cas-hri/gaia-webplugin/commit/16df0a85133fd0e43a67c7528cae63612e825d8d))
- update scroll max-height to 200px
  ([eb554cd](https://github.intuit.com/cas-hri/gaia-webplugin/commit/eb554cdc6a0f2ce990b77a6192e9bad48c66276c))

## [1.7.1](https://github.intuit.com/cas-hri/gaia-webplugin/compare/v1.7.0...v1.7.1) (2025-05-12)

### Bug Fixes

- logs clearing
  ([ee087d5](https://github.intuit.com/cas-hri/gaia-webplugin/commit/ee087d570b7bf536b4740b770dc6a750d9b6ed2f))

# [1.7.0](https://github.intuit.com/cas-hri/gaia-webplugin/compare/v1.6.0...v1.7.0) (2025-05-12)

### Bug Fixes

- add missing onLogAnimationComplete prop type
  ([f82b550](https://github.intuit.com/cas-hri/gaia-webplugin/commit/f82b550cdbeea8ff4aa4d605988bf7574be23211))
- ensure risk score calculation happens after all agents complete
  ([cbc5c16](https://github.intuit.com/cas-hri/gaia-webplugin/commit/cbc5c16287b9569d01f074f017fc0387b1d42383))
- improve error payload handling
  ([be899e4](https://github.intuit.com/cas-hri/gaia-webplugin/commit/be899e44ccfb9ca9bc9838564dfb7cef83eb102b))
- improve step progression and investigation completion logic
  ([0351ea9](https://github.intuit.com/cas-hri/gaia-webplugin/commit/0351ea969a90cbe7d3729be1f2a0183723f9c02a))
- improve step progression logic with proper bounds checking
  ([8252eda](https://github.intuit.com/cas-hri/gaia-webplugin/commit/8252edae25daa8f7d85608fa50a778824228aa48))
- only update step status on current step failure
  ([7e9e12e](https://github.intuit.com/cas-hri/gaia-webplugin/commit/7e9e12ee22e2830ed5e82eadbf0438909f1e2419))
- only update step status on current step failure in catch block
  ([fb70070](https://github.intuit.com/cas-hri/gaia-webplugin/commit/fb700705f4086301a7b09d6682496e67477b4aaf))
- remove unnecessary await from addLog calls
  ([0a9732a](https://github.intuit.com/cas-hri/gaia-webplugin/commit/0a9732aa2b881be0a5ea3256a2b39b4cca8f865a))
- rename step index var and add risk completion log
  ([9fc6ac3](https://github.intuit.com/cas-hri/gaia-webplugin/commit/9fc6ac3f2bbfd0ebb33c8595bdcd5c089b863d33))
- reorder operations to ensure logs are displayed
  ([4407e76](https://github.intuit.com/cas-hri/gaia-webplugin/commit/4407e7654131e0e58535e342064891faa20329bc))
- update agent colors to use Tailwind classes
  ([3bc2263](https://github.intuit.com/cas-hri/gaia-webplugin/commit/3bc2263f025820a68ba71cb9046bf77c09cce667))
- update progress bar when step is completed
  ([9bb6761](https://github.intuit.com/cas-hri/gaia-webplugin/commit/9bb6761645fdbf9b8aa292c3f7c1767176b18e5c))
- use currentSteps for step progression
  ([a725a4c](https://github.intuit.com/cas-hri/gaia-webplugin/commit/a725a4c993459dde7b202bec030ba26bc92054c7))

### Features

- enable show details button for IN_PROGRESS and COMPLETED steps
  ([2e78ccc](https://github.intuit.com/cas-hri/gaia-webplugin/commit/2e78ccc8e382a80c87c7a95c303e73026ea291be))
- make header section sticky
  ([fd4c131](https://github.intuit.com/cas-hri/gaia-webplugin/commit/fd4c1313e713022f9ed06bef60133f7ffd9250de))
- make header section sticky
  ([e6ce681](https://github.intuit.com/cas-hri/gaia-webplugin/commit/e6ce6810ac95a579ec5b00c29b4bc3a07ae85cc5))

# [1.6.0](https://github.intuit.com/cas-hri/gaia-webplugin/compare/v1.5.0...v1.6.0) (2025-05-08)

### Bug Fixes

- add map rendering to Location step details
  ([b747aca](https://github.intuit.com/cas-hri/gaia-webplugin/commit/b747acaec5aa416518a0a8b52fe2432ac2ccaff4))
- cleanup
  ([9b673a1](https://github.intuit.com/cas-hri/gaia-webplugin/commit/9b673a1fe90ada73d8b228d3325896c29e241cb3))
- improve location map display and data handling
  ([fbef498](https://github.intuit.com/cas-hri/gaia-webplugin/commit/fbef498208b5f160d0584eae9d3f967b5eb10db1))
- removed explicit key
  ([151dcc4](https://github.intuit.com/cas-hri/gaia-webplugin/commit/151dcc47cf01cf4dc65bf983d1994818e7384910))
- resolve linter errors in InvestigationPage
  ([bf97a73](https://github.intuit.com/cas-hri/gaia-webplugin/commit/bf97a7338cc012e2bddf2f797e4e3ba443abcc2e))
- update Google Maps API key access in LocationMap component
  ([5eb93a2](https://github.intuit.com/cas-hri/gaia-webplugin/commit/5eb93a2ba69e1a0af88fa0bffdb6617ca48869dd))
- update LocationMap imports and error handling
  ([14c4363](https://github.intuit.com/cas-hri/gaia-webplugin/commit/14c4363aba189404d00263e8c4e27d43571511b1))
- use config hook for Google Maps API key
  ([aa1b50e](https://github.intuit.com/cas-hri/gaia-webplugin/commit/aa1b50e1434f7c477cdaa4d3a66e7d4acc17c389))
- use google geocoding
  ([201c69d](https://github.intuit.com/cas-hri/gaia-webplugin/commit/201c69d1d793710d9e0ffc6d5cc13eba35ccee26))

### Features

- add LocationMap component for displaying location data
  ([3eb97d6](https://github.intuit.com/cas-hri/gaia-webplugin/commit/3eb97d6b0da87af910ea602f2fc846eae3c510d9))
- add LocationMap component for displaying location data
  ([b4d1ff5](https://github.intuit.com/cas-hri/gaia-webplugin/commit/b4d1ff5102d00d6c2919f734e0f08347c7e514b5))

# [1.5.0](https://github.intuit.com/cas-hri/gaia-webplugin/compare/v1.4.2...v1.5.0) (2025-05-06)

### Bug Fixes

- add initialization step to investigation flow
  ([b1570c8](https://github.intuit.com/cas-hri/gaia-webplugin/commit/b1570c804c0bdb43e18182556976bc5ae4e81582))
- add JSDoc comments to EditStepsModal functions
  ([0b14a80](https://github.intuit.com/cas-hri/gaia-webplugin/commit/0b14a807f6f5965cae296eb09b320a9293a36dae))
- added extendedproperties
  ([8940636](https://github.intuit.com/cas-hri/gaia-webplugin/commit/89406360ad2e3295aefc140967b8380d7b978180))
- colors for step statuses
  ([fa495b1](https://github.intuit.com/cas-hri/gaia-webplugin/commit/fa495b1140192412859bad081e08f998c29c1eb6))
- initialization step added twice
  ([05b0854](https://github.intuit.com/cas-hri/gaia-webplugin/commit/05b08549fcaef38278b1f721099855c6ea0d0a1d))
- lint
  ([c0ddf0e](https://github.intuit.com/cas-hri/gaia-webplugin/commit/c0ddf0e9cfe613012e400b1cbe73751cef0b19f2))
- remove apiu key from extended properties
  ([f63c2a3](https://github.intuit.com/cas-hri/gaia-webplugin/commit/f63c2a34109136e1c58723f446042e06fd7826f4))
- remove invalid deployments property from manifest
  ([74c6f12](https://github.intuit.com/cas-hri/gaia-webplugin/commit/74c6f12c1c24a9b3e47fe96da2269a39ce8034d1))
- remove invalid deployments property from manifest
  ([6966e8c](https://github.intuit.com/cas-hri/gaia-webplugin/commit/6966e8c374ab6bd2b3b3ef73f937c251718a96c1))
- update test types to use LogLevel enum
  ([0e1715e](https://github.intuit.com/cas-hri/gaia-webplugin/commit/0e1715e98e5e36cc0826ac3244c9022ac22ad001))

### Features

- add 3-second timeout to log message caret
  ([f761e21](https://github.intuit.com/cas-hri/gaia-webplugin/commit/f761e21f6cfc8897a12af230515d51b21d77aa34))
- auto-clear logs when starting new investigation
  ([04576a3](https://github.intuit.com/cas-hri/gaia-webplugin/commit/04576a30ff3d394009379beec0f56784a070ac63))
- format timestamps for all agents (Network, Device, Log)
  ([25eb516](https://github.intuit.com/cas-hri/gaia-webplugin/commit/25eb516770c330edd833fe476072bb1726536830))
- improve 401 Unauthorized error handling
  ([34a035f](https://github.intuit.com/cas-hri/gaia-webplugin/commit/34a035f8e91c6bf30066fb497989bcb81b6c42b6))
- improve timestamp formatting in investigation details
  ([3ea84e7](https://github.intuit.com/cas-hri/gaia-webplugin/commit/3ea84e729960b7b5dfe50ad58184ef831506f91a))
- multi-color animated donut chart for investigation progress
  ([ac2839b](https://github.intuit.com/cas-hri/gaia-webplugin/commit/ac2839bc1c2180f1908478b5586b089df944ae6f))
- read mock mode from URL parameter
  ([b1e8d8a](https://github.intuit.com/cas-hri/gaia-webplugin/commit/b1e8d8ad4697529e653541526fab6fe78c626fc7))

## [1.4.2](https://github.intuit.com/cas-hri/gaia-webplugin/compare/v1.4.1...v1.4.2) (2025-05-01)

### Bug Fixes

- add cancellation logic to log animation
  ([869621f](https://github.intuit.com/cas-hri/gaia-webplugin/commit/869621f7e012473e77ca47bca7fc83a5e30d978a))
- test file fix
  ([1e873f3](https://github.intuit.com/cas-hri/gaia-webplugin/commit/1e873f3111ad4f9e891e4b808f9b0e46db31c0f4))

## [1.4.1](https://github.intuit.com/cas-hri/gaia-webplugin/compare/v1.4.0...v1.4.1) (2025-05-01)

### Bug Fixes

- close investigation
  ([9e46e6f](https://github.intuit.com/cas-hri/gaia-webplugin/commit/9e46e6fc88cd593f01c99d91dfad6115debf7310))
- fixed progress bar
  ([51d965b](https://github.intuit.com/cas-hri/gaia-webplugin/commit/51d965b02845c3a7550ff2b56647a5c15810057c))
- improve log animation handling
  ([d839418](https://github.intuit.com/cas-hri/gaia-webplugin/commit/d839418d2d90b37c55fefc5d5c5540e1f3780d50))
- reorder imports in InvestigationStep.tsx
  ([97e146e](https://github.intuit.com/cas-hri/gaia-webplugin/commit/97e146e168d8cd743173c36c6bcf0695dab03c7d))
- reset step index and progress bar on new investigation
  ([46a12ab](https://github.intuit.com/cas-hri/gaia-webplugin/commit/46a12ab4d30d54c395a9b3e7f1ceb3cf81196b57))
- show details
  ([44d56c7](https://github.intuit.com/cas-hri/gaia-webplugin/commit/44d56c7f1bb90b322aa74e14cbadd7c631566d23))
- update enum types in test files
  ([91e694e](https://github.intuit.com/cas-hri/gaia-webplugin/commit/91e694e3504754d06f372fe1144e03668a7b36e4))
- **investigation:** improve investigation flow and UI controls
  ([ed57cf1](https://github.intuit.com/cas-hri/gaia-webplugin/commit/ed57cf1c3b96e3ffd93a13cde03dae4b61cc2291))
- **log:** improve JSDoc documentation in AgentLogSidebar
  ([d44ab44](https://github.intuit.com/cas-hri/gaia-webplugin/commit/d44ab4457f8880b473c9aae958a01b85d3059aa7))
- **mock:** use local mock data for risk assessment step
  ([91f39c4](https://github.intuit.com/cas-hri/gaia-webplugin/commit/91f39c409d5b2be5b65cac5fee33987bdb6034df))
- **progressbar:** progress
  ([90f8f5c](https://github.intuit.com/cas-hri/gaia-webplugin/commit/90f8f5cf3b4ca2cd1fa297b119cf70721b129f6e))
- **steps:** resolve type errors in step navigation
  ([e40d1da](https://github.intuit.com/cas-hri/gaia-webplugin/commit/e40d1da8aec3075b4c9f188059ba736ca3a5abdf))

# [1.4.0](https://github.intuit.com/cas-hri/gaia-webplugin/compare/v1.3.0...v1.4.0) (2025-05-01)

### Bug Fixes

- **ui:** prevent toggling details from changing active step
  ([10dcd62](https://github.intuit.com/cas-hri/gaia-webplugin/commit/10dcd62a7330b3266c1c1547a03cae21dee68792))
- add missing types for anomalies and behavior patterns
  ([4647819](https://github.intuit.com/cas-hri/gaia-webplugin/commit/46478193cc0c0391db4c3ff2f1c4148c7888cf40))
- add status and tid to OII mock response in GAIAService
  ([d0f0849](https://github.intuit.com/cas-hri/gaia-webplugin/commit/d0f08490c301944c87e1ff1d5f6df2a1fc3c3321))
- add status and tid to OII mock response in GAIAService
  ([406474a](https://github.intuit.com/cas-hri/gaia-webplugin/commit/406474a1d46660f7f607acfb6f34cc316c2d661d))
- add status and tid to OII mock response in GAIAService
  ([93c50fe](https://github.intuit.com/cas-hri/gaia-webplugin/commit/93c50fef939388967e63e942c9b1fdb9ac44aac4))
- merge branch master
  ([986243b](https://github.intuit.com/cas-hri/gaia-webplugin/commit/986243bb11e05ea468cc0f15b9e9625338f7f701))
- resolve accessibility and cleanup warnings
  ([b9e5439](https://github.intuit.com/cas-hri/gaia-webplugin/commit/b9e54394af5c12d909e4eb0612024a95324fd72c))

### Features

- **ui:** add 0.5rem margin to InvestigationStepComponent
  ([0a93d61](https://github.intuit.com/cas-hri/gaia-webplugin/commit/0a93d61e5e1cbcd196e304d000d5fd9443ec87af))
- add OII Agent integration and fix isolatedModules error
  ([00da3df](https://github.intuit.com/cas-hri/gaia-webplugin/commit/00da3dfd4692ec2fa43ea2fbc255ec01c6fca492))
- add OII Analysis step to progress bar
  ([10f876f](https://github.intuit.com/cas-hri/gaia-webplugin/commit/10f876fa93d332fa855a1ff551e37726d65eee20))

# [1.3.0](https://github.intuit.com/cas-hri/gaia-webplugin/compare/v1.2.1...v1.3.0) (2025-04-29)

### Features

- log all key-value pairs from Log agent
  ([d595e6b](https://github.intuit.com/cas-hri/gaia-webplugin/commit/d595e6bcaea1505c1ea0150d554abc8c4c72e3f7))

## [1.2.1](https://github.intuit.com/cas-hri/gaia-webplugin/compare/v1.2.0...v1.2.1) (2025-04-29)

### Bug Fixes

- lint errors and add JSDoc to InvestigationPage
  ([9ad9d98](https://github.intuit.com/cas-hri/gaia-webplugin/commit/9ad9d9882853a14e70b011cb3946f45d135cadc8))

# [1.2.0](https://github.intuit.com/cas-hri/gaia-webplugin/compare/v1.1.2...v1.2.0) (2025-04-23)

### Features

- **fpar-1666:** fix bugs
  ([057a352](https://github.intuit.com/cas-hri/gaia-webplugin/commit/057a3521bf394a9b42d292f84e05721074bd611f))
- **fpar-1666:** improve code
  ([d06ff0c](https://github.intuit.com/cas-hri/gaia-webplugin/commit/d06ff0c0f005d86c567bcefbc9761cf779b521d8))
- **fpar-1666:** integrate backend api into frontend
  ([4c73cf3](https://github.intuit.com/cas-hri/gaia-webplugin/commit/4c73cf3bd1e78b0399ead7ae6dcea5c7185399f2))

## [1.1.2](https://github.intuit.com/cas-hri/gaia-webplugin/compare/v1.1.1...v1.1.2) (2025-04-23)

### Bug Fixes

- **copytoclipboard:** fixed copyToClipboard functionality
  ([29cf43a](https://github.intuit.com/cas-hri/gaia-webplugin/commit/29cf43abc618122858991bd1d6f0765511bf527c))

## [1.1.1](https://github.intuit.com/cas-hri/gaia-webplugin/compare/v1.1.0...v1.1.1) (2025-04-22)

### Bug Fixes

- **css:** fixed css font size
  ([471382f](https://github.intuit.com/cas-hri/gaia-webplugin/commit/471382f56c8046d85d473f11fba985494c8f3e5d))

# [1.1.0](https://github.intuit.com/cas-hri/gaia-webplugin/compare/v1.0.0...v1.1.0) (2025-04-22)

### Bug Fixes

- **fpar-1666:** add comprehensive tests for InvestigationPage component
  ([486c812](https://github.intuit.com/cas-hri/gaia-webplugin/commit/486c8126f9d09d260d8e06e2613df4d6e02226c1))
- **fpar-1666:** add comprehensive tests for InvestigationPage component
  ([607743d](https://github.intuit.com/cas-hri/gaia-webplugin/commit/607743d6889f3785d98636ca47ffac6508b38ab2))
- **fpar-1666:** add comprehensive tests for InvestigationPage component
  ([f5406a1](https://github.intuit.com/cas-hri/gaia-webplugin/commit/f5406a19407653dae4c148b1738e0a5963b259dd))
- **fpar-1666:** add comprehensive tests for InvestigationPage component
  ([0e4096f](https://github.intuit.com/cas-hri/gaia-webplugin/commit/0e4096f038f1060e75234c63d2743c695cdd0401))
- update HelpInfo test location and imports for proper coverage
  ([77be115](https://github.intuit.com/cas-hri/gaia-webplugin/commit/77be115a8ea318700980cb0433e093727da56288))

### Features

- **fpar-1666:** add --no-bundlescan to yarn serve
  ([8281641](https://github.intuit.com/cas-hri/gaia-webplugin/commit/828164110987876e35ddd2460e74fa4a415e0f9b))
- **fpar-1666:** disable tests
  ([6944281](https://github.intuit.com/cas-hri/gaia-webplugin/commit/69442813915573b4df1ad4fead22aadbbe316cfb))
- **fpar-1666:** fix style
  ([de9219e](https://github.intuit.com/cas-hri/gaia-webplugin/commit/de9219e605c8bbc13925056c305a5d9493283acd))
- **fpar-1666:** integrate gaia/frontend into repo
  ([ae7bf3d](https://github.intuit.com/cas-hri/gaia-webplugin/commit/ae7bf3d92e82091c6c7b16816d7e8a124055b936))
- **fpar-1666:** update cypress tests
  ([8c7cbfb](https://github.intuit.com/cas-hri/gaia-webplugin/commit/8c7cbfbff92777cdcaf686c08fe01b09cc0eeafd))

# 1.0.0 (2025-04-21)

### Features

- **onboard:** yarn.lock and test snapshots
  ([598fac9](https://github.intuit.com/cas-hri/gaia-webplugin/commit/598fac9a9d60344f30e5bf9f2346aa37ccfa4ae5))
