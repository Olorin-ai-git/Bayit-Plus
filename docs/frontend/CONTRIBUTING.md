# 🤝 Contribution Guidelines

Whether it's improving documentation, adding a new component, or suggesting an
issue that will help us improve, all contributions are welcome!

Top reasons to contribute:

- 😍 Gain a sense of pride from improving the lives of your coworkers
- 🎓 It's a great opportunity to learn a new skill and understand a repo better
- ⏳ Free up time for the repo maintainers to focus on their roadmap

## What's in this document?

- [Contribution Expectations](#contribution-expectations)
- [Development Guidelines](#development-guidelines)
- [Autonomous Investigation Development](#autonomous-investigation-development)
- [Best Practices](#best-practices-for-contributing)
- [Contacts](#contacts)

## Contribution Expectations

The contributor is expected to practice the following:

- Have an understanding of the AppFabric Plugin
  [architecture](https://devportal.olorin.com/app/dp/capability/2611/capabilityDocs/main/docs/web-applications/concepts/architecture.md)
  and
  [development mechanics](https://devportal.olorin.com/app/dp/capability/2611/capabilityDocs/main/docs/web-plugins-widgets/getting-started/setup-plugin-for-development.md)
- Submit a new JIRA ticket for the contribution feature request and give as much
  detail as possible
- Follow the
  [JavaScript coding conventions](https://google.github.io/styleguide/jsguide.html)
  specified by Google
- Unit and integration tests must be provided with any code changes if
  applicable
- Total code coverage must be >= 80% and this will be enforced by the build/PR
- All commits, branch names, and PR names must follow
  [semantic format](https://github.com/semantic-release/semantic-release)

The team that owns this web plugin is expected to practice the following:

- Address any incoming PRs for contributions
- Prioritize feature requests if handled by the team itself
- Support the contributor through code guidance and contributing recognition!

## Development Guidelines

### Architecture Overview

The OLORIN Web Plugin follows a modular architecture with these key components:

- **Investigation Modes**: Manual and Autonomous investigation workflows
- **Agent System**: Network, Device, Location, and Logs analysis agents
- **WebSocket Communication**: Real-time updates for autonomous investigations
- **State Management**: React hooks and context for investigation state
- **UI Components**: Reusable components for investigation display

### Code Organization

```
src/
├── components/                 # Reusable UI components
│   ├── AutonomousInvestigationPanel.tsx
│   └── ...
├── js/
│   ├── hooks/                 # Custom React hooks
│   │   ├── useAutonomousInvestigation.ts
│   │   └── ...
│   ├── pages/                 # Page components
│   │   ├── InvestigationPage.tsx
│   │   └── ...
│   ├── services/              # API and business logic
│   │   ├── AutonomousInvestigationClient.ts
│   │   ├── OLORINService.ts
│   │   └── ...
│   └── types/                 # TypeScript type definitions
├── test/                      # Test files
└── docs/                      # Documentation
```

## Autonomous Investigation Development

### Key Components

When working with autonomous investigations, you'll primarily interact with:

1. **AutonomousInvestigationClient**
   (`src/js/services/AutonomousInvestigationClient.ts`)

   - Manages WebSocket connections
   - Handles investigation lifecycle (start/pause/resume/cancel)
   - Provides automatic reconnection and error recovery

2. **useAutonomousInvestigation Hook**
   (`src/js/hooks/useAutonomousInvestigation.ts`)

   - React hook for autonomous investigation state management
   - Handles event listeners and cleanup
   - Provides investigation control methods

3. **AutonomousInvestigationPanel**
   (`src/components/AutonomousInvestigationPanel.tsx`)
   - UI component for autonomous investigation interface
   - Real-time progress tracking and status display
   - Investigation control buttons and results display

### Development Workflow

1. **Adding New Features**:

   ```typescript
   // Example: Adding a new investigation phase
   export enum InvestigationPhase {
     INITIALIZATION = 'initialization',
     NETWORK_ANALYSIS = 'network_analysis',
     DEVICE_ANALYSIS = 'device_analysis',
     LOCATION_ANALYSIS = 'location_analysis',
     LOG_ANALYSIS = 'behavior_analysis',
     RISK_ASSESSMENT = 'risk_assessment',
     NEW_PHASE = 'new_phase', // Add your new phase
     COMPLETED = 'completed',
   }
   ```

2. **Testing Autonomous Features**:

   ```bash
   # Run autonomous investigation tests
   yarn test AutonomousInvestigationClient.test.ts

   # Run all tests
   yarn test
   ```

3. **WebSocket Development**:
   - Use the demo mode for testing: `?demo=true&mock=true`
   - WebSocket endpoint: `ws://localhost:8090/ws/{investigation_id}`
   - Test both parallel and sequential execution modes

### Best Practices for Autonomous Investigation

1. **Error Handling**: Always implement proper error handling for WebSocket
   connections
2. **State Management**: Use the provided hooks for consistent state management
3. **Testing**: Write tests for both success and failure scenarios
4. **Documentation**: Update API documentation when adding new endpoints
5. **Performance**: Consider the impact of real-time updates on UI performance

## Process for Merging a PR

1. Fork this repository

   ```sh
   Click the "Fork" button in the top right of the repo
   ```

1. Create a branch (use the JIRA project and prefix with "feature/" or
   "bugfix/")

   ```sh
   git checkout -b feature/JIRA-1234
   ```

1. Add an upstream to this main repository

   ```sh
   git remote add upstream https://github.olorin.com/cas-hri/olorin-webplugin.git
   ```

1. In your terminal window, navigate into this repo using `cd`
1. Run `yarn` to install dependencies to your repo
1. Once you have Plugin-CLI installed, you can proceed to run
   [`yarn serve`](https://github.olorin.com/pages/UX-Infra/plugin-cli/docs/commands-overview/#plugin-cli-serve)
   to start a
   [local development server](https://devportal.olorin.com/app/dp/capability/2611/capabilityDocs/main/docs/web-plugins-widgets/getting-started/setup-plugin-for-development.md#run-your-plugin-using-the-local-development-server).
   For local development within an AppFabric Shell, you can proceed to run
   `yarn serve` and follow this
   [guide](https://devportal.olorin.com/app/dp/capability/2611/capabilityDocs/main/docs/web-plugins-widgets/getting-started/setup-plugin-for-development.md#run-your-local-plugin-in-a-remote-application-with-the-remote-dev-server).
1. Make your changes including related tests and documentation

1. Make sure you build and test your changes

```sh
yarn build
yarn lint
yarn test
```

1. Push your changes to your fork's branch

   ```sh
   git fetch upstream master
   git merge upstream/master
   git add .
   git commit -m "chore: commit message"
   git push origin name-of-your-branch
   ```

1. In GitHub, make a pull request (PR) to this repository that includes a filled
   description
1. Making a PR will automatically trigger a series of checks against your
   changes and generate a special PR link where you can view your changes (and
   share with others)
1. The team will reach out for more information or make suggestions
1. 🎉 Once the PR is good to go, they'll merge it in and you'll be credited as a
   contributor! Reach out to the team to follow their release cycle.

## After PR Merged

💻 Need to get in contact with the team? The best people to start with are the
project [code owners](./.github/CODEOWNERS).

Reach out to the team's corresponding Slack channel for more information.

Optionally, reach out to an
[owner](https://github.olorin.com/orgs/cas-hri/people?utf8=%E2%9C%93&query=+role%3Aowner)
of this organization for assistance.
