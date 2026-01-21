#!/usr/bin/env node

/**
 * CVPlus KILLDUPS Orchestrator Integration
 * Interfaces with Claude Code subagents for automated deduplication
 * Author: Gil Klainert
 * Generated: 2025-08-28
 */

const fs = require('fs');
const path = require('path');
const { execSync, spawn } = require('child_process');

const PROJECT_ROOT = path.resolve(__dirname, '../..');
const TEMP_DIR = path.join(PROJECT_ROOT, 'tmp', 'killdups');
const ANALYSIS_FILE = path.join(TEMP_DIR, 'duplication_analysis.json');

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

class KillDupsOrchestrator {
    constructor() {
        this.analysisData = null;
        this.executionPlan = null;
        this.subagentMap = {
            'packages/core': 'core-module-specialist',
            'packages/auth': 'auth-module-specialist',
            'packages/i18n': 'i18n-specialist',
            'packages/multimedia': 'multimedia-specialist',
            'packages/premium': 'premium-specialist',
            'packages/public-profiles': 'public-profiles-specialist',
            'packages/recommendations': 'recommendations-specialist',
            'packages/admin': 'admin-specialist',
            'packages/analytics': 'analytics-specialist',
            'packages/cv-processing': 'cv-processing-specialist'
        };
    }

    async loadAnalysisData() {
        try {
            if (!fs.existsSync(ANALYSIS_FILE)) {
                throw new Error('Analysis file not found. Run killdups.sh first.');
            }
            
            this.analysisData = JSON.parse(fs.readFileSync(ANALYSIS_FILE, 'utf8'));
            log(`✓ Loaded analysis data: ${this.analysisData.stats.total_files_scanned} files analyzed`, 'green');
            
            return this.analysisData;
        } catch (error) {
            log(`✗ Failed to load analysis data: ${error.message}`, 'red');
            throw error;
        }
    }

    async generateExecutionPlan() {
        log('→ Generating execution plan with orchestrator subagent...', 'blue');
        
        const planData = {
            timestamp: new Date().toISOString(),
            project_root: PROJECT_ROOT,
            analysis_summary: this.analysisData.stats,
            phases: [],
            priority_levels: {
                high: [],
                medium: [],
                low: []
            }
        };

        // Phase 1: Critical Duplicate Removal
        if (this.analysisData.duplicate_code_blocks.length > 0) {
            const duplicatePhase = {
                phase: 1,
                name: 'Critical Duplicate Code Removal',
                description: 'Remove exact duplicate code blocks across files',
                tasks: [],
                estimated_effort: 'high',
                dependencies: [],
                subagents_required: new Set()
            };

            this.analysisData.duplicate_code_blocks.forEach((duplicate, index) => {
                const task = {
                    id: `dup-${index + 1}`,
                    type: 'duplicate_removal',
                    description: `Remove duplicate code block: ${duplicate.hash.substring(0, 8)}`,
                    locations: duplicate.locations,
                    severity: duplicate.severity,
                    action: 'extract_to_shared_utility',
                    subagent: this.determineSubagentForFiles(duplicate.locations.map(loc => loc.file))
                };

                duplicatePhase.tasks.push(task);
                duplicatePhase.subagents_required.add(task.subagent);
                planData.priority_levels[duplicate.severity].push(task.id);
            });

            duplicatePhase.subagents_required = Array.from(duplicatePhase.subagents_required);
            planData.phases.push(duplicatePhase);
        }

        // Phase 2: DRY Principle Enforcement
        if (this.analysisData.dry_violations.length > 0) {
            const dryPhase = {
                phase: 2,
                name: 'DRY Principle Enforcement',
                description: 'Extract repeated literals and constants into shared configuration',
                tasks: [],
                estimated_effort: 'medium',
                dependencies: ['Phase 1'],
                subagents_required: new Set()
            };

            this.analysisData.dry_violations.forEach((violation, index) => {
                const task = {
                    id: `dry-${index + 1}`,
                    type: 'constant_extraction',
                    description: `Extract repeated pattern: ${violation.pattern}`,
                    pattern: violation.pattern,
                    occurrences: violation.occurrences,
                    locations: violation.locations,
                    severity: violation.severity,
                    action: 'create_shared_constant',
                    subagent: 'core-module-specialist' // Constants typically go in core
                };

                dryPhase.tasks.push(task);
                dryPhase.subagents_required.add(task.subagent);
                planData.priority_levels[violation.severity].push(task.id);
            });

            dryPhase.subagents_required = Array.from(dryPhase.subagents_required);
            planData.phases.push(dryPhase);
        }

        // Phase 3: Code Relocation
        if (this.analysisData.misplaced_code.length > 0) {
            const relocationPhase = {
                phase: 3,
                name: 'Code Relocation to Appropriate Submodules',
                description: 'Move code from root repository to appropriate submodules',
                tasks: [],
                estimated_effort: 'high',
                dependencies: ['Phase 1', 'Phase 2'],
                subagents_required: new Set()
            };

            this.analysisData.misplaced_code.forEach((misplaced, index) => {
                const targetSubagent = this.subagentMap[`packages/${misplaced.suggested_module}`];
                
                const task = {
                    id: `move-${index + 1}`,
                    type: 'code_relocation',
                    description: `Move ${path.basename(misplaced.file)} to ${misplaced.suggested_module} module`,
                    source_file: misplaced.file,
                    target_module: misplaced.suggested_module,
                    confidence: misplaced.confidence,
                    severity: misplaced.severity,
                    action: 'relocate_and_update_imports',
                    subagent: targetSubagent || 'orchestrator'
                };

                relocationPhase.tasks.push(task);
                relocationPhase.subagents_required.add(task.subagent);
                planData.priority_levels[misplaced.severity].push(task.id);
            });

            relocationPhase.subagents_required = Array.from(relocationPhase.subagents_required);
            planData.phases.push(relocationPhase);
        }

        // Phase 4: Similar Functionality Consolidation
        if (this.analysisData.similar_functionality.length > 0) {
            const consolidationPhase = {
                phase: 4,
                name: 'Similar Functionality Consolidation',
                description: 'Review and potentially merge similar functions',
                tasks: [],
                estimated_effort: 'medium',
                dependencies: ['Phase 1', 'Phase 2', 'Phase 3'],
                subagents_required: new Set()
            };

            this.analysisData.similar_functionality.forEach((similar, index) => {
                const task = {
                    id: `similar-${index + 1}`,
                    type: 'functionality_review',
                    description: `Review similar functions: ${similar.locations.map(loc => loc.function_name).join(', ')}`,
                    locations: similar.locations,
                    pattern: similar.pattern,
                    severity: similar.severity,
                    action: 'manual_review_and_consolidation',
                    subagent: this.determineSubagentForFiles(similar.locations.map(loc => loc.file))
                };

                consolidationPhase.tasks.push(task);
                consolidationPhase.subagents_required.add(task.subagent);
                planData.priority_levels[similar.severity].push(task.id);
            });

            consolidationPhase.subagents_required = Array.from(consolidationPhase.subagents_required);
            planData.phases.push(consolidationPhase);
        }

        // Calculate execution metrics
        planData.execution_metrics = {
            total_tasks: planData.phases.reduce((sum, phase) => sum + phase.tasks.length, 0),
            total_phases: planData.phases.length,
            estimated_duration: this.calculateEstimatedDuration(planData.phases),
            required_subagents: [...new Set(planData.phases.flatMap(phase => phase.subagents_required))],
            risk_level: this.assessRiskLevel(planData)
        };

        this.executionPlan = planData;
        
        // Save plan to file
        const planFile = path.join(TEMP_DIR, 'execution_plan.json');
        fs.writeFileSync(planFile, JSON.stringify(planData, null, 2));
        
        log(`✓ Execution plan generated: ${planData.execution_metrics.total_tasks} tasks across ${planData.execution_metrics.total_phases} phases`, 'green');
        log(`→ Plan saved to: ${planFile}`, 'blue');
        
        return planData;
    }

    determineSubagentForFiles(files) {
        // Find the most appropriate subagent based on file locations
        const moduleCount = {};
        
        files.forEach(file => {
            for (const [modulePath, subagent] of Object.entries(this.subagentMap)) {
                if (file.includes(modulePath)) {
                    moduleCount[subagent] = (moduleCount[subagent] || 0) + 1;
                }
            }
        });

        // Return the subagent with the highest count, or orchestrator as fallback
        const topSubagent = Object.entries(moduleCount)
            .sort(([,a], [,b]) => b - a)[0];
        
        return topSubagent ? topSubagent[0] : 'orchestrator';
    }

    calculateEstimatedDuration(phases) {
        const effortWeights = { low: 1, medium: 2, high: 4 };
        
        const totalEffort = phases.reduce((sum, phase) => {
            const phaseWeight = effortWeights[phase.estimated_effort] || 2;
            return sum + (phase.tasks.length * phaseWeight);
        }, 0);

        // Estimate in hours (rough approximation)
        const estimatedHours = Math.ceil(totalEffort * 0.5); // 30 minutes per effort point
        
        return {
            hours: estimatedHours,
            days: Math.ceil(estimatedHours / 8),
            complexity: totalEffort > 20 ? 'high' : totalEffort > 10 ? 'medium' : 'low'
        };
    }

    assessRiskLevel(planData) {
        const riskFactors = {
            high_task_count: planData.execution_metrics.total_tasks > 20,
            multiple_modules: planData.execution_metrics.required_subagents.length > 5,
            high_priority_tasks: planData.priority_levels.high.length > 0,
            cross_module_changes: planData.phases.some(phase => 
                phase.name.includes('Relocation') || phase.name.includes('Consolidation')
            )
        };

        const riskCount = Object.values(riskFactors).filter(Boolean).length;
        
        if (riskCount >= 3) return 'high';
        if (riskCount >= 2) return 'medium';
        return 'low';
    }

    async presentPlanToUser() {
        log('\n' + '='.repeat(70), 'purple');
        log('                    KILLDUPS EXECUTION PLAN', 'purple');
        log('='.repeat(70), 'purple');
        
        const plan = this.executionPlan;
        const metrics = plan.execution_metrics;
        
        log(`\n📊 PLAN OVERVIEW:`, 'cyan');
        log(`   Total Tasks: ${metrics.total_tasks}`, 'yellow');
        log(`   Total Phases: ${metrics.total_phases}`, 'yellow');
        log(`   Estimated Duration: ${metrics.estimated_duration.hours} hours (${metrics.estimated_duration.days} days)`, 'yellow');
        log(`   Risk Level: ${metrics.risk_level.toUpperCase()}`, metrics.risk_level === 'high' ? 'red' : metrics.risk_level === 'medium' ? 'yellow' : 'green');
        
        log(`\n🤖 REQUIRED SUBAGENTS:`, 'cyan');
        metrics.required_subagents.forEach(subagent => {
            log(`   • ${subagent}`, 'blue');
        });
        
        log(`\n📋 EXECUTION PHASES:`, 'cyan');
        plan.phases.forEach(phase => {
            log(`\n   Phase ${phase.phase}: ${phase.name}`, 'yellow');
            log(`   Tasks: ${phase.tasks.length} | Effort: ${phase.estimated_effort} | Subagents: ${phase.subagents_required.join(', ')}`, 'blue');
            log(`   Description: ${phase.description}`, 'blue');
            
            if (phase.dependencies.length > 0) {
                log(`   Dependencies: ${phase.dependencies.join(', ')}`, 'purple');
            }
        });
        
        log(`\n⚠️  PRIORITY BREAKDOWN:`, 'cyan');
        log(`   High Priority: ${plan.priority_levels.high.length} tasks`, 'red');
        log(`   Medium Priority: ${plan.priority_levels.medium.length} tasks`, 'yellow');  
        log(`   Low Priority: ${plan.priority_levels.low.length} tasks`, 'green');
        
        log('\n' + '='.repeat(70), 'purple');
        
        return true;
    }

    async executeWithOrchestrator() {
        log('→ Engaging orchestrator subagent for plan execution...', 'blue');
        
        // Create orchestrator task file
        const orchestratorTask = {
            task_type: 'killdups_execution',
            timestamp: new Date().toISOString(),
            execution_plan: this.executionPlan,
            project_root: PROJECT_ROOT,
            subagent_coordination: {
                workflow: 'sequential_phases',
                handoff_protocol: 'complete_and_verify',
                quality_gates: ['syntax_check', 'test_validation', 'import_verification']
            },
            success_criteria: {
                all_phases_completed: true,
                no_broken_functionality: true,
                reduced_duplication: true,
                maintained_test_coverage: true
            }
        };
        
        const taskFile = path.join(TEMP_DIR, 'orchestrator_task.json');
        fs.writeFileSync(taskFile, JSON.stringify(orchestratorTask, null, 2));
        
        log(`✓ Orchestrator task prepared: ${taskFile}`, 'green');
        log('→ Ready for orchestrator subagent execution', 'blue');
        
        // In a real implementation, this would interface with Claude Code's Task system
        log('\n🚀 NEXT STEPS:', 'cyan');
        log('   1. Review the execution plan above', 'yellow');
        log('   2. Approve the plan if satisfactory', 'yellow');
        log('   3. The orchestrator will coordinate specialist subagents', 'yellow');
        log('   4. Each phase will be executed sequentially with validation', 'yellow');
        
        return taskFile;
    }
}

// Main execution
async function main() {
    const orchestrator = new KillDupsOrchestrator();
    
    try {
        log('🎯 Starting KILLDUPS Orchestrator...', 'cyan');
        
        // Load analysis data
        await orchestrator.loadAnalysisData();
        
        // Generate execution plan  
        await orchestrator.generateExecutionPlan();
        
        // Present plan to user
        await orchestrator.presentPlanToUser();
        
        // Ask for user approval
        log('\n❓ Do you want to proceed with this execution plan? (y/N): ', 'yellow');
        
        // In a real implementation, this would wait for user input
        // For now, we'll prepare for orchestrator execution
        const userApproval = process.argv.includes('--auto-approve');
        
        if (userApproval) {
            log('✓ Plan approved. Proceeding with orchestrator execution...', 'green');
            await orchestrator.executeWithOrchestrator();
        } else {
            log('→ Plan generated and ready for approval.', 'blue');
            log('→ To auto-approve and execute, run with --auto-approve flag', 'blue');
        }
        
    } catch (error) {
        log(`✗ Orchestrator failed: ${error.message}`, 'red');
        process.exit(1);
    }
}

// Run if called directly
if (require.main === module) {
    main();
}

module.exports = KillDupsOrchestrator;