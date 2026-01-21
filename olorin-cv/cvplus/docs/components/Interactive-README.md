# Interactive Components

This directory contains interactive React components for the CVPlus platform that enhance user engagement and provide dynamic functionality.

## Available Components

### SocialMediaLinks

A comprehensive social media links component that provides click tracking, link validation, and customizable display options.

### DynamicQRCode

A fully-featured, customizable QR code component that supports dynamic URL generation, analytics tracking, and multiple styling options.

---

# SocialMediaLinks Component

A comprehensive social media integration component that provides click analytics, link validation, and multiple display styles for professional profiles.

## Features

- ✅ **Multiple Display Styles**: Icons, buttons, or cards layout
- ✅ **Platform Support**: LinkedIn, GitHub, Portfolio, Twitter, Medium, YouTube, Instagram, Facebook
- ✅ **Click Analytics**: Firebase-based tracking with detailed metrics
- ✅ **Link Validation**: Dead link detection and URL reachability checks
- ✅ **Customization**: Themes (colorful, light, dark), sizes, animations
- ✅ **Accessibility**: Full ARIA support and keyboard navigation
- ✅ **Share Functionality**: Web Share API with clipboard fallback
- ✅ **Settings Panel**: Live customization interface (private mode)
- ✅ **Error Handling**: Comprehensive error boundaries and user feedback
- ✅ **TypeScript Support**: Full type safety with proper interfaces

## Basic Usage

```tsx
import { SocialMediaLinks } from '../components/features/Interactive/SocialMediaLinks';

function MyComponent() {
  return (
    <SocialMediaLinks
      jobId="your-job-id"
      profileId="your-profile-id"
      data={{
        linkedin: 'https://linkedin.com/in/johndoe',
        github: 'https://github.com/johndoe',
        portfolio: 'https://johndoe.dev',
        twitter: 'https://twitter.com/johndoe',
        medium: 'https://medium.com/@johndoe',
        youtube: 'https://youtube.com/c/johndoe'
      }}
      customization={{
        style: 'buttons',
        size: 'medium',
        theme: 'colorful',
        showLabels: true,
        openInNewTab: true,
        animateHover: true
      }}
    />
  );
}
```

## Props Interface

```tsx
interface SocialLinksProps extends CVFeatureProps {
  data: {
    linkedin?: string;
    github?: string;
    portfolio?: string;
    twitter?: string;
    medium?: string;
    youtube?: string;
    instagram?: string;
    facebook?: string;
  };
  customization?: {
    style?: 'icons' | 'buttons' | 'cards';
    size?: 'small' | 'medium' | 'large';
    showLabels?: boolean;
    openInNewTab?: boolean;
    theme?: 'dark' | 'light' | 'colorful';
    animateHover?: boolean;
  };
}
```

## Display Styles

### Icons Only
```tsx
customization={{ style: 'icons', showLabels: false }}
```
Compact icon-only display for minimal layouts.

### Buttons with Labels
```tsx
customization={{ style: 'buttons', showLabels: true }}
```
Button-style links with platform names.

### Card Layout
```tsx
customization={{ style: 'cards' }}
```
Card-based layout with additional controls and larger touch targets.

## Theme Options

### Colorful Theme (Default)
```tsx
customization={{ theme: 'colorful' }}
```
Uses platform-specific brand colors for vibrant appearance.

### Light Theme
```tsx
customization={{ theme: 'light' }}
```
Clean light theme suitable for light backgrounds.

### Dark Theme
```tsx
customization={{ theme: 'dark' }}
```
Dark theme optimized for dark mode interfaces.

## Firebase Functions Integration

The component integrates with these Firebase Functions:
- `trackSocialMediaClick` - Records click analytics
- `validateSocialMediaLinks` - Validates URLs and checks reachability
- `getSocialMediaAnalytics` - Retrieves click statistics

## Link Validation

The component includes intelligent link validation:

```tsx
// Automatic platform-specific validation
const PLATFORM_VALIDATORS = {
  linkedin: (url) => /^https?:\/\/(www\.)?linkedin\.com\/(in|pub)\//.test(url),
  github: (url) => /^https?:\/\/(www\.)?github\.com\//.test(url),
  twitter: (url) => /^https?:\/\/(www\.)?(twitter\.com|x\.com)\//.test(url)
  // ... more validators
};
```

Validation features:
- URL format validation
- Platform-specific URL pattern matching
- Live reachability testing
- Visual status indicators

## Analytics and Tracking

### Click Tracking
```tsx
const handleLinkClick = async (platform: string, url: string) => {
  // Firebase Analytics
  logEvent(analytics, 'social_link_click', {
    platform,
    job_id: jobId,
    profile_id: profileId
  });
  
  // Detailed tracking
  await trackSocialClick({
    jobId,
    profileId,
    platform,
    url,
    timestamp: new Date().toISOString(),
    userAgent: navigator.userAgent
  });
};
```

### Analytics Display
In private mode, the component shows:
- Total clicks per platform
- Unique clicks
- Last click timestamp
- Click-through rates

## Testing

Comprehensive test suite covers:

```bash
npm test SocialMediaLinks
```

Test coverage includes:
- ✅ Basic rendering and functionality
- ✅ Customization options
- ✅ Link interactions and analytics
- ✅ Validation and error handling
- ✅ Accessibility compliance
- ✅ Share functionality
- ✅ Settings panel
- ✅ Platform support
- ✅ Responsive design

---

# DynamicQRCode Component

## Overview

The `DynamicQRCode` component follows the CVPlus React Component Conversion Plan and integrates seamlessly with the existing Firebase infrastructure. It provides real-time QR code generation with comprehensive customization options and built-in analytics tracking.

## Features

- ✅ **Dynamic QR Code Generation**: Real-time generation using the `qrcode` library
- ✅ **Multiple URL Support**: Profile, portfolio, LinkedIn, and custom URLs
- ✅ **Customizable Styling**: Square, rounded, and circular styles with color customization
- ✅ **Logo Integration**: Add custom logos to QR codes
- ✅ **Analytics Tracking**: Firebase-based scan tracking and analytics
- ✅ **Mobile Responsive**: Optimized for all device sizes
- ✅ **Error Handling**: Comprehensive error boundaries and user feedback
- ✅ **Download & Share**: Built-in download, copy, and share functionality
- ✅ **Settings Panel**: Live customization interface
- ✅ **TypeScript Support**: Full type safety with proper interfaces

## Installation

The component requires the following dependencies (already installed):

```bash
npm install qrcode @types/qrcode
```

## Basic Usage

```tsx
import { DynamicQRCode } from '../components/features/Interactive/DynamicQRCode';

function MyComponent() {
  return (
    <DynamicQRCode
      jobId="your-job-id"
      profileId="your-profile-id"
      data={{
        url: 'https://example.com/cv/your-profile',
        profileUrl: 'https://example.com/public/your-profile',
        portfolioUrl: 'https://your-portfolio.com',
        linkedinUrl: 'https://linkedin.com/in/your-profile'
      }}
      customization={{
        size: 256,
        style: 'square',
        backgroundColor: '#FFFFFF',
        foregroundColor: '#000000'
      }}
    />
  );
}
```

## Props Interface

```tsx
interface QRCodeProps extends CVFeatureProps {
  data: {
    url: string;                    // Primary URL (required)
    profileUrl?: string;            // Public profile URL
    portfolioUrl?: string;          // Portfolio URL
    linkedinUrl?: string;           // LinkedIn URL
  };
  customization?: {
    size?: number;                  // QR code size in pixels (default: 256)
    style?: 'square' | 'rounded' | 'circular';  // Style (default: 'square')
    logoUrl?: string;               // Logo to embed in QR code
    backgroundColor?: string;       // Background color (default: '#FFFFFF')
    foregroundColor?: string;       // Foreground color (default: '#000000')
  };
}
```

## Advanced Features

### Multiple URL Options

The component automatically creates buttons for all provided URLs:

```tsx
<DynamicQRCode
  jobId="job-123"
  profileId="profile-456"
  data={{
    url: 'https://cvplus.ai/cv/john-doe',
    profileUrl: 'https://cvplus.ai/public/john-doe',
    portfolioUrl: 'https://portfolio.johndoe.com',
    linkedinUrl: 'https://linkedin.com/in/johndoe'
  }}
/>
```

### Custom Styling

```tsx
<DynamicQRCode
  // ... other props
  customization={{
    size: 384,
    style: 'circular',
    backgroundColor: '#F8FAFC',
    foregroundColor: '#1E293B',
    logoUrl: 'https://example.com/logo.png'
  }}
  className="shadow-lg rounded-2xl"
/>
```

### Analytics Integration

The component automatically tracks:
- QR code generation events
- Scan analytics (when implemented on backend)
- User interactions

```tsx
const handleUpdate = (data: any) => {
  console.log('QR code updated:', data);
  // Data includes: { qrCode: dataUrl, generatedAt: Date }
};

const handleError = (error: Error) => {
  console.error('QR code error:', error);
};

<DynamicQRCode
  // ... other props
  onUpdate={handleUpdate}
  onError={handleError}
/>
```

## Component Integration

The component is registered in the feature registry and can be used in CV generation:

```tsx
// Available in registry as:
'DynamicQRCode'     // Component name
'qr-code'           // Feature name
'dynamic-qr-code'   // Alternative name
```

### Firebase Functions Integration

The component integrates with these Firebase Functions:
- `trackQRCodeScan` - Track QR code scan events
- `getQRCodeAnalytics` - Retrieve analytics data

## User Interface

The component provides a comprehensive UI with:

1. **URL Selection Panel**: Choose which URL to encode
2. **QR Code Display**: Canvas-based QR code with real-time generation
3. **Action Buttons**: Download, copy, share, refresh, and settings
4. **Settings Panel**: Live customization controls
5. **Analytics Display**: Scan statistics and analytics
6. **Current URL Display**: Shows the currently encoded URL

## Styling Options

### Square (Default)
```tsx
customization={{ style: 'square' }}
```

### Rounded Corners
```tsx
customization={{ style: 'rounded' }}
```

### Circular
```tsx
customization={{ style: 'circular' }}
```

## Error Handling

The component includes comprehensive error handling:

- **Generation Errors**: QR code library failures
- **Canvas Errors**: Rendering issues
- **Firebase Errors**: Network and authentication issues
- **User Feedback**: Toast notifications for all actions

## Testing

Comprehensive test suite includes:

```bash
npm test DynamicQRCode
```

Tests cover:
- ✅ Component rendering
- ✅ URL selection
- ✅ QR code generation
- ✅ Download functionality
- ✅ Copy to clipboard
- ✅ Share functionality
- ✅ Settings panel
- ✅ Error handling
- ✅ Analytics integration
- ✅ Style variations

## Performance Considerations

- **Canvas Optimization**: Efficient canvas rendering
- **Memory Management**: Proper cleanup of canvas elements
- **Firebase Optimization**: Batched analytics calls
- **Image Optimization**: Optimized data URLs for sharing

## Browser Compatibility

- ✅ Modern browsers with Canvas API support
- ✅ Mobile browsers (iOS Safari, Chrome Mobile)
- ✅ Progressive enhancement for older browsers
- ✅ Clipboard API with fallbacks

## Security Considerations

- **URL Validation**: Validates all input URLs
- **XSS Prevention**: Sanitizes all user inputs
- **CORS Handling**: Proper cross-origin image handling
- **Firebase Security**: Proper authentication and rules

## Accessibility

- **ARIA Labels**: Proper labeling for screen readers
- **Keyboard Navigation**: Full keyboard support
- **Color Contrast**: WCAG compliant color combinations
- **Alternative Text**: Descriptive alt text for QR codes

## Future Enhancements

- [ ] Batch QR code generation
- [ ] Advanced analytics dashboard
- [ ] QR code templates library
- [ ] Scheduled QR code updates
- [ ] Advanced branding options
- [ ] Multi-language support

## Support

For issues or feature requests, please refer to the CVPlus development team or create an issue in the project repository.

## Examples

See `DynamicQRCode.example.tsx` for comprehensive usage examples including:
- Basic usage
- Advanced customization
- Branded QR codes
- CV integration
- Firebase integration
