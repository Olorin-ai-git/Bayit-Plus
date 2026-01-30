# @olorin/shared-email

**Version**: 2.0.0
**Description**: Shared email types and interfaces for the Olorin ecosystem

## Overview

This package provides TypeScript type definitions and interfaces for email functionality across the Olorin platform. It ensures type safety and consistency for email templates, campaigns, tracking, and previews.

## Installation

```bash
npm install @olorin/shared-email
```

## Features

- **Core Email Types**: Email templates, messages, and results
- **Template Contexts**: Type-safe contexts for all email templates
- **Email Tracking**: Event types, statistics, and logging
- **Campaign Management**: Campaign creation, filtering, and summaries
- **Template Preview**: Preview and listing functionality
- **Multi-language Support**: 10 languages (English, Hebrew, Spanish, Chinese, French, Italian, Hindi, Tamil, Bengali, Japanese)
- **RTL Support**: Text direction handling for Hebrew

## Usage

### Core Email Types

```typescript
import type {
  EmailMessage,
  SendResult,
  EmailCategory,
  EmailLanguage
} from '@olorin/shared-email';

const message: EmailMessage = {
  toEmail: 'user@example.com',
  subject: 'Welcome to Olorin',
  htmlContent: '<h1>Welcome!</h1>',
  plainContent: 'Welcome!',
  fromEmail: 'noreply@olorin.ai',
  fromName: 'Olorin Team',
  categories: ['transactional'],
  templateName: 'welcome',
  language: 'en',
};

const result: SendResult = await sendEmail(message);
console.log(result.success, result.messageId);
```

### Template Contexts

```typescript
import type {
  WelcomeEmailContext,
  PaymentConfirmationContext
} from '@olorin/shared-email';

const welcomeContext: WelcomeEmailContext = {
  recipientEmail: 'user@example.com',
  recipientName: 'John Doe',
  lang: 'en',
  subject: 'Welcome to Olorin',
  logoUrl: 'https://olorin.ai/logo.png',
  unsubscribeUrl: 'https://olorin.ai/unsubscribe',
  privacyUrl: 'https://olorin.ai/privacy',
  termsUrl: 'https://olorin.ai/terms',
  currentYear: 2026,
  dashboardUrl: 'https://app.olorin.ai/dashboard',
};

const paymentContext: PaymentConfirmationContext = {
  recipientEmail: 'user@example.com',
  recipientName: 'John Doe',
  lang: 'en',
  subject: 'Payment Confirmation',
  logoUrl: 'https://olorin.ai/logo.png',
  unsubscribeUrl: 'https://olorin.ai/unsubscribe',
  privacyUrl: 'https://olorin.ai/privacy',
  termsUrl: 'https://olorin.ai/terms',
  currentYear: 2026,
  transactionId: 'TX-12345',
  planName: 'Pro Plan',
  amount: '29.99',
  currency: 'USD',
  paymentDate: '2026-01-30',
  nextBillingDate: '2026-02-30',
};
```

### Email Tracking

```typescript
import type {
  EmailEvent,
  DeliveryStats,
  EventLogRequest
} from '@olorin/shared-email/tracking';

const event: EmailEvent = {
  emailId: 'email-123',
  eventType: 'opened',
  recipient: 'user@example.com',
  templateName: 'welcome',
  subject: 'Welcome to Olorin',
  timestamp: '2026-01-30T12:00:00Z',
  metadata: { browser: 'Chrome' },
  sgMessageId: 'sg-msg-123',
  userId: 'user-456',
};

const stats: DeliveryStats = {
  sent: 1000,
  delivered: 950,
  opened: 600,
  clicked: 300,
  bounced: 30,
  dropped: 20,
  spamReports: 5,
  unsubscribes: 10,
  deliveryRate: 0.95,
  openRate: 0.63,
  clickRate: 0.50,
  bounceRate: 0.03,
};

const request: EventLogRequest = {
  page: 1,
  pageSize: 50,
  eventType: 'opened',
  dateRange: {
    start: '2026-01-01',
    end: '2026-01-31',
  },
};
```

### Campaign Management

```typescript
import type {
  EmailCampaign,
  CreateCampaignRequest,
  CampaignSummary
} from '@olorin/shared-email/campaign';

const createRequest: CreateCampaignRequest = {
  name: 'January Newsletter',
  templateName: 'newsletter',
  subject: 'January Updates',
  audienceFilter: {
    languages: ['en', 'he'],
    subscriptionPlans: ['pro', 'enterprise'],
    registeredAfter: '2025-01-01',
    tags: ['engaged'],
    excludeTags: ['unsubscribed'],
  },
  scheduledAt: '2026-02-01T10:00:00Z',
  context: {
    headline: 'New Features',
    bodyHtml: '<p>Check out our new features!</p>',
    ctaUrl: 'https://olorin.ai/features',
    ctaText: 'Learn More',
  },
};

const campaign: EmailCampaign = {
  id: 'campaign-123',
  name: 'January Newsletter',
  category: 'marketing',
  templateName: 'newsletter',
  subject: 'January Updates',
  status: 'scheduled',
  audienceFilter: createRequest.audienceFilter,
  scheduledAt: '2026-02-01T10:00:00Z',
  createdAt: '2026-01-30T12:00:00Z',
  updatedAt: '2026-01-30T12:00:00Z',
};

const summary: CampaignSummary = {
  ...campaign,
  recipientCount: 5000,
  deliveredCount: 4850,
  openedCount: 3000,
  clickedCount: 1500,
};
```

### Template Preview

```typescript
import type {
  TemplatePreviewRequest,
  TemplatePreviewResponse,
  TemplateListResponse
} from '@olorin/shared-email/preview';

const previewRequest: TemplatePreviewRequest = {
  templateName: 'welcome',
  language: 'en',
  context: {
    recipientName: 'John Doe',
    dashboardUrl: 'https://app.olorin.ai/dashboard',
  },
};

const previewResponse: TemplatePreviewResponse = {
  html: '<h1>Welcome John Doe!</h1>',
  plainText: 'Welcome John Doe!',
  subject: 'Welcome to Olorin',
  templateName: 'welcome',
  language: 'en',
  renderedAt: '2026-01-30T12:00:00Z',
};

const templateList: TemplateListResponse = {
  templates: [
    {
      name: 'welcome',
      category: 'transactional',
      description: 'Welcome email for new users',
      requiredContext: ['recipientName', 'dashboardUrl'],
      supportedLanguages: ['en', 'he', 'es'],
      lastModified: '2026-01-15T10:00:00Z',
    },
  ],
  total: 15,
};
```

## Supported Languages

The package supports 10 languages with the `EmailLanguage` type:

| Code | Language | Direction |
|------|----------|-----------|
| `en` | English | LTR |
| `he` | Hebrew | RTL |
| `es` | Spanish | LTR |
| `zh` | Chinese | LTR |
| `fr` | French | LTR |
| `it` | Italian | LTR |
| `hi` | Hindi | LTR |
| `ta` | Tamil | LTR |
| `bn` | Bengali | LTR |
| `ja` | Japanese | LTR |

## Email Categories

The package defines 5 email categories with the `EmailCategory` type:

- `transactional`: Account-related emails (welcome, verification, password reset)
- `payment`: Payment and billing emails
- `notification`: System notifications and alerts
- `admin`: Administrative communications
- `marketing`: Marketing campaigns and newsletters

## Template Contexts

The package provides type-safe contexts for all email templates:

| Template | Context Type | Required Fields |
|----------|-------------|-----------------|
| Welcome | `WelcomeEmailContext` | `dashboardUrl` |
| Email Verification | `EmailVerificationContext` | `verificationUrl`, `expiryHours` |
| Password Reset | `PasswordResetContext` | `resetUrl`, `expiryHours` |
| Payment Confirmation | `PaymentConfirmationContext` | `transactionId`, `planName`, `amount`, `currency`, `paymentDate`, `nextBillingDate` |
| Subscription Activated | `SubscriptionActivatedContext` | `planName`, `features`, `expiresAt` |
| Support Ticket | `SupportTicketContext` | `ticketId`, `ticketSubject`, `ticketStatus`, `ticketUrl` |
| Campaign | `CampaignEmailContext` | `campaignId`, `headline`, `bodyHtml`, `ctaUrl`, `ctaText` |
| GDPR Deletion | `GdprDeletionContext` | `deletionDate`, `dataCategories` |

All contexts extend `EmailBaseContext` which provides common fields like `recipientEmail`, `recipientName`, `lang`, `logoUrl`, etc.

## Email Events

The package tracks 8 email event types via SendGrid webhooks:

| Event Type | Description |
|------------|-------------|
| `sent` | Email sent to SendGrid |
| `delivered` | Email delivered to recipient's mail server |
| `opened` | Recipient opened the email |
| `clicked` | Recipient clicked a link in the email |
| `bounced` | Email bounced (hard or soft bounce) |
| `dropped` | Email dropped by SendGrid (invalid recipient, spam, etc.) |
| `spam_report` | Recipient marked email as spam |
| `unsubscribe` | Recipient unsubscribed |

## Exports

### Main Export (`@olorin/shared-email`)

```typescript
import type {
  // Core types
  EmailCategory,
  EmailLanguage,
  TextDirection,
  EmailTemplate,
  EmailMessage,
  SendResult,

  // Template contexts
  EmailBaseContext,
  WelcomeEmailContext,
  EmailVerificationContext,
  PasswordResetContext,
  PaymentConfirmationContext,
  SubscriptionActivatedContext,
  SupportTicketContext,
  CampaignEmailContext,
  GdprDeletionContext,

  // Tracking types
  EmailEventType,
  EmailEvent,
  DeliveryStats,
  DateRange,
  EventLogRequest,
  EventLogResponse,

  // Campaign types
  EmailCampaign,
  CampaignStatus,
  AudienceFilter,
  CreateCampaignRequest,
  CampaignSummary,

  // Preview types
  TemplatePreviewRequest,
  TemplatePreviewResponse,
  TemplateListItem,
  TemplateListResponse,
} from '@olorin/shared-email';
```

### Subpath Exports

```typescript
// Tracking types only
import type { EmailEvent, DeliveryStats } from '@olorin/shared-email/tracking';

// Campaign types only
import type { EmailCampaign, CampaignSummary } from '@olorin/shared-email/campaign';

// Preview types only
import type { TemplatePreviewRequest } from '@olorin/shared-email/preview';
```

## Build

```bash
npm run build        # Build for production
npm run dev          # Build with watch mode
npm run typecheck    # TypeScript type checking
npm run lint         # ESLint checking
```

## License

Proprietary - Olorin Ecosystem

## Version History

- **2.0.0** (2026-01-30): Initial release with complete email type system
