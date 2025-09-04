# 🎬 Vibe Coding Demo Script
## Live Implementation: Real-time Investigation System

---

## 🎯 Demo Overview

**Objective**: Build a fraud detection endpoint with WebSocket notifications
**Duration**: 20-25 minutes
**Tools**: Cursor AI, VAN methodology, existing OLORIN codebase

### Success Criteria:
- ✅ Create POST /investigation endpoint
- ✅ Store investigation in database
- ✅ Broadcast creation via WebSocket
- ✅ Return proper JSON response
- ✅ Handle errors gracefully

---

## 📋 Pre-Demo Setup Checklist

### Environment Preparation:
- [ ] OLORIN server running on localhost:8090
- [ ] Cursor AI open with codebase loaded
- [ ] Terminal ready for testing
- [ ] Browser with WebSocket client ready
- [ ] Screen sharing optimized for code visibility

---

## 🎯 Phase 1: VAN Analysis (5 minutes)

### Problem Statement:
> "We need to create a real-time investigation system where users can create fraud investigations and all connected clients get notified immediately."

### Visual Breakdown:
```
Client Request → API Endpoint → Validation → Database Storage
                                              ↓
WebSocket Clients ← Broadcast ← WebSocket Manager
```

### Component Analysis:
1. **REST Endpoint** - POST /investigation
2. **Data Validation** - Pydantic models
3. **Database Storage** - Create investigation record
4. **WebSocket Broadcasting** - Notify connected clients
5. **Error Handling** - Validation and database errors

**VAN Level Assessment: Level 3** (Moderate complexity)

---

## 🎯 Phase 2: Cursor Implementation (15 minutes)

### Cursor Prompt:
```
Create a new FastAPI endpoint that:
1. Accepts POST requests to /investigation
2. Takes investigation data as JSON (id, entity_id, entity_type)
3. Validates using InvestigationCreate model
4. Stores using create_investigation()
5. Broadcasts to WebSocket clients
6. Returns created investigation with 201 status
7. Includes proper error handling
8. Follows existing code patterns
```

### Expected Implementation:
```python
@investigations_router.post("/investigation", response_model=InvestigationOut, status_code=201)
def create_investigation_endpoint(
    investigation_create: InvestigationCreate,
) -> InvestigationOut:
    """Create investigation and broadcast to WebSocket clients"""
    try:
        # Set defaults
        if not investigation_create.created_by:
            investigation_create.created_by = "system"
        
        # Create in database
        db_obj = create_investigation(investigation_create)
        
        # Broadcast to WebSocket clients
        websocket_manager = get_websocket_manager()
        # ... broadcasting logic
        
        return InvestigationOut.model_validate(db_obj)
        
    except ValidationError as e:
        raise HTTPException(status_code=400, detail=f"Validation error: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")
```

---

## 🎯 Phase 3: Testing & Validation (5 minutes)

### Test the Endpoint:
```bash
# Start server
poetry run uvicorn app.main:app --host 127.0.0.1 --port 8090 --reload

# Test creation
curl -X POST "http://localhost:8090/api/investigation" \
  -H "Content-Type: application/json" \
  -d '{
    "id": "DEMO_INV_001",
    "entity_id": "demo_user_123",
    "entity_type": "user_id"
  }'
```

### Verify WebSocket:
```javascript
// Browser WebSocket client
const ws = new WebSocket('ws://localhost:8090/ws');
ws.onmessage = function(event) {
    console.log('Received:', JSON.parse(event.data));
};
```

---

## 🎯 Key Demo Insights

### What This Demonstrates:
1. **VAN Analysis Effectiveness** - Systematic breakdown prevented missing components
2. **Cursor AI Performance** - Understood existing patterns and generated quality code
3. **Flow State Maintenance** - No context switching, natural language to code
4. **Real-world Applicability** - Production-ready implementation

### Success Metrics:
- ✅ Endpoint working correctly
- ✅ Database integration complete
- ✅ WebSocket notifications sent
- ✅ Error handling implemented
- ✅ Code follows existing patterns

---

## 🎯 Audience Engagement

### Questions During Demo:
- "What other components might we need?"
- "How would you improve this prompt?"
- "What patterns do you notice?"
- "What edge cases should we test?"

### Troubleshooting Guide:
- **Import errors**: Prompt for missing imports
- **WebSocket issues**: Focus on REST functionality
- **Server problems**: Use backup demo footage
- **Validation errors**: Check model requirements

---

*Demo script for confident presentation of Vibe Coding through practical implementation.*
