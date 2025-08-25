# Centralized Scripts and Documentation Management

This document describes how to manage bash scripts and documentation centrally across all Claude Code projects using the unified management system.

## Overview

Claude Code now provides centralized management for two critical project components:

1. **Scripts Library** (`~/.claude/scripts-library.json`) - Bash scripts for development, deployment, testing, and maintenance
2. **Documentation Library** (`~/.claude/docs-library.json`) - Standardized documentation templates and guides

This ensures consistency, reduces duplication, and maintains quality standards across all projects.

## Scripts Library Management

### Configuration Structure

The scripts library includes:
- **Categories**: development, deployment, testing, security, database, utilities, git
- **Priority Levels**: critical (must have), high (recommended), medium (specialized)
- **Presets**: pre-configured script sets for different project types
- **Templates**: Base templates for creating new scripts

### Available Script Categories

#### Development Scripts
- **file-compliance-checker**: Ensures all code files are under 200 lines
- **setup-project**: Initializes new projects with standard structure
- **code-formatter**: Formats code according to project standards

#### Deployment Scripts
- **deploy-functions**: Firebase functions deployment with error handling
- **strategic-deploy**: Strategic deployment with health checks
- **rollback-deployment**: Rollback to previous deployment version

#### Testing Scripts
- **run-tests**: Comprehensive test suite with coverage reporting
- **e2e-tests**: End-to-end testing with browser automation
- **performance-tests**: Performance and load testing

#### Security Scripts
- **security-scan**: Comprehensive security codebase scanning
- **audit-dependencies**: Dependency vulnerability auditing

#### Database Scripts
- **migrate-database**: Database migrations with backup/verification
- **seed-database**: Database seeding for different environments

#### Utility Scripts
- **cleanup-project**: Clean temporary files and build artifacts
- **backup-project**: Create comprehensive project backups

#### Git Scripts
- **git-hooks-setup**: Set up Git hooks for quality and consistency
- **branch-cleanup**: Clean up merged and stale branches

### Script Presets

#### Minimal (3 scripts)
Essential scripts for basic project functionality:
- file-compliance-checker, run-tests, security-scan

#### Frontend Project (8 scripts)
Complete frontend development workflow:
- file-compliance-checker, setup-project, code-formatter, run-tests, e2e-tests, deploy-functions, security-scan, git-hooks-setup

#### Backend Project (10 scripts)
Backend development with database management:
- All frontend scripts plus migrate-database, seed-database, audit-dependencies

#### Fullstack Project (14 scripts)
Complete full-stack development suite:
- All backend scripts plus performance-tests, strategic-deploy, cleanup-project

#### Enterprise (17 scripts)
Enterprise-grade script set with all capabilities:
- All fullstack scripts plus rollback-deployment, backup-project, branch-cleanup

#### CI/CD (6 scripts)
Scripts optimized for continuous integration:
- file-compliance-checker, run-tests, security-scan, deploy-functions, migrate-database, rollback-deployment

### Scripts Management Commands

```bash
# List available presets
~/.claude/scripts/scripts-manager.sh list-presets

# List script categories
~/.claude/scripts/scripts-manager.sh list-categories

# List all scripts
~/.claude/scripts/scripts-manager.sh list-scripts

# Show specific preset
~/.claude/scripts/scripts-manager.sh show-preset fullstack-project

# Show script details
~/.claude/scripts/scripts-manager.sh show-script file-compliance-checker

# Deploy preset to project
~/.claude/scripts/scripts-manager.sh deploy-preset enterprise ./my-project

# Create scripts directory structure
~/.claude/scripts/scripts-manager.sh create-structure
```

## Documentation Library Management

### Configuration Structure

The documentation library includes:
- **Categories**: project-management, architecture, development, deployment, security, operations, user-documentation
- **Priority Levels**: critical (required), high (recommended), medium (specialized)
- **Presets**: pre-configured documentation sets for different project types
- **Standards**: Markdown formatting, diagram standards, and versioning requirements

### Available Documentation Categories

#### Project Management
- **readme-template**: Comprehensive README with all standard sections
- **contributing-guide**: Standard contributing guidelines
- **changelog-template**: Structured changelog following Keep a Changelog format
- **project-charter**: Project scope and objectives definition

#### Architecture
- **system-design**: System architecture documentation template
- **api-design**: API design patterns and standards
- **database-schema**: Database design and relationships documentation
- **security-architecture**: Security design and threat modeling

#### Development
- **coding-standards**: Code style guide for multiple languages
- **development-setup**: Development environment setup instructions
- **testing-strategy**: Comprehensive testing approach and guidelines
- **code-review-guide**: Code review process and checklist

#### Deployment
- **deployment-guide**: Deployment procedures and environment management
- **infrastructure-as-code**: Infrastructure documentation and IaC practices
- **monitoring-guide**: Monitoring, logging, and observability setup

#### Security
- **security-guide**: Security best practices and implementation guide
- **privacy-policy**: Privacy policy template and data protection guidelines

#### Operations
- **runbook**: Operational procedures and troubleshooting guide
- **disaster-recovery**: Disaster recovery and business continuity plan

#### User Documentation
- **user-guide**: End-user documentation and tutorials
- **api-documentation**: API reference and integration guide

### Documentation Presets

#### Minimal (4 documents)
Essential documentation for basic projects:
- readme-template, contributing-guide, coding-standards, testing-strategy

#### Startup (8 documents)
Documentation for startup and small projects:
- All minimal plus system-design, development-setup, deployment-guide, security-guide

#### Enterprise (22 documents)
Complete enterprise-grade documentation set:
- All categories with comprehensive coverage including compliance and operations

#### Open Source (8 documents)
Optimized for open-source projects:
- readme-template, contributing-guide, changelog-template, coding-standards, development-setup, testing-strategy, api-documentation, user-guide

#### SaaS Product (13 documents)
SaaS-focused documentation:
- System design, API documentation, security, privacy, monitoring, and user guides

#### API Service (10 documents)
API service focused documentation:
- Architecture, API design, database schema, security, operations, and API documentation

### Documentation Management Commands

```bash
# List available presets
~/.claude/scripts/docs-manager.sh list-presets

# List documentation categories
~/.claude/scripts/docs-manager.sh list-categories

# List all documents
~/.claude/scripts/docs-manager.sh list-documents

# Show specific preset
~/.claude/scripts/docs-manager.sh show-preset enterprise

# Show document details
~/.claude/scripts/docs-manager.sh show-document readme-template

# Deploy preset to project
~/.claude/scripts/docs-manager.sh deploy-preset startup ./my-project

# Create docs directory structure
~/.claude/scripts/docs-manager.sh create-structure

# Show documentation standards
~/.claude/scripts/docs-manager.sh show-standards
```

## Project Setup Workflow

### For New Projects

1. **Choose appropriate presets** based on project type:
   ```bash
   # Frontend React project
   ~/.claude/scripts/scripts-manager.sh show-preset frontend-project
   ~/.claude/scripts/docs-manager.sh show-preset startup
   
   # Enterprise application
   ~/.claude/scripts/scripts-manager.sh show-preset enterprise
   ~/.claude/scripts/docs-manager.sh show-preset enterprise
   ```

2. **Create directory structures**:
   ```bash
   ~/.claude/scripts/scripts-manager.sh create-structure ./my-project
   ~/.claude/scripts/docs-manager.sh create-structure ./my-project
   ```

3. **Deploy required assets**:
   ```bash
   ~/.claude/scripts/scripts-manager.sh deploy-preset fullstack-project ./my-project
   ~/.claude/scripts/docs-manager.sh deploy-preset startup ./my-project
   ```

4. **Customize for project-specific needs**:
   - Edit scripts with project-specific configurations
   - Customize documentation templates with project details
   - Add project-specific sections to documents

### For Existing Projects

1. **Assess current state**:
   ```bash
   # Check what's missing compared to preset
   ~/.claude/scripts/scripts-manager.sh show-preset fullstack-project
   ~/.claude/scripts/docs-manager.sh show-preset enterprise
   ```

2. **Deploy missing components**:
   ```bash
   # Scripts manager will skip existing files
   ~/.claude/scripts/scripts-manager.sh deploy-preset fullstack-project .
   ~/.claude/scripts/docs-manager.sh deploy-preset enterprise .
   ```

3. **Standardize existing assets**:
   - Compare existing scripts/docs with templates
   - Update to match current standards
   - Ensure all critical components are present

## Best Practices

### Scripts Management
1. **Regular Updates**: Keep scripts synchronized with central library
2. **Customization**: Modify deployed scripts for project-specific needs while maintaining core functionality
3. **Testing**: Test all scripts in development before using in production
4. **Documentation**: Update script documentation when making modifications
5. **Version Control**: Track script changes in project version control

### Documentation Management
1. **Regular Reviews**: Update documentation with each release
2. **Consistency**: Follow established standards for formatting and structure
3. **Completeness**: Ensure all critical documentation exists and is current
4. **Accessibility**: Make documentation easily discoverable and navigable
5. **Maintenance**: Establish regular review cycles for documentation accuracy

### Integration Patterns
1. **CI/CD Integration**: Use CI/CD preset scripts in automated pipelines
2. **Development Workflow**: Integrate scripts into daily development tasks
3. **Quality Gates**: Use scripts as quality gates in deployment processes
4. **Team Onboarding**: Use documentation presets for consistent team onboarding
5. **Knowledge Management**: Maintain documentation as living knowledge base

## Directory Standards

### Scripts Directory Structure
```
scripts/
├── development/          # Development workflow scripts
├── deployment/          # Deployment and release scripts
├── testing/            # Testing and quality assurance
├── database/           # Database management scripts
├── security/           # Security scanning and auditing
├── utilities/          # General utility scripts
├── git/               # Git workflow and automation
└── templates/         # Script templates for new scripts
```

### Documentation Directory Structure
```
docs/
├── architecture/       # System design and architectural decisions
├── development/       # Development guides and standards
├── deployment/        # Deployment and infrastructure documentation
├── security/          # Security policies and procedures
├── operations/        # Operational procedures and runbooks
├── user-guides/       # End-user documentation
├── api/              # API documentation and specifications
└── diagrams/         # Architectural and flow diagrams (Mermaid)
```

## Standards and Compliance

### Script Standards
- **Bash Version**: Compatible with Bash 4.0+
- **Error Handling**: Comprehensive error handling with `set -e`
- **Logging**: Structured logging with color-coded output
- **Parameters**: Documented parameters with validation
- **Exit Codes**: Standard exit codes for automation integration

### Documentation Standards
- **Format**: GitHub Flavored Markdown
- **Naming**: UPPERCASE-WITH-HYPHENS.md for main documents
- **Diagrams**: Mermaid format in docs/diagrams/
- **Versioning**: Git-based versioning with change tracking
- **Review**: Peer review required for all documentation changes

## Troubleshooting

### Common Issues

#### Scripts Manager
- **Missing Scripts**: Check if source scripts exist in central library
- **Permission Errors**: Ensure scripts are executable after deployment
- **Configuration Errors**: Validate JSON syntax in scripts-library.json

#### Documentation Manager  
- **Missing Templates**: Verify central documentation library is complete
- **Structure Issues**: Use create-structure command to fix directory layout
- **Standard Violations**: Use show-standards command to review requirements

### Resolution Steps
1. **Verify Dependencies**: Ensure jq is installed and configuration files exist
2. **Check Paths**: Confirm all path references are correct and accessible
3. **Test Deployments**: Use dry-run options where available to preview changes
4. **Validate Configurations**: Use jq to validate JSON configuration syntax

## Future Enhancements

### Planned Features
- **Auto-sync**: Automatic synchronization with central libraries
- **Template Engine**: Dynamic template generation with project variables
- **Validation**: Automated validation of deployed assets
- **Reporting**: Usage analytics and compliance reporting
- **Integration**: Enhanced integration with MCP servers and subagent system

### Extensibility
- **Custom Categories**: Add project-specific script/documentation categories
- **Custom Presets**: Create organization-specific presets
- **Hook System**: Integration hooks for custom deployment workflows
- **Plugin Architecture**: Support for third-party extensions

---

**The centralized scripts and documentation management system ensures consistent, high-quality project assets across your entire development ecosystem! 📚🔧**