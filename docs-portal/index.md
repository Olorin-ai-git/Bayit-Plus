---
layout: home

hero:
  name: Bayit+
  text: Documentation Portal
  tagline: Complete documentation for the Bayit+ streaming platform - Web, Mobile, tvOS
  image:
    src: /logo.svg
    alt: Bayit+
  actions:
    - theme: brand
      text: Get Started
      link: /guides/STARTUP_GUIDE
    - theme: alt
      text: API Reference
      link: /api/API_OVERVIEW
    - theme: alt
      text: View on GitHub
      link: https://github.com/bayit-plus

features:
  - icon: 📱
    title: Multi-Platform
    details: Web (React 18 + Vite), Mobile (React Native iOS/Android), tvOS (Apple TV) - One codebase, three platforms
  - icon: 🎨
    title: Glass UI Design System
    details: Glassmorphism component library with dark mode, backdrop blur, and consistent styling across all platforms
  - icon: 🌍
    title: 10 Languages
    details: Full internationalization with Hebrew (RTL), English, Spanish, Chinese, French, Italian, Hindi, Tamil, Bengali, Japanese
  - icon: 🤖
    title: AI-Powered Features
    details: Beta 500 program with AI Search, AI Recommendations, and Auto Catch-Up powered by Anthropic Claude
  - icon: 📺
    title: Live TV & VOD
    details: 10+ Israeli live channels with real-time dubbing, movies, series, podcasts, audiobooks, and radio
  - icon: 🔒
    title: Enterprise Security
    details: Firebase Auth, JWT tokens, OWASP compliance, secrets management via Google Cloud Secret Manager
  - icon: 🧪
    title: 87% Test Coverage
    details: Comprehensive testing with pytest, Jest, Playwright, Detox - Unit, integration, and E2E tests
  - icon: 🚀
    title: Modern Stack
    details: FastAPI backend (Python 3.11), MongoDB Atlas, React 18, TypeScript, Zustand, TailwindCSS
  - icon: 📖
    title: Comprehensive Docs
    details: 249 documentation files covering architecture, API, guides, testing, deployment, and troubleshooting
---

## Quick Links

<div class="vp-doc" style="padding-top: 48px;">

### 🚀 Getting Started

- [Startup Guide](/guides/STARTUP_GUIDE) - Set up your development environment
- [Contributing](/guides/CONTRIBUTING) - How to contribute to Bayit+
- [Troubleshooting](/guides/TROUBLESHOOTING) - Common issues and solutions

### 📚 Development Guides

- [Web Development](/guides/WEB_DEVELOPMENT_GUIDE) - React 18 + Vite + TypeScript
- [Mobile Development](/guides/MOBILE_DEVELOPMENT_GUIDE) - React Native iOS/Android
- [tvOS Development](/guides/TVOS_DEVELOPMENT_GUIDE) - Apple TV development

### 🔌 API Documentation

- [API Overview](/api/API_OVERVIEW) - REST API architecture and patterns
- [AI Features API](/api/AI_API_REFERENCE) - Beta 500 AI endpoints
- [Channel Chat API](/api/CHANNEL_CHAT_API) - Real-time chat for live channels
- [Catch-Up API](/api/CATCH_UP_API) - AI-powered summaries
- [Voice API](/api/VOICE_API_REFERENCE) - Text-to-speech and speech-to-text

### 🏗️ Architecture

- [System Overview](/architecture/SYSTEM_OVERVIEW) - High-level architecture
- [Database Schema](/technical/DATABASE_SCHEMA_REFERENCE) - MongoDB collections
- [Shared Components](/technical/SHARED_COMPONENTS_REFERENCE) - Glass UI library

### 🧪 Testing & Deployment

- [Testing Strategy](/testing/TESTING_STRATEGY) - Unit, integration, E2E tests
- [Deployment Guide](/deployment/DEPLOYMENT_GUIDE) - Production deployment
- [Secrets Management](/deployment/SECRETS_MANAGEMENT) - Google Cloud secrets

</div>

## Platform Features

<div class="vp-doc">

### Web Platform (React 18)
- Vite for fast development with HMR
- Zustand for lightweight state management
- TailwindCSS for utility-first styling
- Glass UI components with glassmorphism
- Playwright for E2E testing
- i18next for 10-language support

### Mobile Platform (React Native)
- iOS 16+ and Android 10+ support
- StyleSheet for platform-native styling
- AsyncStorage for persistent state
- React Navigation for screen routing
- Detox for E2E testing
- Native modules for device features

### tvOS Platform (Apple TV)
- Focus-based navigation with Siri Remote
- 10-foot UI design for living rooms
- TVFocusGuideView for custom focus
- 250x150px minimum touch targets
- 29pt minimum typography
- Scale transforms for focus states

</div>

## Technology Stack

<div class="vp-doc">

| Layer | Technologies |
|-------|-------------|
| **Backend** | Python 3.11, FastAPI, MongoDB Atlas, Beanie ODM, Poetry |
| **Frontend Web** | React 18, TypeScript, Vite, Zustand, TailwindCSS |
| **Frontend Mobile** | React Native, iOS 16+, Android 10+, StyleSheet |
| **Frontend tvOS** | React Native for TV, Focus Navigation, 10-foot UI |
| **UI Library** | @bayit/glass - Glassmorphism component library |
| **i18n** | @olorin/shared-i18n - 10 languages including Hebrew RTL |
| **Testing** | pytest, Jest, React Testing Library, Playwright, Detox |
| **AI/ML** | Anthropic Claude, OpenAI, ElevenLabs TTS/STT |
| **Database** | MongoDB Atlas with 64+ collections, Beanie ODM |
| **Authentication** | Firebase Auth, Google OAuth 2.0, JWT tokens |
| **Deployment** | Google Cloud Run, Firebase Hosting, Docker |

</div>

## Community & Support

<div class="vp-doc">

- **GitHub**: [github.com/bayit-plus](https://github.com/bayit-plus)
- **Email**: support@bayitplus.com
- **Community**: community.bayitplus.com
- **Documentation Issues**: Report errors or suggest improvements on GitHub

</div>

## License

Released under the MIT License. Copyright © 2026 Bayit+
