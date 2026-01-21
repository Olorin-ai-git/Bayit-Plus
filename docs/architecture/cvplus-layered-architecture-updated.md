# CVPlus Layered Architecture - Updated with CV Enhancements Module

**Author**: Gil Klainert
**Date**: 2025-09-16
**Version**: 2.1
**Document Type**: Architectural Specification

## Architecture Overview

CVPlus follows a strict **4-layer hierarchical architecture** with clear dependency rules and domain boundaries. Each layer has specific responsibilities and can only depend on lower layers, ensuring clean separation of concerns and maintainable code structure.

## 📋 **Updated Layer Structure**

### **Layer 0: Foundation (Core)**
**Purpose**: Shared utilities, types, constants, and foundational services

**Modules**:
- `@cvplus/core` - Core utilities, types, validation, logging, configuration

**Dependency Rules**:
- ✅ Can import: External libraries only
- ❌ Cannot import: Any CVPlus modules

### **Layer 1: Base Services**
**Purpose**: Authentication, internationalization, and foundational service layer

**Modules**:
- `@cvplus/auth` - Authentication, authorization, session management
- `@cvplus/i18n` - Internationalization, localization, multi-language support

**Dependency Rules**:
- ✅ Can import: Layer 0 (Core)
- ❌ Cannot import: Layer 1+ modules

### **Layer 2: Domain Services**
**Purpose**: Core domain-specific processing and specialized services

**Modules**:
- `@cvplus/cv-processing` - CV analysis, ATS optimization, processing pipelines
- `@cvplus/multimedia` - Media generation, video/audio processing, file management
- `@cvplus/analytics` - Data analytics, metrics, business intelligence, ML pipelines

**Dependency Rules**:
- ✅ Can import: Layer 0-1 (Core, Auth, I18n)
- ❌ Cannot import: Layer 2+ modules (peer dependencies prohibited)

### **Layer 3: Business Services** 🆕
**Purpose**: Business logic, user-facing features, and enhancement services

**Modules**:
- `@cvplus/cv-enhancements` - 🆕 **Calendar integration, meeting booking, professional networking**
- `@cvplus/premium` - Premium features, subscription management, advanced capabilities
- `@cvplus/recommendations` - AI-powered recommendations, suggestion engine
- `@cvplus/public-profiles` - Public profile management, social features, sharing

**Dependency Rules**:
- ✅ Can import: Layer 0-2 (Core, Auth, I18n, CV-Processing, Multimedia, Analytics)
- ❌ Cannot import: Layer 3+ modules (peer dependencies prohibited)

### **Layer 4: Orchestration Services**
**Purpose**: System orchestration, administration, and workflow management

**Modules**:
- `@cvplus/admin` - Administrative tools, system monitoring, user management
- `@cvplus/workflow` - Job orchestration, template management, automation
- `@cvplus/payments` - Payment processing, billing, transaction management

**Dependency Rules**:
- ✅ Can import: Layer 0-3 (All lower layers)
- ❌ Cannot import: Layer 4 modules (peer dependencies prohibited)

## 🎯 **Key Architectural Changes**

### **NEW: CV Enhancements Module (Layer 3)**
**Rationale**: Calendar integration, meeting booking, and professional networking are **basic enhancement features** available to ALL users, not premium-only features. These belong in Layer 3 as business services that enhance the core CV experience.

**Features Moved from Payments Module**:
- ✅ Calendar integration (Google, Outlook, iCal)
- ✅ Meeting booking and scheduling
- ✅ Professional networking tools
- ✅ Contact management
- ✅ Email automation for scheduling

**Why Layer 3?**
- Enhances core CV functionality with professional tools
- Available to all users (not premium-only)
- Integrates with CV-Processing, Multimedia, and Analytics
- Provides business value through professional networking

### **Payments Module Refocus (Layer 4)**
**Updated Purpose**: Pure payment processing and financial transaction management
- ❌ **REMOVED**: Calendar/booking functionality (moved to cv-enhancements)
- ✅ **RETAINED**: Payment processing, Stripe/PayPal integration, subscription billing
- ✅ **RETAINED**: Transaction management, webhook handling, financial reporting

## 🔄 **Updated Dependency Graph**

```
Layer 4 (Orchestration):     [admin] ←→ [workflow] ←→ [payments]
                               ↓           ↓           ↓
Layer 3 (Business):     [cv-enhancements] [premium] [recommendations] [public-profiles]
                               ↓           ↓           ↓           ↓
Layer 2 (Domain):        [cv-processing] [multimedia] [analytics]
                               ↓           ↓           ↓
Layer 1 (Base):                    [auth] [i18n]
                                     ↓     ↓
Layer 0 (Core):                    [core]
```

## 📊 **Module Dependency Matrix**

| Module | Layer | Can Import From |
|--------|--------|----------------|
| core | 0 | External libraries only |
| auth | 1 | core |
| i18n | 1 | core |
| cv-processing | 2 | core, auth, i18n |
| multimedia | 2 | core, auth, i18n |
| analytics | 2 | core, auth, i18n |
| **cv-enhancements** | **3** | **core, auth, i18n, cv-processing, multimedia, analytics** |
| premium | 3 | core, auth, i18n, cv-processing, multimedia, analytics |
| recommendations | 3 | core, auth, i18n, cv-processing, multimedia, analytics |
| public-profiles | 3 | core, auth, i18n, cv-processing, multimedia, analytics |
| admin | 4 | All Layers 0-3 |
| workflow | 4 | All Layers 0-3 |
| payments | 4 | All Layers 0-3 |

## 🛡️ **Architectural Compliance Rules**

### **MANDATORY Requirements**
1. **Strict Layer Hierarchy**: Higher layers can only import from lower layers
2. **No Peer Dependencies**: Modules in the same layer cannot depend on each other
3. **Clean Domain Boundaries**: Each module has clearly defined responsibilities
4. **Autonomous Operation**: Each module must be independently buildable and testable
5. **Git Submodule Architecture**: All modules are independent git repositories

### **CV Enhancements Specific Rules**
```typescript
// ✅ CORRECT: CV Enhancements importing from lower layers
import { User, Job, CVData } from '@cvplus/core';
import { AuthService } from '@cvplus/auth';
import { CVProcessingService } from '@cvplus/cv-processing';
import { MultimediaService } from '@cvplus/multimedia';
import { AnalyticsService } from '@cvplus/analytics';

// ❌ FORBIDDEN: CV Enhancements importing from same/higher layers
import { PremiumService } from '@cvplus/premium'; // PEER DEPENDENCY - FORBIDDEN
import { AdminService } from '@cvplus/admin'; // HIGHER LAYER - FORBIDDEN
import { PaymentService } from '@cvplus/payments'; // HIGHER LAYER - FORBIDDEN

// ✅ CORRECT: Higher layers importing from CV Enhancements
// In @cvplus/premium:
import { CalendarIntegrationService } from '@cvplus/cv-enhancements';

// In @cvplus/admin:
import { BookingService } from '@cvplus/cv-enhancements';
```

## 📈 **Migration Impact Analysis**

### **Benefits of CV Enhancements Module**
1. **Clear Domain Separation**: Calendar/networking features properly isolated from payment processing
2. **Improved Accessibility**: Enhancement features available to all users, not just premium
3. **Better Maintainability**: Clear ownership of calendar and networking functionality
4. **Enhanced Testability**: Focused testing of enhancement features independent from payments
5. **Scalable Architecture**: Room for additional basic enhancement features

### **Refactored Payments Module**
1. **Focused Responsibility**: Pure payment processing without calendar/booking concerns
2. **Cleaner Dependencies**: No longer needs calendar/email dependencies
3. **Simplified Testing**: Payment tests focused only on financial transactions
4. **Better Security**: Financial code isolated from non-payment functionality

### **Updated Import Patterns**
```typescript
// OLD (Architectural Violation):
import { bookMeeting, sendSchedulingEmail } from '@cvplus/payments';

// NEW (Architecturally Compliant):
import { bookMeeting, sendSchedulingEmail } from '@cvplus/cv-enhancements';
import { CalendarIntegrationService } from '@cvplus/cv-enhancements';
```

## 🔧 **Build Order Requirements**

### **Updated Build Sequence**
```bash
# Layer 0: Foundation
1. packages/core

# Layer 1: Base Services
2. packages/auth
3. packages/i18n

# Layer 2: Domain Services
4. packages/cv-processing
5. packages/multimedia
6. packages/analytics

# Layer 3: Business Services (Updated)
7. packages/cv-enhancements  # 🆕 NEW POSITION
8. packages/premium
9. packages/recommendations
10. packages/public-profiles

# Layer 4: Orchestration Services
11. packages/admin
12. packages/workflow
13. packages/payments
```

### **Parallel Build Groups**
- **Group 1**: core (no dependencies)
- **Group 2**: auth, i18n (depend only on core)
- **Group 3**: cv-processing, multimedia, analytics (depend on Layers 0-1)
- **Group 4**: cv-enhancements, premium, recommendations, public-profiles (depend on Layers 0-2)
- **Group 5**: admin, workflow, payments (depend on Layers 0-3)

## 🚀 **Implementation Guidelines**

### **For CV Enhancements Module**
1. Focus on **basic enhancement features** available to all users
2. Integrate seamlessly with CV-Processing for career data
3. Provide professional networking and calendar capabilities
4. Maintain clean boundaries with premium features
5. Ensure autonomous operation and testing

### **For Other Modules**
1. Update imports to use `@cvplus/cv-enhancements` for calendar/booking features
2. Remove calendar/booking dependencies from payments module
3. Ensure proper layer compliance in all import statements
4. Update test suites to reflect new module boundaries

### **Migration Checklist**
- [ ] Create cv-enhancements submodule with Layer 3 architecture
- [ ] Move calendar/booking functionality from payments to cv-enhancements
- [ ] Update all import statements across CVPlus ecosystem
- [ ] Remove calendar/booking code from payments module
- [ ] Update test suites for both cv-enhancements and payments
- [ ] Validate build order and dependency compliance
- [ ] Update documentation and architectural diagrams

## 📚 **Documentation References**

- **Layer 0 (Core)**: `/packages/core/CLAUDE.md`
- **Layer 1 (Base)**: `/packages/auth/CLAUDE.md`, `/packages/i18n/CLAUDE.md`
- **Layer 2 (Domain)**: `/packages/cv-processing/CLAUDE.md`, `/packages/multimedia/CLAUDE.md`, `/packages/analytics/CLAUDE.md`
- **Layer 3 (Business)**: `/packages/cv-enhancements/CLAUDE.md` 🆕, `/packages/premium/CLAUDE.md`, `/packages/recommendations/CLAUDE.md`, `/packages/public-profiles/CLAUDE.md`
- **Layer 4 (Orchestration)**: `/packages/admin/CLAUDE.md`, `/packages/workflow/CLAUDE.md`, `/packages/payments/CLAUDE.md`

---

**Architectural Compliance Note**: This updated architecture ensures that calendar integration, meeting booking, and professional networking features are properly positioned as basic enhancement services available to all users, while maintaining clean layer separation and domain boundaries throughout the CVPlus ecosystem.