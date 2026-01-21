# LLM Verification System Migration Guide

## Overview

This guide provides step-by-step instructions for migrating existing CVPlus services to use the new LLM Verification System. The system is designed for backward compatibility and gradual adoption.

## Migration Strategy

### Phase 1: Assessment and Preparation
### Phase 2: Development Environment Integration  
### Phase 3: Staging Environment Testing
### Phase 4: Production Rollout
### Phase 5: Optimization and Monitoring

---

## Phase 1: Assessment and Preparation

### 1.1 Identify Services Using LLM APIs

Current CVPlus services using Anthropic Claude:

1. **cvParser.ts** - CV text parsing and data extraction
2. **piiDetector.ts** - Personally identifiable information detection  
3. **achievements-analysis.service.ts** - Achievement extraction from CVs
4. **skills-proficiency.service.ts** - Skills analysis and proficiency assessment
5. **personality-insights.service.ts** - Personality analysis from CV content

Services using OpenAI:
1. **certification-badges.service.ts** - Certification validation and analysis
2. **language-proficiency.service.ts** - Language skill assessment
3. **portfolio-gallery.service.ts** - Portfolio content analysis
4. **video-generation.service.ts** - Video script generation
5. **podcast-generation.service.ts** - Podcast content creation

### 1.2 Current Integration Patterns

**Example: Current CVParser Usage**
```typescript
// Current implementation
const cvParser = new CVParser(process.env.ANTHROPIC_API_KEY);
const result = await cvParser.parseCV(fileBuffer, mimeType, userInstructions);
```

**Example: Current OpenAI Service Usage**
```typescript
// Current implementation
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const response = await openai.chat.completions.create({
  model: 'gpt-4',
  messages: [{ role: 'user', content: prompt }]
});
```

### 1.3 Risk Assessment

**High Priority Services (Migrate First):**
- cvParser.ts - Core functionality, high volume
- piiDetector.ts - Security critical
- achievements-analysis.service.ts - Data quality critical

**Medium Priority Services:**
- skills-proficiency.service.ts
- certification-badges.service.ts
- language-proficiency.service.ts

**Low Priority Services (Monitor and Migrate):**
- personality-insights.service.ts
- video-generation.service.ts
- podcast-generation.service.ts

---

## Phase 2: Development Environment Integration

### 2.1 Install Dependencies

The verification system is already included in the codebase. Ensure your environment has:

```bash
# Verify environment variables
echo "ANTHROPIC_API_KEY: ${ANTHROPIC_API_KEY:+SET}"
echo "OPENAI_API_KEY: ${OPENAI_API_KEY:+SET}"
```

### 2.2 Configure Environment

Update your `.env` file:
```bash
# Required
ANTHROPIC_API_KEY=your_claude_api_key
OPENAI_API_KEY=your_openai_api_key

# Optional - for development
NODE_ENV=development
LLM_VERIFICATION_ENABLED=true
LLM_VERIFICATION_LOG_LEVEL=debug
```

### 2.3 Service Migration Examples

#### 2.3.1 Migrating CVParser (High Priority)

**Step 1: Create backup of existing service**
```bash
cp src/services/cvParser.ts src/services/cvParser.backup.ts
```

**Step 2: Minimal integration approach**
```typescript
// src/services/cvParser.ts - Minimal changes
import { cvParsingWrapper } from './llm-integration-wrapper.service';

export class CVParser {
  constructor(private apiKey: string) {
    // Keep existing constructor for compatibility
  }

  async parseCV(fileBuffer: Buffer, mimeType: string, userInstructions?: string): Promise<ParsedCV> {
    // Extract text using existing methods
    const text = await this.extractText(fileBuffer, mimeType);
    
    // Use verified wrapper instead of direct Claude call
    const result = await cvParsingWrapper.parseCV(text, userInstructions, {
      fileName: 'uploaded_cv',
      mimeType
    });

    // Log verification results (optional)
    if (!result.verified) {
      console.warn('CV parsing verification failed:', result.verificationScore);
    }

    // Parse and return result (keep existing return type)
    return JSON.parse(result.content);
  }

  // Keep all existing private methods unchanged
  private async extractText(fileBuffer: Buffer, mimeType: string): Promise<string> {
    // ... existing implementation
  }
}
```

**Step 3: Update service instantiation**
```typescript
// src/functions/processCV.ts - Update usage
import { CVParser } from '../services/cvParser';

// Keep existing code - no changes needed!
const cvParser = new CVParser(process.env.ANTHROPIC_API_KEY!);
const result = await cvParser.parseCV(fileBuffer, mimeType, userInstructions);
```

#### 2.3.2 Migrating PII Detection (High Priority)

**Step 1: Enhanced security integration**
```typescript
// src/services/piiDetector.ts - Enhanced security
import { piiDetectionWrapper } from './llm-integration-wrapper.service';
import { llmSecurityMonitor } from './llm-security-monitor.service';

export class PIIDetector {
  constructor(private apiKey: string) {}

  async detectPII(text: string, options?: PIIMaskingOptions): Promise<PIIDetectionResult> {
    // Security logging
    const eventId = await llmSecurityMonitor.logSecurityEvent({
      type: 'suspicious_activity',
      severity: 'low',
      service: 'pii-detection',
      details: {
        action: 'pii_detection_request',
        textLength: text.length,
        hasOptions: !!options
      }
    });

    try {
      // Use verified wrapper
      const result = await piiDetectionWrapper.detectPII(text, {
        sensitivity: options?.sensitivity || 'medium',
        includeContext: true
      });

      // Parse response
      const piiData = JSON.parse(result.content);

      // Log if PII found
      if (piiData.piiDetected) {
        await llmSecurityMonitor.logSecurityEvent({
          type: 'pii_exposure',
          severity: piiData.riskLevel === 'critical' ? 'critical' : 'medium',
          service: 'pii-detection',
          details: {
            findingsCount: piiData.totalFindings,
            riskLevel: piiData.riskLevel,
            auditId: result.auditId
          }
        });
      }

      return {
        piiFound: piiData.piiDetected,
        items: piiData.findings,
        maskedText: this.maskPII(text, piiData.findings, options),
        confidence: result.verificationScore / 100,
        verified: result.verified
      };

    } catch (error) {
      // Log detection failure
      await llmSecurityMonitor.logSecurityEvent({
        type: 'verification_failure',
        severity: 'medium',
        service: 'pii-detection',
        details: {
          error: error.message,
          originalEventId: eventId
        }
      });
      throw error;
    }
  }

  // Keep existing private methods
  private maskPII(text: string, findings: any[], options?: PIIMaskingOptions): string {
    // ... existing implementation
  }
}
```

#### 2.3.3 Migrating Achievement Analysis (Medium Priority)

**Step 1: Gradual integration**
```typescript
// src/services/achievements-analysis.service.ts
import { createLLMWrapper } from './llm-integration-wrapper.service';

export class AchievementsAnalysisService {
  private llmWrapper = createLLMWrapper('achievements-analysis', {
    enableVerification: process.env.NODE_ENV === 'production', // Only in production
    customValidation: {
      accuracy: true,
      completeness: true,
      relevance: true,
      consistency: true,
      safety: true,
      format: true,
      customCriteria: [
        {
          name: 'quantifiable_metrics',
          description: 'Extract specific, quantifiable achievements',
          weight: 0.9
        }
      ]
    }
  });

  async extractKeyAchievements(cv: ParsedCV): Promise<Achievement[]> {
    const achievements: Achievement[] = [];

    // Process work experience with verification
    for (const experience of cv.workExperience || []) {
      const experienceAchievements = await this.extractFromExperience(experience);
      achievements.push(...experienceAchievements);
    }

    return achievements;
  }

  private async extractFromExperience(experience: any): Promise<Achievement[]> {
    // Build comprehensive prompt
    const prompt = this.buildExperiencePrompt(experience);

    try {
      // Use verified LLM wrapper
      const result = await this.llmWrapper.callClaude({
        prompt,
        temperature: 0.3,
        maxTokens: 1000,
        context: {
          company: experience.company,
          position: experience.position,
          processing_type: 'achievement_extraction'
        }
      });

      // Log verification results
      if (!result.verified) {
        console.warn(`Achievement extraction verification failed for ${experience.company}: Score ${result.verificationScore}`);
      }

      const parsed = JSON.parse(result.content);
      return parsed.achievements || [];

    } catch (error) {
      console.error('Achievement extraction failed:', error);
      // Fallback to existing logic
      return this.fallbackExperienceExtraction(experience);
    }
  }

  // Keep existing fallback methods
  private fallbackExperienceExtraction(experience: any): Achievement[] {
    // ... existing implementation
  }
}
```

### 2.4 Testing in Development

**Step 1: Create test scripts**
```typescript
// test/llm-verification-migration.test.ts
import { verifiedCVParser } from '../src/services/verified-cv-parser.service';
import { llmSecurityMonitor } from '../src/services/llm-security-monitor.service';

describe('LLM Verification Migration', () => {
  test('CV parsing with verification', async () => {
    const testCV = `
      John Doe
      john.doe@email.com
      Software Engineer at TechCorp
    `;

    const result = await verifiedCVParser.parseCV(
      Buffer.from(testCV),
      'text/plain',
      undefined,
      { userId: 'test-user' }
    );

    expect(result.parsedCV.personalInfo.name).toBe('John Doe');
    expect(result.verificationDetails.verified).toBe(true);
    expect(result.auditInfo.auditId).toBeDefined();
  });

  test('Security monitoring', async () => {
    const initialMetrics = llmSecurityMonitor.getSecurityMetrics();
    
    // Trigger security event
    await llmSecurityMonitor.logSecurityEvent({
      type: 'verification_failure',
      severity: 'medium',
      service: 'test-service',
      details: { test: true }
    });

    const updatedMetrics = llmSecurityMonitor.getSecurityMetrics();
    expect(updatedMetrics.totalEvents).toBe(initialMetrics.totalEvents + 1);
  });
});
```

**Step 2: Run migration tests**
```bash
cd functions
npm test -- llm-verification-migration.test.ts
```

---

## Phase 3: Staging Environment Testing

### 3.1 Staging Configuration

Update staging environment variables:
```bash
# Staging configuration
NODE_ENV=staging
LLM_VERIFICATION_ENABLED=true
LLM_VERIFICATION_LOG_LEVEL=info
LLM_VERIFICATION_CONFIDENCE_THRESHOLD=0.7
LLM_VERIFICATION_MAX_RETRIES=3
```

### 3.2 Gradual Rollout Strategy

**Step 1: Enable verification for 10% of requests**
```typescript
// Gradual rollout configuration
const VERIFICATION_ROLLOUT_PERCENTAGE = 10;

export class CVParser {
  async parseCV(fileBuffer: Buffer, mimeType: string, userInstructions?: string): Promise<ParsedCV> {
    const useVerification = Math.random() * 100 < VERIFICATION_ROLLOUT_PERCENTAGE;
    
    if (useVerification) {
      console.log('Using verified CV parsing');
      return await this.parseWithVerification(fileBuffer, mimeType, userInstructions);
    } else {
      console.log('Using legacy CV parsing');
      return await this.parseLegacy(fileBuffer, mimeType, userInstructions);
    }
  }
}
```

**Step 2: Monitor performance metrics**
```typescript
// Performance monitoring
class MigrationMonitor {
  static async logPerformanceMetrics(service: string, verified: boolean, duration: number) {
    console.log(`Migration Metrics: ${service}`, {
      verified,
      duration,
      timestamp: new Date().toISOString()
    });

    // In production, send to monitoring system
    // await sendToDataDog({ service, verified, duration });
  }
}
```

### 3.3 A/B Testing Framework

```typescript
// A/B testing for verification system
export class ABTestingService {
  static shouldUseVerification(userId: string, service: string): boolean {
    // Use user ID hash for consistent assignment
    const hash = this.hashUserId(userId);
    const percentage = this.getRolloutPercentage(service);
    
    return hash % 100 < percentage;
  }

  private static getRolloutPercentage(service: string): number {
    const rolloutConfig = {
      'cv-parsing': 25,
      'pii-detection': 50,
      'achievements-analysis': 10
    };
    
    return rolloutConfig[service] || 0;
  }

  private static hashUserId(userId: string): number {
    // Simple hash function for consistent assignment
    let hash = 0;
    for (let i = 0; i < userId.length; i++) {
      const char = userId.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash);
  }
}
```

---

## Phase 4: Production Rollout

### 4.1 Pre-Production Checklist

- [ ] API keys configured and tested
- [ ] Configuration validated for production environment
- [ ] Security monitoring rules tested and tuned
- [ ] Performance baselines established
- [ ] Rollback procedures documented
- [ ] Monitoring dashboards configured
- [ ] Alert thresholds set appropriately
- [ ] Documentation updated

### 4.2 Rollout Schedule

**Week 1: Core Services (5% traffic)**
- cvParser.ts
- piiDetector.ts

**Week 2: Expand Core Services (25% traffic)**
- Monitor performance and quality metrics
- Address any issues identified

**Week 3: Add Analysis Services (10% traffic)**
- achievements-analysis.service.ts
- skills-proficiency.service.ts

**Week 4: Full Core Services (100% traffic)**
- Complete migration of critical path services
- Monitor stability

**Week 5+: Remaining Services (Gradual)**
- personality-insights.service.ts
- certification-badges.service.ts
- language-proficiency.service.ts

### 4.3 Production Monitoring

**Key Metrics to Track:**
- Verification success rate (target: >90%)
- Response time impact (target: <100% increase)
- Error rates (target: <1% increase)
- Security events (monitor trends)
- Cost impact (track API usage)

**Monitoring Dashboard Query Examples:**
```sql
-- Verification success rate by service
SELECT 
  service,
  COUNT(*) as total_requests,
  SUM(CASE WHEN verified = true THEN 1 ELSE 0 END) as verified_requests,
  (SUM(CASE WHEN verified = true THEN 1 ELSE 0 END) * 100.0 / COUNT(*)) as success_rate
FROM verification_audit_logs 
WHERE timestamp > NOW() - INTERVAL '24 hours'
GROUP BY service;

-- Response time impact
SELECT 
  service,
  AVG(processing_time) as avg_response_time,
  PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY processing_time) as p95_response_time
FROM verification_audit_logs 
WHERE timestamp > NOW() - INTERVAL '1 hour'
GROUP BY service;
```

### 4.4 Rollback Procedures

**Immediate Rollback Triggers:**
- Verification success rate < 80%
- Response time increase > 200%
- Error rate increase > 5%
- Critical security incidents

**Rollback Process:**
1. **Disable verification** via environment variable:
   ```bash
   LLM_VERIFICATION_ENABLED=false
   ```

2. **Revert to legacy services** if needed:
   ```typescript
   // Emergency rollback flag
   const USE_LEGACY_PARSING = process.env.EMERGENCY_ROLLBACK === 'true';
   
   if (USE_LEGACY_PARSING) {
     return await this.legacyParseCV(fileBuffer, mimeType);
   }
   ```

3. **Monitor recovery metrics** and investigate issues

---

## Phase 5: Optimization and Monitoring

### 5.1 Performance Optimization

**Caching Strategy:**
```typescript
class VerificationCache {
  private cache = new Map<string, any>();
  
  getCachedVerification(promptHash: string): any | null {
    const cached = this.cache.get(promptHash);
    if (cached && Date.now() - cached.timestamp < 3600000) { // 1 hour
      return cached.result;
    }
    return null;
  }
  
  setCachedVerification(promptHash: string, result: any): void {
    this.cache.set(promptHash, {
      result,
      timestamp: Date.now()
    });
  }
}
```

**Batch Processing:**
```typescript
class BatchVerificationService {
  async verifyBatch(requests: VerificationRequest[]): Promise<VerificationResult[]> {
    // Process multiple requests in parallel
    const results = await Promise.all(
      requests.map(req => this.verifyResponse(req))
    );
    return results;
  }
}
```

### 5.2 Cost Optimization

**Smart Verification Rules:**
```typescript
class CostOptimizer {
  shouldVerify(request: any): boolean {
    // Skip verification for simple requests
    if (request.content.length < 100) return false;
    
    // Always verify high-risk operations
    if (request.service === 'pii-detection') return true;
    
    // Use sampling for low-risk operations
    if (request.service === 'personality-insights') {
      return Math.random() < 0.1; // 10% sampling
    }
    
    return true;
  }
}
```

### 5.3 Continuous Improvement

**Quality Metrics Tracking:**
```typescript
class QualityMetrics {
  async trackQualityImprovement(service: string, before: any, after: any) {
    const improvement = {
      service,
      accuracy_improvement: after.accuracy - before.accuracy,
      completeness_improvement: after.completeness - before.completeness,
      user_satisfaction_change: after.userRating - before.userRating,
      timestamp: new Date()
    };
    
    // Store for analysis
    await this.storeQualityMetrics(improvement);
  }
}
```

---

## Troubleshooting Guide

### Common Issues and Solutions

#### Issue 1: High Verification Failure Rate
**Symptoms:** >20% verification failures
**Possible Causes:**
- Validation criteria too strict
- Model version mismatch
- Prompt quality issues

**Solutions:**
```typescript
// Adjust validation criteria
const relaxedCriteria = {
  ...defaultCriteria,
  confidenceThreshold: 0.6, // Lower from 0.7
  scoreThreshold: 65 // Lower from 70
};

// Enable debug logging
console.log('Verification failure details:', result.issues);
```

#### Issue 2: Performance Impact Too High
**Symptoms:** Response times >2x baseline
**Possible Causes:**
- OpenAI API latency
- Too many retries
- Network issues

**Solutions:**
```typescript
// Reduce timeout and retries
const optimizedConfig = {
  timeoutMs: 15000, // Reduce from 30000
  maxRetries: 1, // Reduce from 3
  retryDelay: 500 // Reduce from 1000
};

// Implement selective verification
if (request.priority === 'high' || Math.random() < 0.5) {
  return await verifiedService.call(request);
} else {
  return await legacyService.call(request);
}
```

#### Issue 3: OpenAI API Rate Limits
**Symptoms:** 429 errors from OpenAI
**Solutions:**
```typescript
// Implement exponential backoff
class RateLimitHandler {
  async callWithBackoff(fn: Function, maxRetries: number = 3): Promise<any> {
    for (let i = 0; i < maxRetries; i++) {
      try {
        return await fn();
      } catch (error) {
        if (error.status === 429 && i < maxRetries - 1) {
          const delay = Math.pow(2, i) * 1000; // Exponential backoff
          await new Promise(resolve => setTimeout(resolve, delay));
          continue;
        }
        throw error;
      }
    }
  }
}
```

#### Issue 4: High API Costs
**Symptoms:** Unexpected API bill increases
**Solutions:**
```typescript
// Implement cost controls
class CostController {
  private dailySpend = 0;
  private readonly dailyLimit = 100; // $100/day

  async checkBudget(): Promise<boolean> {
    if (this.dailySpend > this.dailyLimit) {
      console.warn('Daily API budget exceeded, disabling verification');
      return false;
    }
    return true;
  }

  trackSpend(cost: number): void {
    this.dailySpend += cost;
  }
}
```

---

## Success Criteria

### Technical Metrics
- [ ] Verification success rate > 90%
- [ ] Response time impact < 100%
- [ ] Error rate increase < 1%
- [ ] Zero security incidents
- [ ] API cost increase < 50%

### Business Metrics
- [ ] Customer satisfaction maintained/improved
- [ ] Support ticket volume unchanged
- [ ] Data quality improvements measurable
- [ ] Compliance requirements met
- [ ] Team productivity maintained

### Operational Metrics
- [ ] Zero downtime during migration
- [ ] Rollback procedures tested and working
- [ ] Monitoring and alerting functional
- [ ] Documentation complete and accurate
- [ ] Team trained on new system

---

## Conclusion

This migration guide provides a comprehensive roadmap for safely integrating the LLM Verification System into existing CVPlus services. The phased approach ensures minimal risk while maximizing the benefits of improved AI response quality and security.

Key success factors:
1. **Gradual rollout** with careful monitoring
2. **Comprehensive testing** at each phase
3. **Clear rollback procedures** for risk mitigation
4. **Continuous optimization** based on real-world performance
5. **Team training** and documentation maintenance

Following this guide will ensure a smooth transition to verified AI responses while maintaining the high quality and reliability that CVPlus users expect.