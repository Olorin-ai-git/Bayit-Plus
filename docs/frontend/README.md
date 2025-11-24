<div align="center">

# [olorin-webplugin](https://devportal.olorin.com/app/dp/resource/6347841268104977808)

Powering Prosperity 🌎

</div>

<div align="center">

[![Build Status](https://build.olorin.com/plugins-shared/buildStatus/buildIcon?job=cas-hri/olorin-webplugin/olorin-webplugin/master)](https://build.olorin.com/plugins-shared/blue/organizations/jenkins/cas-hri%2Folorin-webplugin%2Folorin-webplugin/activity/?branch=master)
[![Code Coverage](https://codecov.tools.a.olorin.com/ghe/cas-hri/olorin-webplugin/branch/master/graph/badge.svg)](https://codecov.tools.a.olorin.com/ghe/cas-hri/olorin-webplugin/)
[![code style: prettier](https://img.shields.io/badge/code_style-prettier-ff69b4.svg?style=shield)](https://github.com/prettier/prettier)
[![semantic-release](https://img.shields.io/badge/%20%20%F0%9F%93%A6%F0%9F%9A%80-semantic--release-e10079.svg)](https://github.com/semantic-release/semantic-release)
[![slack](https://img.shields.io/badge/slack-join--the--discussion-3399ff.svg?logo=slack&style=flat)](https://olorin-teams.slack.com/messages/C3JK09N5D)

</div>

## 👋 Welcome!

This is an AppFabric Web Plugin created in the `cas-hri` space and is maintained
by the organization's
[owners](https://github.olorin.com/orgs/cas-hri/people?utf8=%E2%9C%93&query=+role%3Aowner).

## Usage

This is a Web Plugin used by the `cas-hri` space for fraud investigation and
risk assessment.

**Plugin Purpose:** OLORIN (Generative AI Investigation Assistant) Web Plugin
provides an intelligent fraud investigation platform that combines manual
investigation tools with structured AI-powered analysis.

**Target User Audience:** Fraud analysts, security investigators, risk
assessment teams, and compliance officers.

**Top Features for this Web Plugin include:**

### 🔍 **Investigation Modes**

- **Manual Mode**: Traditional step-by-step investigation control with detailed
  analysis
- **Structured Mode**: AI-powered automatic investigation with real-time
  progress tracking

### 🤖 **AI-Powered Analysis**

- **Network Agent**: Analyzes network traffic patterns and suspicious
  connections
- **Device Agent**: Examines device characteristics and reputation
- **Log Agent**: Processes system and application logs for anomalies
- **Location Agent**: Analyzes geographical patterns and location anomalies
- **Risk Assessment**: Calculates comprehensive risk scores

### ⚡ **Structured Investigation Features**

- **Parallel Execution**: Run all agents simultaneously for faster results
- **Sequential Execution**: Step-by-step analysis with agent dependencies
- **Real-time Control**: Pause, resume, or cancel investigations at any time
- **WebSocket Communication**: Live progress updates and status monitoring
- **Error Recovery**: Automatic reconnection and retry mechanisms

### 📊 **Investigation Management**

- **Entity Support**: Investigate both User IDs and Device IDs
- **Risk Score Display**: Visual risk assessment with agent-specific scores
- **Investigation History**: Track and manage multiple investigations
- **Comment System**: Collaborative investigation notes and findings
- **Export Capabilities**: Generate reports and export investigation data

## Local Development

1. To build this repo, you will need
   [Plugin-CLI v4](https://github.olorin.com/pages/UX-Infra/plugin-cli/docs/webtools-manager)
   and Node 18. (run `nvm install && nvm use` to switch to the correct Node
   version)
1. Clone this repo to your local machine via `git clone`.
1. In your terminal window, navigate into this repo using `cd`.
1. Run `yarn` to install dependencies to your repo.
1. Once you have Plugin-CLI installed, you can proceed to run
   [`yarn start`](https://github.olorin.com/pages/UX-Infra/plugin-cli/docs/commands-overview#plugin-cli-start)
   to start a
   [local development server](https://devportal.olorin.com/app/dp/capability/2611/capabilityDocs/main/docs/web-plugins-widgets/getting-started/setup-plugin-for-development.md#run-your-plugin-using-the-local-development-server).
   For local development within an AppFabric Shell, you can proceed to run
   [`yarn serve`](https://github.olorin.com/pages/UX-Infra/plugin-cli/docs/commands-overview#plugin-cli-serve)
   and follow this
   [guide](https://devportal.olorin.com/app/dp/capability/2611/capabilityDocs/main/docs/web-plugins-widgets/usecases/testing-plugin-within-app.md#to-run-a-local-version-of-a-non-deployed-plugin).

### Next Steps

1. 📚 Learn more about [olorin's UX Fabric](http://in/uxfabric)
1. Optionally enable
   [Renovate](https://github.olorin.com/github-apps/renovate-pro/) on your
   organization for Automated Dependency Updates. Reach out to an
   [owner](https://github.olorin.com/orgs/cas-hri/people?utf8=%E2%9C%93&query=+role%3Aowner)
   of this organization for assistance.

## 💻 Technologies Supported

- React
- Redux
- Typescript
- Graph QL
- Apollo
- ESLint
- Remark
- Webpack
- Jest
- Cypress
- Lighthouse

[Learn more](https://devportal.olorin.com/app/dp/capability/2611/capabilityDocs/main/docs/web-applications/get-started/env-set-up.md?searchTerm=Windows%20Setup#technologies-overview)
about all the technologies AppFabric Widgets use!

[Learn more](https://github.olorin.com/pages/UX-Infra/plugin-cli/docs/cli-used-technologies)
about the Plugin-CLI's technologies!

## Contributing

Eager to contribute to olorin-webplugin? Check out our
[Contribution Guidelines](./CONTRIBUTING.md)!

Learn more about olorin's contribution policies -
[InnerSource](http://in/innersource).

## 🛠️ Builds, Environments, and Deployments

- [IBP Job](https://build.olorin.com/plugins-shared/blue/organizations/jenkins/cas-hri%2Folorin-webplugin%2Folorin-webplugin/activity/?branch=master)
- [Plugin Deployment Configuration - DevPortal](https://devportal.olorin.com/app/dp/resource/6347841268104977808/addons/pluginConfiguration)

## 👀 Monitoring

### Logging

- _Pre-Production Logs_ are automatically configured to populate in
  [AppFabric Splunk](https://ip.e2e.scheduled.splunk.olorin.com/en-US/app/search/web_shell_log_monitoring)
- _Production Logs_ require the Plugin to be part of
  [Web App](https://devportal.olorin.com/app/dp/capability/2611/capabilityDocs/main/docs/web-applications/get-started/walkthrough/2-create-a-web-app.md).
  Please add your plugin to the desired
  [Web App Configuration](https://devportal.olorin.com/app/dp/capability/2611/capabilityDocs/main/docs/web-applications/reference/web-app-configuration-v2.md#plugins).

### Performance

- _Pre-Production Logs_ are automatically configured to populate in
  [AppFabric Splunk](https://ip.e2e.scheduled.splunk.olorin.com/en-US/app/search/web_shell_ui_performance_monitoring)
- _Production Logs_ require the Plugin to be part of
  [Web App](https://devportal.olorin.com/app/dp/capability/2611/capabilityDocs/main/docs/web-applications/get-started/walkthrough/2-create-a-web-app.md).
  Please add your plugin to the desired
  [Web App Configuration](https://devportal.olorin.com/app/dp/capability/2611/capabilityDocs/main/docs/web-applications/reference/web-app-configuration-v2.md#plugins).

Learn more about
[monitoring for AppFabric Web Apps](https://devportal.olorin.com/app/dp/capability/2611/capabilityDocs/main/docs/rum/overview.md).

## 📚 Documentation Index

### **📋 Project Management**
- **[Project Brief](./projectbrief.md)** - Core project overview and architecture
- **[Active Context](./activeContext.md)** - Current development phase and status
- **[Tasks](./tasks.md)** - Current task tracking and progress metrics
- **[Progress](./progress.md)** - Detailed development progress log
- **[Changelog](./CHANGELOG.md)** - Version history and release notes

### **🛠️ Development & Contributing**
- **[Contributing Guide](./CONTRIBUTING.md)** - Development guidelines and contribution process
- **[License](./LICENSE.md)** - Project license information

### **🔌 API & Integration**
- **[OLORIN API Documentation](./OLORIN_API_Documentation.md)** - Complete API reference (63KB, 2803 lines)
- **[MCP Frontend Integration Guide](./MCP_FRONTEND_INTEGRATION_GUIDE.md)** - React MCP client integration (39KB, 1610 lines)
- **[MCP Frontend Developer Specification](./MCP_Frontend_Developer_Specification.md)** - MCP development specification (26KB, 953 lines)
- **[MCP Endpoints Guide](./MCP_Endpoints_Guide.md)** - Environment-specific MCP endpoints (14KB, 418 lines)
- **[Custom Prompt Usage Guide](./Custom_Prompt_Usage_Guide.md)** - MCP custom prompt functionality (8.8KB, 342 lines)

### **🔄 Real-time Communication**
- **[Frontend Polling Specification](./FRONTEND_POLLING_SPECIFICATION.md)** - Complete polling implementation spec (27KB, 1002 lines)
- **[Polling API Examples](./POLLING_API_EXAMPLES.md)** - Polling API usage examples (11KB, 417 lines)
- **[Polling Implementation Summary](./POLLING_SPECIFICATION_IMPLEMENTATION_SUMMARY.md)** - Implementation status and details (8.2KB, 239 lines)
- **[WebSocket Structured Mode Guide](./websocket-structured-mode-guide.md)** - WebSocket implementation guide (20KB, 758 lines)

### **🤖 Investigation & Analysis**
- **[Structured Investigation Technical Guide](./AUTONOMOUS_INVESTIGATION_TECHNICAL_GUIDE.md)** - Technical implementation details (17KB, 709 lines)
- **[Structured Investigation Demo](./structured-investigation-demo.md)** - Demo and usage examples (6.8KB, 265 lines)
- **[OLORIN User Manual](./OLORIN_User_Manual.md)** - End-user documentation (18KB, 729 lines)

### **🎨 UI & Design**
- **[Frontend Theme Implementation](./FRONT_THEME_IMPLEMENTATION.md)** - Complete theme and styling guide (772KB, 32932 lines)

### **📁 Historical Documentation**
- **[Archive Directory](./archive/)** - Historical documents, phase reports, and deprecated guides
  - Implementation summaries from previous phases
  - Test infrastructure reports
  - VAN assessment reports
  - Historical integration instructions

## Support

For support related to the [AppFabric architecture](http://in/uxfabric/), check
out [StackOverflow](https://stackoverflow.olorin.com/questions/tagged/1918) or
ask us a question on [Slack](https://olorin-teams.slack.com/archives/C3JK09N5D)
