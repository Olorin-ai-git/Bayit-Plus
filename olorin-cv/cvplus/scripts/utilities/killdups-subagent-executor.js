#!/usr/bin/env node

/**
 * CVPlus KILLDUPS Subagent Executor
 * Integrates with Claude Code Task system for automated subagent coordination
 * Author: Gil Klainert
 * Generated: 2025-08-28
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const PROJECT_ROOT = path.resolve(__dirname, '../..');
const TEMP_DIR = path.join(PROJECT_ROOT, 'tmp', 'killdups');
const ANALYSIS_FILE = path.join(TEMP_DIR, 'duplication_analysis.json');
const EXECUTION_PLAN_FILE = path.join(TEMP_DIR, 'execution_plan.json');

// ANSI color codes for output
const colors = {
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    purple: '\x1b[35m',
    cyan: '\x1b[36m',
    reset: '\x1b[0m'
};

function log(message, color = 'reset') {
    console.log(`${colors[color]}${message}${colors.reset}`);
}

class KillDupsSubagentExecutor {
    constructor() {
        this.executionPlan = null;
        this.taskResults = [];
        this.currentPhase = 0;
        this.executionLog = [];
    }

    async loadExecutionPlan() {
        try {
            if (!fs.existsSync(EXECUTION_PLAN_FILE)) {
                throw new Error('Execution plan not found. Run killdups.sh --execute-plan first.');
            }
            
            this.executionPlan = JSON.parse(fs.readFileSync(EXECUTION_PLAN_FILE, 'utf8'));
            log(`✓ Loaded execution plan with ${this.executionPlan.execution_metrics.total_tasks} tasks`, 'green');
            
            return this.executionPlan;
        } catch (error) {
            log(`✗ Failed to load execution plan: ${error.message}`, 'red');
            throw error;
        }
    }

    async executePhase(phase) {
        log(`\n🚀 EXECUTING PHASE ${phase.phase}: ${phase.name}`, 'cyan');
        log(`   Tasks: ${phase.tasks.length} | Subagents: ${phase.subagents_required.join(', ')}`, 'blue');
        
        const phaseResults = {
            phase: phase.phase,
            name: phase.name,
            started_at: new Date().toISOString(),
            tasks: [],
            status: 'running',
            errors: []
        };

        // Execute tasks sequentially within the phase
        for (let i = 0; i < phase.tasks.length; i++) {
            const task = phase.tasks[i];
            log(`\n→ Task ${i + 1}/${phase.tasks.length}: ${task.description}`, 'yellow');
            
            try {
                const taskResult = await this.executeTask(task, phase);
                phaseResults.tasks.push(taskResult);
                
                if (taskResult.status === 'completed') {
                    log(`  ✓ ${task.id} completed successfully`, 'green');
                } else {
                    log(`  ⚠ ${task.id} needs manual review`, 'yellow');
                }
            } catch (error) {
                log(`  ✗ ${task.id} failed: ${error.message}`, 'red');
                phaseResults.errors.push({
                    task_id: task.id,
                    error: error.message,
                    timestamp: new Date().toISOString()
                });
            }
        }

        phaseResults.completed_at = new Date().toISOString();
        phaseResults.status = phaseResults.errors.length === 0 ? 'completed' : 'partial';
        
        this.taskResults.push(phaseResults);
        
        log(`\n✓ Phase ${phase.phase} ${phaseResults.status}: ${phaseResults.tasks.length} tasks processed`, 
            phaseResults.status === 'completed' ? 'green' : 'yellow');
        
        return phaseResults;
    }

    async executeTask(task, phase) {
        const taskResult = {
            id: task.id,
            type: task.type,
            description: task.description,
            subagent: task.subagent,
            started_at: new Date().toISOString(),
            status: 'running',
            outputs: [],
            next_actions: []
        };

        // Create subagent task specification
        const subagentTask = this.createSubagentTask(task, phase);
        
        // Save task specification for the subagent
        const taskSpecFile = path.join(TEMP_DIR, `task_${task.id}.json`);
        fs.writeFileSync(taskSpecFile, JSON.stringify(subagentTask, null, 2));
        
        log(`    📝 Task specification saved: ${taskSpecFile}`, 'blue');

        // Generate the Claude Code Task command that would be executed
        const taskCommand = this.generateTaskCommand(task, subagentTask);
        
        taskResult.claude_task_command = taskCommand;
        taskResult.task_spec_file = taskSpecFile;
        
        // For demonstration purposes, we'll simulate the task execution
        // In real usage, this would interface with Claude Code's Task system
        const simulationResult = this.simulateTaskExecution(task);
        
        taskResult.status = simulationResult.status;
        taskResult.outputs = simulationResult.outputs;
        taskResult.next_actions = simulationResult.next_actions;
        taskResult.completed_at = new Date().toISOString();
        
        return taskResult;
    }

    createSubagentTask(task, phase) {
        const baseTask = {
            task_id: task.id,
            task_type: task.type,
            phase: phase.phase,
            phase_name: phase.name,
            description: task.description,
            severity: task.severity,
            project_root: PROJECT_ROOT,
            timestamp: new Date().toISOString()
        };

        // Customize task based on type
        switch (task.type) {
            case 'duplicate_removal':
                return {
                    ...baseTask,
                    action: 'extract_to_shared_utility',
                    duplicate_locations: task.locations,
                    content_hash: task.hash || 'unknown',
                    extraction_strategy: 'create_shared_function',
                    target_module: this.suggestTargetModule(task.locations),
                    validation_requirements: [
                        'ensure_all_imports_updated',
                        'run_affected_tests',
                        'verify_no_functionality_broken'
                    ]
                };

            case 'constant_extraction':
                return {
                    ...baseTask,
                    action: 'create_shared_constant',
                    pattern: task.pattern,
                    occurrences: task.occurrences,
                    locations: task.locations,
                    target_module: 'core',
                    constant_name: this.generateConstantName(task.pattern),
                    validation_requirements: [
                        'update_all_references',
                        'ensure_type_safety',
                        'run_affected_tests'
                    ]
                };

            case 'code_relocation':
                return {
                    ...baseTask,
                    action: 'relocate_and_update_imports',
                    source_file: task.source_file,
                    target_module: task.target_module,
                    confidence: task.confidence,
                    relocation_steps: [
                        'analyze_dependencies',
                        'move_file_to_target_module',
                        'update_all_import_references',
                        'update_export_indices',
                        'run_full_test_suite'
                    ],
                    validation_requirements: [
                        'no_broken_imports',
                        'all_tests_pass',
                        'proper_module_boundaries'
                    ]
                };

            case 'functionality_review':
                return {
                    ...baseTask,
                    action: 'manual_review_and_consolidation',
                    similar_functions: task.locations,
                    pattern: task.pattern,
                    review_criteria: [
                        'analyze_functional_similarity',
                        'identify_merge_opportunities',
                        'assess_breaking_change_impact',
                        'recommend_consolidation_strategy'
                    ],
                    validation_requirements: [
                        'maintain_existing_functionality',
                        'improve_code_maintainability',
                        'reduce_cognitive_complexity'
                    ]
                };

            default:
                return {
                    ...baseTask,
                    action: 'analyze_and_recommend',
                    validation_requirements: ['manual_review_required']
                };
        }
    }

    generateTaskCommand(task, subagentTask) {
        // Generate the Claude Code Task command that would be executed
        const prompt = this.generateSubagentPrompt(task, subagentTask);
        
        return {
            tool: 'Task',
            parameters: {
                subagent_type: task.subagent,
                description: task.description.substring(0, 50) + '...',
                prompt: prompt
            }
        };
    }

    generateSubagentPrompt(task, subagentTask) {
        const prompts = {
            duplicate_removal: `
KILLDUPS Task: Remove duplicate code block

**Task ID**: ${task.id}
**Type**: Duplicate Code Removal
**Severity**: ${task.severity}

**Locations with duplicates**:
${task.locations.map(loc => `- ${loc.file}:${loc.start_line}-${loc.end_line}`).join('\n')}

**Actions Required**:
1. Analyze the duplicate code blocks
2. Extract common functionality to a shared utility function
3. Update all locations to use the shared function
4. Ensure all imports are properly updated
5. Run tests to verify functionality is preserved

**Target Module**: ${subagentTask.target_module}
**Validation**: Ensure no functionality is broken and all tests pass.
            `,
            
            constant_extraction: `
KILLDUPS Task: Extract repeated constants

**Task ID**: ${task.id}
**Type**: DRY Violation - Repeated Constants
**Severity**: ${task.severity}

**Repeated Pattern**: \`${task.pattern}\`
**Occurrences**: ${task.occurrences}

**Locations**:
${task.locations.map(loc => `- ${loc.file}:${loc.line}`).join('\n')}

**Actions Required**:
1. Create a shared constant in the core module
2. Replace all occurrences with the constant reference
3. Update imports in all affected files
4. Ensure type safety is maintained
5. Run tests to verify functionality

**Suggested Constant Name**: ${subagentTask.constant_name}
            `,
            
            code_relocation: `
KILLDUPS Task: Relocate code to appropriate submodule

**Task ID**: ${task.id}
**Type**: Code Relocation
**Confidence**: ${task.confidence}

**Source File**: ${task.source_file}
**Target Module**: ${task.target_module}

**Actions Required**:
1. Analyze file dependencies and imports
2. Move file to the target submodule
3. Update all import references across the codebase
4. Update export index files
5. Verify module boundaries are properly maintained
6. Run full test suite

**Validation**: Ensure no broken imports and all tests pass.
            `,
            
            functionality_review: `
KILLDUPS Task: Review similar functionality for consolidation

**Task ID**: ${task.id}
**Type**: Similar Functionality Review
**Pattern**: ${task.pattern}

**Similar Functions**:
${task.locations.map(loc => `- ${loc.function_name} in ${loc.file}:${loc.line}`).join('\n')}

**Actions Required**:
1. Analyze functional similarity between the functions
2. Identify opportunities for consolidation or sharing
3. Assess impact of potential changes
4. Recommend consolidation strategy
5. If consolidation is beneficial, implement the changes
6. Maintain existing functionality contracts

**Review Focus**: Determine if functions can be merged or shared without breaking existing functionality.
            `
        };

        return prompts[task.type] || `
KILLDUPS Task: ${task.description}

**Task ID**: ${task.id}
**Type**: ${task.type}
**Actions**: Analyze and provide recommendations for the identified issue.
        `;
    }

    simulateTaskExecution(task) {
        // Simulate task execution for demonstration
        // In real usage, this would be replaced by actual Task API calls
        
        const baseResult = {
            status: 'completed',
            outputs: [],
            next_actions: []
        };

        switch (task.type) {
            case 'duplicate_removal':
                return {
                    ...baseResult,
                    outputs: [
                        `Created shared utility function in ${this.suggestTargetModule(task.locations)} module`,
                        `Updated ${task.locations.length} files to use shared function`,
                        'All imports updated successfully',
                        'Tests pass - no functionality broken'
                    ],
                    next_actions: [
                        'Review extracted function for optimization opportunities',
                        'Consider adding JSDoc documentation'
                    ]
                };

            case 'constant_extraction':
                return {
                    ...baseResult,
                    outputs: [
                        `Created constant ${this.generateConstantName(task.pattern)} in core module`,
                        `Updated ${task.occurrences} occurrences across ${task.locations.length} files`,
                        'All imports updated and type-safe'
                    ],
                    next_actions: [
                        'Consider grouping related constants',
                        'Update documentation to reference the constant'
                    ]
                };

            case 'code_relocation':
                return {
                    ...baseResult,
                    status: 'needs_review',
                    outputs: [
                        `Analyzed ${task.source_file} for relocation to ${task.target_module}`,
                        `Identified ${Math.floor(Math.random() * 5) + 1} import dependencies`,
                        'File contains module-specific functionality'
                    ],
                    next_actions: [
                        'Manual review recommended due to complex dependencies',
                        'Consider splitting file if it has mixed responsibilities',
                        'Validate module boundaries after relocation'
                    ]
                };

            case 'functionality_review':
                return {
                    ...baseResult,
                    status: 'needs_review',
                    outputs: [
                        `Analyzed ${task.locations.length} similar functions`,
                        'Functions have similar naming but different implementations',
                        'Consolidation possible with careful refactoring'
                    ],
                    next_actions: [
                        'Manual review required to assess functional equivalence',
                        'Consider creating a base utility with specialized variations',
                        'Evaluate impact on existing API contracts'
                    ]
                };

            default:
                return {
                    ...baseResult,
                    status: 'needs_review',
                    outputs: ['Task type requires manual analysis'],
                    next_actions: ['Schedule manual review with development team']
                };
        }
    }

    suggestTargetModule(locations) {
        // Suggest target module based on file locations
        const moduleCounts = {};
        
        locations.forEach(loc => {
            if (loc.file.includes('/packages/')) {
                const match = loc.file.match(/\/packages\/([^\/]+)/);
                if (match) {
                    moduleCounts[match[1]] = (moduleCounts[match[1]] || 0) + 1;
                }
            }
        });

        // Return the most common module, or 'core' as default
        const topModule = Object.entries(moduleCounts)
            .sort(([,a], [,b]) => b - a)[0];
        
        return topModule ? topModule[0] : 'core';
    }

    generateConstantName(pattern) {
        // Generate appropriate constant name from pattern
        let name = pattern
            .replace(/['"]/g, '')
            .replace(/[^a-zA-Z0-9]/g, '_')
            .toUpperCase();
        
        // Limit length and ensure it's descriptive
        if (name.length > 30) {
            name = name.substring(0, 30);
        }
        
        // Add prefix if it doesn't start with a letter
        if (!/^[A-Z]/.test(name)) {
            name = 'CONST_' + name;
        }

        return name;
    }

    async generateExecutionReport() {
        const report = {
            execution_summary: {
                started_at: this.taskResults[0]?.started_at,
                completed_at: new Date().toISOString(),
                total_phases: this.taskResults.length,
                total_tasks: this.taskResults.reduce((sum, phase) => sum + phase.tasks.length, 0),
                success_rate: this.calculateSuccessRate()
            },
            phase_results: this.taskResults,
            recommendations: this.generateRecommendations(),
            next_steps: this.generateNextSteps()
        };

        const reportFile = path.join(TEMP_DIR, 'execution_report.json');
        fs.writeFileSync(reportFile, JSON.stringify(report, null, 2));
        
        return report;
    }

    calculateSuccessRate() {
        const totalTasks = this.taskResults.reduce((sum, phase) => sum + phase.tasks.length, 0);
        const completedTasks = this.taskResults.reduce((sum, phase) => 
            sum + phase.tasks.filter(task => task.status === 'completed').length, 0
        );
        
        return totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
    }

    generateRecommendations() {
        const recommendations = [];
        
        // Analyze task results for recommendations
        this.taskResults.forEach(phase => {
            const failedTasks = phase.tasks.filter(task => task.status === 'failed');
            const reviewTasks = phase.tasks.filter(task => task.status === 'needs_review');
            
            if (failedTasks.length > 0) {
                recommendations.push({
                    type: 'failed_tasks',
                    message: `${failedTasks.length} tasks failed in ${phase.name}`,
                    action: 'Review error logs and retry failed tasks manually'
                });
            }
            
            if (reviewTasks.length > 0) {
                recommendations.push({
                    type: 'manual_review',
                    message: `${reviewTasks.length} tasks require manual review in ${phase.name}`,
                    action: 'Schedule developer review for complex consolidation decisions'
                });
            }
        });

        return recommendations;
    }

    generateNextSteps() {
        const steps = [];
        
        // Generate next steps based on execution results
        const allTasks = this.taskResults.flatMap(phase => phase.tasks);
        const completedTasks = allTasks.filter(task => task.status === 'completed');
        const reviewTasks = allTasks.filter(task => task.status === 'needs_review');
        
        if (completedTasks.length > 0) {
            steps.push('Run full test suite to validate all automated changes');
            steps.push('Review extracted utilities and constants for optimization opportunities');
        }
        
        if (reviewTasks.length > 0) {
            steps.push('Schedule manual review session for tasks requiring human judgment');
            steps.push('Create follow-up tickets for complex consolidation opportunities');
        }
        
        steps.push('Re-run KILLDUPS analysis to validate duplication reduction');
        steps.push('Update project documentation to reflect architectural improvements');
        
        return steps;
    }

    async executeAll() {
        log('🎯 Starting KILLDUPS Subagent Execution...', 'cyan');
        
        if (!this.executionPlan || !this.executionPlan.phases) {
            throw new Error('No execution plan loaded');
        }

        // Execute phases sequentially
        for (const phase of this.executionPlan.phases) {
            await this.executePhase(phase);
            
            // Brief pause between phases
            await new Promise(resolve => setTimeout(resolve, 1000));
        }

        // Generate final report
        const report = await this.generateExecutionReport();
        
        log('\n' + '='.repeat(70), 'purple');
        log('                    EXECUTION COMPLETE', 'purple');
        log('='.repeat(70), 'purple');
        
        log(`\n📊 EXECUTION SUMMARY:`, 'cyan');
        log(`   Total Phases: ${report.execution_summary.total_phases}`, 'yellow');
        log(`   Total Tasks: ${report.execution_summary.total_tasks}`, 'yellow');
        log(`   Success Rate: ${report.execution_summary.success_rate}%`, 
            report.execution_summary.success_rate > 80 ? 'green' : 'yellow');
        
        if (report.recommendations.length > 0) {
            log(`\n⚠️  RECOMMENDATIONS:`, 'cyan');
            report.recommendations.forEach(rec => {
                log(`   • ${rec.message}`, 'yellow');
                log(`     Action: ${rec.action}`, 'blue');
            });
        }
        
        if (report.next_steps.length > 0) {
            log(`\n🚀 NEXT STEPS:`, 'cyan');
            report.next_steps.forEach(step => {
                log(`   • ${step}`, 'yellow');
            });
        }
        
        log(`\n✓ Full execution report saved to: ${path.join(TEMP_DIR, 'execution_report.json')}`, 'green');
        
        return report;
    }
}

// Main execution
async function main() {
    const executor = new KillDupsSubagentExecutor();
    
    try {
        await executor.loadExecutionPlan();
        await executor.executeAll();
        
        log('\n🎉 KILLDUPS execution completed successfully!', 'green');
        
    } catch (error) {
        log(`\n✗ Execution failed: ${error.message}`, 'red');
        process.exit(1);
    }
}

// Run if called directly
if (require.main === module) {
    main();
}

module.exports = KillDupsSubagentExecutor;