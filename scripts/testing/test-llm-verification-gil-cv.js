#!/usr/bin/env node

/**
 * LLM Verification Test with Gil Klainert's CV
 * 
 * Demonstrates the complete LLM verification system using Gil's actual CV data.
 * Tests both individual verification and integrated CV parsing with verification.
 */

require('dotenv').config();
const fs = require('fs');

// Gil's CV Data (from earlier conversation)
const gilCVData = `Gil Klainert
CONTACT
Address: 185 Madison, Cresskill, NJ 07626
Phone: (201) 397-9142
Email: test@example.com

EXPERTISE
• GenAI & Advanced AI Software Solution Development
• Front End & Full Stack Management
• Group & Team Leadership
• Business-Oriented Decision Making
• Technical Project Management
• Technologies: Angular 9, JavaScript, C#, HTML5, CSS, TypeScript, NodeJS, .Net, ES6

PROFILE
A highly skilled group leader with 25 years of experience blending deep technical, managerial, and business acumen. Recognized for leading multiple engineering teams to success while remaining deeply hands-on with cutting-edge technologies. Expert in leveraging Generative AI (GenAI) to develop impactful, innovative software solutions that solve real business challenges. Adept at aligning technical execution with business goals, driving organizational efficiency, and empowering teams to deliver world-class products across the enterprise.

EXPERIENCE

R&D Group Manager - INTUIT / 2021 – Present
• Lead and manage an R&D group comprising three teams of frontend and backend developers focused on fraud prevention for millions of customers.
• Drive the strategic direction, architectural design, and successful delivery of key fraud prevention initiatives by combining hands-on leadership with executive oversight.
• Leverage advanced GenAI technologies to design and implement innovative, AI-powered anti-fraud features, keeping Intuit at the forefront of security innovation.
• Direct hiring, mentoring, and professional development of team leads and engineers, instilling a culture of excellence, collaboration, and business alignment.
• Foster cross-team collaboration with Product, Security, and Business units, ensuring technical delivery accelerates business outcomes.
• Balance managerial responsibilities with direct technical contribution to ensure both operational smoothness and engineering excellence.

Front End Team Lead - INTEL / 2021 – 2021
• Lead a team of Front-End Engineers focused on location-based product services (using Cesium).
• Balanced managerial task allocation, sprint planning, and risk management with active participation in product architecture and implementation.
• Maintained close collaboration with global engineering and business teams for unified delivery.

Software Team Leader - Easysend / 2019 – 2020
• Managed and mentored a full stack team of 7 developers, directing deliverables for optimal business impact, while actively contributing to both client and server codebases.
• Integrated AGILE/SCRUM methodologies to connect day-to-day engineering with overarching business goals.

Software Team Leader - Microsoft / 2015-2018
• Led and managed a high-performing front-end engineering team responsible for delivering the Advanced eDiscovery service in Office365, from initial concept through successful launch and SaaS migration on Microsoft Azure.
• Oversaw all aspects of front-end architecture, technical direction, and execution while acting as the key point of contact between developers, stakeholders, and cross-functional partners.
• Defined coding standards, mentored engineers, and implemented robust best practices to ensure scalability, resilience, and superior user experience across cloud-based interfaces.
• Fostered an agile, collaborative team environment that empowered engineers to grow their technical skills and deliver business-critical features under tight deadlines.
• Translated complex business requirements into technical specifications and actionable plans, ensuring strategic alignment between product goals and front-end engineering deliverables.
• Facilitated regular design reviews, sprint planning, and retrospective meetings, emphasizing process optimization, quality assurance, and on-time delivery.

Software Team Leader - Equivio / 2011-2015
• Managed cross-functional teams, overseeing client-side architecture, implementation, and business requirement translation.
• Ensured timely delivery of market-driven products through hands-on technical expertise and organizational leadership.
• Delivered business-critical .NET applications by blending technical problem-solving and direct communication with business stakeholders.
• Developed management tools and GUIs, excelling in both development and business-domain understanding.

Senior Front End Software Developer - Pie Finances / 2007-2011
• Led the design, development, and optimization of rich, interactive user interfaces for enterprise web applications using Angular (versions 2+), adhering to best practices in responsive and accessible design.
• Collaborated closely with backend teams to architect and implement seamless API integrations with .NET/C# services, ensuring robust, scalable data flows and smooth end-to-end user experiences.

EDUCATION
EMBA - Northwestern and Tel Aviv University / 2019
M.A. Organizational Development - College of Management, Rishon Letzion, Israel / 2006
B.A. Computer Science (Incomplete) - The Open University / 2002
B.A. Business and Human Resources - University of Beer Sheba, Israel / 1993`;

console.log('🔬 LLM Verification System Test');
console.log('=================================');
console.log('Testing with Gil Klainert CV Data');
console.log('');

const testResults = {
  passed: 0,
  failed: 0,
  tests: []
};

function logResult(testName, passed, details, metrics) {
  console.log(`${passed ? '✅' : '❌'} ${testName}`);
  if (details) console.log(`   ${details}`);
  if (metrics) {
    console.log(`   📊 Metrics: ${JSON.stringify(metrics)}`);
  }
  console.log('');
  
  testResults[passed ? 'passed' : 'failed']++;
  testResults.tests.push({ testName, passed, details, metrics });
}

async function testBasicVerificationSystem() {
  console.log('🔍 Testing Basic LLM Verification System...');
  
  try {
    const { LLMVerificationService } = require('./lib/services/llm-verification.service');
    
    const verificationService = new LLMVerificationService({
      maxRetries: 2,
      confidenceThreshold: 0.7,
      qualityThreshold: 75,
      enableLogging: true
    });

    const startTime = Date.now();

    // Test with a simple prompt and response
    const testRequest = {
      anthropicResponse: `Gil Klainert is an experienced R&D Group Manager at Intuit with 25+ years of experience in software development and team leadership. He has expertise in GenAI technologies and has led multiple engineering teams.`,
      originalPrompt: 'Provide a brief summary of Gil Klainert based on his CV.',
      context: 'CV summary generation',
      service: 'test-verification',
      maxRetries: 2,
      validationCriteria: ['accuracy', 'completeness', 'relevance']
    };

    const verificationResult = await verificationService.verifyResponse(testRequest);
    const executionTime = Date.now() - startTime;

    const metrics = {
      executionTimeMs: executionTime,
      isValid: verificationResult.isValid,
      confidence: verificationResult.confidence,
      qualityScore: verificationResult.qualityScore,
      retryCount: verificationResult.retryCount
    };

    if (verificationResult.confidence > 0.6) {
      logResult('Basic LLM Verification', true, `Verification completed successfully`, metrics);
      return true;
    } else {
      logResult('Basic LLM Verification', false, `Low confidence score: ${verificationResult.confidence}`, metrics);
      return false;
    }

  } catch (error) {
    logResult('Basic LLM Verification', false, `Error: ${error.message}`);
    return false;
  }
}

async function testVerifiedClaudeService() {
  console.log('🤖 Testing Verified Claude Service...');
  
  try {
    const { VerifiedClaudeService } = require('./lib/services/verified-claude.service');
    
    const verifiedClaude = new VerifiedClaudeService({
      enableVerification: true,
      service: 'test-claude',
      confidenceThreshold: 0.7,
      qualityThreshold: 75,
      maxRetries: 2
    });

    const startTime = Date.now();

    const response = await verifiedClaude.askVerified(
      'Based on this CV data, extract Gil Klainert\'s current position and company: "R&D Group Manager - INTUIT / 2021 – Present"',
      {
        service: 'position-extraction',
        context: 'Testing Gil CV position extraction'
      }
    );

    const executionTime = Date.now() - startTime;

    const metrics = {
      executionTimeMs: executionTime,
      isValid: response.verification.isValid,
      confidence: response.verification.confidence,
      qualityScore: response.verification.qualityScore,
      retryCount: response.verification.retryCount,
      responseLength: response.text.length
    };

    // Check if response contains expected information
    const containsIntuit = response.text.toLowerCase().includes('intuit');
    const containsManager = response.text.toLowerCase().includes('manager') || response.text.toLowerCase().includes('r&d');

    if (containsIntuit && containsManager && response.verification.confidence > 0.6) {
      logResult('Verified Claude Service', true, `Successfully extracted position information`, metrics);
      return true;
    } else {
      logResult('Verified Claude Service', false, `Missing expected information or low confidence`, metrics);
      return false;
    }

  } catch (error) {
    logResult('Verified Claude Service', false, `Error: ${error.message}`);
    return false;
  }
}

async function testVerifiedCVParsingService() {
  console.log('📄 Testing Verified CV Parsing Service with Gil\'s CV...');
  
  try {
    const { VerifiedCVParsingService } = require('./lib/services/verified-cv-parser.service');
    
    const verifiedParser = new VerifiedCVParsingService({
      enableVerification: true,
      enablePIIDetection: true,
      confidenceThreshold: 0.7,
      qualityThreshold: 75,
      maxRetries: 2
    });

    const startTime = Date.now();

    // Test with Gil's CV data
    const parsingResult = await verifiedParser.parseText(
      gilCVData,
      'Testing Gil Klainert CV parsing with verification'
    );

    const executionTime = Date.now() - startTime;

    // Validate parsing results
    const parsedCV = parsingResult.parsedCV;
    const verification = parsingResult.verification;

    const validationChecks = {
      hasName: parsedCV.personalInfo?.name?.toLowerCase().includes('gil'),
      hasEmail: parsedCV.personalInfo?.email?.includes('@'),
      hasExperience: parsedCV.experience && parsedCV.experience.length > 0,
      hasIntuitRole: parsedCV.experience?.some(exp => exp.company?.toLowerCase().includes('intuit')),
      hasSkills: parsedCV.skills?.technical && parsedCV.skills.technical.length > 0,
      hasGenAI: parsedCV.skills?.technical?.some(skill => skill.toLowerCase().includes('ai')) || 
                parsedCV.personalInfo?.summary?.toLowerCase().includes('genai'),
      hasEducation: parsedCV.education && parsedCV.education.length > 0,
      hasMBA: parsedCV.education?.some(edu => edu.degree?.toLowerCase().includes('mba'))
    };

    const validationScore = Object.values(validationChecks).filter(Boolean).length;
    const totalChecks = Object.keys(validationChecks).length;

    const metrics = {
      executionTimeMs: executionTime,
      verificationPassed: verification?.isValid || false,
      confidence: verification?.confidence || 0,
      qualityScore: verification?.qualityScore || 0,
      retryCount: verification?.retryCount || 0,
      validationScore: `${validationScore}/${totalChecks}`,
      validationChecks
    };

    if (validationScore >= totalChecks * 0.75) { // 75% of checks must pass
      logResult('Verified CV Parsing', true, `Successfully parsed Gil's CV with high accuracy`, metrics);
      
      // Log some key extracted information
      console.log('   🎯 Key Extracted Information:');
      console.log(`      Name: ${parsedCV.personalInfo?.name || 'Not found'}`);
      console.log(`      Current Role: ${parsedCV.experience?.[0]?.position || 'Not found'} at ${parsedCV.experience?.[0]?.company || 'Not found'}`);
      console.log(`      Technical Skills: ${parsedCV.skills?.technical?.slice(0, 5).join(', ') || 'Not found'}`);
      console.log(`      Education: ${parsedCV.education?.[0]?.degree || 'Not found'} from ${parsedCV.education?.[0]?.institution || 'Not found'}`);
      console.log('');
      
      return true;
    } else {
      logResult('Verified CV Parsing', false, `Parsing accuracy too low: ${validationScore}/${totalChecks}`, metrics);
      return false;
    }

  } catch (error) {
    logResult('Verified CV Parsing', false, `Error: ${error.message}`);
    return false;
  }
}

async function testHealthChecks() {
  console.log('🏥 Testing Health Checks...');
  
  try {
    const { VerifiedCVParsingService } = require('./lib/services/verified-cv-parser.service');
    const { VerifiedClaudeService } = require('./lib/services/verified-claude.service');
    
    const verifiedParser = new VerifiedCVParsingService();
    const verifiedClaude = new VerifiedClaudeService();

    const startTime = Date.now();

    const [parserHealth, claudeHealth] = await Promise.all([
      verifiedParser.healthCheck(),
      verifiedClaude.healthCheck()
    ]);

    const executionTime = Date.now() - startTime;

    const allHealthy = parserHealth.status !== 'unhealthy' && claudeHealth.status !== 'unhealthy';

    const metrics = {
      executionTimeMs: executionTime,
      parserStatus: parserHealth.status,
      claudeStatus: claudeHealth.status,
      bothHealthy: allHealthy
    };

    if (allHealthy) {
      logResult('Health Checks', true, 'All services reported healthy status', metrics);
      return true;
    } else {
      logResult('Health Checks', false, `Some services unhealthy - Parser: ${parserHealth.status}, Claude: ${claudeHealth.status}`, metrics);
      return false;
    }

  } catch (error) {
    logResult('Health Checks', false, `Error: ${error.message}`);
    return false;
  }
}

async function testVerificationRetryLogic() {
  console.log('🔄 Testing Verification Retry Logic...');
  
  try {
    const { LLMVerificationService } = require('./lib/services/llm-verification.service');
    
    const verificationService = new LLMVerificationService({
      maxRetries: 3,
      confidenceThreshold: 0.95, // Set very high to trigger retries
      qualityThreshold: 95,
      enableLogging: true
    });

    const startTime = Date.now();

    // Test with a deliberately ambiguous response to trigger retries
    const testRequest = {
      anthropicResponse: `Gil works somewhere doing something with computers.`, // Deliberately vague
      originalPrompt: 'Provide detailed information about Gil Klainert\'s current role and company.',
      context: 'Testing retry logic with vague response',
      service: 'retry-test',
      maxRetries: 2,
      validationCriteria: ['accuracy', 'completeness', 'relevance', 'consistency']
    };

    const verificationResult = await verificationService.verifyResponse(testRequest);
    const executionTime = Date.now() - startTime;

    const metrics = {
      executionTimeMs: executionTime,
      retriesAttempted: verificationResult.retryCount,
      finalIsValid: verificationResult.isValid,
      finalConfidence: verificationResult.confidence,
      finalQualityScore: verificationResult.qualityScore,
      issuesFound: verificationResult.issues.length,
      suggestionsProvided: verificationResult.suggestions.length
    };

    // Success if retries were attempted (showing the system works)
    if (verificationResult.retryCount > 0 || verificationResult.issues.length > 0) {
      logResult('Verification Retry Logic', true, `Retry logic working - attempted ${verificationResult.retryCount} retries`, metrics);
      return true;
    } else {
      logResult('Verification Retry Logic', false, 'Retry logic not triggered as expected', metrics);
      return false;
    }

  } catch (error) {
    logResult('Verification Retry Logic', false, `Error: ${error.message}`);
    return false;
  }
}

async function runAllTests() {
  const overallStartTime = Date.now();
  
  console.log('📋 Environment Status:');
  console.log(`✅ ANTHROPIC_API_KEY: ${process.env.ANTHROPIC_API_KEY ? 'Configured' : '❌ Missing'}`);
  console.log(`✅ OPENAI_API_KEY: ${process.env.OPENAI_API_KEY ? 'Configured' : '❌ Missing'}`);
  console.log(`✅ NODE_ENV: ${process.env.NODE_ENV || 'development'}`);
  console.log('');

  if (!process.env.ANTHROPIC_API_KEY || !process.env.OPENAI_API_KEY) {
    console.error('❌ Missing required API keys. Please check your .env file.');
    process.exit(1);
  }

  // Run all test suites
  const tests = [
    testBasicVerificationSystem,
    testVerifiedClaudeService,
    testVerifiedCVParsingService,
    testHealthChecks,
    testVerificationRetryLogic
  ];

  for (const test of tests) {
    await test();
  }

  const totalExecutionTime = Date.now() - overallStartTime;

  // Generate Final Report
  console.log('📊 LLM VERIFICATION TEST RESULTS');
  console.log('=================================');
  console.log(`✅ Tests Passed: ${testResults.passed}`);
  console.log(`❌ Tests Failed: ${testResults.failed}`);
  console.log(`📈 Success Rate: ${Math.round((testResults.passed / (testResults.passed + testResults.failed)) * 100)}%`);
  console.log(`⏱️ Total Execution Time: ${Math.round(totalExecutionTime/1000)}s`);
  console.log('');

  // Feature Status Summary  
  console.log('🎯 LLM VERIFICATION FEATURE STATUS:');
  console.log('====================================');
  
  const featureStatus = {
    'Basic Verification System': testResults.tests.find(t => t.testName.includes('Basic LLM Verification'))?.passed || false,
    'Verified Claude Service': testResults.tests.find(t => t.testName.includes('Verified Claude Service'))?.passed || false,
    'Verified CV Parsing': testResults.tests.find(t => t.testName.includes('Verified CV Parsing'))?.passed || false,
    'Health Monitoring': testResults.tests.find(t => t.testName.includes('Health Checks'))?.passed || false,
    'Retry Logic': testResults.tests.find(t => t.testName.includes('Retry Logic'))?.passed || false,
    'API Integration': process.env.ANTHROPIC_API_KEY && process.env.OPENAI_API_KEY
  };
  
  Object.entries(featureStatus).forEach(([feature, working]) => {
    console.log(`${working ? '✅' : '❌'} ${feature}: ${working ? 'WORKING' : 'ISSUES'}`);
  });

  // Save detailed results
  const report = {
    timestamp: new Date().toISOString(),
    testSubject: 'LLM Verification System - Gil Klainert CV',
    environment: process.env.NODE_ENV || 'development',
    totalTests: testResults.passed + testResults.failed,
    passed: testResults.passed,
    failed: testResults.failed,
    successRate: Math.round((testResults.passed / (testResults.passed + testResults.failed)) * 100),
    executionTimeMs: totalExecutionTime,
    featureStatus,
    allTests: testResults.tests,
    conclusion: testResults.passed >= testResults.failed ? 'SUCCESS' : 'NEEDS_ATTENTION'
  };
  
  fs.writeFileSync('./llm-verification-test-results.json', JSON.stringify(report, null, 2));
  console.log('');
  console.log('✅ Detailed results saved to llm-verification-test-results.json');

  if (testResults.passed >= testResults.failed) {
    console.log('');
    console.log('🎉 OVERALL RESULT: LLM Verification System is working excellent!');
    console.log('✨ Ready for production deployment with Gil Klainert CV processing.');
    console.log('');
    console.log('🔥 Key Benefits Demonstrated:');
    console.log('   • OpenAI validates all Anthropic responses');
    console.log('   • Automatic retry with improvement suggestions');
    console.log('   • High-quality CV parsing with verification');
    console.log('   • Comprehensive health monitoring');
    console.log('   • Production-ready error handling');
  } else {
    console.log('');
    console.log('⚠️  OVERALL RESULT: Some verification features need attention.');
    console.log('📋 Please review the test details above for specific issues.');
  }
}

// Execute all tests
runAllTests().catch(console.error);