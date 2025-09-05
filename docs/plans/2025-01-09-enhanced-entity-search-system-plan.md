# Multi-Entity Autonomous Investigation System Implementation Plan

**Author:** Gil Klainert  
**Date:** 2025-01-09  
**Plan Type:** Autonomous Investigation Enhancement  
**Complexity:** High  
**Estimated Duration:** 30 days  
**Architecture Diagram:** [Multi-Entity Autonomous Investigation Architecture](/docs/diagrams/enhanced-entity-search-architecture-2025-01-09.md)

## Executive Summary

This plan outlines the enhancement of the Olorin autonomous investigation system to support multi-entity investigations with Boolean relationship logic. The system will extend the existing LangGraph-based investigation workflow to simultaneously investigate multiple related entities (derived from the 20-column CSV dataset) using existing investigation tools and agents, providing comprehensive cross-entity fraud analysis.

## Current State Analysis

### Existing Autonomous Investigation Capabilities
- **LangGraph Investigation Workflow**: Single-entity autonomous investigation with device, location, network, and logs agents
- **Investigation Tools**: Splunk, vector search, threat intelligence, OSINT tools integrated with agents
- **EntityManager System**: 48 predefined entity types (DEVICE, LOCATION, NETWORK, USER, ACCOUNT, TRANSACTION, etc.)
- **Agent Orchestration**: Coordinated multi-agent investigation with real-time WebSocket updates
- **Investigation Results**: Comprehensive risk assessment with agent thoughts and scores

### Transaction Dataset Analysis
The CSV file contains 20 columns requiring new entity type mappings:
- Temporal: `TABLE_RECORD_CREATED_AT`, `TABLE_RECORD_UPDATED_AT`, `TX_DATETIME`, `TX_RECEIVED_DATETIME`
- Identifiers: `ORIGINAL_TX_ID`, `TX_ID_KEY`, `SURROGATE_APP_TX_ID`, `NSURE_UNIQUE_TX_ID`
- Business: `STORE_ID`, `APP_ID`, `EVENT_TYPE`, `AUTHORIZATION_STAGE`
- User Data: `EMAIL`, `EMAIL_NORMALIZED`, `FIRST_NAME`, `UNIQUE_USER_ID`
- Processing: `TX_UPLOADED_TO_SNOWFLAKE`, `IS_SENT_FOR_NSURE_REVIEW`, `CLIENT_REQUEST_ID`

### Gap Analysis
- **Single Entity Limitation**: Current autonomous investigations limited to one entity (user_id, device_id, etc.)
- **Missing Entity Types**: Transaction-specific entities from CSV not covered by current 48 types
- **No Multi-Entity Orchestration**: LangGraph agents cannot investigate related entities simultaneously
- **Limited Relationship Analysis**: No Boolean logic for entity relationship investigations
- **Investigation Scope**: Current tools investigate one entity at a time, missing cross-entity fraud patterns

## Implementation Strategy

### Phase 1: Enhanced Entity Type System ⏳ PENDING
**Duration:** Days 1-3  
**Priority:** Critical

#### 1.1 CSV-Derived Entity Types Extension
**Objective:** Extend EntityType enum with transaction-specific entities

**New Entity Types:**
```python
# Transaction-specific entities
TIMESTAMP = "timestamp"
EVENT = "event" 
TRANSACTION_ID = "transaction_id"
REQUEST = "request"
USER_IDENTITY = "user_identity"
AUTHORIZATION = "authorization"
CURRENCY = "currency"
MERCHANT_CATEGORY = "merchant_category"

# Temporal entities
DATETIME_PATTERN = "datetime_pattern"
SEQUENCE = "sequence"
BATCH = "batch"

# Business entities  
BUSINESS_RULE = "business_rule"
COMPLIANCE_STATUS = "compliance_status"
REVIEW_QUEUE = "review_queue"
```

**Files to Modify:**
- `app/service/agent/multi_entity/entity_manager.py` (EntityType enum, lines 20-66)

#### 1.2 Transaction Entity Factory
**Objective:** Automated entity creation from CSV data

**Implementation:**
- Create `TransactionEntityFactory` class
- Implement CSV column to entity type mapping
- Add attribute extraction with data validation
- Error handling for malformed data

### Phase 2: Multi-Entity Investigation Orchestration ⏳ PENDING
**Duration:** Days 4-7  
**Priority:** Critical

#### 2.1 Multi-Entity Investigation Request Model
**Objective:** Extend autonomous investigation to support multiple entities with relationships

**Core Components:**
```python
class EntityRelationship(BaseModel):
    source_entity_id: str
    target_entity_id: str
    relationship_type: str  # "initiated", "occurred_at", "associated_with"
    strength: float = 1.0

class MultiEntityInvestigationRequest(BaseModel):
    investigation_id: str
    entities: List[Dict[str, str]]  # [{"entity_id": "user123", "entity_type": "user"}]
    relationships: List[EntityRelationship]
    boolean_logic: str  # "user AND (transaction_id OR store_id)"
    investigation_scope: List[str] = ["device", "location", "network", "logs"]

class MultiEntityInvestigationResult(BaseModel):
    investigation_id: str
    entity_results: Dict[str, InvestigationResult]  # entity_id -> investigation result
    cross_entity_analysis: CrossEntityAnalysis
    relationship_insights: List[RelationshipInsight]
    overall_risk_assessment: MultiEntityRiskAssessment
```

**Files to Create:**
- `app/models/multi_entity_investigation.py` (<200 lines)
- `app/service/agent/multi_entity/investigation_orchestrator.py` (<200 lines)

#### 2.2 LangGraph Multi-Entity Workflow
**Features:**
- Extend existing LangGraph workflow to handle multiple entities simultaneously
- Coordinate agents across related entities (investigate user AND transaction AND store)
- Boolean logic evaluation for entity relationships
- Cross-entity pattern detection using existing tools

### Phase 3: Enhanced Investigation Agent System ⏳ PENDING
**Duration:** Days 8-12  
**Priority:** High

#### 3.1 Multi-Entity Investigation Agents
**Objective:** Extend existing LangGraph agents to investigate multiple related entities

**Enhanced Agent Architecture:**
```python
class MultiEntityInvestigationCoordinator:
    def __init__(self, existing_agents: Dict[str, Agent])
    
    async def coordinate_multi_entity_investigation(
        self, 
        request: MultiEntityInvestigationRequest
    ) -> MultiEntityInvestigationResult
    
    async def execute_cross_entity_analysis(
        self,
        entity_results: Dict[str, InvestigationResult],
        relationships: List[EntityRelationship]
    ) -> CrossEntityAnalysis
    
    def create_investigation_workflow(
        self, entities: List[Dict], relationships: List[EntityRelationship]
    ) -> LangGraphWorkflow
```

**Files to Create:**
- `app/service/agent/multi_entity/multi_investigation_coordinator.py` (<200 lines)
- `app/service/agent/multi_entity/cross_entity_analyzer.py` (<200 lines)

#### 3.2 Cross-Entity Pattern Detection
**Features:**
- Use existing investigation tools (Splunk, vector search, OSINT) across multiple entities
- Identify patterns spanning multiple entities (user → transaction → merchant → location)
- Risk correlation analysis between related entities
- Timeline reconstruction across entity relationships
- Anomaly detection in cross-entity behavior patterns

### Phase 4: API Layer Enhancement ⏳ PENDING
**Duration:** Days 13-15  
**Priority:** High

#### 4.1 Autonomous Investigation API Extensions
**Extended Endpoints:**
```
POST /api/v1/autonomous-investigation/multi-entity
POST /api/v1/autonomous-investigation/multi-entity/{investigation_id}/status
GET /api/v1/autonomous-investigation/multi-entity/{investigation_id}/results
PUT /api/v1/autonomous-investigation/multi-entity/{investigation_id}/relationships
GET /api/v1/entities/types/transaction-enhanced
```

**Files to Create:**
- Extend `app/router/autonomous_investigation_router.py` (add multi-entity endpoints)

#### 4.2 Multi-Entity Investigation API Models
**Enhanced Models:**
```python
class MultiEntityInvestigationRequest(BaseModel):
    investigation_id: str = Field(default_factory=lambda: f"multi_{uuid.uuid4().hex[:8]}")
    entities: List[Dict[str, str]] = Field(..., min_items=2, max_items=10)
    relationships: List[EntityRelationship] = Field(default_factory=list)
    boolean_logic: str = Field(default="AND", description="Boolean logic: 'AND', 'OR', '(A AND B) OR C'")
    investigation_scope: List[str] = Field(default=["device", "location", "network", "logs"])
    priority: str = Field(default="normal", choices=["low", "normal", "high", "critical"])

class MultiEntityInvestigationResponse(BaseModel):
    investigation_id: str
    status: str  # "in_progress", "completed", "failed"
    entities: List[Dict[str, str]]
    entity_results: Dict[str, InvestigationResult]
    cross_entity_insights: List[CrossEntityInsight]
    overall_risk_score: float
    investigation_timeline: List[InvestigationEvent]
    websocket_url: str  # For real-time updates
```

**Files to Modify:**
- `app/models/api_models.py` (add multi-entity investigation models)

### Phase 5: Frontend Enhancement ⏳ PENDING
**Duration:** Days 16-20  
**Priority:** Medium

#### 5.1 Multi-Entity Investigation Interface
**Enhanced Investigation Components:**
```typescript
interface MultiEntityInvestigationStarter extends React.FC {
  onInvestigationStart: (request: MultiEntityInvestigationRequest) => void;
  availableEntityTypes: EntityType[];
  existingInvestigations?: string[];
}

interface EntityRelationshipBuilder extends React.FC {
  entities: Array<{entity_id: string, entity_type: string}>;
  relationships: EntityRelationship[];
  onRelationshipsChange: (relationships: EntityRelationship[]) => void;
}

interface MultiEntityInvestigationResults extends React.FC {
  investigationResult: MultiEntityInvestigationResult;
  onEntityDrillDown: (entityId: string) => void;
  showCrossEntityInsights: boolean;
}

interface CrossEntityInsightsPanel extends React.FC {
  insights: CrossEntityInsight[];
  relationshipGraph: EntityRelationshipGraph;
  onPatternHighlight: (pattern: string) => void;
}
```

**Files to Create:**
- `olorin-front/src/js/components/investigation/MultiEntityInvestigationStarter.tsx` (<200 lines)
- `olorin-front/src/js/components/investigation/EntityRelationshipBuilder.tsx` (<200 lines)
- `olorin-front/src/js/components/investigation/MultiEntityResults.tsx` (<200 lines)
- `olorin-front/src/js/components/investigation/CrossEntityInsightsPanel.tsx` (<200 lines)

#### 5.2 Investigation Management UI Features
- **Multi-Entity Investigation Launcher**: Start investigations with multiple related entities
- **Entity Relationship Mapping**: Visual relationship builder with drag-and-drop
- **Real-Time Investigation Progress**: WebSocket updates for multi-entity investigation progress
- **Cross-Entity Pattern Visualization**: Interactive graphs showing entity relationships and risk patterns
- **Investigation History**: Track and compare multi-entity investigations

### Phase 6: Testing and Validation ⏳ PENDING
**Duration:** Days 21-25  
**Priority:** Critical

#### 6.1 Backend Test Suite
**Test Categories:**
```python
# Entity type tests
async def test_csv_entity_mapping()
async def test_transaction_entity_creation()
async def test_entity_validation()

# Boolean search tests  
async def test_and_operator_logic()
async def test_or_operator_logic()
async def test_not_operator_logic()
async def test_complex_nested_queries()
async def test_parentheses_grouping()

# Performance tests
async def test_search_performance_benchmarks()
async def test_concurrent_multi_entity_searches()
async def test_large_dataset_handling()

# Integration tests
async def test_api_endpoint_integration()
async def test_entity_manager_integration()
```

**Files to Create:**
- `test/unit/service/agent/multi_entity/test_boolean_search.py` (<200 lines)
- `test/integration/test_multi_entity_search_api.py` (<200 lines)
- `test/performance/test_search_benchmarks.py` (<200 lines)

#### 6.2 Frontend Test Suite
```typescript
describe('BooleanSearchBuilder', () => {
  test('renders entity type selector correctly');
  test('constructs valid boolean queries');
  test('handles query syntax errors gracefully');
  test('supports drag-and-drop query building');
});

describe('Multi-Entity Search Integration', () => {
  test('end-to-end search execution');
  test('result filtering and sorting');
  test('query history persistence');
});
```

### Phase 7: Performance Optimization ⏳ PENDING
**Duration:** Days 26-28  
**Priority:** Medium

#### 7.1 Search Performance Enhancements
**Optimization Strategies:**
- **Entity Indexing**: Implement B-tree indices for faster entity lookups
- **Query Result Caching**: LRU cache for frequently executed queries
- **Parallel Entity Searches**: Asyncio-based concurrent search execution
- **Database Query Optimization**: Index analysis and query plan optimization

#### 7.2 Scalability Improvements
- **Connection Pooling**: Optimized database connection management
- **Memory Management**: Efficient entity graph memory usage
- **Query Complexity Limits**: Prevent resource-intensive queries
- **Rate Limiting**: API throttling for search endpoints

### Phase 8: Documentation and Deployment ⏳ PENDING
**Duration:** Days 29-30  
**Priority:** Medium

#### 8.1 Comprehensive Documentation
**Documentation Deliverables:**
- **API Documentation**: OpenAPI specs with search examples
- **Frontend Component Docs**: Storybook integration
- **Query Syntax Guide**: User reference manual
- **Performance Tuning Guide**: Optimization recommendations

#### 8.2 Deployment and Integration
- **CI/CD Pipeline Integration**: Automated testing and deployment
- **Performance Monitoring**: Search metrics and alerting
- **Error Tracking**: Comprehensive logging and error analysis
- **User Training Materials**: Video tutorials and quick-start guides

## Success Criteria

### Functional Requirements
- ✅ **Entity Type Coverage**: All 20 CSV columns mapped to searchable entity types
- ✅ **Boolean Logic Support**: Complete AND/OR/NOT operations with parentheses
- ✅ **Multi-Entity Search**: Cross-entity search with intelligent relevance ranking
- ✅ **Performance Target**: Sub-500ms response time for typical queries (<100 entities)
- ✅ **UI Usability**: Intuitive search interface requiring minimal user training

### Technical Requirements
- ✅ **Backward Compatibility**: No breaking changes to existing investigation APIs
- ✅ **Code Quality**: All new files under 200 lines with comprehensive documentation
- ✅ **Scalability**: Handle 1000+ concurrent searches without degradation
- ✅ **Maintainability**: Modular design with clear separation of concerns
- ✅ **Security**: Input validation and SQL injection protection

### Quality Gates
- ✅ **Test Coverage**: >90% code coverage for all new components
- ✅ **Performance Tests**: All search operations under target latency
- ✅ **Security Audit**: Penetration testing for search endpoints
- ✅ **Documentation**: Complete API reference and user guides
- ✅ **User Acceptance**: Positive feedback from fraud investigation team

## Risk Assessment and Mitigation

### Technical Risks
| Risk | Impact | Probability | Mitigation Strategy |
|------|--------|-------------|-------------------|
| Performance degradation | High | Medium | Implement caching, indexing, and query optimization |
| Query complexity explosion | Medium | High | Limit nesting depth and query size constraints |
| Data consistency issues | High | Low | Add comprehensive validation and relationship checks |
| Memory consumption growth | Medium | Medium | Implement efficient graph algorithms and cleanup |

### Implementation Risks
| Risk | Impact | Probability | Mitigation Strategy |
|------|--------|-------------|-------------------|
| Timeline overrun | Medium | Medium | Break phases into smaller deliverable chunks |
| Integration complexity | High | Medium | Comprehensive testing at each development phase |
| User adoption challenges | Medium | Low | Provide migration path and extensive training |
| Technical debt accumulation | Medium | Medium | Regular code reviews and refactoring sessions |

## Resource Requirements

### Development Team
- **Backend Engineer**: Entity search system and API implementation (20 days)
- **Frontend Engineer**: Advanced search UI and query builder (15 days)  
- **QA Engineer**: Comprehensive testing strategy and execution (10 days)
- **DevOps Engineer**: Performance optimization and deployment (5 days)

### Infrastructure Requirements
- **Enhanced Database Indexing**: Additional storage for entity search indices
- **Cache Layer**: Redis cluster for query result caching (2GB memory)
- **Monitoring Systems**: Search performance and error tracking integration
- **Load Testing Environment**: Capacity testing for concurrent searches

## Dependencies and Prerequisites

### Internal Dependencies
- **EntityManager System**: Current multi-entity framework (stable)
- **RetrievalEngine**: Existing search infrastructure (requires extension)
- **Investigation Workflow**: Integration with existing investigation processes
- **API Authentication**: Current JWT-based security framework

### External Dependencies
- **Database Performance**: PostgreSQL query optimization capabilities
- **Frontend Framework**: React/TypeScript component compatibility
- **Testing Infrastructure**: Jest/pytest framework availability
- **Deployment Pipeline**: CI/CD system configuration

## Conclusion

This comprehensive plan transforms the Olorin entity search system from basic single-entity queries to sophisticated multi-entity Boolean search capabilities. The phased approach ensures minimal disruption to existing functionality while delivering powerful new search features that significantly enhance fraud investigation efficiency.

The implementation leverages existing architectural patterns and maintains strict adherence to code quality standards, ensuring long-term maintainability and scalability. Upon completion, investigators will have access to advanced search capabilities that dramatically improve their ability to identify complex fraud patterns across multiple entity types and relationships.

**Next Steps:**
1. **Plan Approval**: Review and approve implementation approach
2. **Resource Allocation**: Assign development team members to phases
3. **Environment Setup**: Prepare development and testing infrastructure
4. **Phase 1 Kickoff**: Begin enhanced entity type system implementation