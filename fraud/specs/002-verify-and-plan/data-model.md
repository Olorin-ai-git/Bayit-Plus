# Data Model: Manual Investigation UI

**Generated**: 2025-01-21 | **Feature**: Manual Investigation UI Migration

## Core Entities

### Investigation
Primary entity representing a fraud investigation case.

**Fields**:
- `id: string` - Unique investigation identifier (UUID)
- `entityId: string` - ID of the entity being investigated (user, merchant, etc.)
- `entityType: string` - Type of entity ('user_id', 'merchant_id', 'transaction_id')
- `status: InvestigationStatus` - Current investigation state
- `riskScore: number` - Overall risk assessment (0-100)
- `createdAt: DateTime` - Investigation start timestamp
- `updatedAt: DateTime` - Last modification timestamp
- `completedAt: DateTime?` - Investigation completion timestamp
- `assignedTo: string[]` - List of investigator user IDs
- `sandbox: string` - Sandbox environment identifier
- `priority: Priority` - Investigation urgency level
- `metadata: Record<string, any>` - Additional investigation context

**Relationships**:
- Has many InvestigationSteps
- Has many Comments
- Has many AuditLogs
- Has one InvestigationReport

**State Transitions**:
```
PENDING → IN_PROGRESS → REVIEW → COMPLETED/FAILED
        ↗               ↙
         PAUSED/ESCALATED
```

### InvestigationStep
Individual phases of investigation analysis.

**Fields**:
- `id: string` - Step identifier
- `investigationId: string` - Parent investigation reference
- `type: StepType` - Type of analysis ('device', 'location', 'network', 'logs')
- `status: StepStatus` - Step execution state
- `startTime: DateTime` - Step start timestamp
- `endTime: DateTime?` - Step completion timestamp
- `duration: number?` - Execution duration in milliseconds
- `retryCount: number` - Number of execution attempts
- `error: string?` - Error message if failed
- `result: AgentResponse?` - Analysis results

**Relationships**:
- Belongs to Investigation
- Has one AgentResponse

**State Transitions**:
```
PENDING → RUNNING → COMPLETED/FAILED
       ↗         ↙
        RETRYING
```

### AgentResponse
Results from AI/ML agents analyzing fraud signals.

**Fields**:
- `stepId: string` - Associated investigation step
- `agentType: AgentType` - Type of agent ('device', 'location', 'network', 'logs')
- `timestamp: DateTime` - Response generation time
- `confidence: number` - Confidence score (0-1)
- `riskLevel: RiskLevel` - Risk assessment ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')
- `signals: Signal[]` - Detected fraud signals
- `recommendations: string[]` - Agent suggestions
- `rawData: object` - Original analysis data
- `llmAssessment: string?` - LLM-generated analysis
- `processingTime: number` - Analysis duration in milliseconds

**Relationships**:
- Belongs to InvestigationStep
- Has many Signals

### RiskScore
Computed risk assessment with contributing factors.

**Fields**:
- `investigationId: string` - Parent investigation
- `score: number` - Overall risk score (0-100)
- `confidence: number` - Confidence in assessment (0-1)
- `factors: RiskFactor[]` - Contributing risk factors
- `trend: Trend` - Risk trend ('INCREASING', 'STABLE', 'DECREASING')
- `threshold: number` - Alert threshold
- `calculatedAt: DateTime` - Calculation timestamp
- `algorithm: string` - Scoring algorithm version

**Relationships**:
- Belongs to Investigation
- Has many RiskFactors

### Evidence
Collected data points supporting investigation.

**Fields**:
- `id: string` - Evidence identifier
- `investigationId: string` - Parent investigation
- `type: EvidenceType` - Type of evidence
- `source: string` - Evidence source system
- `collectedAt: DateTime` - Collection timestamp
- `collectedBy: string` - Collector user ID
- `data: object` - Evidence content
- `metadata: Record<string, any>` - Additional context
- `verified: boolean` - Verification status
- `weight: number` - Evidence importance (0-1)

**Relationships**:
- Belongs to Investigation
- Referenced by InvestigationReport

### Comment
Collaborative notes between investigators.

**Fields**:
- `id: string` - Comment identifier
- `investigationId: string` - Parent investigation
- `authorId: string` - Author user ID
- `message: string` - Comment text
- `timestamp: DateTime` - Creation time
- `editedAt: DateTime?` - Last edit timestamp
- `parentId: string?` - Parent comment for threading
- `mentions: string[]` - Mentioned user IDs
- `attachments: Attachment[]` - File attachments

**Relationships**:
- Belongs to Investigation
- Has optional parent Comment (threading)

### InvestigationReport
Generated documentation of findings.

**Fields**:
- `id: string` - Report identifier
- `investigationId: string` - Parent investigation
- `generatedAt: DateTime` - Generation timestamp
- `generatedBy: string` - Generator user ID
- `format: ReportFormat` - Output format ('PDF', 'HTML', 'JSON')
- `sections: ReportSection[]` - Report content sections
- `summary: string` - Executive summary
- `findings: Finding[]` - Key findings
- `recommendations: string[]` - Action recommendations
- `status: ReportStatus` - Report state
- `url: string?` - Storage location

**Relationships**:
- Belongs to Investigation
- References Evidence items

### InvestigationTemplate
Predefined investigation workflows.

**Fields**:
- `id: string` - Template identifier
- `name: string` - Template name
- `description: string` - Template purpose
- `category: string` - Template category
- `steps: StepDefinition[]` - Workflow steps
- `requiredFields: string[]` - Required input fields
- `defaultPriority: Priority` - Default priority
- `estimatedDuration: number` - Expected completion time
- `createdBy: string` - Creator user ID
- `active: boolean` - Availability status

**Relationships**:
- Used by many Investigations

### UserPermissions
Authorization levels for investigations.

**Fields**:
- `userId: string` - User identifier
- `investigationId: string?` - Specific investigation (null for global)
- `permissions: Permission[]` - Granted permissions
- `role: Role` - User role
- `grantedAt: DateTime` - Permission grant time
- `grantedBy: string` - Grantor user ID
- `expiresAt: DateTime?` - Permission expiration

**Relationships**:
- Belongs to User
- Optional Investigation reference

### AuditLog
Historical record of investigation actions.

**Fields**:
- `id: string` - Log entry identifier
- `investigationId: string` - Parent investigation
- `userId: string` - Actor user ID
- `action: AuditAction` - Action performed
- `timestamp: DateTime` - Action timestamp
- `details: object` - Action details
- `ipAddress: string` - Actor IP address
- `userAgent: string` - Client user agent
- `previousValue: any?` - Value before change
- `newValue: any?` - Value after change

**Relationships**:
- Belongs to Investigation
- References User

## Type Definitions

### Enumerations
```typescript
enum InvestigationStatus {
  PENDING = 'PENDING',
  IN_PROGRESS = 'IN_PROGRESS',
  REVIEW = 'REVIEW',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  PAUSED = 'PAUSED',
  ESCALATED = 'ESCALATED'
}

enum StepStatus {
  PENDING = 'PENDING',
  RUNNING = 'RUNNING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  RETRYING = 'RETRYING'
}

enum RiskLevel {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL'
}

enum Priority {
  LOW = 'LOW',
  NORMAL = 'NORMAL',
  HIGH = 'HIGH',
  URGENT = 'URGENT'
}

enum ReportFormat {
  PDF = 'PDF',
  HTML = 'HTML',
  JSON = 'JSON',
  CSV = 'CSV'
}
```

### Complex Types
```typescript
interface Signal {
  type: string;
  value: any;
  confidence: number;
  description: string;
}

interface RiskFactor {
  name: string;
  weight: number;
  value: number;
  contribution: number;
}

interface Finding {
  type: string;
  severity: RiskLevel;
  description: string;
  evidence: string[];
}

interface StepDefinition {
  type: StepType;
  required: boolean;
  order: number;
  config: object;
}

interface Attachment {
  id: string;
  filename: string;
  size: number;
  mimeType: string;
  url: string;
}
```

## Data Flow

### Investigation Lifecycle
1. Investigation created with initial entity data
2. Investigation steps executed in sequence/parallel
3. Agent responses collected and analyzed
4. Risk score calculated from agent results
5. Evidence collected throughout process
6. Comments added for collaboration
7. Report generated from findings
8. Audit logs track all actions

### Real-time Updates
- WebSocket events for step status changes
- Live risk score updates
- Real-time comment notifications
- Agent response streaming
- Collaborative cursor positions

## Validation Rules

### Investigation
- `entityId` required and non-empty
- `entityType` must be valid type
- `riskScore` between 0 and 100
- `assignedTo` must contain valid user IDs

### InvestigationStep
- `type` must be supported agent type
- `retryCount` cannot exceed maximum (3)
- `duration` must be positive if set

### AgentResponse
- `confidence` between 0 and 1
- `riskLevel` must be valid level
- `signals` array cannot be empty

### RiskScore
- `score` between 0 and 100
- `confidence` between 0 and 1
- `factors` must sum to total score

### Evidence
- `weight` between 0 and 1
- `data` must be valid JSON
- `source` must be recognized system

### Comment
- `message` maximum 5000 characters
- `mentions` must be valid user IDs
- `attachments` total size < 50MB

## Indexes

### Performance Optimization
- `investigations.entityId` - Entity lookup
- `investigations.status` - Status filtering
- `investigations.createdAt` - Time-based queries
- `investigation_steps.investigationId` - Step retrieval
- `comments.investigationId` - Comment loading
- `audit_logs.investigationId, timestamp` - Audit trail