# Data Model Specification: Reports Microservice

**Feature**: `001-reports-microservice-implementation`
**Date**: 2025-01-09
**Phase**: Phase 1 - Design
**Status**: Complete

## Table of Contents

1. [Overview](#overview)
2. [Database Schema](#database-schema)
3. [SQLAlchemy Models (Backend)](#sqlalchemy-models-backend)
4. [Pydantic Schemas (API)](#pydantic-schemas-api)
5. [TypeScript Interfaces (Frontend)](#typescript-interfaces-frontend)
6. [Widget Data Model](#widget-data-model)
7. [State Transitions](#state-transitions)
8. [Validation Rules](#validation-rules)

## Overview

The data model supports report management with markdown content, status lifecycle, and dynamic widget integration. The backend is already implemented; this document describes the complete data model for reference.

**Schema Compliance** (SYSTEM MANDATE):
- ✅ No DDL in code - schema defined explicitly
- ✅ All columns validated against Pydantic schemas
- ✅ Parameterized queries only
- ✅ Foreign key constraints enforced (owner references User)

## Database Schema

### Table: reports

**Purpose**: Persist report documents with markdown content and metadata.

```sql
CREATE TABLE reports (
    -- Primary Key
    id VARCHAR(255) PRIMARY KEY,
    
    -- Report Metadata
    owner VARCHAR(255) NOT NULL,
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'Draft',
    tags JSON,
    
    -- Timestamps (from TimestampMixin)
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    
    -- Indexes
    INDEX idx_reports_owner (owner),
    INDEX idx_reports_status (status),
    INDEX idx_reports_updated (updated_at)
);

-- Constraints
CHECK (status IN ('Draft', 'Published', 'Archived'))
```

**Column Descriptions**:
- `id`: UUID string, primary key
- `owner`: User identifier (string), indexed for filtering
- `title`: Report title, required, max 255 characters
- `content`: Markdown content, required, TEXT type for large content
- `status`: Report status enum (Draft, Published, Archived), indexed
- `tags`: JSON array of tag strings, nullable
- `created_at`: Creation timestamp, auto-set
- `updated_at`: Last update timestamp, auto-updated

## SQLAlchemy Models (Backend)

**Location**: `olorin-server/app/persistence/models.py`

```python
class ReportRecord(Base, TimestampMixin):
    """Report record model for investigation reports."""
    
    __tablename__ = "reports"
    
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    owner = Column(String, nullable=False, index=True)
    title = Column(String, nullable=False)
    content = Column(Text, nullable=False)
    status = Column(String, default="Draft", nullable=False, index=True)
    tags = Column(JSON, nullable=True)
```

**Status Values**:
- `Draft`: Report is being edited, not visible to others
- `Published`: Report is published and visible
- `Archived`: Report is archived, filtered from default views

## Pydantic Schemas (API)

**Location**: `olorin-server/app/schemas/report_schemas.py`

### ReportCreate
```python
class ReportCreate(BaseModel):
    title: str = Field(..., min_length=1, max_length=255)
    content: str = Field(..., description="Markdown content")
    tags: Optional[List[str]] = Field(default_factory=list)
```

### ReportUpdate
```python
class ReportUpdate(BaseModel):
    title: Optional[str] = Field(None, min_length=1, max_length=255)
    content: Optional[str] = None
    status: Optional[str] = Field(None)  # Draft, Published, Archived
    tags: Optional[List[str]] = None
```

### ReportResponse
```python
class ReportResponse(BaseModel):
    id: str
    title: str
    content: str
    owner: str
    status: str
    tags: List[str] = Field(default_factory=list)
    created_at: datetime
    updated_at: datetime
```

### InvestigationStatisticsResponse
```python
class InvestigationStatisticsResponse(BaseModel):
    total: int
    completed: int
    success_rate: float  # 0.0-100.0
    investigations: List[Dict[str, Any]]  # Recent investigations
```

## TypeScript Interfaces (Frontend)

**Location**: `olorin-front/src/microservices/reporting/types/reports.ts`

```typescript
export type ReportStatus = 'Draft' | 'Published' | 'Archived';

export interface Report {
  id: string;
  title: string;
  content: string;
  owner: string;
  status: ReportStatus;
  tags: string[];
  created_at: string;  // ISO datetime
  updated_at: string;  // ISO datetime
}

export interface ReportCreate {
  title: string;
  content: string;
  tags?: string[];
}

export interface ReportUpdate {
  title?: string;
  content?: string;
  status?: ReportStatus;
  tags?: string[];
}

export interface InvestigationStatistics {
  total: number;
  completed: number;
  success_rate: number;
  investigations: Array<{
    id: string;
    name: string;
    owner: string;
    status: string;
    updated: string;
  }>;
}
```

## Widget Data Model

Widgets are embedded in markdown content as placeholders and rendered dynamically.

### Widget Placeholder Format

```
{{WIDGET_TYPE subtype}}
```

**Widget Types**:
- `KPI` → KPI Widget (subtypes: total, completed, success)
- `CHART` → Chart Widget (subtypes: timeseries, success, hbar, heat)
- `TABLE` → Table Widget (subtypes: recent)

### Widget Component Props

```typescript
interface KPIWidgetProps {
  type: 'total' | 'completed' | 'success';
  data: InvestigationStatistics;
}

interface ChartWidgetProps {
  type: 'timeseries' | 'success' | 'hbar' | 'heat';
  data: InvestigationStatistics;
}

interface TableWidgetProps {
  type: 'recent';
  data: InvestigationStatistics['investigations'];
}
```

### Widget Data Source

Widgets fetch data from:
- **Endpoint**: `GET /api/v1/reports/statistics/investigations`
- **Response**: `InvestigationStatisticsResponse`
- **Caching**: Cache for 30 seconds to reduce API calls

## State Transitions

### Report Status Lifecycle

```
[Draft] ──publish──> [Published]
  │                    │
  │                    │
  └──archive──> [Archived] <──archive──┘
```

**Transitions**:
- `Draft → Published`: User clicks "Publish" button
- `Published → Draft`: User clicks "Publish" again (unpublish)
- `Any → Archived`: User changes status to "Archived"
- `Archived → Draft`: User changes status back to "Draft" (restore)

**Business Rules**:
- Only report owner can change status
- Published reports are visible to all users (with read permission)
- Archived reports are filtered from default views
- Status changes update `updated_at` timestamp

## Validation Rules

### Report Title
- **Required**: Yes
- **Min Length**: 1 character
- **Max Length**: 255 characters
- **Pattern**: No validation pattern (allows any characters)

### Report Content
- **Required**: Yes
- **Min Length**: 0 characters (empty content allowed)
- **Max Length**: No limit (TEXT type)
- **Format**: Markdown format
- **Widget Placeholders**: Validated on save (optional, for better UX)

### Report Status
- **Required**: Yes
- **Default**: "Draft"
- **Allowed Values**: "Draft", "Published", "Archived"
- **Case Sensitive**: Yes (matches backend enum)

### Tags
- **Required**: No
- **Type**: Array of strings
- **Max Items**: No limit (practical limit: 10-20 tags)
- **Tag Format**: Alphanumeric + hyphens/underscores, max 50 chars per tag
- **Unique**: Tags are not unique across reports

### Owner
- **Required**: Yes
- **Source**: Current authenticated user (from JWT token)
- **Immutable**: Cannot be changed after creation
- **Authorization**: Users can only edit/delete their own reports

## Relationships

### Report → User (Owner)
- **Type**: Many-to-One
- **Foreign Key**: `owner` → `users.username` (or user ID)
- **Cascade**: None (reports preserved if user deleted)
- **Access Control**: Owner-based filtering in queries

### Report → Investigation (Widget Data)
- **Type**: Many-to-Many (via widget placeholders)
- **Relationship**: Reports reference investigations through widget data
- **No Foreign Key**: Widgets fetch data dynamically, no direct DB relationship

## Data Flow

### Report Creation Flow
```
User Input → ReportCreate Schema → Validation → ReportRecord → Database
```

### Report Update Flow
```
User Input → ReportUpdate Schema → Validation → ReportRecord Update → Database
```

### Widget Rendering Flow
```
Markdown Content → Parse Placeholders → Fetch Statistics API → Render Widgets
```

## Indexes

**Performance Optimizations**:
- `idx_reports_owner`: Fast filtering by owner
- `idx_reports_status`: Fast filtering by status
- `idx_reports_updated`: Fast sorting by update time

**Query Patterns**:
- List reports by owner: Uses `idx_reports_owner`
- Filter by status: Uses `idx_reports_status`
- Sort by updated: Uses `idx_reports_updated`

## Migration Strategy

**Backend**: Already implemented, no migration needed.

**Frontend**: 
- Update existing `Report` type to match backend schema
- Migrate any localStorage data to backend (if exists)
- Update service calls to use new API endpoints

## Security Considerations

1. **Authorization**: Owner-based access control (users can only edit own reports)
2. **Input Sanitization**: Markdown content sanitized by react-markdown
3. **XSS Prevention**: react-markdown prevents XSS by default
4. **SQL Injection**: Parameterized queries prevent SQL injection
5. **Rate Limiting**: Backend rate limiting applies to report endpoints

## Performance Considerations

1. **Content Size**: Large markdown content stored as TEXT (efficient)
2. **Indexes**: Indexes on owner, status, updated_at for fast queries
3. **Widget Data Caching**: Cache investigation statistics for 30 seconds
4. **Pagination**: Report list supports pagination (page, limit)
5. **Lazy Loading**: Widgets loaded only when report is viewed

