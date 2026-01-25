# GlassToast Notification System - Usage Guide

## Overview

The GlassToast notification system is a unified, cross-platform toast notification framework with glassmorphic styling. It replaces all existing notification patterns (GlassModal, GlassAlert, ModalContext, ToastContainer) with a single, production-ready API.

## Features

- **5 Notification Levels**: debug, info, warning, success, error
- **Platform Support**: iOS, tvOS, Android, Web (React Native Web)
- **Glassmorphic Styling**: Beautiful backdrop blur effects
- **Accessibility**: VoiceOver, screen reader support, WCAG AA compliant
- **i18n Ready**: Full internationalization support
- **RTL Support**: Right-to-left language support
- **Haptic Feedback**: iOS haptic feedback integration
- **TTS Integration**: Text-to-speech announcements
- **Auto-dismiss**: Configurable auto-dismiss timers
- **Priority Queue**: Notifications prioritized by level
- **Deduplication**: Prevents duplicate notifications
- **Safe Area**: iOS Safe Area support for notches and Dynamic Island

## Installation

The notification system is included in `@olorin/glass-ui` v2.0.0+.

Install dependencies:
```bash
npm install zustand nanoid react-native-safe-area-context react-native-reanimated react-native-gesture-handler
```

## Setup

### 1. Wrap your app with NotificationProvider

```tsx
import { NotificationProvider } from '@olorin/glass-ui/contexts';

export default function App() {
  return (
    <NotificationProvider position="bottom" maxVisible={3}>
      {/* Your app content */}
    </NotificationProvider>
  );
}
```

### 2. Use the hook in components

```tsx
import { useNotifications } from '@olorin/glass-ui/hooks';

function MyComponent() {
  const notifications = useNotifications();

  const handleClick = () => {
    notifications.showSuccess('Operation completed!', 'Success');
  };

  return <button onClick={handleClick}>Click me</button>;
}
```

### 3. Imperative API (outside React components)

```tsx
import { Notifications } from '@olorin/glass-ui/hooks';

// In error handlers, API interceptors, etc.
try {
  await api.call();
} catch (error) {
  Notifications.showError(error.message, 'API Error');
}
```

## API Reference

### Hook API

```tsx
const notifications = useNotifications();

// Basic methods
notifications.show({ level: 'info', message: 'Hello', title: 'Info' });
notifications.showDebug(message, title?);
notifications.showInfo(message, title?);
notifications.showWarning(message, title?);
notifications.showSuccess(message, title?);
notifications.showError(message, title?);

// Management
notifications.dismiss(id);
notifications.clear();
notifications.clearByLevel('error');
```

### Imperative API

```tsx
import { Notifications } from '@olorin/glass-ui/hooks';

Notifications.showSuccess('Saved!');
Notifications.showError('Failed to save', 'Error');
Notifications.clear();
```

### Advanced Options

```tsx
notifications.show({
  level: 'warning',
  message: 'Unsaved changes',
  title: 'Warning',
  duration: 5000, // Auto-dismiss after 5s
  dismissable: true, // Show dismiss button
  action: {
    label: 'Save now',
    type: 'retry',
    onPress: () => save(),
  },
});
```

## Migration Guide

### From GlassModal

**Before:**
```tsx
<GlassModal
  visible={showModal}
  type="error"
  title="Error"
  message="Something went wrong"
  onClose={() => setShowModal(false)}
/>
```

**After:**
```tsx
const notifications = useNotifications();
notifications.showError('Something went wrong', 'Error');
```

### From Alert.alert (React Native)

**Before:**
```tsx
Alert.alert('Success', 'Operation completed');
```

**After:**
```tsx
const notifications = useNotifications();
notifications.showSuccess('Operation completed', 'Success');
```

### From ModalContext

**Before:**
```tsx
const { showError } = useModal();
showError('Error message');
```

**After:**
```tsx
const notifications = useNotifications();
notifications.showError('Error message');
```

## Platform-Specific Features

### iOS
- Safe Area support (notches, Dynamic Island)
- Haptic feedback on notification display
- VoiceOver announcements

### tvOS
- 10-foot UI optimized (larger text, touch targets)
- TV remote gesture support (swipe to dismiss)
- Focus navigation integration

### Web
- Keyboard navigation (Escape to dismiss)
- CSS backdrop-filter for glass effect
- React Portal for proper z-index management

## Accessibility

- **WCAG AA Compliant**: All text meets contrast requirements
- **Screen Reader Support**: Automatic announcements
- **Keyboard Navigation**: Full keyboard support
- **Focus Management**: Proper focus handling for actions

## Security

- **XSS Prevention**: All messages sanitized
- **Action Validation**: Only allowed action types
- **Sensitive Data Detection**: Prevents SSN, credit cards in notifications

## Best Practices

1. **Use appropriate levels**:
   - `debug`: Development/debugging only
   - `info`: General information
   - `warning`: Warnings that don't block workflow
   - `success`: Successful operations
   - `error`: Errors that require attention

2. **Keep messages concise**: Max 500 characters (auto-truncated)

3. **Provide titles for context**: Helps users quickly understand the notification

4. **Use actions sparingly**: Only for critical actions

5. **Test on all platforms**: Ensure proper display on iOS, tvOS, Web

## Troubleshooting

### Notifications not showing
- Ensure `NotificationProvider` wraps your app
- Check that `useNotifications` is called inside the provider

### Styling issues on Web
- Verify `backdrop-filter` CSS support in target browsers
- Check z-index conflicts with other components

### Safe Area issues on iOS
- Ensure `react-native-safe-area-context` is installed
- Wrap app with `SafeAreaProvider`

## Examples

See `/examples/notifications/` for complete examples:
- Basic usage
- i18n integration
- Action buttons
- Platform-specific features

## Support

For issues or questions, contact the Olorin Platform team or file an issue in the repo.
