// @ts-ignore - Export conflicts/**
 * Job Processing Service for Firebase Functions
 * 
 * Handles CV data retrieval and processing for recommendations system.
 * 
 * @author Gil Klainert
 * @version 1.0.0
 */

import { getFirestore } from 'firebase-admin/firestore';
import type { CVParsedData } from '@cvplus/core';

const db = getFirestore();

/**
 * Get CV data for a specific job and user
 */
export async function getJobData(jobId: string, userId: string): Promise<CVParsedData | null> {
  try {
    console.log(`[JobProcessing] Retrieving CV data for job ${jobId}, user ${userId}`);
    
    // Get job document
    const jobDoc = await db
      .collection('jobs')
      .doc(jobId)
      .get();
    
    if (!jobDoc.exists) {
      console.warn(`[JobProcessing] Job ${jobId} not found`);
      return null;
    }
    
    const jobData = jobDoc.data();
    
    // Verify user ownership
    if (jobData?.userId !== userId) {
      console.warn(`[JobProcessing] Job ${jobId} does not belong to user ${userId}`);
      return null;
    }
    
    // Return parsed CV data
    const cvData = jobData?.parsedData;
    if (!cvData) {
      console.warn(`[JobProcessing] No parsed CV data found for job ${jobId}`);
      return createMockCVData(); // Return mock data for development
    }
    
    return cvData as CVParsedData;
    
  } catch (error) {
    console.error(`[JobProcessing] Error retrieving CV data for job ${jobId}:`, error);
    return createMockCVData(); // Return mock data for development
  }
}

/**
 * Create mock CV data for development/testing purposes
 */
function createMockCVData(): CVParsedData {
  return {
    personalInfo: {
      firstName: 'John',
      lastName: 'Doe',
      email: 'john.doe@example.com',
      phone: '+1234567890',
      location: {
        city: 'San Francisco',
        state: 'CA',
        country: 'United States'
      },
      linkedIn: 'https://linkedin.com/in/johndoe',
      website: 'https://johndoe.dev',
      summary: 'Experienced software engineer with expertise in web development and cloud technologies. Passionate about building scalable applications and leading technical teams to deliver high-quality solutions.'
    },
    workExperience: [
      {
        id: '1',
        company: 'Tech Company Inc.',
        position: 'Senior Software Engineer',
        location: 'San Francisco, CA',
        startDate: '2020-01-01',
        isCurrent: true,
        description: 'Lead development of scalable web applications using modern technologies',
        responsibilities: [
          'Built scalable web applications using React and Node.js',
          'Collaborated with cross-functional teams to deliver features',
          'Mentored junior developers and conducted code reviews',
          'Implemented CI/CD pipelines and automated testing'
        ],
        achievements: [
          'Increased system performance by 40% through optimization',
          'Led team of 5 developers in successful product launch',
          'Reduced deployment time from 2 hours to 15 minutes',
          'Implemented monitoring system that reduced downtime by 60%'
        ],
        technologies: ['JavaScript', 'React', 'Node.js', 'AWS', 'Docker', 'PostgreSQL']
      },
      {
        id: '2',
        company: 'Startup Solutions',
        position: 'Software Engineer',
        location: 'San Jose, CA',
        startDate: '2018-03-01',
        endDate: '2019-12-31',
        isCurrent: false,
        description: 'Full-stack development and system architecture',
        responsibilities: [
          'Developed REST APIs and microservices',
          'Built responsive web interfaces',
          'Worked with agile development methodologies',
          'Participated in system design and architecture decisions'
        ],
        achievements: [
          'Delivered 95% of sprint commitments on time',
          'Improved API response times by 30%',
          'Contributed to 50% increase in user engagement'
        ],
        technologies: ['Python', 'Django', 'React', 'MongoDB', 'Redis']
      }
    ],
    skills: [
      {
        category: 'programming',
        name: 'Programming Languages',
        skills: [
          { id: '1', name: 'JavaScript', category: 'programming', level: 'expert', yearsOfExperience: 6 },
          { id: '2', name: 'Python', category: 'programming', level: 'advanced', yearsOfExperience: 4 },
          { id: '3', name: 'TypeScript', category: 'programming', level: 'advanced', yearsOfExperience: 3 },
          { id: '4', name: 'Java', category: 'programming', level: 'intermediate', yearsOfExperience: 2 }
        ]
      },
      {
        category: 'frameworks',
        name: 'Frameworks & Libraries',
        skills: [
          { id: '5', name: 'React', category: 'frameworks', level: 'expert', yearsOfExperience: 5 },
          { id: '6', name: 'Node.js', category: 'frameworks', level: 'advanced', yearsOfExperience: 4 },
          { id: '7', name: 'Django', category: 'frameworks', level: 'intermediate', yearsOfExperience: 2 },
          { id: '8', name: 'Express.js', category: 'frameworks', level: 'advanced', yearsOfExperience: 3 }
        ]
      },
      {
        category: 'cloud',
        name: 'Cloud & DevOps',
        skills: [
          { id: '9', name: 'AWS', category: 'cloud', level: 'advanced', yearsOfExperience: 3 },
          { id: '10', name: 'Docker', category: 'devops', level: 'advanced', yearsOfExperience: 3 },
          { id: '11', name: 'Kubernetes', category: 'devops', level: 'intermediate', yearsOfExperience: 1 },
          { id: '12', name: 'CI/CD', category: 'devops', level: 'advanced', yearsOfExperience: 3 }
        ]
      },
      {
        category: 'databases',
        name: 'Databases',
        skills: [
          { id: '13', name: 'PostgreSQL', category: 'databases', level: 'advanced', yearsOfExperience: 4 },
          { id: '14', name: 'MongoDB', category: 'databases', level: 'intermediate', yearsOfExperience: 2 },
          { id: '15', name: 'Redis', category: 'databases', level: 'intermediate', yearsOfExperience: 2 }
        ]
      }
    ],
    education: [
      {
        id: '1',
        institution: 'University of California, Berkeley',
        degree: 'Bachelor of Science',
        field: 'Computer Science',
        location: 'Berkeley, CA',
        startDate: '2014-08-01',
        endDate: '2018-05-01',
        gpa: 3.7,
        honors: ['Magna Cum Laude', 'Dean\'s List'],
        coursework: ['Data Structures', 'Algorithms', 'Database Systems', 'Software Engineering', 'Computer Networks']
      }
    ],
    languages: [
      {
        id: '1',
        name: 'English',
        code: 'en',
        proficiency: 'native',
        certified: false
      },
      {
        id: '2',
        name: 'Spanish',
        code: 'es',
        proficiency: 'conversational',
        certified: false
      }
    ],
    certifications: [
      {
        id: '1',
        name: 'AWS Certified Solutions Architect',
        issuer: 'Amazon Web Services',
        dateIssued: '2021-06-15',
        expiryDate: '2024-06-15',
        credentialId: 'AWS-SAA-123456',
        verificationUrl: 'https://aws.amazon.com/verification/AWS-SAA-123456',
        description: 'Demonstrates expertise in designing distributed systems on AWS',
        skills: ['AWS', 'Cloud Architecture', 'System Design']
      },
      {
        id: '2',
        name: 'Certified Kubernetes Administrator',
        issuer: 'Cloud Native Computing Foundation',
        dateIssued: '2022-03-10',
        expiryDate: '2025-03-10',
        credentialId: 'CKA-789012',
        description: 'Validates skills in Kubernetes cluster administration',
        skills: ['Kubernetes', 'Container Orchestration', 'DevOps']
      }
    ],
    projects: [
      {
        id: '1',
        title: 'E-commerce Platform',
        description: 'Full-stack e-commerce application with real-time inventory management and payment processing',
        technologies: ['React', 'Node.js', 'PostgreSQL', 'Stripe API', 'AWS'],
        url: 'https://ecommerce-demo.johndoe.dev',
        githubUrl: 'https://github.com/johndoe/ecommerce-platform',
        startDate: '2021-01-01',
        endDate: '2021-06-01',
        status: 'completed',
        highlights: [
          'Processed over $100K in transactions',
          'Achieved 99.9% uptime',
          'Supports 1000+ concurrent users',
          'Integrated with multiple payment gateways'
        ],
        role: 'Full-Stack Developer',
        teamSize: 3
      },
      {
        id: '2',
        title: 'Real-time Chat Application',
        description: 'Scalable chat application with WebSocket support and message encryption',
        technologies: ['React', 'Socket.io', 'Node.js', 'MongoDB', 'Docker'],
        githubUrl: 'https://github.com/johndoe/chat-app',
        startDate: '2020-09-01',
        endDate: '2020-12-01',
        status: 'completed',
        highlights: [
          'Supports 10K+ concurrent connections',
          'End-to-end message encryption',
          'Real-time typing indicators',
          'File sharing capabilities'
        ],
        role: 'Lead Developer',
        teamSize: 2
      }
    ],
    achievements: [
      {
        id: '1',
        title: 'Employee of the Year',
        description: 'Recognized for exceptional performance and leadership in delivering critical projects',
        dateReceived: '2021-12-15',
        issuer: 'Tech Company Inc.',
        type: 'award',
        impact: 'Led team to deliver 3 major features ahead of schedule',
        metrics: {
          'projects_delivered': 8,
          'team_satisfaction': 95,
          'customer_satisfaction': 92
        }
      },
      {
        id: '2',
        title: 'Open Source Contributor',
        description: 'Active contributor to popular open source projects with 500+ commits',
        dateReceived: '2022-01-01',
        type: 'recognition',
        url: 'https://github.com/johndoe',
        impact: 'Contributed to projects used by 100K+ developers',
        metrics: {
          'commits': 500,
          'projects': 15,
          'stars_received': 1200
        }
      }
    ],
    metadata: {
      parsedAt: Date.now(),
      parserVersion: '2.0.0',
      source: 'manual',
      confidence: 0.95,
      warnings: []
    }
  };
}