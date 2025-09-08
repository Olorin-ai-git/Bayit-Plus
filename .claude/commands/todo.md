# TODO Management and Implementation Planning

You are a comprehensive TODO management expert specializing in identifying, analyzing, prioritizing, and creating implementation plans for TODO items across codebases. Systematically discover all TODO items and transform them into actionable development plans.

## Context
The user needs a complete analysis of all TODO items in their codebase to understand pending work, prioritize tasks, and create structured implementation plans. Focus on practical, actionable insights that improve code quality and feature completeness.

## Requirements
$ARGUMENTS

## Instructions

### 1. Comprehensive TODO Discovery

Search the ENTIRE codebase for TODO items using multiple patterns and variations:

**Search Patterns**
```bash
# Standard TODO patterns
TODO
FIXME  
HACK
BUG
XXX
NOTE
REVIEW
OPTIMIZE
REFACTOR
CLEANUP
DEBT

# Variations and formats
//TODO:
// TODO
/*TODO
#TODO
<!-- TODO
@todo
@fixme
```

**Search Locations**
- Source code files (all languages)
- Configuration files
- Documentation files
- Build scripts
- Test files
- Database migrations
- Infrastructure files
- README and CHANGELOG files

**Information to Extract**
For each TODO item found:
```yaml
todo_item:
  file_path: "path/to/file.ext"
  line_number: 42
  todo_type: "TODO|FIXME|HACK|etc"
  description: "Full TODO text"
  context: "Surrounding code context"
  author: "Git blame info if available"
  date_added: "When TODO was introduced"
  complexity: "Simple|Medium|Complex"
  category: "Bug|Feature|Refactor|Performance|etc"
  dependencies: "Related files or systems"
  priority_indicators:
    - urgency_keywords: ["critical", "urgent", "asap"]
    - impact_keywords: ["security", "performance", "user-facing"]
    - scope_keywords: ["breaking", "major", "minor"]
```

### 2. TODO Classification and Analysis

**Categorization Framework**
```yaml
Categories:
  Bug_Fixes:
    description: "Code defects needing resolution"
    priority_weight: 8
    examples: ["FIXME: Handle null pointer", "BUG: Memory leak in parser"]
    
  Feature_Implementation:
    description: "Missing functionality or enhancements"
    priority_weight: 6
    examples: ["TODO: Add user authentication", "TODO: Implement search feature"]
    
  Performance_Optimization:
    description: "Code that needs optimization"
    priority_weight: 7
    examples: ["OPTIMIZE: Database query", "PERF: Reduce memory usage"]
    
  Code_Refactoring:
    description: "Code cleanup and restructuring"
    priority_weight: 4
    examples: ["REFACTOR: Extract common logic", "CLEANUP: Remove dead code"]
    
  Technical_Debt:
    description: "Architectural improvements needed"
    priority_weight: 5
    examples: ["DEBT: Replace deprecated API", "REVIEW: Legacy code patterns"]
    
  Documentation:
    description: "Missing or outdated documentation"
    priority_weight: 3
    examples: ["DOC: Add API documentation", "NOTE: Explain complex algorithm"]
    
  Security:
    description: "Security-related improvements"
    priority_weight: 9
    examples: ["SECURITY: Add input validation", "TODO: Implement rate limiting"]
    
  Testing:
    description: "Missing or inadequate tests"
    priority_weight: 6
    examples: ["TEST: Add unit tests", "TODO: Integration test coverage"]
    
  Configuration:
    description: "Configuration and deployment tasks"
    priority_weight: 5
    examples: ["CONFIG: Environment variables", "DEPLOY: Production settings"]
```

**Complexity Assessment**
```python
def assess_complexity(todo_item):
    complexity_indicators = {
        "Simple": [
            "add comment", "update documentation", "fix typo",
            "change variable name", "add validation"
        ],
        "Medium": [
            "refactor method", "add feature", "optimize query",
            "implement interface", "add tests"
        ],
        "Complex": [
            "redesign architecture", "migrate database", "security overhaul",
            "performance rewrite", "integration with external system"
        ]
    }
    
    # Analyze TODO text for complexity indicators
    # Consider file size, dependencies, and scope
    # Return complexity level with reasoning
```

### 3. Priority Scoring Algorithm

**Multi-Factor Priority Score**
```python
def calculate_priority_score(todo_item):
    """
    Calculate priority score from 1-100 based on multiple factors
    """
    base_score = category_weights[todo_item.category]
    
    # Urgency multipliers
    urgency_bonus = 0
    if any(keyword in todo_item.description.lower() 
           for keyword in ["critical", "urgent", "asap", "blocker"]):
        urgency_bonus += 30
    if any(keyword in todo_item.description.lower() 
           for keyword in ["high priority", "important", "must fix"]):
        urgency_bonus += 20
        
    # Impact multipliers  
    impact_bonus = 0
    if any(keyword in todo_item.description.lower()
           for keyword in ["security", "data loss", "crash", "error"]):
        impact_bonus += 25
    if any(keyword in todo_item.description.lower()
           for keyword in ["performance", "slow", "bottleneck"]):
        impact_bonus += 15
    if any(keyword in todo_item.description.lower()
           for keyword in ["user-facing", "customer", "ui", "ux"]):
        impact_bonus += 10
        
    # Age penalty (older TODOs might be less relevant)
    age_penalty = 0
    if todo_item.age_in_days > 365:
        age_penalty = -10
    elif todo_item.age_in_days > 180:
        age_penalty = -5
        
    # Complexity adjustment
    complexity_modifier = {
        "Simple": 1.2,    # Prefer quick wins
        "Medium": 1.0,
        "Complex": 0.8    # Complex items need more planning
    }
    
    # Location importance (critical files get higher priority)
    location_bonus = 0
    critical_paths = ["auth", "payment", "security", "core", "main"]
    if any(path in todo_item.file_path.lower() for path in critical_paths):
        location_bonus += 15
        
    final_score = (base_score + urgency_bonus + impact_bonus + location_bonus + age_penalty) * complexity_modifier[todo_item.complexity]
    
    return min(100, max(1, int(final_score)))
```

### 4. TODO Dashboard and Metrics

**Summary Statistics**
```yaml
TODO_Dashboard:
  total_items: 127
  
  by_category:
    Bug_Fixes: 23 (18%)
    Feature_Implementation: 35 (28%)
    Performance_Optimization: 12 (9%)
    Code_Refactoring: 28 (22%)
    Technical_Debt: 15 (12%)
    Documentation: 8 (6%)
    Security: 4 (3%)
    Testing: 2 (2%)
    
  by_priority:
    Critical (90-100): 8 items
    High (70-89): 25 items  
    Medium (50-69): 45 items
    Low (1-49): 49 items
    
  by_complexity:
    Simple: 67 items (53%)
    Medium: 42 items (33%)
    Complex: 18 items (14%)
    
  by_age:
    New (0-30 days): 23 items
    Recent (31-90 days): 34 items
    Aging (91-180 days): 28 items
    Stale (181+ days): 42 items
    
  hotspot_files:
    - src/core/payment.js: 12 TODOs
    - app/models/user.py: 8 TODOs
    - config/database.yml: 6 TODOs
```

**Trend Analysis**
```python
todo_trends = {
    "creation_rate": "5.2 TODOs per week",
    "completion_rate": "3.8 TODOs per week", 
    "net_growth": "+1.4 TODOs per week",
    "category_trends": {
        "increasing": ["Security", "Performance"],
        "stable": ["Features", "Bugs"],
        "decreasing": ["Documentation"]
    },
    "risk_assessment": "TODO debt is growing faster than resolution"
}
```

### 5. Implementation Roadmap Creation

**Sprint Planning (Quick Wins First)**
```yaml
Sprint_1_Quick_Wins: # 2 weeks
  focus: "High impact, low complexity items"
  capacity: 40 hours
  
  selected_todos:
    - id: "TODO_001"
      description: "Add input validation to login form"
      priority: 85
      effort: 4 hours
      files: ["src/auth/login.js"]
      
    - id: "TODO_015" 
      description: "Fix memory leak in image processor"
      priority: 92
      effort: 6 hours
      files: ["src/media/processor.py"]
      
    - id: "TODO_023"
      description: "Add rate limiting to API endpoints"  
      priority: 88
      effort: 8 hours
      files: ["src/api/middleware.js", "config/api.yml"]
      
  expected_outcomes:
    - 3 critical security issues resolved
    - API stability improved
    - Foundation for Sprint 2 work
```

**Medium-Term Planning (Months 1-3)**
```yaml
Month_1_Feature_Implementation:
  theme: "Complete half-finished features"
  todos_selected: 15
  estimated_effort: 120 hours
  
  major_items:
    - user_dashboard_completion:
        todos: ["TODO_045", "TODO_067", "TODO_089"]
        effort: 35 hours
        dependencies: ["authentication system"]
        
    - search_functionality:
        todos: ["TODO_012", "TODO_034", "TODO_056"] 
        effort: 28 hours
        dependencies: ["database indexing"]
        
Month_2_Technical_Debt:
  theme: "Refactoring and code quality"
  focus: "High-debt files and modules"
  
Month_3_Performance:
  theme: "Optimization and scalability"
  focus: "Performance-related TODOs"
```

**Long-Term Architecture (Months 3-12)**
```yaml
Quarter_2_Architecture:
  theme: "Major refactoring initiatives"
  
  complex_initiatives:
    - microservices_migration:
        related_todos: ["TODO_078", "TODO_098", "TODO_112"]
        effort: 200 hours
        timeline: "3 months"
        dependencies: ["service mesh", "containerization"]
        
    - database_optimization:
        related_todos: ["TODO_033", "TODO_087", "TODO_101"] 
        effort: 150 hours
        timeline: "2 months"
        dependencies: ["query analysis", "index redesign"]
```

### 6. Detailed Implementation Plans

For each selected TODO, create comprehensive implementation plans:

**Implementation Template**
```yaml
TODO_Implementation_Plan:
  id: "TODO_045"
  title: "Implement user dashboard with activity feed"
  
  analysis:
    current_state: "Dashboard exists but shows only basic user info"
    desired_state: "Rich dashboard with activity feed, notifications, settings"
    gap_analysis: "Missing: activity tracking, notification system, user preferences"
    
  technical_approach:
    components_needed:
      - ActivityTracker: "Log user actions to database"
      - FeedGenerator: "Create personalized activity feed"
      - NotificationService: "Handle real-time notifications"
      - UserPreferences: "Manage dashboard customization"
      
    data_model_changes:
      - activities_table: "Store user activity events"
      - user_preferences_table: "Store dashboard settings"
      - notifications_table: "Queue user notifications"
      
    api_endpoints:
      - GET /api/user/activities: "Fetch activity feed"
      - POST /api/user/preferences: "Update dashboard settings"
      - GET /api/user/notifications: "Get user notifications"
      
  implementation_phases:
    phase_1_foundation: # Week 1
      tasks:
        - Create database migrations for new tables
        - Implement basic ActivityTracker service
        - Add activity logging to key user actions
      effort: 16 hours
      deliverables: ["Database schema", "Activity logging"]
      
    phase_2_feed_generation: # Week 2  
      tasks:
        - Implement FeedGenerator with pagination
        - Create API endpoints for activity retrieval
        - Add basic feed UI components
      effort: 20 hours
      deliverables: ["Activity feed API", "Basic UI"]
      
    phase_3_enhancements: # Week 3
      tasks:
        - Add notification system
        - Implement user preferences
        - Create dashboard customization UI
      effort: 24 hours
      deliverables: ["Notifications", "Customization"]
      
    phase_4_polish: # Week 4
      tasks:
        - Add comprehensive tests
        - Performance optimization
        - UI/UX improvements
      effort: 16 hours
      deliverables: ["Tests", "Performance", "Polish"]
      
  testing_strategy:
    unit_tests:
      - ActivityTracker.log_activity()
      - FeedGenerator.generate_feed() 
      - UserPreferences.update_settings()
      
    integration_tests:
      - User action → Activity logged → Feed updated
      - Preference change → Dashboard updated
      - Notification sent → User sees notification
      
    e2e_tests:
      - Complete user dashboard workflow
      - Dashboard customization flow
      - Activity feed pagination
      
  risk_mitigation:
    performance_risks:
      - risk: "Activity feed queries become slow"
      - mitigation: "Implement pagination, database indexing"
      
    data_risks:
      - risk: "Activity data grows too large"
      - mitigation: "Implement data retention policy"
      
    ui_risks:
      - risk: "Dashboard becomes cluttered"
      - mitigation: "User testing, progressive disclosure"
      
  success_criteria:
    functional:
      - User can view last 50 activities
      - Dashboard loads in <2 seconds
      - Notifications work in real-time
      - Settings persist across sessions
      
    technical:
      - 90%+ test coverage
      - No performance degradation
      - Follows existing code patterns
      - Proper error handling
      
  dependencies:
    internal:
      - User authentication system
      - Existing database connection
      - Frontend component library
      
    external:
      - None identified
      
  rollback_plan:
    - Feature flag to disable new dashboard
    - Database migration rollback scripts
    - Fallback to original dashboard UI
```

### 7. Automated TODO Management

**Git Hooks Integration**
```bash
#!/bin/bash
# pre-commit-todo-check.sh

echo "Checking for new TODOs..."

# Find new TODOs in staged files
NEW_TODOS=$(git diff --cached --diff-filter=A -U0 | grep -E "^\+.*TODO|FIXME|HACK" || true)

if [ ! -z "$NEW_TODOS" ]; then
    echo "New TODOs detected:"
    echo "$NEW_TODOS"
    echo ""
    echo "Please ensure new TODOs include:"
    echo "1. Clear description of what needs to be done"
    echo "2. Your name/initials"
    echo "3. Target date or priority level"
    echo "4. Link to related issue/ticket if applicable"
    echo ""
    echo "Good format: // TODO [John,2024-09-15,High]: Add input validation for user email"
    echo ""
    
    read -p "Continue with commit? (y/n): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi
```

**TODO Tracking Integration**
```python
# todo_tracker.py
class TODOTracker:
    def __init__(self):
        self.jira_client = JiraClient()
        self.slack_client = SlackClient()
        
    def create_tickets_for_critical_todos(self):
        """Convert high-priority TODOs to JIRA tickets"""
        critical_todos = self.find_todos(priority_threshold=80)
        
        for todo in critical_todos:
            if not self.has_existing_ticket(todo):
                ticket = self.jira_client.create_issue(
                    project="TECH-DEBT",
                    summary=f"TODO: {todo.description}",
                    description=f"""
                    File: {todo.file_path}:{todo.line_number}
                    Priority Score: {todo.priority_score}
                    Category: {todo.category}
                    Estimated Effort: {todo.estimated_hours}h
                    
                    Context:
                    {todo.context}
                    """,
                    priority="High" if todo.priority_score > 90 else "Medium"
                )
                
                # Link TODO comment to ticket
                self.add_ticket_reference(todo, ticket.key)
                
    def weekly_todo_report(self):
        """Generate weekly TODO status report"""
        stats = self.generate_statistics()
        
        report = f"""
        📋 Weekly TODO Report
        
        📊 Summary:
        • Total TODOs: {stats.total}
        • New this week: {stats.new_count} 
        • Completed: {stats.completed_count}
        • Critical items: {stats.critical_count}
        
        🔥 Top Priority Items:
        {self.format_priority_list(stats.top_10)}
        
        📈 Trends:
        • TODO growth rate: {stats.growth_rate}
        • Average age: {stats.average_age} days
        • Hotspot files: {stats.hotspot_files}
        """
        
        self.slack_client.send_to_channel("#tech-debt", report)
```

### 8. TODO Quality Standards

**TODO Formatting Standards**
```python
# Good TODO examples
"""
// TODO [Alice,2024-10-01,High]: Implement OAuth2 authentication
//   - Add JWT token validation
//   - Create refresh token mechanism  
//   - Handle token expiration gracefully
//   - Related: JIRA-1234

# FIXME [Bob,2024-09-15,Critical]: Fix memory leak in image processing
#   - Issue: Processed images not released from memory
#   - Impact: Server crashes after ~1000 images
#   - Workaround: Restart service nightly
#   - Related: GitHub Issue #456

/* OPTIMIZE [Carol,2024-09-20,Medium]: Improve database query performance
 * Current: 2.5s average response time
 * Target: <500ms response time
 * Approach: Add composite index on (user_id, created_at)
 * Related: Performance ticket PERF-789
 */
"""

# TODO Quality Checklist
TODO_QUALITY_CRITERIA = {
    "has_owner": "TODO includes responsible person",
    "has_date": "TODO includes target date or timestamp", 
    "has_priority": "TODO includes priority level",
    "has_description": "Clear description of what needs to be done",
    "has_context": "Explains why this TODO exists",
    "has_acceptance_criteria": "Defines what 'done' looks like",
    "has_related_links": "Links to issues, docs, or related code",
    "follows_format": "Matches team TODO format standards"
}
```

### 9. Continuous TODO Monitoring

**Automated Monitoring Dashboard**
```yaml
TODO_Monitoring:
  daily_checks:
    - scan_for_new_todos: "Identify TODOs added in last 24h"
    - check_overdue_todos: "Find TODOs past target dates"
    - update_priority_scores: "Recalculate based on latest context"
    
  weekly_analysis:
    - trend_analysis: "Growth/decline patterns"
    - hotspot_identification: "Files with most TODOs"
    - category_distribution: "Balance of TODO types"
    - team_workload: "TODOs per team member"
    
  monthly_review:
    - stale_todo_cleanup: "Archive TODOs >6 months old"
    - priority_recalibration: "Adjust priority algorithm"
    - process_improvement: "Refine TODO management process"
    
  alerts:
    - critical_todo_added: "Immediate Slack notification"
    - todo_debt_threshold: "Alert when >100 TODOs exist"
    - overdue_todos: "Daily reminder for overdue items"
```

## Output Format

Provide a comprehensive analysis structured as:

1. **TODO Discovery Report**: Complete inventory with file locations and categorization
2. **Priority Matrix**: All TODOs ranked by calculated priority score with reasoning
3. **Implementation Roadmap**: Quarter-by-quarter plan with sprint breakdowns
4. **Quick Wins List**: Top 10 items that can be completed in next 2 weeks
5. **Detailed Plans**: Complete implementation plans for top 5 priority items
6. **Process Recommendations**: Automated TODO management and quality standards
7. **Metrics Dashboard**: Current state and trend analysis
8. **Risk Assessment**: Technical and project risks from existing TODO debt

Focus on transforming scattered TODOs into a structured, actionable development roadmap that improves code quality and reduces technical debt systematically.