# @cvplus/public-profiles

CVPlus Public Profiles - SEO-optimized public CV sharing and professional networking platform module.

## Overview

The Public Profiles module provides comprehensive functionality for creating, managing, and optimizing public professional profiles. It includes advanced SEO optimization, analytics tracking, social media integration, and professional networking features.

## Features

### 🌐 Public Profile Management
- **Custom Profile URLs**: Personalized URLs (e.g., cvplus.io/john-smith)
- **Multiple Templates**: Professional, Creative, Tech, Executive, and Custom templates
- **Privacy Controls**: Granular visibility and privacy settings
- **Custom Branding**: Brand colors, typography, and layout customization
- **Custom Domains**: Premium custom domain support

### 🔍 SEO Optimization
- **Meta Tag Generation**: Automated title, description, and keyword optimization
- **Structured Data**: Schema.org markup for rich snippets
- **Open Graph & Twitter Cards**: Social media preview optimization
- **Sitemap Generation**: Automatic sitemap creation and submission
- **Performance Optimization**: Page speed and Core Web Vitals optimization
- **Competitive Analysis**: SEO benchmarking against competitors

### 📊 Advanced Analytics
- **Real-time Tracking**: Live visitor and engagement metrics
- **Comprehensive Reports**: Views, referrers, geographic data, device analytics
- **Goal Tracking**: Contact form submissions, downloads, conversions
- **Funnel Analysis**: User journey and conversion path analysis
- **Custom Events**: Track specific interactions and behaviors
- **Privacy Compliant**: GDPR-compliant analytics with user consent

### 🤝 Professional Networking
- **Connection Management**: Professional connection requests and management
- **Messaging System**: Direct professional messaging with spam protection
- **Endorsements**: Skill endorsements from professional connections
- **Recommendations**: Written professional recommendations
- **Network Analytics**: Network growth and engagement insights
- **Smart Suggestions**: AI-powered connection recommendations

### 🎨 Customization & Branding
- **Template System**: Multiple professional templates
- **Color Schemes**: Custom brand colors and themes
- **Typography**: Custom font selection and sizing
- **Layout Options**: Flexible section ordering and layout
- **Media Integration**: Profile images, portfolio galleries, videos
- **Social Integration**: Social media links and sharing

### 📱 Social Media Integration
- **Platform Support**: LinkedIn, Twitter, Facebook, Instagram, GitHub, YouTube
- **One-click Sharing**: Easy profile sharing across platforms
- **Social Proof**: Display social media engagement
- **Cross-posting**: Automated content syndication
- **Social Analytics**: Track social referrals and engagement

### 📄 Export & Sharing
- **PDF Export**: Professional PDF CV generation
- **QR Codes**: Easy offline sharing with QR codes
- **vCard Export**: Contact information in vCard format
- **Print Optimization**: Print-friendly layouts
- **Email Signatures**: Professional email signature integration

## Installation

```bash
npm install @cvplus/public-profiles
```

## Quick Start

```typescript
import { PublicProfilesManager, initializePublicProfiles } from '@cvplus/public-profiles';

// Initialize the module
const profilesManager = initializePublicProfiles({
  baseUrl: 'https://yourapp.com',
  enableAnalytics: true,
  enableNetworking: true,
  enableSEO: true
});

// Create a public profile
const result = await profilesManager.createProfile('user123', {
  name: 'John Smith',
  title: 'Senior Software Engineer',
  summary: 'Experienced software engineer specializing in full-stack development...',
  skills: ['JavaScript', 'React', 'Node.js', 'Python'],
  email: 'john@example.com',
  socialLinks: {
    linkedin: 'https://linkedin.com/in/johnsmith',
    github: 'https://github.com/johnsmith'
  }
}, {
  template: 'professional',
  publishImmediately: true,
  seoOptimization: true,
  analyticsEnabled: true
});

if (result.success) {
  console.log('Profile created:', result.urls?.publicUrl);
}
```

## Core APIs

### Profile Management

```typescript
// Create a new profile
const profile = await profilesManager.createProfile(userId, profileData, {
  template: 'professional',
  publishImmediately: true,
  seoOptimization: true,
  targetKeywords: ['software engineer', 'full stack developer'],
  analyticsEnabled: true
});

// Update an existing profile
const updateResult = await profilesManager.updateProfile(profileId, {
  summary: 'Updated professional summary...',
  skills: ['JavaScript', 'TypeScript', 'React', 'Vue.js']
});

// Get a public profile
const publicProfile = await profilesManager.getProfile('john-smith');

// Publish/unpublish profile
await profilesManager.publishProfile(profileId);
await profilesManager.unpublishProfile(profileId);
```

### SEO Optimization

```typescript
// Generate SEO report
const seoReport = await profilesManager.generateSEOReport(profileId);
console.log('SEO Score:', seoReport.score);
console.log('Issues:', seoReport.issues);
console.log('Opportunities:', seoReport.opportunities);

// Optimize profile for SEO
const optimization = await profilesManager.optimizeSEO(profile, {
  targetKeywords: ['senior developer', 'react expert'],
  industryFocus: 'Technology',
  locationTargeting: 'San Francisco, CA'
});

// Generate sitemap
const sitemap = await profilesManager.generateSitemap(profile);
```

### Analytics Tracking

```typescript
// Set up analytics
await profilesManager.setupAnalytics(profileId, profileSlug);

// Track profile view
await profilesManager.trackView(profileId, {
  timestamp: new Date(),
  source: 'direct',
  referrer: 'https://google.com',
  userAgent: 'Mozilla/5.0...',
  ipAddress: '192.168.1.1'
});

// Track custom events
await profilesManager.trackEvent(profileId, 'contact_form_submit', {
  category: 'engagement',
  action: 'form_submission',
  label: 'contact_form'
});

// Get analytics data
const analytics = await profilesManager.getAnalytics(profileId, 'last_30_days');
console.log('Total Views:', analytics.metrics.overview.totalViews);
console.log('Unique Visitors:', analytics.metrics.overview.uniqueVisitors);
```

### Networking Features

```typescript
// Enable networking
await profilesManager.enableNetworking(profileId, {
  allowDirectConnections: true,
  allowDirectMessages: true,
  requireConnectionApproval: true
});
```

## Configuration

```typescript
const config = {
  baseUrl: 'https://cvplus.io',
  apiEndpoint: '/api/v2',
  enableAnalytics: true,
  enableNetworking: true,
  enableSEO: true,
  defaultTemplate: 'professional',
  storageProvider: 'firebase',
  analyticsProvider: 'google'
};

const profilesManager = initializePublicProfiles(config);
```

## Templates

Available templates:

- **Professional**: Clean, corporate layout
- **Creative**: Vibrant, artistic design  
- **Tech**: Modern, developer-focused layout
- **Executive**: Sophisticated, leadership-oriented
- **Academic**: Research and education focused
- **Consultant**: Business and consulting oriented
- **Custom**: Fully customizable template

## SEO Features

- **Technical SEO**: Page speed optimization, mobile responsiveness
- **Content SEO**: Keyword optimization, readability analysis
- **Schema Markup**: Rich snippets for search results
- **Social SEO**: Open Graph and Twitter Card optimization
- **Local SEO**: Location-based optimization
- **Competitive Analysis**: Benchmarking against competitors

## Analytics Metrics

- **Traffic**: Views, visitors, sessions, bounce rate
- **Engagement**: Time on page, scroll depth, interaction rate
- **Conversions**: Goals, funnels, attribution analysis
- **Audience**: Demographics, geography, devices
- **Real-time**: Live visitor tracking and events
- **Custom**: Custom events, dimensions, and metrics

## Privacy & Compliance

- **GDPR Compliant**: Full GDPR compliance with consent management
- **Privacy Controls**: Granular privacy settings per profile
- **Data Retention**: Configurable data retention policies
- **Anonymization**: IP address anonymization and user privacy
- **Consent Management**: Cookie consent and tracking preferences

## Integration

### Firebase Integration

```typescript
import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

// Configure Firebase
const firebaseApp = initializeApp(firebaseConfig);
const db = getFirestore(firebaseApp);
const storage = getStorage(firebaseApp);
```

### Google Analytics Integration

```typescript
// Google Analytics 4 integration
const analyticsConfig = {
  measurementId: 'G-XXXXXXXXXX',
  apiSecret: 'your-api-secret',
  enableEnhancedEcommerce: true
};
```

## TypeScript Support

Full TypeScript support with comprehensive type definitions:

```typescript
import { 
  PublicProfileData, 
  SEOReport, 
  AnalyticsData,
  ProfileCreationOptions 
} from '@cvplus/public-profiles';
```

## Browser Support

- Chrome 80+
- Firefox 74+
- Safari 13+
- Edge 80+

## Contributing

Please read our [Contributing Guide](../../CONTRIBUTING.md) for details on our code of conduct and the process for submitting pull requests.

## License

This project is licensed under the Proprietary License - see the [LICENSE](../../LICENSE) file for details.

## Support

- 📧 Email: support@cvplus.io
- 📖 Documentation: https://docs.cvplus.io/public-profiles
- 🐛 Issues: https://github.com/cvplus/cvplus/issues
- 💬 Discord: https://discord.gg/cvplus

---

Made with ❤️ by the CVPlus team