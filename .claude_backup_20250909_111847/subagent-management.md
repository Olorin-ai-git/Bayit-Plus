# Centralized Subagent Management

This document describes how to manage Claude Code subagents centrally across all projects using the orchestrated agent framework.

## Overview

All Claude Code subagents are centrally managed through `~/.claude/subagents.json`. This provides:
- Consistent subagent definitions across projects
- Predefined presets for different project types
- Systematic choreographies for complex workflows
- Easy discovery and organization of available specialists
- Version control of subagent configurations

## Configuration Structure

### Subagents
Individual agent definitions organized by category:
- **ai-analysis**: AI-powered analysis specialists
- **backend**: Server-side development experts
- **frontend**: Client-side development specialists  
- **universal**: Cross-cutting concerns (security, performance, quality)
- **testing**: Quality assurance specialists
- **orchestration**: Project management and coordination
- **infrastructure**: DevOps and deployment specialists

Each subagent includes:
- **description**: What the agent specializes in
- **category**: Logical grouping
- **expertise**: Specific skills and technologies
- **path**: Location of the agent definition file
- **priority**: Importance level (critical, high, medium)

### Categories
Logical groupings for easy selection:
- **critical**: Essential for all projects
- **frontend**: Frontend development stack
- **backend**: Backend development stack
- **database**: Data management specialists
- **testing**: Quality assurance
- **devops**: Infrastructure and deployment
- **leadership**: Project coordination
- **quality**: Code quality and optimization
- **debugging**: Error detection and resolution

### Presets
Pre-configured teams for common scenarios:
- **minimal**: Basic development (3 agents)
- **frontend-development**: Complete frontend team (5 agents)
- **backend-development**: Complete backend team (6 agents)
- **fullstack-development**: Complete full-stack team (9 agents)
- **enterprise**: Enterprise-grade team with all specialists (13 agents)
- **debugging**: Specialized troubleshooting team (4 agents)
- **rails-stack**: Ruby on Rails focused team (6 agents)
- **python-stack**: Python ecosystem team (6 agents)
- **go-stack**: Go ecosystem team (6 agents)

### Choreographies
Systematic workflows for complex tasks:
- **feature-development-dance**: 7-agent systematic implementation (4-24 hours)
- **bug-hunting-tango**: 4-agent bug investigation (1-8 hours)
- **code-review-waltz**: 6-agent multi-dimensional review (30 min - 2 hours)

## Management Script

Use `~/.claude/scripts/subagent-manager.sh` for easy management:

### Available Commands

```bash
# List all available presets
~/.claude/scripts/subagent-manager.sh list-presets

# List subagent categories
~/.claude/scripts/subagent-manager.sh list-categories

# List all available subagents
~/.claude/scripts/subagent-manager.sh list-agents

# List available choreographies
~/.claude/scripts/subagent-manager.sh list-choreographies

# Show agents in a specific preset
~/.claude/scripts/subagent-manager.sh show-preset fullstack-development

# Verify subagent files exist for a preset
~/.claude/scripts/subagent-manager.sh verify-preset enterprise

# Show choreography details
~/.claude/scripts/subagent-manager.sh show-choreography feature-development-dance
```

## Usage Examples

### For New Projects

1. **Choose appropriate preset based on project type**:
   ```bash
   # Frontend React project
   ~/.claude/scripts/subagent-manager.sh show-preset frontend-development
   
   # Full-stack application
   ~/.claude/scripts/subagent-manager.sh show-preset fullstack-development
   
   # Enterprise application
   ~/.claude/scripts/subagent-manager.sh show-preset enterprise
   ```

2. **Use the agents in your development workflow**:
   ```markdown
   # Direct agent invocation
   @react-expert help me implement a shopping cart component
   @security-specialist review this authentication implementation
   @code-reviewer analyze this pull request
   
   # Choreography invocation
   "implement user authentication system" # Auto-triggers feature-development-dance
   "debug payment processing issue"       # Auto-triggers bug-hunting-tango
   "review this code for production"      # Auto-triggers code-review-waltz
   ```

### For Specialized Workflows

1. **Backend API Development**:
   ```bash
   # Use backend preset
   Agents: @nodejs-expert, @database-architect, @prisma-expert, @security-specialist, @test-automation-expert
   ```

2. **Frontend Feature Implementation**:
   ```bash
   # Use frontend preset  
   Agents: @react-expert, @performance-optimizer, @test-automation-expert, @documentation-specialist
   ```

3. **Production Debugging**:
   ```bash
   # Use debugging preset
   Agents: @error-detective, @performance-optimizer, @security-specialist
   ```

## Available Subagents

### Critical Priority (Always Include)
- **@code-reviewer**: Comprehensive code review and quality assurance
- **@security-specialist**: Security analysis and vulnerability assessment

### High Priority (Recommended)
- **@react-expert**: React development and modern patterns
- **@nodejs-expert**: Node.js backend development and architecture
- **@git-expert**: Git workflow and repository management
- **@documentation-specialist**: Technical documentation and API docs
- **@performance-optimizer**: Performance analysis and optimization
- **@test-automation-expert**: Test automation and quality engineering
- **@tech-lead-orchestrator**: Technical leadership and project coordination
- **@project-analyst**: Project analysis and requirements breakdown
- **@deployment-specialist**: Deployment automation and infrastructure
- **@database-architect**: Database design and architecture

### Medium Priority (Specialized)
- **@vue-expert**: Vue.js development and ecosystem
- **@angular-expert**: Angular framework development
- **@django-expert**: Django framework development
- **@rails-expert**: Ruby on Rails development
- **@fastapi-expert**: FastAPI and async Python patterns
- **@gin-expert**: Gin framework for Go applications
- **@fiber-expert**: Fiber framework for Go applications
- **@laravel-expert**: Laravel framework development

## Choreography Workflows

### Feature Development Dance
**Triggers**: "implement", "build", "create", "add feature", "develop"
**Duration**: 4-24 hours
**Sequence**: Sequential with quality gates

1. **@project-analyst** → Requirements breakdown and scope definition
2. **@tech-lead-orchestrator** → Architecture design and technical planning
3. **@security-specialist** → Security review and threat assessment
4. **Backend Expert** → Implementation (framework-specific)
5. **@test-automation-expert** → Comprehensive test suite development
6. **@code-reviewer** → Quality review and standards compliance
7. **@documentation-specialist** → API documentation and user guides

### Bug Hunting Tango
**Triggers**: "bug", "error", "issue", "broken", "fix", "debug"
**Duration**: 1-8 hours
**Sequence**: Sequential investigation

1. **@error-detective** → Bug analysis and reproduction
2. **@code-reviewer** → Root cause investigation
3. **Backend Expert** → Fix implementation
4. **@test-automation-expert** → Regression prevention

### Code Review Waltz
**Triggers**: "review", "PR", "pull request", "code quality"
**Duration**: 30 minutes - 2 hours
**Sequence**: Parallel review

- **@code-reviewer** → Review coordination (lead)
- **@security-specialist** → Security assessment (parallel)
- **@performance-optimizer** → Performance review (parallel)
- **Framework Expert** → Technical standards (parallel)
- **@test-automation-expert** → Test quality validation
- **@documentation-specialist** → Documentation review

## Best Practices

### Team Selection
1. **Start with presets**: Choose the closest preset and customize if needed
2. **Include critical agents**: Always include @code-reviewer and @security-specialist
3. **Match expertise to stack**: Use framework-specific experts for your technology
4. **Consider project phase**: Different phases need different specialist emphasis

### Workflow Orchestration
1. **Trust the choreographies**: Let systematic workflows run their course
2. **Use quality gates**: Don't skip validation steps in choreographies
3. **Maintain context**: Each agent builds on previous agent work
4. **Document decisions**: Capture architectural and security decisions

### Agent Coordination
1. **Clear handoffs**: Ensure each agent completes their scope before handoff
2. **Preserve context**: Maintain decisions and artifacts between agents
3. **Validate quality**: Use review agents to validate work quality
4. **Close loops**: Ensure all requirements are addressed

## Troubleshooting

### Common Issues

1. **Missing Agent Files**: Verify agents exist using the verification command
   ```bash
   ~/.claude/scripts/subagent-manager.sh verify-preset your-preset
   ```

2. **Incorrect Agent Selection**: Check available agents and their expertise
   ```bash  
   ~/.claude/scripts/subagent-manager.sh list-agents
   ```

3. **Choreography Not Triggering**: Use explicit invocation
   ```markdown
   "Use feature development dance for shopping cart implementation"
   ```

### Agent Path Issues
- **Agent Path**: `~/.local/share/claude-007-agents/.claude/agents/`
- **Configuration**: `~/.claude/subagents.json`
- **Verification**: Use the verify-preset command to check file existence

## Extending the System

### Adding New Agents
1. Create agent definition file in appropriate category directory
2. Update `subagents.json` with agent configuration
3. Add to relevant presets and categories
4. Update choreographies if the agent participates in workflows

### Creating Custom Presets
1. Identify your team's typical agent combination
2. Add preset definition to `subagents.json`
3. Test with verification command
4. Document the preset's intended use case

### Modifying Choreographies
1. Analyze current workflow effectiveness
2. Adjust agent sequence or participation
3. Update duration estimates based on experience
4. Test new choreography flow

## Integration with MCP Servers

The subagent system integrates seamlessly with MCP servers:

- **Task Master MCP**: Project planning and task breakdown
- **Basic Memory MCP**: Historical patterns and organizational learning
- **GitHub MCP**: Repository operations and workflow management
- **Context7 MCP**: Live documentation and framework references

## Advanced Features

### Personality Engine Integration
Each agent can have adaptive personalities that:
- Adjust communication style based on user preferences
- Modify detail level based on project urgency
- Adapt approaches based on success patterns
- Evolve based on feedback and outcomes

### Learning System
The system continuously improves by:
- Tracking success patterns across projects
- Optimizing agent coordination workflows
- Adapting personality traits for better outcomes
- Building organizational knowledge through MCP memory

---

**The centralized subagent system transforms your development workflow into a coordinated intelligence network that automatically applies the right expertise and systematic approaches for optimal outcomes! 🎭**