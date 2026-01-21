#!/usr/bin/env node

/**
 * CVPlus Firebase Functions Analysis Tool
 * Analyzes function structure and identifies consolidation opportunities
 */

const fs = require('fs');
const path = require('path');

class FunctionsAnalyzer {
  constructor(functionsPath = 'functions/src') {
    this.functionsPath = functionsPath;
    this.results = {
      totalFunctions: 0,
      functionsByCategory: {},
      consolidationOpportunities: [],
      coldStartIssues: []
    };
  }

  async analyzeFunctionStructure() {
    console.log('🔍 Analyzing Firebase Functions structure...\n');

    try {
      // Read the main index.ts file
      const indexPath = path.join(this.functionsPath, 'index.ts');
      const indexContent = fs.readFileSync(indexPath, 'utf8');
      
      // Extract all export statements
      const exportMatches = indexContent.match(/export\s*\{[^}]*\}/g) || [];
      const directExports = indexContent.match(/export\s*\*?\s*\{[^}]*\}\s*from/g) || [];
      
      let totalExports = 0;
      const functionCategories = {};

      // Analyze export blocks
      exportMatches.forEach(exportBlock => {
        const functions = exportBlock.match(/[a-zA-Z][a-zA-Z0-9_]*/g) || [];
        functions.forEach(func => {
          if (func !== 'export') {
            totalExports++;
            this.categorizeFunction(func, functionCategories);
          }
        });
      });

      // Analyze function files in directories
      const functionsDir = path.join(this.functionsPath, 'functions');
      if (fs.existsSync(functionsDir)) {
        const functionFiles = fs.readdirSync(functionsDir, { withFileTypes: true });
        
        functionFiles.forEach(file => {
          if (file.isFile() && file.name.endsWith('.ts')) {
            const functionName = file.name.replace('.ts', '');
            totalExports++;
            this.categorizeFunction(functionName, functionCategories);
          } else if (file.isDirectory()) {
            // Handle subdirectories (e.g., payments/)
            const subDirPath = path.join(functionsDir, file.name);
            const subFiles = fs.readdirSync(subDirPath);
            
            subFiles.forEach(subFile => {
              if (subFile.endsWith('.ts')) {
                totalExports++;
                this.categorizeFunction(`${file.name}_${subFile.replace('.ts', '')}`, functionCategories);
              }
            });
          }
        });
      }

      this.results.totalFunctions = totalExports;
      this.results.functionsByCategory = functionCategories;

      console.log(`📊 Total Functions: ${totalExports}`);
      console.log('\n📋 Functions by Category:');
      
      Object.entries(functionCategories).forEach(([category, functions]) => {
        console.log(`  ${category}: ${functions.length} functions`);
        functions.forEach(func => console.log(`    - ${func}`));
      });

      return this.results;
    } catch (error) {
      console.error('❌ Error analyzing functions:', error.message);
      throw error;
    }
  }

  categorizeFunction(functionName, categories) {
    const name = functionName.toLowerCase();
    
    if (name.includes('cv') || name.includes('process') || name.includes('analyze')) {
      if (!categories['CV Processing']) categories['CV Processing'] = [];
      categories['CV Processing'].push(functionName);
    } else if (name.includes('video') || name.includes('podcast') || name.includes('media') || name.includes('generate')) {
      if (!categories['Media Generation']) categories['Media Generation'] = [];
      categories['Media Generation'].push(functionName);
    } else if (name.includes('user') || name.includes('auth') || name.includes('profile') || name.includes('subscription') || name.includes('payment')) {
      if (!categories['User Management']) categories['User Management'] = [];
      categories['User Management'].push(functionName);
    } else if (name.includes('analytics') || name.includes('monitor') || name.includes('track') || name.includes('log')) {
      if (!categories['Analytics & Monitoring']) categories['Analytics & Monitoring'] = [];
      categories['Analytics & Monitoring'].push(functionName);
    } else if (name.includes('calendar') || name.includes('email') || name.includes('booking') || name.includes('integration')) {
      if (!categories['Integrations']) categories['Integrations'] = [];
      categories['Integrations'].push(functionName);
    } else if (name.includes('portal') || name.includes('web') || name.includes('qr') || name.includes('public')) {
      if (!categories['Portal & Public']) categories['Portal & Public'] = [];
      categories['Portal & Public'].push(functionName);
    } else if (name.includes('test') || name.includes('debug') || name.includes('config')) {
      if (!categories['Testing & Configuration']) categories['Testing & Configuration'] = [];
      categories['Testing & Configuration'].push(functionName);
    } else {
      if (!categories['Miscellaneous']) categories['Miscellaneous'] = [];
      categories['Miscellaneous'].push(functionName);
    }
  }

  identifyConsolidationOpportunities() {
    console.log('\n🎯 Identifying Function Consolidation Opportunities...\n');

    const opportunities = [];
    const categories = this.results.functionsByCategory;

    // Identify categories with many functions that can be consolidated
    Object.entries(categories).forEach(([category, functions]) => {
      if (functions.length > 3) {
        opportunities.push({
          type: 'Category Consolidation',
          category: category,
          current_functions: functions.length,
          functions: functions,
          proposed_consolidation: `${category.replace(/\s+/g, '')}Orchestrator`,
          expected_reduction: `${functions.length - 1} functions → 1 orchestrator`,
          impact: functions.length > 10 ? 'High' : functions.length > 5 ? 'Medium' : 'Low'
        });
      }
    });

    // Overall consolidation potential
    const totalFunctions = this.results.totalFunctions;
    const estimatedConsolidated = Math.max(8, Math.ceil(Object.keys(categories).length * 0.7));
    
    opportunities.unshift({
      type: 'Overall Consolidation',
      category: 'All Functions',
      current_functions: totalFunctions,
      proposed_consolidation: `${estimatedConsolidated} consolidated orchestrators`,
      expected_reduction: `${totalFunctions} → ${estimatedConsolidated} functions`,
      reduction_percentage: Math.round(((totalFunctions - estimatedConsolidated) / totalFunctions) * 100),
      impact: 'Critical'
    });

    this.results.consolidationOpportunities = opportunities;

    opportunities.forEach((opp, index) => {
      console.log(`${index + 1}. ${opp.type} (${opp.impact} Impact)`);
      if (opp.category) console.log(`   Category: ${opp.category}`);
      console.log(`   Current: ${opp.current_functions} functions`);
      console.log(`   Proposed: ${opp.proposed_consolidation}`);
      console.log(`   Reduction: ${opp.expected_reduction}`);
      if (opp.reduction_percentage) console.log(`   Savings: ${opp.reduction_percentage}%`);
      console.log('');
    });

    return opportunities;
  }

  generateConsolidationPlan() {
    const plan = {
      analysis_date: new Date().toISOString(),
      current_state: {
        total_functions: this.results.totalFunctions,
        categories: Object.keys(this.results.functionsByCategory).length,
        functions_by_category: Object.fromEntries(
          Object.entries(this.results.functionsByCategory)
            .map(([cat, funcs]) => [cat, funcs.length])
        )
      },
      consolidation_strategy: {
        target_functions: Math.max(8, Math.ceil(Object.keys(this.results.functionsByCategory).length * 0.7)),
        expected_reduction_percentage: Math.round(((this.results.totalFunctions - 8) / this.results.totalFunctions) * 100),
        cold_start_improvement: '60-80% reduction in cold start latency',
        orchestrators: this.generateOrchestrators()
      },
      implementation_phases: this.generateImplementationPhases(),
      risk_assessment: this.generateRiskAssessment()
    };

    return plan;
  }

  generateOrchestrators() {
    const orchestrators = [];
    const categories = this.results.functionsByCategory;

    Object.entries(categories).forEach(([category, functions]) => {
      if (functions.length > 2) {
        orchestrators.push({
          name: `${category.replace(/\s+/g, '').toLowerCase()}Orchestrator`,
          handles: functions,
          routing_strategy: 'operation-based',
          expected_functions_consolidated: functions.length,
          memory_allocation: this.recommendMemoryAllocation(category, functions.length)
        });
      }
    });

    return orchestrators;
  }

  recommendMemoryAllocation(category, functionCount) {
    const categoryLower = category.toLowerCase();
    
    if (categoryLower.includes('media') || categoryLower.includes('video')) {
      return '2GB'; // Media processing needs more memory
    } else if (categoryLower.includes('cv') || categoryLower.includes('process')) {
      return '1GB'; // CV processing is memory intensive
    } else if (categoryLower.includes('analytics') || categoryLower.includes('monitor')) {
      return '512MB'; // Analytics functions are lighter
    } else {
      return '256MB'; // Default for utility functions
    }
  }

  generateImplementationPhases() {
    return [
      {
        phase: 1,
        name: 'High-Impact Consolidation',
        targets: ['CV Processing', 'Media Generation'],
        expected_reduction: '40-50 functions',
        timeline: '1-2 weeks'
      },
      {
        phase: 2,
        name: 'User & Integration Services',
        targets: ['User Management', 'Integrations'],
        expected_reduction: '20-30 functions',
        timeline: '1 week'
      },
      {
        phase: 3,
        name: 'Supporting Services',
        targets: ['Analytics & Monitoring', 'Portal & Public'],
        expected_reduction: '15-25 functions',
        timeline: '1 week'
      },
      {
        phase: 4,
        name: 'Cleanup & Optimization',
        targets: ['Testing & Configuration', 'Miscellaneous'],
        expected_reduction: '10-20 functions',
        timeline: '3-5 days'
      }
    ];
  }

  generateRiskAssessment() {
    return {
      high_risk: [
        'Function migration may break existing integrations',
        'Cold start optimization requires careful memory tuning'
      ],
      medium_risk: [
        'Routing complexity may introduce latency',
        'Error handling needs comprehensive testing'
      ],
      low_risk: [
        'Monitoring may need adjustment',
        'Documentation updates required'
      ],
      mitigation_strategies: [
        'Gradual migration with rollback capabilities',
        'Comprehensive integration testing',
        'Performance monitoring during migration',
        'Feature flags for progressive rollout'
      ]
    };
  }

  async saveConsolidationPlan(filename = 'functions-consolidation-plan.json') {
    const plan = this.generateConsolidationPlan();
    const planPath = path.join(process.cwd(), 'logs', filename);
    
    // Ensure logs directory exists
    const logsDir = path.join(process.cwd(), 'logs');
    if (!fs.existsSync(logsDir)) {
      fs.mkdirSync(logsDir, { recursive: true });
    }
    
    fs.writeFileSync(planPath, JSON.stringify(plan, null, 2));
    console.log(`📄 Functions consolidation plan saved: ${planPath}`);
    
    return plan;
  }
}

// Main execution
async function main() {
  console.log('🚀 CVPlus Firebase Functions Analysis\n');
  
  const analyzer = new FunctionsAnalyzer();
  
  try {
    // Change to project root for analysis
    process.chdir(path.join(__dirname, '../..'));
    
    await analyzer.analyzeFunctionStructure();
    analyzer.identifyConsolidationOpportunities();
    
    const plan = await analyzer.saveConsolidationPlan(`functions-consolidation-${new Date().toISOString().split('T')[0]}.json`);
    
    console.log('🎯 Functions Analysis Complete!');
    console.log(`Current Functions: ${plan.current_state.total_functions}`);
    console.log(`Target Functions: ${plan.consolidation_strategy.target_functions}`);
    console.log(`Expected Reduction: ${plan.consolidation_strategy.expected_reduction_percentage}%`);
    console.log(`Cold Start Improvement: ${plan.consolidation_strategy.cold_start_improvement}`);
    
  } catch (error) {
    console.error('❌ Analysis failed:', error.message);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = FunctionsAnalyzer;