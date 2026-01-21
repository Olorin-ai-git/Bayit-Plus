#!/usr/bin/env node
/**
 * Seed Recommendations Script
 * Manually add test recommendations to the job document for frontend testing
 */

const admin = require('firebase-admin');

// Initialize Firebase Admin
admin.initializeApp({
  projectId: 'getmycv-ai'
});

const firestore = admin.firestore();
firestore.settings({
  host: 'localhost:8090',
  ssl: false
});

async function seedRecommendations() {
  const jobId = 'HS7MAXk3GHaqdXjrujkP';
  
  console.log('🌱 Seeding recommendations for job:', jobId);
  
  // Create comprehensive test recommendations
  const recommendations = [
    {
      id: 'seed_rec_001',
      type: 'content',
      category: 'professional_summary',
      section: 'Professional Summary',
      actionRequired: 'modify',
      title: 'Enhance Professional Summary',
      description: 'Create a compelling professional summary that highlights your key achievements and career objectives with quantifiable results.',
      suggestedContent: 'Consider adding: "Results-driven software engineer with 5+ years of experience developing scalable web applications. Successfully led 3 major product launches, improving user engagement by 40% and reducing system downtime by 25%. Expertise in JavaScript, React, and Node.js with a passion for creating innovative solutions."',
      currentContent: 'Software engineer with experience in web development.',
      impact: 'high',
      priority: 9,
      estimatedScoreImprovement: 18
    },
    {
      id: 'seed_rec_002',
      type: 'content',
      category: 'skills',
      section: 'Skills',
      actionRequired: 'reformat',
      title: 'Optimize Technical Skills Section',
      description: 'Reorganize skills into categories and include relevant keywords for ATS compatibility and better readability.',
      suggestedContent: 'Technical Skills: JavaScript, TypeScript, React, Node.js, Python, AWS, Docker\nFrameworks: Express.js, Next.js, Vue.js\nDatabases: PostgreSQL, MongoDB, Redis\nTools: Git, Jenkins, Kubernetes, Terraform',
      impact: 'high',
      priority: 8,
      estimatedScoreImprovement: 15
    },
    {
      id: 'seed_rec_003',
      type: 'content',
      category: 'experience',
      section: 'Experience',
      actionRequired: 'modify',
      title: 'Add Quantifiable Achievements to Work Experience',
      description: 'Transform job descriptions into achievement-focused bullet points with specific metrics and measurable outcomes.',
      suggestedContent: '• Led development of microservices architecture, reducing API response time by 35%\n• Implemented automated testing pipeline, increasing code coverage from 60% to 95%\n• Mentored 4 junior developers, resulting in 50% faster onboarding time\n• Optimized database queries, improving application performance by 40%',
      impact: 'high',
      priority: 7,
      estimatedScoreImprovement: 20
    },
    {
      id: 'seed_rec_004',
      type: 'structure',
      category: 'education',
      section: 'Education',
      actionRequired: 'modify',
      title: 'Enhance Education Section',
      description: 'Add relevant coursework, honors, and certifications to strengthen your educational background.',
      suggestedContent: 'Bachelor of Science in Computer Science\nUniversity Name, Graduation Year\nRelevant Coursework: Data Structures, Algorithms, Software Engineering, Database Design\nHonors: Dean\'s List (3 semesters), Cum Laude',
      impact: 'medium',
      priority: 5,
      estimatedScoreImprovement: 8
    },
    {
      id: 'seed_rec_005',
      type: 'formatting',
      category: 'formatting',
      section: 'General',
      actionRequired: 'reformat',
      title: 'Improve CV Formatting and Structure',
      description: 'Enhance visual appeal and readability with consistent formatting, proper spacing, and professional typography.',
      suggestedContent: 'Use consistent bullet points, appropriate white space, professional fonts (Arial/Calibri), and clear section headers. Ensure contact information is prominently displayed at the top.',
      impact: 'medium',
      priority: 6,
      estimatedScoreImprovement: 10
    },
    {
      id: 'seed_rec_006',
      type: 'content',
      category: 'projects',
      section: 'Projects',
      actionRequired: 'add',
      title: 'Add Notable Projects Section',
      description: 'Include relevant projects that demonstrate your technical skills and problem-solving abilities.',
      suggestedContent: 'E-commerce Platform (React, Node.js, PostgreSQL)\n• Built full-stack application handling 1000+ daily users\n• Implemented secure payment processing with Stripe integration\n• Deployed using Docker and AWS ECS with 99.9% uptime',
      impact: 'medium',
      priority: 4,
      estimatedScoreImprovement: 12
    },
    {
      id: 'seed_rec_007',
      type: 'content',
      category: 'keywords',
      section: 'General',
      actionRequired: 'modify',
      title: 'Include Industry Keywords',
      description: 'Incorporate relevant software engineering keywords to improve ATS compatibility and searchability.',
      suggestedContent: 'Include keywords like: Agile development, CI/CD, cloud computing, DevOps, full-stack development, API design, scalable systems, software architecture, code review, unit testing',
      impact: 'medium',
      priority: 3,
      estimatedScoreImprovement: 9
    }
  ];
  
  try {
    // Update the job document with recommendations
    await firestore.collection('jobs').doc(jobId).update({
      cvRecommendations: recommendations,
      lastRecommendationGeneration: new Date().toISOString(),
      seedGeneratedAt: new Date().toISOString(),
      recommendationCount: recommendations.length,
      status: 'analyzed' // Ensure status shows as analyzed
    });
    
    console.log(`✅ Successfully seeded ${recommendations.length} recommendations`);
    console.log('📊 Recommendation breakdown:');
    console.log(`   - High priority: ${recommendations.filter(r => r.priority >= 7).length}`);
    console.log(`   - Medium priority: ${recommendations.filter(r => r.priority >= 4 && r.priority < 7).length}`);
    console.log(`   - Low priority: ${recommendations.filter(r => r.priority < 4).length}`);
    console.log(`   - Total potential score improvement: ${recommendations.reduce((sum, r) => sum + r.estimatedScoreImprovement, 0)} points`);
    
    console.log('\n🎯 Frontend testing ready!');
    console.log('The job now has comprehensive recommendations that the frontend can load and display.');
    
  } catch (error) {
    console.error('❌ Failed to seed recommendations:', error);
  }
  
  process.exit(0);
}

seedRecommendations();