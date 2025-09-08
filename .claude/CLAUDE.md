# Global Claude Code Execution Standards

## ⚠️ CRITICAL MANDATORY PROHIBITIONS

**🚨💰 YOU ARE NOT ALLOWED TO RUN INVESTIGATIONS IN LIVE MODE WITHOUT EXPLICIT USER APPROVAL!!!!! 💰🚨**

**🚨 YOU ARE NOT ALLOWED TO USE MOCK DATA ANYWHERE IN THE CODEBASE!!!!! 🚨**

**These are ZERO-TOLERANCE rules that apply universally across ALL projects, ALL tasks, and ALL circumstances.**

Apply the following rules **universally and consistently** across ALL coding tasks in ALL projects:

## Core Execution Standards

1. 🚫💰 **ABSOLUTE PROHIBITION: Never run LIVE mode investigations without explicit user approval - EVER!**
   - **ZERO TOLERANCE**: RUNNING LIVE MODE INVESTIGATION COSTS REAL MONEY!
   - **MANDATORY**: Always get explicit written approval before running ANY investigation in LIVE mode.
   - **NO EXCEPTIONS**: This applies to all scripts, tests, debugging, demonstrations, and any other execution.
   - **ENFORCEMENT**: Any unauthorized LIVE mode execution is considered a critical financial violation.
   - **PROHIBITED COMMANDS**: Never run commands with `--mode live`, `USE_SNOWFLAKE=true`, or any LIVE investigation without explicit approval.
   - **ALWAYS USE MOCK MODE**: Default to `--mode mock` or `TEST_MODE=mock` for all testing unless explicitly told otherwise.

2. 🚫 **ABSOLUTE PROHIBITION: Never create mock data or use placeholders - EVER!**
   - **ZERO TOLERANCE**: Do not fabricate data under ANY circumstances.
   - **MANDATORY**: Always request real input data sources or clearly flag missing data as a blocking issue.
   - **NO EXCEPTIONS**: This rule applies to all code, tests, examples, documentation, and any other content.
   - **ENFORCEMENT**: Any violation of this rule is considered a critical failure.

3. 🚨 **CRITICAL PROHIBITION: NEVER DELETE FILES WITHOUT EXPLICIT USER APPROVAL - EVER!**
   - **ZERO TOLERANCE**: Do not delete, remove, or destroy ANY files without explicit user consent.
   - **MANDATORY**: Always ask for manual user approval before deleting ANY file or directory.
   - **NO EXCEPTIONS**: This applies to temporary files, backups, source code, configs, docs, scripts, and ALL file types.
   - **ENFORCEMENT**: Unauthorized file deletion is considered a critical failure and security violation.
   - **PROCESS**: Identify → Ask User → Get Explicit Approval → Then Delete (never skip approval step)
   - **SAFETY**: When in doubt, DO NOT DELETE - ask the user first.

4. 🛑 **MANDATORY PLAN APPROVAL: Never implement ANY plan without explicit user approval - EVER!**
   - **ZERO TOLERANCE**: Do not start implementation before the user has reviewed and approved the plan.
   - **MANDATORY**: Always present the complete plan, get explicit approval, then proceed with implementation.
   - **NO EXCEPTIONS**: This rule applies to all implementations, refactoring, new features, bug fixes, and any code changes.
   - **ENFORCEMENT**: Any implementation without prior plan approval is considered a critical failure.
   - **PROCESS**: Plan → Present → Approval → Implementation (never skip steps)

5. 🔍 **CRITICAL: MANDATORY CODEBASE ANALYSIS BEFORE ANY PLAN CREATION - NEVER SKIP!**
   - **ZERO TOLERANCE**: Before creating ANY design or plan, you MUST scan the codebase to understand what currently exists.
   - **MANDATORY ANALYSIS**: Always check whether some or all of the requested functionality is already implemented.
   - **COMPREHENSIVE SCAN**: Use Read, Glob, Grep, and search tools to examine existing code, components, services, and documentation.
   - **NO EXCEPTIONS**: This applies to ALL planning tasks - new features, refactoring, bug fixes, enhancements, and architectural changes.
   - **ENFORCEMENT**: Creating plans without prior codebase analysis is considered a critical failure and waste of resources.
   - **PROCESS**: Analyze Existing Code → Identify Gaps → Create Plan → Present → Get Approval → Implement
   - **AVOID DUPLICATION**: Prevent recreating existing functionality and ensure plans build upon current implementation.

6. 🧠 **MANDATORY: Always use global subagents for ALL tasks.**
   - **EXCLUSIVELY use subagents from the global collection at `~/.local/share/claude-007-agents/.claude/agents/`**
   - **NEVER use local project subagents** - the global collection is the single source of truth with 158+ specialized subagents
   - Every task (including planning, execution, testing, debugging, etc.) must be handled by an appropriate global subagent
   - Subagents must have clearly defined scopes and responsibilities
   - **Global subagents include comprehensive categories:** 
     - **Core Engineering**: ai-analysis, ai, automation, backend, frontend, infrastructure, engineering
     - **Business & Product**: business, product, project-management, studio-operations, marketing
     - **Quality & Testing**: testing, security, universal
     - **Design & UX**: design
     - **Data & Analytics**: data, database
     - **DevOps & Infrastructure**: devops, infrastructure
     - **Orchestration & Management**: orchestration, orchestrators, personalities, choreography
   - Use the Task tool to invoke subagents with their specific expertise areas

7. 📋 **Always generate a TodoList before you begin.**
   - Include all high-level and granular subtasks necessary for successful task completion.
   - Revisit and update the list as needed during execution.

8. 📊 **Use model OpusPlan (Opus 4.1) for planning and task breakdown.**
   - Invoke OpusPlan to:
     - Generate project plans.
     - Break complex requests into subproblems.
     - Define workflows and dependencies.

   **Use model Sonnet 4.1 for execution.**
   - Execute the individual tasks and subplans using the Sonnet model.
   - Apply Sonnet for code generation, implementation, and testing.

9. ✅ **Every code solution must include a complete and executable test suite.**
   - Test suites must be:
     - Comprehensive (cover edge cases, expected flow, and error handling).
     - Written in the same language as the codebase (e.g., Python → `pytest`, TypeScript → `jest` or `vitest`).
     - Self-contained and reproducible.

10. 🔁 **If any test fails, fix iteratively with a dedicated subagent.**
   - Launch a "TestFixer" subagent with a sole purpose:
     - To analyze, fix, and validate failing tests.
   - This subagent must run iteratively until all tests pass.

11. 🔁 **If there are TypeScript or Python errors (e.g., type-checking, compile-time errors), resolve them iteratively.**
   - Use a dedicated "LintFixer" or "TypeFixer" subagent.
   - Iteratively fix and revalidate until the codebase is error-free and all type checks pass.

12. 🔍 **ALWAYS USE code-reviewer subagent AS A FINAL STEP OF ANY IMPLEMENTATION TASK.**
   - **MANDATORY**: Every implementation task MUST end with code-reviewer subagent review
   - Use code-reviewer immediately after completing any code changes
   - Code-reviewer specializes in configuration security, production safety, and quality assurance
   - Do not consider any implementation task complete until code-reviewer has reviewed it
   - This applies to ALL coding tasks: new features, bug fixes, refactoring, configuration changes
   - **CRITICAL**: Code-reviewer has expertise in detecting risky configuration changes that could cause production outages

13. 🏗️ **AFTER completing a coding task, you MUST build the project and iteratively fix any build errors.**
   - Always run the appropriate build command for the project (e.g., `npm run build`, `poetry run build`, etc.).
   - If build errors occur, use a dedicated "BuildFixer" subagent to resolve them iteratively.
   - Continue until the project builds successfully without errors or warnings.

14. 🔀 **MANDATORY: ALL git operations MUST be handled by the git-expert subagent.**
   - **NEVER perform git operations directly** - Always use the git-expert subagent for ALL git-related tasks.
   - **ALL git commands** including but not limited to: commit, push, pull, merge, rebase, branch, checkout, status, diff, log.
   - **Use Task tool** to invoke git-expert subagent: `Task(subagent_type="git-expert", description="[git operation]", prompt="[detailed request]")`
   - **Git-expert responsibilities**: Proper commit messages, conflict resolution, branch management, repository maintenance.
   - **NO EXCEPTIONS**: This applies to deployment scripts, automation, manual operations, and any other git interactions.

15. ✅ **When creating a document, always place in in an appropriate subfolder under /docs**
   - Before creating a new document, scan the codebase and make sure there are no loose documents not under /docs and that the document you are about to create does not exist already.
   - Every Planning document MUST be accompanied by interactive HTML visualization files with embedded Mermaid diagrams that will be placed under /docs/diagrams/.
   - **HTML VISUALIZATION REQUIREMENTS**: Create comprehensive HTML files with:
     - Professional responsive CSS styling
     - Multiple Mermaid diagrams embedded using mermaid.js CDN
     - Contextual descriptions for each diagram
     - Color-coded sections and feature lists
     - Mobile-responsive design
     - Interactive elements where applicable
 

16. ✅ **When creating a batch script, always place  in an appropriate subfolder under /scripts**
   - Before creating a new batch script, scan the codebase and make sure there are no loose scripts not under /scripts  and that the script you are about to create does npt exist already.

17. ✅**Python environment**: Always use Poetry commands for Python projects. Only Python 3.11 is supported
      - **Never use pip or python directly** - All Python commands must go through Poetry (e.g., `poetry run python`)

18. ✅   **All css must be using Tailwind css** 
      - Do NOT use material ui.   

19. ✅ **All production code files MUST have less than 200 lines of code.**
   - This applies ONLY to our codebase files (exclude node_modules, build artifacts, dist, .git, vendor, etc.).
   - Scan only our production code.
   - After Claude Code starts, run a script that checks all files compliance.
   - If a file exceeds 200 lines you MUST refactor it to comply.
   - **CRITICAL**: Break large files into smaller, focused modules with clear responsibilities.
   - **DO NOT trim comments, documentation, or whitespace** to meet the 200-line limit.
   - **PROPER METHOD**: Use modular architecture and separation of concerns to create self-contained units.
   - Each module should have a single, well-defined purpose and clear interface boundaries.
   - Maintain full documentation and comments while achieving modularity through proper design.

20. ✅ **Use centralized MCP server configuration for all projects.**
   - Reference the centralized MCP servers configuration at `~/.claude/mcp-servers.json`
   - Use appropriate presets based on project needs: 'minimal', 'development', 'data-processing', or 'full'
   - For new projects, copy the required MCP servers from the central configuration to project-specific settings
   - Always check the central configuration for updates to MCP server definitions

21. ✅ **Use centralized subagent configuration for all projects.**
   - Reference the centralized subagent configuration at `~/.claude/subagents.json`
   - Use appropriate presets based on project needs: 'minimal', 'frontend-development', 'backend-development', 'fullstack-development', 'enterprise'
   - Leverage choreographies for systematic workflows: 'feature-development-dance', 'bug-hunting-tango', 'code-review-waltz'
   - All subagents are located at `~/.local/share/claude-007-agents/.claude/agents/`
   - Always check the central configuration for updates to subagent definitions and new presets

22. ✅ **Use centralized scripts library for all projects.**
   - Reference the centralized scripts configuration at `~/.claude/scripts-library.json`
   - Use appropriate presets based on project needs: 'minimal', 'frontend-project', 'backend-project', 'fullstack-project', 'enterprise', 'ci-cd'
   - All scripts are categorized: 'development', 'deployment', 'testing', 'security', 'database', 'utilities', 'git'
   - Copy required scripts to project `/scripts` directory and customize as needed
   - Always check the central configuration for new scripts and updates

23. ✅ **Use centralized documentation library for all projects.**
   - Reference the centralized documentation configuration at `~/.claude/docs-library.json`
   - Use appropriate presets based on project needs: 'minimal', 'startup', 'enterprise', 'open-source', 'saas-product', 'api-service'
   - All documentation follows standard structure under `/docs` directory
   - Include Mermaid diagrams in `/docs/diagrams/` for planning documents
   - Always check the central configuration for documentation standards and templates

24. ✅ **MANDATORY: Run MCP setup script for every new project.**
   - **ALWAYS execute `~/.claude/scripts/mcp-setup.sh install-deps [preset]` when creating or working with a new project**
   - Choose appropriate preset based on project type: 'minimal', 'development', 'data-processing', 'automation', 'design', or 'full'
   - **The script automatically handles both server registration AND dependency installation:**
     - **Step 1**: Registers all MCP servers with Claude Code using `claude mcp add` commands
     - **Step 2**: Installs all required package dependencies via npm
   - MCP servers provide essential capabilities like filesystem access, memory management, code analysis, and context management
   - **This is MANDATORY and MUST NOT be skipped** - MCP servers are required for proper Claude Code functionality
   - **No manual registration required** - The script handles everything automatically

25. 📊 **MANDATORY: Always create a plan with model Opus 4.1 BEFORE writing any code for ANY task.**
   - **NO CODE GENERATION without an existing plan.**
   - Use OpusPlan (Opus 4.1) to create comprehensive execution plans BEFORE any implementation.
   - Plans must include:
     - Task breakdown and dependencies
     - Implementation strategy
     - Testing approach
     - Success criteria
   - **Code must ONLY implement an existing, approved plan.**
   - If a plan needs modification during implementation, pause and update the plan first.
   - **MANDATORY PLAN DOCUMENTATION**: Each plan you create MUST be written to `/docs/plans/` folder with:
     - Timestamp in the filename (YYYY-MM-DD format)
     - "Gil Klainert" listed as the Author
     - Link to accompanying Mermaid diagram in `/docs/diagrams/`
   - **MANDATORY PLAN EXECUTION PROTOCOL**:
     - **FEATURE BRANCH**: ALWAYS create a feature branch BEFORE starting ANY plan implementation using git-expert subagent
     - **PHASE COMMITS**: Commit after EVERY successful phase completion using git-expert subagent
     - **PROGRESS DOCUMENTATION**: Update the plan document with progress status after each phase:
       - Add "✅ COMPLETED" marker to finished phases
       - Add "🔄 IN PROGRESS" marker to current phase
       - Add "⏳ PENDING" marker to upcoming phases
       - Include timestamp and any relevant notes for each phase completion
     - **BRANCH NAMING**: Use format `feature/plan-{YYYY-MM-DD}-{short-description}`
     - **COMMIT MESSAGES**: Reference the plan document in every commit message

26. 🚀 **MANDATORY: Always use deployment subagents for Firebase deployments.**
   - **WHENEVER user requests deployment to Firebase, use the firebase-deployment-specialist subagent**
   - The subagent has expertise in the Intelligent Firebase Deployment System with:
     - Advanced error handling and recovery (24 recovery strategies)
     - Quota management and intelligent batching
     - Comprehensive health checking (10 validation categories)
     - Firebase Secrets integration and validation
     - 100% deployment success rate through automated recovery
   - **Use Task tool with firebase-deployment-specialist for all Firebase deployment workflows:**
     - **Git operations**: MUST be delegated to git-expert subagent (add, commit, push)
     - Pre-deployment validation with TypeScript and environment checks
     - Intelligent deployment with batching and error recovery
     - Post-deployment health checks and comprehensive reporting
   - **Available at**: `~/.local/share/claude-007-agents/.claude/agents/devops/firebase-deployment-specialist.md`
   - **Deployment modes**: full, quick, test, batch-only, report-only
   - **Project expertise**: Specialized for CVPlus with 127+ Firebase Functions

27. 🎛️ **MANDATORY: Orchestrator Task Flow Control for Coding Plans and Designs.**
   - **When implementing any coding plan or design, the control of the task flow MUST remain with the orchestrator subagent**
   - **Orchestrator subagent responsibilities:**
     - **MANDATORY SUBAGENT TEAM SELECTION**: Review all available subagents .md files and decide which subagent team will be used to execute the plan
     - Assign each subtask to the appropriate specialist subagent
     - Monitor subtask completion and maintain overall project control
     - Verify each subtask completion using debugger subagent and other validation subagents
     - Enforce quality gates before accepting subtask completion
     - Coordinate handovers between specialist subagents
   - **Specialist subagent responsibilities:**
     - Execute assigned subtasks within their domain expertise
     - Complete subtasks fully before handing control back to orchestrator
     - Provide detailed completion status and deliverables to orchestrator
     - Follow orchestrator instructions for scope and requirements
   - **Task flow protocol:**
     1. Orchestrator assigns subtask to specialist subagent
     2. Specialist subagent completes subtask in full
     3. Specialist hands control back to orchestrator
     4. Orchestrator MUST verify subtask completion using debugger/validation subagents
     5. If subtask is unsatisfactory, orchestrator hands it back to relevant subagent for improvements/fixes
     6. Process repeats until orchestrator determines subtask is fully completed
     7. Only after full completion, orchestrator assigns next subtask to next relevant subagent
     8. Continue until ALL subtasks are fully completed
   - **Quality verification requirements:**
     - Use debugger subagent to validate technical implementation
     - Use test-writer-fixer subagent to verify test coverage and execution
     - Use appropriate validation subagents based on subtask type (frontend-coverage-engineer, backend-test-engineer, etc.)
     - Orchestrator has final approval authority for subtask completion
   - **No parallel subtask execution** - One subtask must be fully completed before starting the next

## Mandatory Execution Lifecycle

⚠️ **Do not shortcut these instructions**. Always adhere to this full lifecycle:
0. **FIRST: Run MCP setup script** - Execute `~/.claude/scripts/mcp-setup.sh install-deps [preset]` for new projects.
0.1. **MANDATORY: Read all documentation for project context** - Read ALL content in `/docs` folder and subfolders to understand current project status, architecture, plans, and implementation details before starting any work.
1. Run file compliance check script (ensure all files < 200 lines).
2. **MANDATORY: Create comprehensive plan with OpusPlan (Opus 4.1) BEFORE any code implementation.**
3. Generate a TodoList based on the plan.
4. Assign tasks to subagents.
5. Execute with Sonnet (implementing ONLY the approved plan).
6. Test thoroughly.
7. Fix iteratively.
8. Build the project and fix any build errors.
9. **MANDATORY: Use code-reviewer subagent as final step of ANY implementation task.**
10. **For Firebase deployments: ALWAYS use firebase-deployment-specialist subagent with the Intelligent Firebase Deployment System.**

## Additional Standards

- 🚨 **CRITICAL: Never delete ANY files without explicit user approval - this is a security violation**
- Never create files unless absolutely necessary for achieving your goal.
- Always prefer editing existing files to creating new ones.
- Never proactively create documentation files (*.md) or README files unless explicitly requested.
- Do what has been asked; nothing more, nothing less.

## Development Tips

### When Starting a New Project
1. **IMMEDIATE FIRST STEP**: Run `~/.claude/scripts/mcp-setup.sh install-deps [preset]`
   - **This single command does EVERYTHING automatically:**
     - Registers ALL MCP servers with Claude Code (`claude mcp add` for each server)
     - Installs ALL required npm packages globally
     - Handles error cases gracefully
   - Choose preset based on project type:
     - `development` - Full dev environment (recommended for most projects)
     - `minimal` - Basic functionality only
     - `data-processing` - Data analysis projects
     - `automation` - Browser automation projects  
     - `design` - Design workflow projects
     - `full` - All available servers
2. **MANDATORY: Read ALL documentation for context** - Read EVERY file in `/docs` folder and ALL subfolders to understand:
   - Current project status and completed work
   - Architecture decisions and design patterns
   - Implementation plans and roadmaps
   - Known issues and their resolutions
   - Feature specifications and requirements
   - Use Read tool to examine EVERY .md file in /docs recursively
3. Verify MCP servers are registered: `claude mcp list`
4. Index the codebase if using claude-context MCP server
5. **No manual registration needed** - everything is automated!

### When Adding New Features
1. Check existing patterns in similar components/modules
2. Use available Claude Code subagents (e.g., @rails-backend-expert, @react-expert) for specialized guidance
3. Ensure proper TypeScript types and Python type hints
4. Add comprehensive tests (unit and integration)
5. Update API documentation if adding endpoints
6. Checkout A feature branch for implementation

### When Debugging
1. Use structured logging with appropriate levels
2. Check WebSocket event logs for investigation issues
3. Verify sandbox authorization for API calls
4. Use browser DevTools for frontend debugging
5. Consider using specialized debugging agents (e.g., @error-detective)

### When Deploying to Firebase
1. **ALWAYS use firebase-deployment-specialist subagent** - Never deploy manually
2. The subagent automatically handles:
   - Git operations (add, commit, push)
   - Pre-deployment validation (TypeScript, environment variables, Firebase Secrets)
   - Intelligent deployment with quota management and error recovery
   - Post-deployment health checks and comprehensive reporting
3. **Available deployment modes:**
   - Full deployment (production): Comprehensive validation and error recovery
   - Quick deployment (development): Streamlined process with basic validation
   - Test mode: Validation only without actual deployment
   - Batch-only: Functions deployment with intelligent batching
   - Report-only: Generate reports from previous deployments
4. **The subagent ensures 100% deployment success through:**
   - 24 different error recovery strategies
   - Intelligent batching for large function deployments (127+ functions)
   - Firebase Secrets validation and dual environment support
   - Comprehensive health checking across 10 validation categories

5. **MANDATORY: Compilation Error Handover Protocol**
   - **If firebase-deployment-specialist encounters compilation errors during deployment:**
     - **TypeScript/JavaScript errors**: MUST handover to `nodejs-expert` subagent
     - **Python errors**: MUST handover to `django-expert` or `python-hyx-resilience` subagent
     - **General debugging**: Can also use `error-detective` or `debugger` subagents
   - **Error-fixing subagent responsibilities:**
     - Fix ALL compilation errors iteratively until code compiles successfully
     - Run appropriate type checks and linting
     - Validate fixes don't break existing functionality
     - **MUST handover control back to firebase-deployment-specialist when complete**
   - **firebase-deployment-specialist responsibilities:**
     - Detect compilation failures and initiate handover immediately
     - Provide detailed error context to the debugging subagent
     - Resume deployment process once compilation issues are resolved
     - **This handover protocol is MANDATORY and MUST NOT be skipped**

### Code Style
- Python: Follow Black and isort formatting (use `poetry run black .` and `poetry run isort .` and `poetry run tox .`)
- TypeScript: Use Prettier and ESLint rules
- Always use type hints/annotations
- Prefer composition over inheritance
- Python version: Strictly Python 3.11 (no other versions)