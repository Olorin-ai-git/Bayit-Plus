# Changelog

All notable changes to @olorin/glass-ui will be documented in this file.

## [2.0.0] - 2026-01-24

### Added - Unified Notification System 🎉

**Core Components**
- GlassToast component with glassmorphic styling
- GlassToastContainer for managing multiple notifications
- NotificationProvider React Context
- useNotifications() hook API
- Notifications imperative API

**Features**
- 5 notification levels (debug, info, warning, success, error)
- Cross-platform support (iOS, tvOS, Android, Web)
- WCAG AA accessibility
- RTL support
- Auto-dismiss timers
- Priority queue
- Deduplication
- Safe Area support
- Swipe-to-dismiss
- Haptic feedback (iOS)
- VoiceOver/screen reader support

**Backend Integration**
- NotificationEvent and NotificationMetrics models
- API endpoints for tracking and analytics
- 90-day data retention

**Security**
- XSS prevention
- Sensitive data detection
- Action validation
- Message sanitization

**Dependencies**
- Added zustand ^5.0.0
- Added nanoid ^5.0.0
- Added react-native-safe-area-context ^4.8.0 (peer)
- Added react-native-gesture-handler ^2.14.0 (peer)
- Updated @olorin/design-tokens@2.0.0

## [1.x.x] - Previous Versions

Previous releases focused on individual Glass components.
