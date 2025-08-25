Perform comprehensive codebase analysis using orchestrator with specialized agents for complete coverage:

[Extended thinking: This workflow provides exhaustive codebase analysis by orchestrating multiple specialized agents to examine every aspect of the codebase. The orchestrator coordinates parallel and sequential analysis streams to deliver a comprehensive report covering quality, standards, implementation gaps, and improvement recommendations.]

Execute orchestrated analysis using Task tool with specialized agent teams:

## 🎯 Comprehensive Analysis Orchestration

Use Task tool with subagent_type="orchestrator"
Prompt: "Orchestrate comprehensive codebase analysis for: $ARGUMENTS. Coordinate specialized agents to analyze every line of code, assess quality standards, identify gaps between plans and implementation, evaluate best practices compliance, and generate actionable improvement plans. Provide complete coverage analysis including:"

### Primary Analysis Streams (Parallel Execution):

#### 1. **Code Quality & Standards Assessment**
- Line-by-line code review across all files
- Best practices compliance evaluation  
- Code complexity and maintainability analysis
- Design patterns and architectural adherence
- Documentation completeness assessment

#### 2. **Technical Architecture Review**
- System architecture evaluation
- Component relationships and dependencies
- Scalability and performance patterns
- Technology stack optimization
- Integration points analysis

#### 3. **Security & Compliance Audit**
- Security vulnerability assessment
- Compliance with security standards
- Authentication and authorization review
- Data protection and privacy evaluation
- Dependency security analysis

#### 4. **Performance & Optimization Analysis**
- Performance bottleneck identification
- Resource utilization assessment
- Database query optimization opportunities
- Caching strategy evaluation
- Load testing and scalability analysis

#### 5. **Testing & Quality Assurance Review**
- Test coverage analysis (line-by-line)
- Test quality and effectiveness assessment
- Edge case coverage evaluation
- Integration and end-to-end testing gaps
- Automated testing pipeline assessment

#### 6. **Documentation & Knowledge Management**
- Documentation completeness and accuracy
- Code comments and inline documentation
- API documentation assessment
- Onboarding and setup documentation
- Technical debt documentation

### Secondary Analysis Streams (Sequential Dependencies):

#### 7. **Plan vs Implementation Gap Analysis**
- Compare existing documentation against implementation
- Identify features planned but not implemented
- Assess implementation deviations from design
- Evaluate architectural decisions vs plans
- Document specification compliance

#### 8. **Best Practices Gap Analysis**
- Industry standard compliance assessment
- Framework-specific best practices evaluation
- Code organization and structure review
- Naming conventions and consistency
- Error handling and logging standards

#### 9. **Development Workflow Assessment**
- Git workflow and branching strategy
- CI/CD pipeline effectiveness
- Code review process evaluation
- Deployment and release management
- Development environment setup

#### 10. **Technical Debt & Maintenance Analysis**
- Technical debt identification and prioritization
- Legacy code modernization opportunities
- Dependency updates and maintenance needs
- Performance optimization opportunities
- Refactoring recommendations

## 📊 Comprehensive Report Structure

Orchestrator will coordinate all agents to produce a unified report including:

### Executive Summary
- **Overall Health Score** (1-100): Weighted composite of all analysis areas
- **Critical Issues Count**: Security, functionality, architectural flaws requiring immediate attention
- **Risk Assessment**: High/Medium/Low risk categorization with business impact
- **Compliance Status**: Standards adherence and regulatory compliance

### Detailed Analysis Sections

#### A. Code Quality Metrics
- **Lines of Code Analysis**: Total lines, file-by-file breakdown, compliance with 200-line rule
- **Code Complexity Scores**: Cyclomatic complexity, maintainability index
- **Code Duplication**: Duplicate code identification and consolidation opportunities
- **Technical Debt Score**: Quantified technical debt with remediation effort estimates

#### B. Architecture & Design Assessment
- **Architectural Patterns**: Current patterns vs recommended patterns
- **Component Coupling**: Tight coupling identification and decoupling recommendations
- **Design Principles**: SOLID principles compliance assessment
- **Scalability Analysis**: Current limits and scaling recommendations

#### C. Security & Compliance Report
- **Vulnerability Assessment**: Security issues with CVSS scores and remediation steps
- **Compliance Gaps**: OWASP, industry standards, regulatory requirement gaps
- **Authentication/Authorization**: Security model evaluation and improvements
- **Data Protection**: Privacy and data handling compliance

#### D. Performance Analysis
- **Performance Bottlenecks**: Identified performance issues with impact assessment
- **Resource Optimization**: Memory, CPU, database optimization opportunities
- **Caching Opportunities**: Caching strategy improvements
- **Scalability Constraints**: Current limitations and scaling path recommendations

#### E. Testing & Quality Report
- **Coverage Analysis**: Line-by-line test coverage with gap identification
- **Test Quality Assessment**: Test effectiveness and maintainability scores
- **Testing Strategy**: Current strategy vs recommended improvements
- **Quality Metrics**: Bug density, defect trends, quality gates

#### F. Documentation Assessment
- **Documentation Coverage**: Completeness scoring for all documentation types
- **Documentation Quality**: Accuracy, clarity, and usefulness assessment
- **Knowledge Gaps**: Missing documentation identification
- **Maintenance Needs**: Outdated documentation requiring updates

### Gap Analysis & Recommendations

#### G. Plan vs Implementation Gaps
- **Feature Gaps**: Planned features not implemented
- **Implementation Deviations**: Code that deviates from specifications
- **Architectural Misalignment**: Design vs implementation differences
- **Specification Compliance**: Requirements traceability analysis

#### H. Best Practices Gaps
- **Standards Compliance**: Industry and framework-specific standard gaps
- **Code Organization**: Structure and organization improvement opportunities
- **Workflow Improvements**: Development process enhancement recommendations
- **Tool Optimization**: Development tool and automation opportunities

### Prioritized Improvement Plans

#### I. Critical Priority (Must Fix Immediately)
- Security vulnerabilities requiring immediate attention
- System stability and reliability issues
- Compliance violations with legal/regulatory impact
- Performance issues affecting user experience

#### J. High Priority (Fix Within Sprint)
- Code quality issues affecting maintainability
- Moderate security concerns
- Performance optimization opportunities
- Important testing gaps

#### K. Medium Priority (Fix Within Quarter)
- Technical debt reduction opportunities
- Documentation improvements
- Code organization enhancements
- Process optimization recommendations

#### L. Low Priority (Consider for Future)
- Nice-to-have improvements
- Advanced optimization opportunities
- Future technology upgrades
- Enhanced development workflow features

### Implementation Roadmap

#### M. Suggested Implementation Sequence
1. **Phase 1 (Immediate)**: Critical security and stability fixes
2. **Phase 2 (Short-term)**: Quality and performance improvements
3. **Phase 3 (Medium-term)**: Technical debt reduction and optimization
4. **Phase 4 (Long-term)**: Strategic improvements and modernization

#### N. Resource Requirements
- **Developer Hours**: Estimated effort for each improvement category
- **Skill Requirements**: Specialized skills needed for implementation
- **Tool/Infrastructure Needs**: Additional tools or infrastructure required
- **Timeline Estimates**: Realistic timelines for each improvement phase

### Success Metrics & Monitoring

#### O. Key Performance Indicators
- **Quality Metrics**: Code quality improvement targets
- **Performance Metrics**: Performance improvement benchmarks
- **Security Metrics**: Security posture improvement goals
- **Maintainability Metrics**: Technical debt reduction targets

#### P. Monitoring & Tracking
- **Progress Tracking**: How to monitor improvement implementation
- **Quality Gates**: Checkpoints to ensure improvements meet standards
- **Regression Prevention**: Strategies to prevent quality regression
- **Continuous Improvement**: Ongoing analysis and improvement processes

Target: $ARGUMENTS

## Post-Analysis Actions

After orchestrator completes the comprehensive analysis:

1. **Validation Review**: Use code-reviewer agent to validate critical findings
2. **Implementation Planning**: Use project-orchestrator to create detailed implementation plans
3. **Risk Assessment**: Use security-auditor to validate security findings
4. **Performance Validation**: Use performance-engineer to confirm optimization opportunities
5. **Documentation Updates**: Update project documentation with findings and recommendations