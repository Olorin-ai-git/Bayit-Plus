# Changelog

All notable changes to the Bayit+ platform will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2026-01-27

### 🎉 Initial Release

First public release of Bayit+ - Israeli Content Streaming Platform with Voice-First Interface.

### Added

#### iOS Mobile App
- **Voice-First Interface**: Complete voice control with "Hey Bayit" wake word detection
- **Live Israeli TV**: Access to Israeli television channels with EPG (Electronic Program Guide)
- **Israeli Radio**: Streaming of Israeli radio stations with live playback
- **Movies & Series**: Extensive library of Hebrew-language content
- **Podcasts**: Hebrew podcast directory with offline download support
- **Audiobooks**: Hebrew audiobook library with progress sync
- **Music**: Israeli music streaming with playlist support
- **Siri Integration**: Deep Siri Shortcuts for hands-free control
- **AirPlay Support**: Cast content to Apple TV and other AirPlay devices
- **Chromecast Support**: Cast to Chromecast-enabled devices
- **Offline Mode**: Download content for offline viewing
- **Multi-Language**: Support for 10 languages including Hebrew (RTL), English, Spanish, Chinese, French, Italian, Hindi, Tamil, Bengali, and Japanese
- **Accessibility**: VoiceOver support, Dynamic Type, and reduced motion options

#### tvOS App (Apple TV)
- **10-Foot UI**: Optimized interface for big-screen viewing
- **Siri Remote Voice Control**: Native voice search and commands
- **Top Shelf Integration**: Featured content on Apple TV home screen
- **Focus-Based Navigation**: Intuitive navigation with Apple TV remote
- **Picture-in-Picture**: Continue watching while browsing
- **Live TV Grid**: Full-screen channel guide with quick switching
- **Continue Watching**: Sync watch progress across devices
- **User Profiles**: Multiple user profiles with personalized recommendations
- **Parental Controls**: Content restrictions and PIN protection

#### Web App
- **Responsive Design**: Optimized for desktop, tablet, and mobile browsers
- **Live Dubbing**: Real-time AI-powered Hebrew dubbing for content
- **Chromecast**: Cast from browser to TV
- **AirPlay**: Safari AirPlay support
- **Keyboard Shortcuts**: Full keyboard navigation support
- **Dark Mode**: Glassmorphic dark-mode UI throughout

#### Backend
- **HLS Streaming**: Adaptive bitrate streaming for all content
- **Real-Time Sync**: WebSocket-based progress synchronization
- **Content Management**: Comprehensive CMS for content ingestion
- **User Management**: Account creation, profiles, and preferences
- **Analytics**: Usage tracking and content performance metrics
- **Audible Integration**: Import audiobooks from Audible library

### Security
- Firebase Authentication with multi-provider support
- Secure token management
- Privacy-focused data handling
- GDPR compliance ready

### Performance
- Lazy loading for all content grids
- Image optimization with responsive sizes
- Efficient caching strategy
- Background playback support

---

## Release Notes

### iOS Mobile App v1.0.0
- **Minimum iOS Version**: 16.0
- **Supported Devices**: iPhone, iPad
- **Bundle ID**: tv.bayit.plus

### tvOS App v1.0.0
- **Minimum tvOS Version**: 17.0
- **Supported Devices**: Apple TV 4K (all generations), Apple TV HD
- **Bundle ID**: tv.bayit.plus.tvos

### Web App v1.0.0
- **Supported Browsers**: Chrome 90+, Firefox 90+, Safari 15+, Edge 90+
- **URL**: https://app.bayitplus.com
