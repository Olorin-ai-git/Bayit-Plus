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

This is a Web Plugin used by the `cas-hri` space.

Plugin Purpose: _fill this in_ Target User Audience: _fill this in_ Top Features
for this Web Plugin include: _fill this in (screenshots recommended)_

## Local Development

1. To build this repo, you will need Node 18 (run `nvm install && nvm use` to
   switch to the correct Node version)
1. Clone this repo to your local machine via `git clone`.
1. In your terminal window, navigate into this repo using `cd`.
1. Run `yarn` to install dependencies to your repo.
1. After installing dependencies run `yarn start` to start a
   [local development server](https://devportal.olorin.com/app/dp/capability/2611/capabilityDocs/main/docs/web-plugins-widgets/getting-started/setup-plugin-for-development.md#run-your-plugin-using-the-local-development-server).

### Next Steps

1. �� Learn more about [Olorin's UX Fabric](http://in/uxfabric)
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


## Contributing

Eager to contribute to olorin-webplugin? Check out our
[Contribution Guidelines](./CONTRIBUTING.md)!

Learn more about Olorin's contribution policies -
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

## Support

For support related to the [AppFabric architecture](http://in/uxfabric/), check
out [StackOverflow](https://stackoverflow.olorin.com/questions/tagged/1918) or
ask us a question on [Slack](https://olorin-teams.slack.com/archives/C3JK09N5D)

## Progress Webhook

Run `npm run webhook` to start a local HTTP server that listens for progress
events on `POST /progress`. The backend can post agent execution updates to this
endpoint so the UI can display real-time status.
