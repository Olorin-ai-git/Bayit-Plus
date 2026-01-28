# Privacy Policy - Bayit+ Translator Chrome Extension

**Last Updated:** January 28, 2026

**Effective Date:** January 28, 2026

---

## Introduction

This Privacy Policy describes how Bayit+ ("we", "our", or "us") collects, uses, and shares information when you use the Bayit+ Translator Chrome Extension (the "Extension"). We are committed to protecting your privacy and complying with all applicable data protection laws, including the General Data Protection Regulation (GDPR).

---

## Information We Collect

### 1. User Account Information
When you create an account or log in:
- **Email address** (required for authentication)
- **Name** (optional, for personalization)
- **Google OAuth data** (if you choose Google login):
  - Basic profile information (name, email, profile picture)
  - OAuth token (encrypted)

### 2. Audio Data
When you activate real-time dubbing:
- **Tab audio stream** - Captured from the active browser tab only when dubbing is actively running
- **Audio chunks** - Sent to our secure backend for processing (speech-to-text, translation, text-to-speech)
- **Retention**: Audio data is processed **ephemerally** and **not permanently stored**. Temporary processing cache is deleted after 7 days maximum.

### 3. Usage Data
- **Dubbing session duration** - Tracked for quota enforcement (free tier: 5 mins/day)
- **Subscription status** - Whether you have a free or premium subscription
- **Feature usage** - Which settings you configure (language, voice, volume)
- **Error logs** - Technical errors for debugging (via Sentry)

### 4. Device and Browser Information
- **Browser type and version** (e.g., Chrome 120, Edge 110)
- **Operating system** (Windows, Mac, Linux)
- **Extension version** (e.g., 1.0.0)
- **IP address** (for rate limiting and security)

### 5. Payment Information
If you upgrade to Premium:
- **Stripe customer ID** - Managed securely by Stripe (PCI-DSS Level 1 certified)
- **Payment method** - Stored by Stripe, never accessed by us
- **Subscription status** - Active, canceled, or expired

**We never see or store your credit card details.** All payment processing is handled by Stripe.

---

## How We Use Your Information

### 1. Provide the Extension Service
- **Real-time dubbing**: Process audio to translate Hebrew to English/Spanish
- **Authentication**: Verify your identity and manage your account
- **Quota enforcement**: Track usage to enforce free tier limits (5 mins/day)

### 2. Improve the Extension
- **Error monitoring**: Identify and fix bugs via Sentry error tracking
- **Performance optimization**: Analyze latency and resource usage
- **Feature development**: Understand which features are most used

### 3. Billing and Subscription Management
- **Process payments**: Handle upgrades, cancellations, and refunds via Stripe
- **Send receipts**: Email payment confirmations (via Stripe)
- **Manage subscriptions**: Track subscription status and renewal dates

### 4. Communications
- **Support**: Respond to your inquiries at support@bayit.tv
- **Service updates**: Notify you of critical updates or service disruptions (rare)
- **Marketing** (opt-in only): Send promotional emails if you explicitly consent

---

## Legal Basis for Processing (GDPR)

Under GDPR, we process your data based on:

1. **Consent** (Article 6(1)(a)):
   - You consent to audio capture when you click "Start Dubbing"
   - You consent to marketing emails if you opt in

2. **Contract** (Article 6(1)(b)):
   - Processing necessary to provide the Extension service you requested
   - Subscription management and payment processing

3. **Legitimate Interests** (Article 6(1)(f)):
   - Error monitoring to improve service quality
   - Fraud prevention and security

---

## Data Sharing and Disclosure

### Third-Party Services
We share your data with trusted third-party services:

1. **ElevenLabs** (Voice Synthesis)
   - Purpose: Convert translated text to natural-sounding speech
   - Data shared: Translated text only (no personal information)
   - Privacy policy: https://elevenlabs.io/privacy

2. **Google Cloud Platform** (Infrastructure)
   - Purpose: Host backend API and process audio streams
   - Data shared: Audio chunks, user IDs (encrypted)
   - Privacy policy: https://cloud.google.com/privacy

3. **Stripe** (Payment Processing)
   - Purpose: Manage subscriptions and payments
   - Data shared: Email, customer ID, payment method
   - Privacy policy: https://stripe.com/privacy
   - PCI-DSS Level 1 certified

4. **Sentry** (Error Tracking)
   - Purpose: Monitor errors and performance issues
   - Data shared: Error logs, browser info, extension version
   - Privacy policy: https://sentry.io/privacy

5. **PostHog** (Product Analytics)
   - Purpose: Understand feature usage and user behavior
   - Data shared: Anonymous usage events (e.g., "dubbing started")
   - Privacy policy: https://posthog.com/privacy

### Legal Disclosures
We may disclose your information if required by law:
- **Court orders or subpoenas**
- **Law enforcement requests** (with proper legal process)
- **Compliance with GDPR or other regulations**

We will notify you of such disclosures unless legally prohibited.

---

## Data Retention

- **Audio data**: Processed **ephemerally** and deleted immediately after dubbing session ends. Temporary cache (if any) deleted within 7 days maximum.
- **User accounts**: Retained until you delete your account
- **Usage logs**: Retained for 90 days for quota enforcement
- **Error logs**: Retained for 30 days for debugging
- **Payment records**: Retained for 7 years (tax compliance)

---

## Your Rights (GDPR)

You have the following rights under GDPR:

### 1. Right to Access (Article 15)
Request a copy of all personal data we hold about you.

### 2. Right to Rectification (Article 16)
Correct inaccurate or incomplete data.

### 3. Right to Erasure / "Right to be Forgotten" (Article 17)
Request deletion of your personal data. We will delete your account and all associated data within 30 days.

### 4. Right to Restrict Processing (Article 18)
Limit how we use your data in certain circumstances.

### 5. Right to Data Portability (Article 20)
Receive your data in a machine-readable format (JSON) to transfer to another service.

### 6. Right to Object (Article 21)
Object to processing based on legitimate interests or marketing.

### 7. Right to Withdraw Consent (Article 7(3))
Withdraw consent for audio capture or marketing emails at any time.

### 8. Right to Lodge a Complaint (Article 77)
File a complaint with your local data protection authority if you believe we violated your privacy rights.

**To exercise your rights, email us at privacy@bayit.tv**

---

## Data Security

We implement industry-standard security measures:

- **Encryption in transit**: All data transmitted via HTTPS/TLS 1.3
- **Encryption at rest**: User data encrypted in database (AES-256)
- **JWT token encryption**: Authentication tokens encrypted with AES-256-GCM before storage
- **Rate limiting**: Prevents abuse and brute-force attacks
- **Security headers**: OWASP best practices (CSP, HSTS, X-Frame-Options)
- **Regular security audits**: Penetration testing and vulnerability scanning

---

## Children's Privacy

The Extension is **not intended for users under 13 years old**. We do not knowingly collect personal information from children under 13. If we discover we have collected data from a child under 13, we will delete it immediately.

---

## International Data Transfers

Your data may be transferred to and processed in:
- **United States** (Google Cloud Platform servers)
- **European Union** (GDPR-compliant data centers)

We ensure adequate safeguards for international transfers via:
- **Standard Contractual Clauses** (SCCs) approved by the European Commission
- **Privacy Shield certification** (where applicable)

---

## Cookies and Tracking

The Extension **does not use cookies** in the traditional sense. However, we use:

- **LocalStorage**: Stores user preferences (language, volume) and encrypted authentication token
- **Sentry tracking**: Monitors errors (can be disabled in settings)
- **PostHog analytics**: Tracks feature usage (anonymized, can be disabled in settings)

You can disable analytics in Extension Settings → Privacy.

---

## Changes to This Privacy Policy

We may update this Privacy Policy from time to time. We will notify you of significant changes via:
- **Email notification** (if you have an account)
- **In-app notification** (popup in Extension)
- **Updated "Last Updated" date** at the top of this policy

Continued use of the Extension after changes constitutes acceptance of the updated policy.

---

## Contact Us

If you have questions about this Privacy Policy or want to exercise your privacy rights:

**Email:** privacy@bayit.tv
**Support:** support@bayit.tv
**Website:** https://bayit.tv/extension

**Data Controller:**
Olorin Media Inc.
[Address to be added]

---

## Complaint to Supervisory Authority

If you are in the EU/EEA and believe we have violated your privacy rights, you can lodge a complaint with your local data protection authority:

- **List of EU Data Protection Authorities**: https://edpb.europa.eu/about-edpb/board/members_en

---

## Acknowledgment

By using the Bayit+ Translator Extension, you acknowledge that you have read and understood this Privacy Policy and agree to its terms.

---

**Last Updated:** January 28, 2026
