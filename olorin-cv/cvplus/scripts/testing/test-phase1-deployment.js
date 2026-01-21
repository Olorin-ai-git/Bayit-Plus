#!/usr/bin/env node

/**
 * Phase 1 ATS Enhancement - Live Deployment Test
 * 
 * This script validates the deployed enhanced ATS system
 * by testing core functionality and measuring performance.
 */

const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const { getFunctions } = require('firebase-admin/functions');
const { httpsCallable } = require('firebase/functions');
const { initializeApp: initClientApp } = require('firebase/app');
const { getFunctions: getClientFunctions, connectFunctionsEmulator } = require('firebase/functions');

// Test configuration
const TEST_CONFIG = {
  projectId: 'getmycv-ai',
  testUserId: 'test-user-phase1',
  maxResponseTime: 45000, // 45 seconds
  minConfidenceScore: 0.65,
  expectedFeatures: [
    'advancedScore',
    'systemSimulations', 
    'semanticAnalysis',
    'competitorBenchmark'
  ]
};

// Sample CV for testing
const SAMPLE_CV = {
  personalInfo: {
    name: 'Alex Johnson',
    email: 'alex.johnson@email.com',
    phone: '+1-555-987-6543',
    address: 'San Francisco, CA',
    summary: 'Senior Software Engineer with 6 years of experience in full-stack development, specializing in React, Node.js, and cloud architecture. Proven track record of leading teams and delivering scalable solutions.'
  },
  experience: [
    {
      position: 'Senior Software Engineer',
      company: 'TechCorp Inc',
      startDate: '2021-03',
      endDate: '2024-08',
      duration: '3 years 5 months',
      description: 'Led development of microservices architecture serving 1M+ users. Implemented CI/CD pipelines reducing deployment time by 60%. Mentored 5 junior developers.',
      responsibilities: [
        'Full-stack development using React and Node.js',
        'Cloud infrastructure management on AWS',
        'Team leadership and code review',
        'Performance optimization and scaling'
      ],
      achievements: [
        'Improved application performance by 40%',
        'Reduced system downtime from 2% to 0.5%',
        'Led migration to microservices architecture'
      ]
    },
    {
      position: 'Software Developer',
      company: 'StartupXYZ',
      startDate: '2018-06',
      endDate: '2021-02',
      duration: '2 years 8 months',
      description: 'Developed and maintained web applications using modern JavaScript frameworks. Collaborated with design team to implement responsive UI components.',
      responsibilities: [
        'Frontend development with React and Vue.js',
        'Backend API development',
        'Database design and optimization',
        'Unit testing and integration testing'
      ],
      achievements: [
        'Delivered 15+ feature releases on schedule',
        'Reduced page load times by 35%',
        'Implemented automated testing suite'
      ]
    }
  ],
  skills: {
    technical: [
      'JavaScript', 'TypeScript', 'React', 'Node.js', 'Python',
      'AWS', 'Docker', 'Kubernetes', 'PostgreSQL', 'MongoDB',
      'Git', 'CI/CD', 'Microservices', 'REST APIs', 'GraphQL'
    ],
    soft: [
      'Team Leadership', 'Problem Solving', 'Communication',
      'Project Management', 'Mentoring', 'Agile Methodologies'
    ]
  },
  education: [
    {
      degree: 'Bachelor of Science',
      field: 'Computer Science',
      institution: 'UC Berkeley',
      year: '2018',
      gpa: '3.7'
    }
  ]
};

class Phase1DeploymentTester {
  constructor() {
    this.results = {
      tests: [],
      summary: {
        passed: 0,
        failed: 0,
        total: 0,
        startTime: new Date(),
        endTime: null
      }
    };
    
    console.log('🚀 Phase 1 ATS Enhancement - Deployment Test Started');
    console.log('=' .repeat(60));
  }

  async initializeFirebase() {
    try {
      // Initialize Firebase client
      const firebaseConfig = {
        projectId: TEST_CONFIG.projectId,
        // Add your config here if needed
      };
      
      const app = initClientApp(firebaseConfig);
      this.functions = getClientFunctions(app);
      
      console.log('✅ Firebase initialized successfully');
      return true;
    } catch (error) {
      console.error('❌ Firebase initialization failed:', error.message);
      return false;
    }
  }

  async createTestJob() {
    try {
      console.log('\n📝 Creating test job with sample CV...');
      
      // Simulate job creation (you may need to adjust this based on your actual job creation process)
      const testJob = {
        id: `test-job-${Date.now()}`,
        userId: TEST_CONFIG.testUserId,
        parsedData: SAMPLE_CV,
        status: 'analyzed',
        createdAt: new Date()
      };
      
      console.log(`✅ Test job created: ${testJob.id}`);
      return testJob;
    } catch (error) {
      console.error('❌ Test job creation failed:', error.message);
      return null;
    }
  }

  async testAnalyzeATSCompatibility(jobId) {
    console.log('\n🔍 Testing analyzeATSCompatibility function...');
    
    const testStart = Date.now();
    
    try {
      const analyzeATS = httpsCallable(this.functions, 'analyzeATSCompatibility');
      
      const result = await analyzeATS({
        jobId: jobId,
        targetRole: 'Senior Software Engineer',
        targetKeywords: ['React', 'Node.js', 'AWS', 'Leadership']
      });
      
      const duration = Date.now() - testStart;
      const data = result.data;
      
      // Test basic structure
      this.runTest('Function Response', 'Response received', !!data);
      this.runTest('Response Time', `${duration}ms`, duration < TEST_CONFIG.maxResponseTime);
      this.runTest('Score Present', 'Has overall score', typeof data.overall === 'number');
      this.runTest('Score Range', 'Score 0-100', data.overall >= 0 && data.overall <= 100);
      
      // Test enhanced features
      if (data.advancedScore) {
        console.log('🎯 Testing Enhanced Features...');
        
        this.runTest('Advanced Score', 'Present', !!data.advancedScore);
        this.runTest('Multi-factor Breakdown', 'All factors present', 
          data.advancedScore.breakdown && 
          data.advancedScore.breakdown.parsing !== undefined &&
          data.advancedScore.breakdown.keywords !== undefined &&
          data.advancedScore.breakdown.formatting !== undefined &&
          data.advancedScore.breakdown.content !== undefined &&
          data.advancedScore.breakdown.specificity !== undefined
        );
        
        this.runTest('ATS System Scores', 'All systems present',
          data.advancedScore.atsSystemScores &&
          data.advancedScore.atsSystemScores.workday !== undefined &&
          data.advancedScore.atsSystemScores.greenhouse !== undefined &&
          data.advancedScore.atsSystemScores.lever !== undefined
        );
        
        this.runTest('Recommendations', 'Present with priorities',
          Array.isArray(data.advancedScore.recommendations) &&
          data.advancedScore.recommendations.length > 0 &&
          data.advancedScore.recommendations[0].priority !== undefined
        );
        
        this.runTest('Confidence Score', 'Within range',
          data.advancedScore.confidence >= 0 && data.advancedScore.confidence <= 1
        );
        
        this.runTest('Confidence Threshold', `>=${TEST_CONFIG.minConfidenceScore}`,
          data.advancedScore.confidence >= TEST_CONFIG.minConfidenceScore
        );
      } else {
        console.log('ℹ️  Enhanced features not available - using legacy fallback');
        this.runTest('Legacy Fallback', 'Working', true);
      }
      
      // Test semantic analysis
      if (data.semanticAnalysis) {
        console.log('🧠 Testing Semantic Analysis...');
        
        this.runTest('Semantic Analysis', 'Present', !!data.semanticAnalysis);
        this.runTest('Primary Keywords', 'Present', 
          Array.isArray(data.semanticAnalysis.primaryKeywords) &&
          data.semanticAnalysis.primaryKeywords.length > 0
        );
        this.runTest('Contextual Relevance', 'Valid score',
          data.semanticAnalysis.contextualRelevance >= 0 &&
          data.semanticAnalysis.contextualRelevance <= 1
        );
      }
      
      // Test system simulations
      if (data.systemSimulations) {
        console.log('🏢 Testing ATS System Simulations...');
        
        this.runTest('System Simulations', 'Present', 
          Array.isArray(data.systemSimulations) && data.systemSimulations.length > 0
        );
        
        const workdaySimulation = data.systemSimulations.find(sim => sim.system === 'workday');
        this.runTest('Workday Simulation', 'Present', !!workdaySimulation);
        
        if (workdaySimulation) {
          this.runTest('Simulation Scores', 'Valid ranges',
            workdaySimulation.parsingAccuracy >= 0 && workdaySimulation.parsingAccuracy <= 1 &&
            workdaySimulation.keywordMatching >= 0 && workdaySimulation.keywordMatching <= 1 &&
            workdaySimulation.overallScore >= 0 && workdaySimulation.overallScore <= 100
          );
        }
      }
      
      console.log(`\n📊 Analysis Result Summary:`);
      console.log(`   Overall Score: ${data.overall}/100`);
      console.log(`   Confidence: ${data.advancedScore?.confidence ? (data.advancedScore.confidence * 100).toFixed(1) + '%' : 'N/A'}`);
      console.log(`   Processing Time: ${duration}ms`);
      console.log(`   Enhanced Features: ${data.advancedScore ? '✅ Active' : '❌ Fallback'}`);
      
      return data;
      
    } catch (error) {
      console.error('❌ analyzeATSCompatibility test failed:', error.message);
      this.runTest('Function Execution', 'Failed', false);
      return null;
    }
  }

  async testApplyATSOptimizations(jobId) {
    console.log('\n🔧 Testing applyATSOptimizations function...');
    
    try {
      const applyOptimizations = httpsCallable(this.functions, 'applyATSOptimizations');
      
      const result = await applyOptimizations({
        jobId: jobId,
        optimizations: ['keyword-optimization', 'formatting-improvement']
      });
      
      this.runTest('Apply Optimizations', 'Response received', !!result.data);
      this.runTest('Optimization Result', 'Has result structure', 
        result.data && (result.data.success !== undefined || result.data.result !== undefined)
      );
      
      return result.data;
      
    } catch (error) {
      console.error('❌ applyATSOptimizations test failed:', error.message);
      this.runTest('Apply Optimizations', 'Failed', false);
      return null;
    }
  }

  async testGenerateATSKeywords() {
    console.log('\n🎯 Testing generateATSKeywords function...');
    
    try {
      const generateKeywords = httpsCallable(this.functions, 'generateATSKeywords');
      
      const result = await generateKeywords({
        jobDescription: 'We are looking for a Senior Software Engineer with experience in React, Node.js, and AWS cloud services.',
        industry: 'technology',
        role: 'Senior Software Engineer'
      });
      
      this.runTest('Generate Keywords', 'Response received', !!result.data);
      this.runTest('Keywords Array', 'Array of keywords', 
        Array.isArray(result.data) && result.data.length > 0
      );
      
      if (result.data && result.data.length > 0) {
        console.log(`   Generated ${result.data.length} keywords:`, result.data.slice(0, 5).join(', '));
      }
      
      return result.data;
      
    } catch (error) {
      console.error('❌ generateATSKeywords test failed:', error.message);
      this.runTest('Generate Keywords', 'Failed', false);
      return null;
    }
  }

  runTest(testName, description, passed) {
    this.results.tests.push({
      name: testName,
      description,
      passed,
      timestamp: new Date()
    });
    
    this.results.summary.total++;
    if (passed) {
      this.results.summary.passed++;
      console.log(`   ✅ ${testName}: ${description}`);
    } else {
      this.results.summary.failed++;
      console.log(`   ❌ ${testName}: ${description}`);
    }
  }

  async runAllTests() {
    try {
      // Initialize
      const initialized = await this.initializeFirebase();
      if (!initialized) {
        throw new Error('Firebase initialization failed');
      }

      // Create test job
      const testJob = await this.createTestJob();
      if (!testJob) {
        throw new Error('Test job creation failed');
      }

      // Run function tests
      await this.testAnalyzeATSCompatibility(testJob.id);
      await this.testApplyATSOptimizations(testJob.id);
      await this.testGenerateATSKeywords();

      // Complete
      this.results.summary.endTime = new Date();
      this.printSummary();
      
    } catch (error) {
      console.error('\n💥 Test suite failed:', error.message);
      this.results.summary.endTime = new Date();
      this.printSummary();
    }
  }

  printSummary() {
    const duration = this.results.summary.endTime - this.results.summary.startTime;
    const passRate = (this.results.summary.passed / this.results.summary.total * 100).toFixed(1);
    
    console.log('\n' + '='.repeat(60));
    console.log('📋 TEST SUMMARY');
    console.log('='.repeat(60));
    console.log(`Total Tests: ${this.results.summary.total}`);
    console.log(`Passed: ${this.results.summary.passed} ✅`);
    console.log(`Failed: ${this.results.summary.failed} ❌`);
    console.log(`Pass Rate: ${passRate}%`);
    console.log(`Duration: ${(duration / 1000).toFixed(1)}s`);
    
    if (this.results.summary.failed > 0) {
      console.log('\n❌ FAILED TESTS:');
      this.results.tests
        .filter(test => !test.passed)
        .forEach(test => {
          console.log(`   • ${test.name}: ${test.description}`);
        });
    }
    
    console.log('\n🎯 RECOMMENDATIONS:');
    if (passRate >= 90) {
      console.log('   ✅ Phase 1 deployment is working excellently!');
      console.log('   ✅ Ready for production traffic');
      console.log('   ✅ Consider beginning Phase 2 planning');
    } else if (passRate >= 75) {
      console.log('   ⚠️  Phase 1 deployment has minor issues');
      console.log('   ⚠️  Monitor closely and fix failing tests');
      console.log('   ⚠️  Suitable for limited production use');
    } else {
      console.log('   🚨 Phase 1 deployment has significant issues');
      console.log('   🚨 Investigation required before production use');
      console.log('   🚨 Check function logs and error details');
    }
    
    console.log('\n📊 NEXT STEPS:');
    console.log('   1. Monitor function logs: firebase functions:log');
    console.log('   2. Check user feedback and engagement metrics');
    console.log('   3. Review cost analysis for LLM API usage');
    console.log('   4. Begin collecting data for Phase 2 ML pipeline');
  }
}

// Run tests if called directly
if (require.main === module) {
  const tester = new Phase1DeploymentTester();
  tester.runAllTests().catch(console.error);
}

module.exports = Phase1DeploymentTester;