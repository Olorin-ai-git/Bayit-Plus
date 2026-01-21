# CVPlus Policy Enforcement Implementation Plan

**Author:** Gil Klainert  
**Date:** August 24, 2025  
**Status:** Draft - Pending Approval  
**Diagram:** [Policy Enforcement Architecture](../diagrams/policy-enforcement-architecture.mermaid)

## Executive Summary

This plan outlines a comprehensive policy enforcement system for CVPlus that will enforce usage policies across both frontend and backend systems. The system includes CV hashcode tracking, name verification, usage monitoring, and automated policy violation detection.

## Current Infrastructure Analysis

### ✅ Existing Systems
- **Authentication:** Firebase Auth with user validation
- **Premium Management:** `checkFeatureAccess.ts` and `usePremiumStatus.ts`
- **User Data:** `userSubscriptions` collection in Firestore
- **Feature Gates:** webPortal, aiChat, podcast, advancedAnalytics, videoIntroduction

### 🔍 Policy Requirements to Enforce

#### Free Plan Limits
- Up to 3 CV uploads per month
- Light parsing only (basic AI suggestions)
- Limited exports (plain text or watermarked)
- Personal use only

#### Premium Plan ($49 Lifetime)
- Unlimited refinements on own CV
- Up to 3 unique CVs per month (unlimited iterations)
- Full parsing + ATS optimization
- Premium features access

#### Fair Use Enforcement
- **CV Ownership Verification:** Name in CV must match account name
- **Duplicate Detection:** CV hashcode tracking to prevent sharing
- **Account Sharing Prevention:** Usage pattern monitoring
- **Export Licensing:** Personal use only enforcement

## 1. CV Hashcode Tracking System

### 1.1 Technical Specification

```typescript
interface CVHashRecord {
  hashId: string;                    // SHA-256 hash of CV content
  originalUserId: string;            // First user to upload this CV
  uploadTimestamp: Date;             // First upload time
  duplicateUploads: {                // Track all duplicate uploads
    userId: string;
    uploadTime: Date;
    violationFlags: string[];
  }[];
  cvMetadata: {
    extractedName: string;           // Name found in CV
    fileSize: number;
    fileType: string;
    wordCount: number;
  };
  policyStatus: 'clean' | 'flagged' | 'violation';
}
```

### 1.2 Implementation Components

#### Backend Service: `CVHashService`
```typescript
// Location: functions/src/services/cv-hash.service.ts
class CVHashService {
  async generateCVHash(cvContent: string): Promise<string>
  async checkForDuplicates(hash: string, userId: string): Promise<DuplicateCheckResult>
  async recordCVUpload(hash: string, userId: string, metadata: CVMetadata): Promise<void>
  async flagPolicyViolation(hash: string, userId: string, violationType: string): Promise<void>
}
```

#### Firestore Collection Structure
```
cvHashRecords/
  {hashId}/
    - originalUserId: string
    - uploadTimestamp: timestamp
    - duplicateUploads: array
    - cvMetadata: object
    - policyStatus: string
    - lastViolationCheck: timestamp
```

### 1.3 Hash Generation Strategy
- **Content Normalization:** Remove formatting, timestamps, metadata
- **Name-Agnostic Hash:** Generate separate hash excluding name fields
- **Similarity Threshold:** 95% content match triggers duplicate flag
- **Hash Storage:** Store in `cvHashRecords` collection for cross-user checking

## 2. Name Verification System

### 2.1 Technical Specification

#### Account Name Sources (Priority Order)
1. **Verified Display Name** (from Firebase Auth profile)
2. **Billing Name** (from Stripe payment records)
3. **Manual Verification** (admin-approved name changes)

#### CV Name Extraction
- **Multiple Methods:** OCR, text parsing, structured data extraction
- **Name Variations:** Handle nicknames, middle names, initials
- **Cultural Considerations:** Different name ordering conventions

### 2.2 Implementation Components

#### Backend Service: `NameVerificationService`
```typescript
class NameVerificationService {
  async extractNameFromCV(cvContent: string): Promise<ExtractedName[]>
  async verifyNameMatch(accountName: string, cvName: string): Promise<VerificationResult>
  async updateVerifiedAccountName(userId: string, newName: string, source: string): Promise<void>
  async flagNameMismatch(userId: string, accountName: string, cvName: string): Promise<void>
}

interface VerificationResult {
  isMatch: boolean;
  confidence: number;
  matchType: 'exact' | 'partial' | 'nickname' | 'none';
  suggestedCorrection?: string;
}
```

#### Name Matching Algorithm
- **Exact Match:** 100% confidence
- **Partial Match:** First/Last name match (80% confidence)
- **Nickname Detection:** Common nickname database (70% confidence)
- **Fuzzy Matching:** Levenshtein distance for typos (60% confidence)
- **Failure Threshold:** <60% confidence flags for manual review

### 2.3 User Account Name Management

#### Verified Names Collection
```typescript
userVerifiedNames/
  {userId}/
    - primaryName: string
    - aliases: string[]
    - verificationSource: 'auth' | 'billing' | 'manual'
    - verifiedAt: timestamp
    - pendingChanges: {
      requestedName: string
      requestedAt: timestamp
      status: 'pending' | 'approved' | 'rejected'
    }
```

## 3. Frontend Policy Enforcement Strategy

### 3.1 Real-Time Usage Tracking

#### Enhanced Premium Status Hook
```typescript
// Extension to existing usePremiumStatus.ts
interface EnhancedPremiumStatus extends PremiumStatus {
  monthlyUsage: {
    cvUploadsCount: number;
    uniqueCVsCount: number;
    exportCount: number;
    lastResetDate: Date;
  };
  policyStatus: {
    isCompliant: boolean;
    violations: PolicyViolation[];
    warnings: PolicyWarning[];
  };
  accountVerification: {
    nameVerified: boolean;
    lastVerificationDate?: Date;
    pendingVerification: boolean;
  };
}
```

#### Usage Tracking Components
- **Upload Counter:** Real-time CV upload tracking
- **Unique CV Monitor:** Track different CV versions per month
- **Export Limiter:** Enforce export restrictions for free users
- **Policy Status Indicator:** Show compliance status in UI

### 3.2 Policy Enforcement UI Components

#### PreUploadPolicyCheck Component
```typescript
interface PreUploadPolicyCheckProps {
  onPolicyCompliant: () => void;
  onPolicyViolation: (violation: PolicyViolation) => void;
}

// Checks before allowing CV upload:
// - Monthly upload limits
// - Account verification status
// - Previous policy violations
```

#### NameVerificationModal Component
```typescript
// Triggered when CV name doesn't match account name
// Options:
// 1. Update account name (with verification)
// 2. Confirm CV belongs to user
// 3. Cancel upload
```

#### PolicyViolationAlert Component
```typescript
// Shows policy violations and required actions
// - Temporary restrictions
// - Required verifications
// - Account suspension notices
```

### 3.3 Frontend Validation Flow

1. **Pre-Upload Validation**
   - Check monthly upload limits
   - Verify account status
   - Display policy reminders

2. **Upload Process Monitoring**
   - Real-time policy checking
   - Name verification prompts
   - Duplicate detection alerts

3. **Post-Upload Actions**
   - Usage counter updates
   - Policy compliance confirmation
   - Next steps guidance

## 4. Backend Policy Validation Architecture

### 4.1 Policy Enforcement Service

```typescript
// functions/src/services/policy-enforcement.service.ts
class PolicyEnforcementService {
  // Core validation methods
  async validateCVUpload(userId: string, cvData: any): Promise<ValidationResult>
  async checkUsageLimits(userId: string): Promise<UsageLimitResult>
  async verifyAccountCompliance(userId: string): Promise<ComplianceResult>
  
  // Violation handling
  async recordPolicyViolation(userId: string, violation: PolicyViolation): Promise<void>
  async applyAccountRestrictions(userId: string, restrictions: Restriction[]): Promise<void>
  async scheduleComplianceReview(userId: string, reviewType: string): Promise<void>
}
```

### 4.2 Validation Pipeline

#### CV Upload Validation Flow
```
1. Authentication Check ✓ (existing)
2. Usage Limits Validation (NEW)
3. CV Hash Generation & Duplicate Check (NEW)
4. Name Verification (NEW)
5. Content Policy Check (NEW)
6. Account Compliance Verification (NEW)
7. Policy Recording & Analytics (NEW)
```

#### Firebase Function Integration
- **Enhanced processCV:** Add policy validation steps
- **New policyValidation:** Dedicated policy checking function
- **Enhanced applyImprovements:** Add compliance checks

### 4.3 Database Schema Extensions

#### User Policy Records
```typescript
userPolicyRecords/
  {userId}/
    - accountStatus: 'active' | 'warning' | 'restricted' | 'suspended'
    - monthlyUsage: {
        cvUploads: number
        uniqueCVs: number  
        exports: number
        resetDate: timestamp
      }
    - violations: PolicyViolation[]
    - restrictions: Restriction[]
    - complianceScore: number
    - lastPolicyCheck: timestamp
```

#### Policy Violations Log
```typescript
policyViolations/
  {violationId}/
    - userId: string
    - violationType: 'duplicate_cv' | 'name_mismatch' | 'usage_limit' | 'account_sharing'
    - severity: 'warning' | 'moderate' | 'severe'
    - detectedAt: timestamp
    - evidence: object
    - status: 'active' | 'resolved' | 'appealed'
    - actionTaken: string[]
```

## 5. User Monitoring and Analytics System

### 5.1 Usage Pattern Detection

#### Suspicious Activity Indicators
- **Rapid Upload Patterns:** Multiple CVs uploaded in short timeframe
- **Name Variations:** Frequent name changes or mismatches
- **Geographic Anomalies:** Login patterns from different locations
- **Device Fingerprinting:** Multiple devices accessing same content
- **Export Patterns:** Unusual export frequency or timing

#### Analytics Dashboard
```typescript
interface PolicyAnalytics {
  userMetrics: {
    totalUsers: number;
    activeViolations: number;
    suspendedAccounts: number;
    complianceRate: number;
  };
  violationTrends: {
    duplicateCVs: ViolationTrend;
    nameMismatches: ViolationTrend;
    usageLimitExceeded: ViolationTrend;
    accountSharing: ViolationTrend;
  };
  systemHealth: {
    validationLatency: number;
    falsePositiveRate: number;
    manualReviewQueue: number;
  };
}
```

### 5.2 Real-Time Monitoring

#### Event Tracking System
- **CV Upload Events:** Track all uploads with metadata
- **Policy Check Events:** Log all validation results
- **Violation Events:** Record all policy violations
- **User Action Events:** Track user responses to policy prompts

#### Alert System
- **Immediate Alerts:** Severe violations trigger instant notifications
- **Daily Digest:** Summary of moderate violations
- **Weekly Reports:** Compliance trends and analytics
- **Manual Review Queue:** Flagged cases requiring human review

## 6. Policy Violation Handling Workflow

### 6.1 Violation Severity Levels

#### Warning Level
- **Triggers:** Minor usage limit exceeded, potential name mismatch
- **Actions:** User notification, usage reminder, temporary restriction
- **Duration:** 24 hours
- **Resolution:** Automatic after compliance

#### Moderate Level
- **Triggers:** Clear name mismatch, duplicate CV upload, repeated warnings
- **Actions:** Account restriction, mandatory verification, usage suspension
- **Duration:** 7 days or until verified
- **Resolution:** Manual verification required

#### Severe Level
- **Triggers:** Multiple violations, account sharing evidence, commercial use
- **Actions:** Account suspension, data access restriction, manual review
- **Duration:** 30 days or permanent
- **Resolution:** Admin review and approval

### 6.2 User Communication System

#### Violation Notification Templates
```typescript
interface ViolationNotification {
  violationType: string;
  severity: 'warning' | 'moderate' | 'severe';
  description: string;
  requiredActions: string[];
  appealProcess: string;
  timelineToResolution: string;
}
```

#### Resolution Workflow
1. **Automatic Detection:** System flags potential violation
2. **User Notification:** Email and in-app notification sent
3. **Grace Period:** User has time to respond/appeal
4. **Enforcement:** Restrictions applied if not resolved
5. **Appeal Process:** Manual review if requested
6. **Resolution:** Account restored or permanently restricted

## 7. Implementation Timeline and Phases

### Phase 1: Foundation (Week 1-2)
**Goal:** Establish core policy enforcement infrastructure

**Backend Tasks:**
- [ ] Create `CVHashService` for content hashing
- [ ] Implement `NameVerificationService` for name matching
- [ ] Set up Firestore collections for policy tracking
- [ ] Create basic policy validation functions

**Frontend Tasks:**
- [ ] Extend `usePremiumStatus` with usage tracking
- [ ] Create `PreUploadPolicyCheck` component
- [ ] Implement usage limit indicators in UI
- [ ] Add policy status to user dashboard

**Testing:**
- [ ] Unit tests for hash generation and name matching
- [ ] Integration tests for policy validation flow
- [ ] E2E tests for upload restriction enforcement

### Phase 2: Detection and Monitoring (Week 3-4)
**Goal:** Implement comprehensive policy violation detection

**Backend Tasks:**
- [ ] Integrate CV hash checking into upload flow
- [ ] Implement name verification in processCV function
- [ ] Create violation logging and tracking system
- [ ] Set up automated policy checking jobs

**Frontend Tasks:**
- [ ] Create `NameVerificationModal` component
- [ ] Implement `PolicyViolationAlert` system
- [ ] Add real-time compliance monitoring
- [ ] Create policy education tooltips and guides

**Testing:**
- [ ] Test duplicate CV detection accuracy
- [ ] Validate name matching algorithms with edge cases
- [ ] Test violation workflow with various scenarios

### Phase 3: Enforcement and Communication (Week 5-6)
**Goal:** Complete policy enforcement with user communication

**Backend Tasks:**
- [ ] Implement account restriction mechanisms
- [ ] Create violation severity assessment logic
- [ ] Set up automated email notifications
- [ ] Build admin review and appeal system

**Frontend Tasks:**
- [ ] Create violation appeal interface
- [ ] Implement account status indicators
- [ ] Build compliance dashboard for users
- [ ] Add policy education and help resources

**Testing:**
- [ ] Test complete violation handling workflow
- [ ] Validate notification systems
- [ ] Performance testing under high load
- [ ] Security testing for policy bypass attempts

### Phase 4: Analytics and Optimization (Week 7-8)
**Goal:** Implement monitoring and continuous improvement

**Backend Tasks:**
- [ ] Create policy analytics dashboard
- [ ] Implement anomaly detection algorithms
- [ ] Set up automated reporting system
- [ ] Build admin tools for policy management

**Frontend Tasks:**
- [ ] Create admin policy management interface
- [ ] Implement user compliance education system
- [ ] Add policy transparency features
- [ ] Create user feedback collection system

**Testing:**
- [ ] Load testing with realistic user patterns
- [ ] False positive/negative rate analysis
- [ ] User experience testing for policy flows
- [ ] Security audit of complete system

## 8. Technical Implementation Details

### 8.1 CV Hash Generation Algorithm

```typescript
class CVContentHasher {
  static async generateHash(cvContent: string): Promise<string> {
    // 1. Normalize content (remove formatting, dates, contact info)
    const normalized = this.normalizeContent(cvContent);
    
    // 2. Generate SHA-256 hash
    const hash = await crypto.subtle.digest('SHA-256', 
      new TextEncoder().encode(normalized)
    );
    
    // 3. Convert to base64 for storage
    return btoa(String.fromCharCode(...new Uint8Array(hash)));
  }
  
  private static normalizeContent(content: string): string {
    return content
      .replace(/\s+/g, ' ')                    // Normalize whitespace
      .replace(/\d{4}-\d{2}-\d{2}/g, '')      // Remove dates
      .replace(/[\d\-\(\)\+\s]{10,}/g, '')    // Remove phone numbers
      .replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, '') // Remove emails
      .toLowerCase()
      .trim();
  }
}
```

### 8.2 Name Verification Algorithm

```typescript
class NameMatcher {
  static verifyNameMatch(accountName: string, cvName: string): VerificationResult {
    const accountParts = this.parseNameParts(accountName);
    const cvParts = this.parseNameParts(cvName);
    
    // Exact match
    if (accountName.toLowerCase() === cvName.toLowerCase()) {
      return { isMatch: true, confidence: 1.0, matchType: 'exact' };
    }
    
    // First and last name match
    if (accountParts.firstName === cvParts.firstName && 
        accountParts.lastName === cvParts.lastName) {
      return { isMatch: true, confidence: 0.9, matchType: 'partial' };
    }
    
    // Nickname detection
    const nicknameMatch = this.checkNicknameMatch(accountParts, cvParts);
    if (nicknameMatch.confidence > 0.7) {
      return { isMatch: true, confidence: nicknameMatch.confidence, matchType: 'nickname' };
    }
    
    // Fuzzy matching for typos
    const fuzzyScore = this.calculateFuzzyMatch(accountName, cvName);
    if (fuzzyScore > 0.8) {
      return { isMatch: true, confidence: fuzzyScore, matchType: 'partial' };
    }
    
    return { isMatch: false, confidence: 0, matchType: 'none' };
  }
}
```

### 8.3 Usage Limits Enforcement

```typescript
class UsageLimitsService {
  async checkUploadLimit(userId: string, planType: string): Promise<UsageLimitResult> {
    const usage = await this.getUserMonthlyUsage(userId);
    const limits = this.getPlanLimits(planType);
    
    if (planType === 'free' && usage.cvUploads >= limits.maxUploads) {
      return {
        allowed: false,
        limitType: 'monthly_uploads',
        currentUsage: usage.cvUploads,
        limit: limits.maxUploads,
        resetDate: this.getMonthlyResetDate()
      };
    }
    
    if (planType === 'premium' && usage.uniqueCVs >= limits.maxUniqueCVs) {
      return {
        allowed: false,
        limitType: 'unique_cvs',
        currentUsage: usage.uniqueCVs,
        limit: limits.maxUniqueCVs,
        resetDate: this.getMonthlyResetDate()
      };
    }
    
    return { allowed: true };
  }
}
```

## 9. Success Metrics and KPIs

### 9.1 Policy Enforcement Effectiveness
- **Violation Detection Rate:** % of actual violations caught by system
- **False Positive Rate:** % of legitimate users flagged incorrectly  
- **Policy Compliance Rate:** % of users following policies
- **Resolution Time:** Average time to resolve violations

### 9.2 System Performance
- **Validation Latency:** Time to complete policy checks during upload
- **System Availability:** Uptime of policy enforcement services
- **Scalability:** Performance under increasing user load
- **Resource Usage:** CPU/memory consumption of policy services

### 9.3 User Experience
- **User Satisfaction:** Feedback on policy enforcement fairness
- **Appeal Success Rate:** % of successful violation appeals
- **Policy Understanding:** User comprehension of policies
- **Support Ticket Reduction:** Decreased policy-related support requests

## 10. Risk Assessment and Mitigation

### 10.1 Technical Risks

**Risk:** False positive violations due to name variations
- **Mitigation:** Comprehensive nickname database, fuzzy matching, manual review queue
- **Monitoring:** Track false positive rates and user appeals

**Risk:** CV hash collisions or manipulation
- **Mitigation:** Strong hash algorithms, content normalization, multiple validation layers
- **Monitoring:** Hash collision detection, suspicious pattern analysis

**Risk:** Policy bypass through technical means
- **Mitigation:** Multiple validation layers, server-side enforcement, regular security audits
- **Monitoring:** Anomaly detection, behavior analysis, security monitoring

### 10.2 Business Risks

**Risk:** User backlash against strict policy enforcement
- **Mitigation:** Clear communication, fair appeal process, gradual rollout
- **Monitoring:** User feedback, churn rates, support ticket sentiment

**Risk:** Competitive disadvantage from usage restrictions
- **Mitigation:** Focus on preventing abuse while maintaining user-friendly experience
- **Monitoring:** Market positioning analysis, competitor feature comparison

### 10.3 Legal and Compliance Risks

**Risk:** Privacy concerns with name verification and usage monitoring
- **Mitigation:** GDPR compliance, transparent privacy policy, user consent
- **Monitoring:** Privacy audit compliance, user privacy concerns

**Risk:** Discrimination concerns with name matching algorithms
- **Mitigation:** Cultural sensitivity testing, bias detection, manual review options
- **Monitoring:** Algorithm fairness metrics, demographic impact analysis

## Conclusion

This comprehensive policy enforcement plan will establish CVPlus as a trusted platform that maintains fairness and prevents abuse while providing an excellent user experience for legitimate users. The phased implementation approach allows for testing and refinement at each stage, ensuring robust and reliable policy enforcement.

The combination of automated detection with human oversight, clear user communication, and fair appeal processes will create a balanced system that protects the platform while respecting user rights and maintaining trust.

---

**Next Steps:**
1. Review and approve this plan
2. Begin Phase 1 implementation
3. Set up monitoring and analytics infrastructure
4. Conduct user acceptance testing for policy UI components

**Dependencies:**
- Firebase infrastructure scaling
- Additional cloud function resources
- Customer support team training
- Legal review of policy enforcement procedures