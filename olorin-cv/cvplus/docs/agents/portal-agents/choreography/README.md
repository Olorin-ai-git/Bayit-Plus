# Agent Collaboration Choreography System

## Overview
The choreography system defines structured patterns for multi-agent collaboration, ensuring efficient handoffs, comprehensive coverage, and consistent quality across all development workflows.

## Available Choreographies

### 🎭 [Feature Development Dance](./feature-development-dance.md)
**Purpose**: Systematic new feature implementation
**Participants**: 7 agents (analyst → architect → security → builder → validator → reviewer → documenter)
**Duration**: 4-24 hours depending on complexity
**Best For**: New features, major functionality additions

**Key Benefits**:
- Comprehensive security review upfront
- Systematic quality gates at each step
- Knowledge preservation through documentation
- Clear handoff protocols prevent dropped responsibilities

---

### 🕺 [Bug Hunting Tango](./bug-hunting-tango.md)  
**Purpose**: Systematic bug investigation and resolution
**Participants**: 4-6 agents (investigator → explorer → fixer → validator → reviewer)
**Duration**: 1-8 hours depending on complexity
**Best For**: Bug fixes, incident response, problem solving

**Key Benefits**:
- Thorough root cause analysis
- Prevention of similar future issues
- Regression testing integration
- Learning capture for team knowledge

**Variations**:
- **Performance Bug Tango**: +@performance-optimizer, @database-admin
- **Security Bug Tango**: +@security-specialist, @security-auditor  
- **Infrastructure Bug Tango**: +@devops-troubleshooter, @incident-responder

---

### 💃 [Code Review Waltz](./code-review-waltz.md)
**Purpose**: Comprehensive multi-dimensional code review
**Participants**: 4-6 agents (conductor + security + performance + framework + test + documentation)
**Duration**: 30 minutes - 24 hours depending on scope
**Best For**: All code reviews, especially complex or critical changes

**Key Benefits**:
- Parallel review across multiple quality dimensions
- Specialist expertise for each aspect of code quality
- Systematic quality criteria evaluation
- Knowledge sharing through collaborative review

**Variations**:
- **Quick Waltz**: Minor changes, 2-3 agents, <2 hours
- **Grand Waltz**: Major features, 6+ agents, up to 24 hours
- **Emergency Waltz**: Hotfixes, 3 agents, <1 hour

## Choreography Selection Guide

### By Project Phase
- **Planning**: Feature Development Dance
- **Development**: Feature Development Dance or Bug Hunting Tango
- **Review**: Code Review Waltz
- **Maintenance**: Bug Hunting Tango

### By Urgency
- **P0 (Critical)**: Emergency variants with parallel execution
- **P1 (High)**: Standard choreographies with expedited handoffs
- **P2 (Medium)**: Full choreographies with optional optimizations
- **P3 (Low)**: Can be interrupted for higher priority work

### By Complexity
- **Simple**: Quick variants, fewer participants
- **Medium**: Standard choreographies
- **Complex**: Grand variants, additional specialists

### By Risk Level
- **High Risk**: Full security reviews, additional validation steps
- **Medium Risk**: Standard security checks
- **Low Risk**: Streamlined security validation

## Integration with MCP Systems

### GitHub MCP Integration
- All choreographies integrate with GitHub MCP for live repository operations
- PR management, workflow status tracking, and artifact handling
- Automated branch management and deployment orchestration

### Task Master MCP Integration  
- Project initialization and task breakdown (Feature Development Dance)
- Complexity analysis and dependency management
- Progress tracking and project coordination

### Context7 MCP Integration
- Live documentation access during implementation
- Framework-specific pattern validation
- Current best practices verification

### Basic Memory MCP Integration
- Pattern storage and reuse across projects
- Learning from previous choreography outcomes
- Organizational knowledge building and sharing

## Customization Guidelines

### Adding New Choreographies
1. Define clear purpose and participants
2. Establish handoff triggers and conditions
3. Create quality gates and approval criteria
4. Define success metrics and learning capture
5. Test with representative scenarios

### Modifying Existing Choreographies
1. Document rationale for changes
2. Update success metrics accordingly
3. Validate with affected agent types
4. Update integration points with MCP systems
5. Preserve core quality guarantees

### Context-Specific Adaptations
- **Team Size**: Adjust participant count based on available agents
- **Domain Requirements**: Add compliance or regulatory specialists
- **Technology Stack**: Include relevant framework specialists
- **Organizational Culture**: Adjust formality and communication styles

## Success Metrics

### Quality Metrics
- Code quality scores maintained or improved
- Security vulnerabilities caught before production
- Performance regressions prevented
- Test coverage maintained above thresholds

### Efficiency Metrics  
- Handoff time between agents
- Overall choreography completion time
- Rework cycles and iteration count
- Agent utilization and parallel work effectiveness

### Learning Metrics
- Knowledge transfer effectiveness
- Pattern reuse across projects
- Organizational learning accumulation
- Agent skill development over time

## Best Practices

### Communication
- Clear handoff messages between agents
- Documented decisions and rationale
- Proactive escalation of blocking issues
- Regular status updates for complex choreographies

### Quality Gates
- No agent can proceed without explicit approval from previous agent
- Security concerns are always blocking
- Test failures prevent progression
- Documentation must be complete before final approval

### Learning Integration
- Store successful patterns in Basic Memory MCP
- Analyze failed choreographies for improvement opportunities
- Share insights across similar agent types
- Evolve choreographies based on outcome data

---

*The choreography system transforms individual agent expertise into coordinated team intelligence, ensuring comprehensive coverage and consistent quality across all development activities.*