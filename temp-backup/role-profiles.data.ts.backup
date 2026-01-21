/**
 * Role Profiles Data
 * 
 * Comprehensive role profile definitions for the ten core domains:
 * - Software Engineer
 * - Engineering Manager  
 * - HR Specialist
 * - AI Product Expert
 * - Data Scientist
 * - Digital Marketing Specialist
 * - UI/UX Designer
 * - Business Analyst
 * - Project Manager
 * - DevOps Engineer
 */

import {
  RoleProfile,
  RoleCategory,
  ExperienceLevel,
  CVSection
} from '../types/role-profile.types';

export const roleProfilesData: Omit<RoleProfile, 'id' | 'createdAt' | 'updatedAt'>[] = [
  // Software Engineer Profile
  {
    name: 'Software Engineer',
    category: RoleCategory.ENGINEERING,
    description: 'Designs, develops, and maintains software applications using various programming languages and frameworks. Focuses on writing clean, efficient code and collaborating with cross-functional teams.',
    keywords: [
      'software development', 'programming', 'coding', 'application development',
      'web development', 'mobile development', 'full-stack', 'backend', 'frontend',
      'APIs', 'databases', 'testing', 'debugging', 'version control', 'agile'
    ],
    requiredSkills: [
      'JavaScript', 'Python', 'Java', 'C++', 'Git', 'SQL', 'HTML/CSS',
      'Data Structures', 'Algorithms', 'Object-Oriented Programming'
    ],
    preferredSkills: [
      'React', 'Node.js', 'TypeScript', 'AWS', 'Docker', 'Kubernetes',
      'MongoDB', 'PostgreSQL', 'REST APIs', 'GraphQL', 'Testing Frameworks',
      'CI/CD', 'Linux', 'System Design', 'Microservices'
    ],
    experienceLevel: ExperienceLevel.MID,
    industryFocus: ['Technology', 'Fintech', 'Healthcare', 'E-commerce', 'SaaS'],
    
    matchingCriteria: {
      titleKeywords: [
        'software engineer', 'software developer', 'full stack developer',
        'backend developer', 'frontend developer', 'web developer',
        'application developer', 'systems engineer', 'programmer'
      ],
      skillKeywords: [
        'javascript', 'python', 'java', 'react', 'node.js', 'sql',
        'git', 'html', 'css', 'api', 'database', 'testing', 'agile'
      ],
      industryKeywords: [
        'tech', 'technology', 'software', 'startup', 'fintech',
        'saas', 'e-commerce', 'digital', 'platform'
      ],
      experienceKeywords: [
        'developed', 'built', 'implemented', 'designed', 'created',
        'maintained', 'optimized', 'debugged', 'tested', 'deployed',
        'collaborated', 'integrated', 'automated', 'refactored'
      ],
      educationKeywords: [
        'computer science', 'software engineering', 'computer engineering',
        'information technology', 'mathematics', 'engineering'
      ]
    },
    
    enhancementTemplates: {
      professionalSummary: 'Experienced Software Engineer with [X] years of expertise in [PRIMARY TECHNOLOGIES]. Proven track record of developing scalable applications that serve [USER COUNT] users and processing [DATA VOLUME] daily. Skilled in full-stack development with strong foundation in [TECHNICAL EXPERTISE] and passion for solving complex technical challenges.',
      
      skillsStructure: {
        categories: [
          {
            name: 'Programming Languages',
            skills: ['JavaScript', 'Python', 'Java', 'TypeScript', 'C++', 'Go'],
            priority: 1
          },
          {
            name: 'Frontend Technologies',
            skills: ['React', 'Vue.js', 'Angular', 'HTML5', 'CSS3', 'SASS'],
            priority: 2
          },
          {
            name: 'Backend Technologies',
            skills: ['Node.js', 'Express.js', 'Django', 'Spring Boot', 'FastAPI'],
            priority: 2
          },
          {
            name: 'Databases',
            skills: ['PostgreSQL', 'MongoDB', 'Redis', 'MySQL', 'DynamoDB'],
            priority: 3
          },
          {
            name: 'Cloud & DevOps',
            skills: ['AWS', 'Docker', 'Kubernetes', 'CI/CD', 'Jenkins', 'GitHub Actions'],
            priority: 3
          },
          {
            name: 'Tools & Methodologies',
            skills: ['Git', 'Jest', 'Agile', 'Scrum', 'TDD', 'REST APIs'],
            priority: 4
          }
        ],
        displayFormat: 'categorized',
        maxSkillsPerCategory: 8
      },
      
      experienceEnhancements: [
        {
          roleLevel: 'junior',
          bulletPointTemplate: 'Developed [FEATURE/COMPONENT] using [TECHNOLOGY] resulting in [QUANTIFIABLE_OUTCOME]',
          achievementTemplate: 'Successfully implemented [PROJECT] which improved [METRIC] by [PERCENTAGE]',
          quantificationGuide: 'Include metrics like performance improvements, user engagement, code coverage, or bug reduction',
          actionVerbs: ['Developed', 'Built', 'Implemented', 'Created', 'Designed', 'Contributed', 'Collaborated']
        },
        {
          roleLevel: 'mid',
          bulletPointTemplate: 'Architected and developed [SYSTEM/FEATURE] serving [USER_COUNT] users, improving [PERFORMANCE_METRIC] by [PERCENTAGE]',
          achievementTemplate: 'Led development of [PROJECT] resulting in [BUSINESS_IMPACT] and [TECHNICAL_IMPROVEMENT]',
          quantificationGuide: 'Focus on scalability, performance, user impact, and technical leadership',
          actionVerbs: ['Architected', 'Led', 'Optimized', 'Scaled', 'Mentored', 'Delivered', 'Integrated']
        },
        {
          roleLevel: 'senior',
          bulletPointTemplate: 'Spearheaded [INITIATIVE] across [TEAM_SIZE] teams, reducing [METRIC] by [PERCENTAGE] and enabling [BUSINESS_OUTCOME]',
          achievementTemplate: 'Designed and implemented [ARCHITECTURE] supporting [SCALE] concurrent users with [RELIABILITY_METRIC] uptime',
          quantificationGuide: 'Emphasize system design, cross-team impact, mentoring, and business value',
          actionVerbs: ['Spearheaded', 'Architected', 'Mentored', 'Influenced', 'Established', 'Transformed']
        }
      ],
      
      achievementTemplates: [
        'Built a [PRODUCT/FEATURE] that increased user engagement by [PERCENTAGE]',
        'Optimized application performance, reducing load times by [TIME] and server costs by [AMOUNT]',
        'Implemented automated testing suite achieving [PERCENTAGE] code coverage',
        'Delivered [NUMBER] production releases with zero downtime',
        'Mentored [NUMBER] junior developers on best practices and code quality'
      ],
      
      keywordOptimization: [
        'agile development', 'test-driven development', 'code review',
        'performance optimization', 'scalable architecture', 'API design',
        'database optimization', 'security best practices', 'clean code',
        'continuous integration', 'microservices', 'cloud computing'
      ]
    },
    
    validationRules: {
      requiredSections: [
        CVSection.PROFESSIONAL_SUMMARY,
        CVSection.EXPERIENCE,
        CVSection.SKILLS,
        CVSection.EDUCATION
      ],
      optionalSections: [
        CVSection.PROJECTS,
        CVSection.CERTIFICATIONS,
        CVSection.ACHIEVEMENTS
      ],
      minExperienceYears: 2,
      criticalSkills: ['Programming Languages', 'Version Control', 'Problem Solving']
    },
    
    version: '1.0.0',
    isActive: true
  },

  // Engineering Manager Profile
  {
    name: 'Engineering Manager',
    category: RoleCategory.MANAGEMENT,
    description: 'Leads and manages engineering teams while maintaining technical expertise. Balances people management, project delivery, and technical strategy to drive team success and product development.',
    keywords: [
      'team leadership', 'people management', 'technical leadership', 'project management',
      'software development', 'agile', 'scrum', 'team building', 'mentoring',
      'performance management', 'hiring', 'strategy', 'cross-functional collaboration'
    ],
    requiredSkills: [
      'Team Leadership', 'People Management', 'Project Management', 'Technical Strategy',
      'Agile/Scrum', 'Performance Management', 'Hiring', 'Communication', 'Mentoring'
    ],
    preferredSkills: [
      'Software Development', 'System Architecture', 'Product Management',
      'Stakeholder Management', 'OKRs', 'Budget Management', 'Process Improvement',
      'Cross-functional Collaboration', 'Technical Roadmapping', 'Risk Management'
    ],
    experienceLevel: ExperienceLevel.SENIOR,
    industryFocus: ['Technology', 'Fintech', 'Healthcare', 'E-commerce', 'SaaS', 'Consulting'],
    
    matchingCriteria: {
      titleKeywords: [
        'engineering manager', 'team lead', 'technical manager', 'development manager',
        'software engineering manager', 'technical lead', 'team leader',
        'engineering director', 'head of engineering'
      ],
      skillKeywords: [
        'team leadership', 'people management', 'project management', 'agile',
        'scrum', 'mentoring', 'hiring', 'performance management', 'strategy'
      ],
      industryKeywords: [
        'tech', 'technology', 'software', 'startup', 'fintech',
        'saas', 'enterprise', 'digital', 'platform'
      ],
      experienceKeywords: [
        'led', 'managed', 'mentored', 'hired', 'built', 'scaled',
        'delivered', 'collaborated', 'coordinated', 'facilitated',
        'established', 'improved', 'developed', 'guided'
      ],
      educationKeywords: [
        'computer science', 'engineering', 'mba', 'management',
        'business administration', 'technology management'
      ]
    },
    
    enhancementTemplates: {
      professionalSummary: 'Results-driven Engineering Manager with [X] years of experience leading high-performing teams of [TEAM_SIZE] engineers. Successfully delivered [NUMBER] major products/features serving [USER_BASE] users while maintaining [QUALITY_METRIC]. Expertise in scaling engineering organizations, implementing agile practices, and driving technical strategy aligned with business objectives.',
      
      skillsStructure: {
        categories: [
          {
            name: 'Leadership & Management',
            skills: ['Team Leadership', 'People Management', 'Performance Management', 'Mentoring', 'Hiring'],
            priority: 1
          },
          {
            name: 'Project & Process Management',
            skills: ['Agile/Scrum', 'Project Management', 'Process Improvement', 'OKRs', 'Risk Management'],
            priority: 2
          },
          {
            name: 'Technical Skills',
            skills: ['Software Development', 'System Architecture', 'Technical Strategy', 'Code Review'],
            priority: 3
          },
          {
            name: 'Business & Strategy',
            skills: ['Stakeholder Management', 'Product Strategy', 'Budget Management', 'Cross-functional Collaboration'],
            priority: 3
          }
        ],
        displayFormat: 'categorized',
        maxSkillsPerCategory: 6
      },
      
      experienceEnhancements: [
        {
          roleLevel: 'mid',
          bulletPointTemplate: 'Led team of [TEAM_SIZE] engineers delivering [PROJECT/PRODUCT] resulting in [BUSINESS_IMPACT]',
          achievementTemplate: 'Built and scaled engineering team from [INITIAL_SIZE] to [FINAL_SIZE] while maintaining [QUALITY_METRIC]',
          quantificationGuide: 'Focus on team size, delivery metrics, business impact, and process improvements',
          actionVerbs: ['Led', 'Managed', 'Built', 'Scaled', 'Delivered', 'Established', 'Improved']
        },
        {
          roleLevel: 'senior',
          bulletPointTemplate: 'Directed [NUMBER] cross-functional teams across [PROJECTS/INITIATIVES], achieving [OUTCOME] and improving [METRIC] by [PERCENTAGE]',
          achievementTemplate: 'Established engineering practices and processes that reduced [METRIC] by [PERCENTAGE] across [SCOPE]',
          quantificationGuide: 'Emphasize organizational impact, process improvements, and strategic initiatives',
          actionVerbs: ['Directed', 'Established', 'Transformed', 'Architected', 'Influenced', 'Championed']
        }
      ],
      
      achievementTemplates: [
        'Built and led a team of [NUMBER] engineers delivering [PRODUCT] to [USER_COUNT] users',
        'Reduced engineering team turnover from [PERCENTAGE] to [PERCENTAGE] through improved processes',
        'Implemented agile practices that increased delivery velocity by [PERCENTAGE]',
        'Successfully hired and onboarded [NUMBER] engineers expanding team capabilities',
        'Established technical roadmap aligned with business strategy, delivering [OUTCOME]'
      ],
      
      keywordOptimization: [
        'team building', 'technical leadership', 'agile transformation',
        'engineering culture', 'talent acquisition', 'cross-functional collaboration',
        'technical strategy', 'performance optimization', 'process improvement',
        'stakeholder management', 'product development', 'engineering excellence'
      ]
    },
    
    validationRules: {
      requiredSections: [
        CVSection.PROFESSIONAL_SUMMARY,
        CVSection.EXPERIENCE,
        CVSection.SKILLS,
        CVSection.ACHIEVEMENTS
      ],
      optionalSections: [
        CVSection.EDUCATION,
        CVSection.CERTIFICATIONS,
        CVSection.PROJECTS
      ],
      minExperienceYears: 5,
      criticalSkills: ['Team Leadership', 'People Management', 'Technical Background']
    },
    
    version: '1.0.0',
    isActive: true
  },

  // HR Specialist Profile
  {
    name: 'HR Specialist',
    category: RoleCategory.HR,
    description: 'Manages human resources functions including recruitment, employee relations, performance management, and organizational development. Ensures compliance with employment laws and fosters positive workplace culture.',
    keywords: [
      'human resources', 'recruitment', 'talent acquisition', 'employee relations',
      'performance management', 'onboarding', 'compliance', 'benefits administration',
      'organizational development', 'workplace culture', 'training', 'compensation'
    ],
    requiredSkills: [
      'Talent Acquisition', 'Employee Relations', 'Performance Management', 'HRIS',
      'Employment Law', 'Benefits Administration', 'Interview Skills', 'Communication'
    ],
    preferredSkills: [
      'Organizational Development', 'Change Management', 'Training & Development',
      'Compensation Analysis', 'Diversity & Inclusion', 'Employee Engagement',
      'HR Analytics', 'Conflict Resolution', 'Policy Development'
    ],
    experienceLevel: ExperienceLevel.MID,
    industryFocus: ['Technology', 'Healthcare', 'Finance', 'Manufacturing', 'Consulting', 'Retail'],
    
    matchingCriteria: {
      titleKeywords: [
        'hr specialist', 'human resources specialist', 'hr generalist', 'recruiter',
        'talent acquisition specialist', 'hr coordinator', 'people operations',
        'hr business partner', 'employee relations specialist'
      ],
      skillKeywords: [
        'recruitment', 'talent acquisition', 'employee relations', 'hris',
        'performance management', 'benefits', 'compliance', 'onboarding',
        'interviewing', 'hr policies', 'employment law'
      ],
      industryKeywords: [
        'hr', 'human resources', 'people', 'talent', 'corporate',
        'enterprise', 'consulting', 'services', 'organization'
      ],
      experienceKeywords: [
        'recruited', 'hired', 'onboarded', 'managed', 'developed',
        'implemented', 'coordinated', 'facilitated', 'administered',
        'counseled', 'trained', 'supported', 'maintained'
      ],
      educationKeywords: [
        'human resources', 'psychology', 'business administration',
        'organizational psychology', 'industrial relations', 'management'
      ]
    },
    
    enhancementTemplates: {
      professionalSummary: 'Dedicated HR Specialist with [X] years of experience in talent acquisition, employee relations, and organizational development. Successfully recruited [NUMBER] professionals across various roles while maintaining [RETENTION_RATE] employee retention rate. Expertise in HRIS systems, compliance management, and creating positive workplace cultures that drive employee engagement.',
      
      skillsStructure: {
        categories: [
          {
            name: 'Core HR Functions',
            skills: ['Talent Acquisition', 'Employee Relations', 'Performance Management', 'Onboarding'],
            priority: 1
          },
          {
            name: 'Systems & Compliance',
            skills: ['HRIS', 'Employment Law', 'Benefits Administration', 'Policy Development'],
            priority: 2
          },
          {
            name: 'People Development',
            skills: ['Training & Development', 'Organizational Development', 'Change Management', 'Coaching'],
            priority: 3
          },
          {
            name: 'Analytics & Strategy',
            skills: ['HR Analytics', 'Compensation Analysis', 'Diversity & Inclusion', 'Employee Engagement'],
            priority: 3
          }
        ],
        displayFormat: 'categorized',
        maxSkillsPerCategory: 6
      },
      
      experienceEnhancements: [
        {
          roleLevel: 'junior',
          bulletPointTemplate: 'Managed [HR_FUNCTION] for [EMPLOYEE_COUNT] employees, achieving [OUTCOME] and improving [METRIC] by [PERCENTAGE]',
          achievementTemplate: 'Successfully recruited [NUMBER] candidates with [TIME_TO_FILL] average time-to-fill',
          quantificationGuide: 'Include metrics like hiring numbers, retention rates, time-to-fill, employee satisfaction scores',
          actionVerbs: ['Recruited', 'Onboarded', 'Coordinated', 'Administered', 'Supported', 'Facilitated']
        },
        {
          roleLevel: 'mid',
          bulletPointTemplate: 'Led [HR_INITIATIVE] across [DEPARTMENT/ORGANIZATION] resulting in [BUSINESS_IMPACT] and [EMPLOYEE_OUTCOME]',
          achievementTemplate: 'Implemented [HR_PROGRAM] that improved employee engagement scores by [PERCENTAGE]',
          quantificationGuide: 'Focus on program implementation, process improvements, and organizational impact',
          actionVerbs: ['Implemented', 'Developed', 'Led', 'Established', 'Improved', 'Streamlined']
        },
        {
          roleLevel: 'senior',
          bulletPointTemplate: 'Spearheaded [STRATEGIC_INITIATIVE] impacting [SCOPE] and delivering [BUSINESS_VALUE]',
          achievementTemplate: 'Designed and executed [HR_STRATEGY] that supported company growth from [SIZE] to [SIZE] employees',
          quantificationGuide: 'Emphasize strategic impact, organizational transformation, and business alignment',
          actionVerbs: ['Spearheaded', 'Transformed', 'Architected', 'Influenced', 'Championed', 'Drove']
        }
      ],
      
      achievementTemplates: [
        'Reduced time-to-fill for open positions by [PERCENTAGE] through process optimization',
        'Achieved [PERCENTAGE] employee retention rate through improved engagement initiatives',
        'Successfully onboarded [NUMBER] new hires with [SATISFACTION_SCORE] satisfaction rating',
        'Implemented HRIS system that streamlined processes for [EMPLOYEE_COUNT] employees',
        'Developed training programs that improved employee performance ratings by [PERCENTAGE]'
      ],
      
      keywordOptimization: [
        'employee engagement', 'talent management', 'workforce planning',
        'organizational culture', 'performance improvement', 'compliance management',
        'change management', 'employee development', 'diversity and inclusion',
        'hr metrics', 'strategic hr', 'people analytics'
      ]
    },
    
    validationRules: {
      requiredSections: [
        CVSection.PROFESSIONAL_SUMMARY,
        CVSection.EXPERIENCE,
        CVSection.SKILLS,
        CVSection.EDUCATION
      ],
      optionalSections: [
        CVSection.CERTIFICATIONS,
        CVSection.ACHIEVEMENTS,
        CVSection.PROJECTS
      ],
      minExperienceYears: 2,
      criticalSkills: ['Human Resources', 'Communication', 'Employee Relations']
    },
    
    version: '1.0.0',
    isActive: true
  },

  // AI Product Expert Profile
  {
    name: 'AI Product Expert',
    category: RoleCategory.BUSINESS,
    description: 'Specializes in AI and machine learning product development, strategy, and implementation. Bridges technical AI capabilities with business requirements to drive innovative AI-powered solutions.',
    keywords: [
      'artificial intelligence', 'machine learning', 'product management', 'ai strategy',
      'deep learning', 'natural language processing', 'computer vision', 'data science',
      'ai ethics', 'model deployment', 'product strategy', 'technical product management'
    ],
    requiredSkills: [
      'AI/ML Fundamentals', 'Product Management', 'Data Analysis', 'Python',
      'Technical Communication', 'Stakeholder Management', 'Product Strategy', 'Agile'
    ],
    preferredSkills: [
      'Deep Learning', 'NLP', 'Computer Vision', 'MLOps', 'Cloud Platforms',
      'AI Ethics', 'Model Evaluation', 'A/B Testing', 'User Research', 'Go-to-Market'
    ],
    experienceLevel: ExperienceLevel.SENIOR,
    industryFocus: ['Technology', 'AI/ML', 'SaaS', 'Fintech', 'Healthcare', 'Automotive'],
    
    matchingCriteria: {
      titleKeywords: [
        'ai product manager', 'ml product manager', 'ai product expert',
        'machine learning product manager', 'technical product manager',
        'ai strategy', 'ai consultant', 'ml engineer', 'data scientist'
      ],
      skillKeywords: [
        'artificial intelligence', 'machine learning', 'deep learning',
        'product management', 'python', 'tensorflow', 'pytorch',
        'nlp', 'computer vision', 'data analysis', 'ml models'
      ],
      industryKeywords: [
        'ai', 'machine learning', 'artificial intelligence', 'tech',
        'startup', 'saas', 'data', 'analytics', 'automation'
      ],
      experienceKeywords: [
        'developed', 'implemented', 'deployed', 'trained', 'optimized',
        'launched', 'managed', 'analyzed', 'designed', 'built',
        'collaborated', 'researched', 'evaluated', 'scaled'
      ],
      educationKeywords: [
        'computer science', 'data science', 'machine learning',
        'artificial intelligence', 'mathematics', 'statistics', 'engineering'
      ]
    },
    
    enhancementTemplates: {
      professionalSummary: 'Strategic AI Product Expert with [X] years of experience developing and launching AI-powered products that serve [USER_COUNT] users and process [DATA_VOLUME] daily. Proven track record of translating complex AI/ML capabilities into business value, with expertise in [AI_DOMAINS] and successful delivery of [NUMBER] production ML models achieving [PERFORMANCE_METRIC] accuracy.',
      
      skillsStructure: {
        categories: [
          {
            name: 'AI/ML Technologies',
            skills: ['Machine Learning', 'Deep Learning', 'NLP', 'Computer Vision', 'MLOps'],
            priority: 1
          },
          {
            name: 'Product Management',
            skills: ['Product Strategy', 'Stakeholder Management', 'User Research', 'Go-to-Market', 'Agile'],
            priority: 1
          },
          {
            name: 'Technical Skills',
            skills: ['Python', 'TensorFlow', 'PyTorch', 'SQL', 'Cloud Platforms', 'APIs'],
            priority: 2
          },
          {
            name: 'Business & Strategy',
            skills: ['AI Strategy', 'Data Analysis', 'A/B Testing', 'Performance Metrics', 'Business Intelligence'],
            priority: 3
          }
        ],
        displayFormat: 'categorized',
        maxSkillsPerCategory: 7
      },
      
      experienceEnhancements: [
        {
          roleLevel: 'mid',
          bulletPointTemplate: 'Developed and launched [AI_PRODUCT/FEATURE] using [ML_TECHNIQUE] that improved [BUSINESS_METRIC] by [PERCENTAGE]',
          achievementTemplate: 'Successfully deployed [NUMBER] ML models to production serving [SCALE] with [PERFORMANCE_METRIC] performance',
          quantificationGuide: 'Focus on AI/ML model performance, business impact, user adoption, and technical achievements',
          actionVerbs: ['Developed', 'Deployed', 'Optimized', 'Implemented', 'Launched', 'Trained', 'Analyzed']
        },
        {
          roleLevel: 'senior',
          bulletPointTemplate: 'Led AI product strategy for [PRODUCT/DOMAIN] resulting in [BUSINESS_OUTCOME] and enabling [TECHNICAL_CAPABILITY]',
          achievementTemplate: 'Architected and executed AI roadmap that increased [BUSINESS_METRIC] by [PERCENTAGE] across [USER_BASE]',
          quantificationGuide: 'Emphasize strategic impact, cross-functional leadership, and transformational outcomes',
          actionVerbs: ['Led', 'Architected', 'Transformed', 'Pioneered', 'Established', 'Influenced', 'Drove']
        }
      ],
      
      achievementTemplates: [
        'Built and deployed [NUMBER] production ML models with [ACCURACY/PERFORMANCE] performance',
        'Launched AI product feature that increased user engagement by [PERCENTAGE]',
        'Reduced model inference time by [PERCENTAGE] while maintaining [ACCURACY] accuracy',
        'Led cross-functional team to deliver AI solution processing [DATA_VOLUME] daily',
        'Established ML infrastructure that scaled to support [USER_COUNT] concurrent users'
      ],
      
      keywordOptimization: [
        'ai product development', 'machine learning systems', 'model deployment',
        'ai strategy', 'data-driven decisions', 'ml infrastructure',
        'ai ethics', 'model performance', 'technical product management',
        'ai transformation', 'intelligent systems', 'predictive analytics'
      ]
    },
    
    validationRules: {
      requiredSections: [
        CVSection.PROFESSIONAL_SUMMARY,
        CVSection.EXPERIENCE,
        CVSection.SKILLS,
        CVSection.PROJECTS
      ],
      optionalSections: [
        CVSection.EDUCATION,
        CVSection.CERTIFICATIONS,
        CVSection.ACHIEVEMENTS,
        CVSection.PUBLICATIONS
      ],
      minExperienceYears: 3,
      criticalSkills: ['AI/ML Knowledge', 'Product Management', 'Technical Communication']
    },
    
    version: '1.0.0',
    isActive: true
  },

  // Data Scientist Profile
  {
    name: 'Data Scientist',
    category: RoleCategory.DATA,
    description: 'Analyzes complex datasets to extract insights and build predictive models that drive business decisions. Combines statistical analysis, machine learning, and domain expertise to solve challenging problems.',
    keywords: [
      'data science', 'machine learning', 'statistical analysis', 'data mining',
      'predictive modeling', 'data visualization', 'big data', 'python', 'r',
      'sql', 'statistics', 'analytics', 'algorithms', 'experimentation'
    ],
    requiredSkills: [
      'Python', 'SQL', 'Statistics', 'Machine Learning', 'Data Visualization',
      'Pandas', 'NumPy', 'Scikit-learn', 'Data Analysis', 'Hypothesis Testing'
    ],
    preferredSkills: [
      'TensorFlow', 'PyTorch', 'R', 'Spark', 'Hadoop', 'Tableau', 'Power BI',
      'AWS', 'GCP', 'Deep Learning', 'NLP', 'Time Series Analysis', 'A/B Testing'
    ],
    experienceLevel: ExperienceLevel.MID,
    industryFocus: ['Technology', 'Finance', 'Healthcare', 'E-commerce', 'Consulting', 'Research'],
    
    matchingCriteria: {
      titleKeywords: [
        'data scientist', 'machine learning engineer', 'data analyst',
        'research scientist', 'quantitative analyst', 'ml engineer',
        'data science consultant', 'analytics consultant'
      ],
      skillKeywords: [
        'python', 'sql', 'machine learning', 'statistics', 'data analysis',
        'pandas', 'numpy', 'scikit-learn', 'tensorflow', 'pytorch',
        'data visualization', 'statistical modeling', 'predictive modeling'
      ],
      industryKeywords: [
        'data', 'analytics', 'research', 'tech', 'fintech',
        'healthcare', 'consulting', 'startup', 'enterprise'
      ],
      experienceKeywords: [
        'analyzed', 'modeled', 'predicted', 'developed', 'implemented',
        'optimized', 'built', 'trained', 'evaluated', 'visualized',
        'experimented', 'researched', 'discovered', 'improved'
      ],
      educationKeywords: [
        'data science', 'statistics', 'mathematics', 'computer science',
        'physics', 'engineering', 'economics', 'analytics'
      ]
    },
    
    enhancementTemplates: {
      professionalSummary: 'Experienced Data Scientist with [X] years of expertise in machine learning and statistical analysis. Successfully developed [NUMBER] predictive models that improved business outcomes by [PERCENTAGE]. Proficient in Python, SQL, and advanced analytics with proven ability to translate complex data into actionable insights for stakeholders.',
      
      skillsStructure: {
        categories: [
          {
            name: 'Programming & Tools',
            skills: ['Python', 'R', 'SQL', 'Pandas', 'NumPy', 'Jupyter'],
            priority: 1
          },
          {
            name: 'Machine Learning',
            skills: ['Scikit-learn', 'TensorFlow', 'PyTorch', 'XGBoost', 'Deep Learning'],
            priority: 1
          },
          {
            name: 'Statistics & Analysis',
            skills: ['Statistical Modeling', 'Hypothesis Testing', 'A/B Testing', 'Time Series Analysis'],
            priority: 2
          },
          {
            name: 'Data & Visualization',
            skills: ['Data Visualization', 'Tableau', 'Matplotlib', 'Seaborn', 'Power BI'],
            priority: 2
          },
          {
            name: 'Big Data & Cloud',
            skills: ['Spark', 'Hadoop', 'AWS', 'GCP', 'Docker', 'MLOps'],
            priority: 3
          }
        ],
        displayFormat: 'categorized',
        maxSkillsPerCategory: 8
      },
      
      experienceEnhancements: [
        {
          roleLevel: 'junior',
          bulletPointTemplate: 'Developed [MODEL_TYPE] model using [TECHNIQUE] that achieved [PERFORMANCE_METRIC] and improved [BUSINESS_OUTCOME]',
          achievementTemplate: 'Built predictive model that increased [BUSINESS_METRIC] by [PERCENTAGE] using [DATASET_SIZE] records',
          quantificationGuide: 'Include model performance metrics, dataset sizes, business impact, and accuracy measures',
          actionVerbs: ['Developed', 'Built', 'Analyzed', 'Implemented', 'Trained', 'Evaluated', 'Optimized']
        },
        {
          roleLevel: 'mid',
          bulletPointTemplate: 'Led data science project analyzing [DATA_SOURCE] to identify [INSIGHTS] resulting in [BUSINESS_IMPACT]',
          achievementTemplate: 'Designed and deployed [ML_SYSTEM] processing [DATA_VOLUME] daily with [PERFORMANCE] latency',
          quantificationGuide: 'Focus on project leadership, complex analysis, system design, and scalable solutions',
          actionVerbs: ['Led', 'Designed', 'Architected', 'Collaborated', 'Delivered', 'Scaled', 'Automated']
        },
        {
          roleLevel: 'senior',
          bulletPointTemplate: 'Established data science practice for [DOMAIN] enabling [CAPABILITY] and driving [STRATEGIC_OUTCOME]',
          achievementTemplate: 'Architected ML infrastructure supporting [SCALE] models with [RELIABILITY] uptime across [BUSINESS_UNITS]',
          quantificationGuide: 'Emphasize strategic initiatives, infrastructure development, and organization-wide impact',
          actionVerbs: ['Established', 'Transformed', 'Pioneered', 'Influenced', 'Mentored', 'Championed']
        }
      ],
      
      achievementTemplates: [
        'Developed predictive model with [ACCURACY]% accuracy that saved [AMOUNT] annually',
        'Analyzed [DATA_SIZE] dataset to identify insights that increased revenue by [PERCENTAGE]',
        'Built recommendation system that improved user engagement by [PERCENTAGE]',
        'Implemented A/B testing framework that optimized [METRIC] across [USER_BASE] users',
        'Created automated data pipeline processing [VOLUME] records daily with [ACCURACY] reliability'
      ],
      
      keywordOptimization: [
        'predictive analytics', 'statistical modeling', 'data mining',
        'machine learning algorithms', 'big data analysis', 'data-driven insights',
        'quantitative analysis', 'experimental design', 'feature engineering',
        'model deployment', 'business intelligence', 'advanced analytics'
      ]
    },
    
    validationRules: {
      requiredSections: [
        CVSection.PROFESSIONAL_SUMMARY,
        CVSection.EXPERIENCE,
        CVSection.SKILLS,
        CVSection.EDUCATION
      ],
      optionalSections: [
        CVSection.PROJECTS,
        CVSection.CERTIFICATIONS,
        CVSection.ACHIEVEMENTS,
        CVSection.PUBLICATIONS
      ],
      minExperienceYears: 2,
      criticalSkills: ['Python/R', 'Statistics', 'Machine Learning', 'Data Analysis']
    },
    
    version: '1.0.0',
    isActive: true
  },

  // Digital Marketing Specialist Profile
  {
    name: 'Digital Marketing Specialist',
    category: RoleCategory.MARKETING,
    description: 'Drives digital marketing strategies across multiple channels including SEO, SEM, social media, content marketing, and email campaigns. Leverages data analytics to optimize campaigns and maximize ROI while building brand awareness and customer engagement.',
    keywords: [
      'digital marketing', 'seo', 'sem', 'social media marketing', 'content marketing',
      'google ads', 'facebook ads', 'ppc', 'email marketing', 'marketing automation',
      'analytics', 'conversion optimization', 'brand awareness', 'lead generation', 'growth hacking'
    ],
    requiredSkills: [
      'SEO', 'Google Ads', 'Facebook Ads', 'Google Analytics', 'Content Marketing',
      'Social Media Marketing', 'Email Marketing', 'Campaign Management', 'Data Analysis'
    ],
    preferredSkills: [
      'Marketing Automation', 'HubSpot', 'Salesforce', 'Adobe Creative Suite',
      'LinkedIn Ads', 'Instagram Marketing', 'TikTok Marketing', 'A/B Testing',
      'Conversion Rate Optimization', 'Copywriting', 'HTML/CSS', 'SQL', 'Tableau'
    ],
    experienceLevel: ExperienceLevel.MID,
    industryFocus: ['E-commerce', 'SaaS', 'Technology', 'Retail', 'Media', 'Consumer Goods'],
    
    matchingCriteria: {
      titleKeywords: [
        'digital marketing specialist', 'marketing specialist', 'seo specialist',
        'sem specialist', 'social media manager', 'digital marketer',
        'marketing manager', 'growth marketer', 'performance marketer',
        'content marketing specialist', 'marketing coordinator'
      ],
      skillKeywords: [
        'seo', 'sem', 'google ads', 'facebook ads', 'social media',
        'content marketing', 'email marketing', 'analytics', 'ppc',
        'marketing automation', 'digital marketing', 'lead generation'
      ],
      industryKeywords: [
        'marketing', 'digital', 'advertising', 'agency', 'e-commerce',
        'retail', 'brand', 'media', 'startup', 'tech'
      ],
      experienceKeywords: [
        'managed', 'optimized', 'launched', 'increased', 'improved',
        'generated', 'created', 'developed', 'analyzed', 'executed',
        'drove', 'implemented', 'measured', 'scaled'
      ],
      educationKeywords: [
        'marketing', 'business', 'communications', 'advertising',
        'digital marketing', 'media studies', 'journalism', 'public relations'
      ]
    },
    
    enhancementTemplates: {
      professionalSummary: 'Results-driven Digital Marketing Specialist with [X] years of experience managing multi-channel campaigns with [BUDGET] annual budget. Proven track record of increasing organic traffic by [PERCENTAGE] and improving conversion rates by [PERCENTAGE]. Expert in SEO/SEM, social media marketing, and data-driven campaign optimization with demonstrated success in [INDUSTRY] sector.',
      
      skillsStructure: {
        categories: [
          {
            name: 'Digital Marketing Channels',
            skills: ['SEO', 'SEM/PPC', 'Social Media Marketing', 'Email Marketing', 'Content Marketing'],
            priority: 1
          },
          {
            name: 'Advertising Platforms',
            skills: ['Google Ads', 'Facebook Ads', 'LinkedIn Ads', 'Instagram Ads', 'YouTube Ads'],
            priority: 2
          },
          {
            name: 'Analytics & Tools',
            skills: ['Google Analytics', 'Google Tag Manager', 'SEMrush', 'Ahrefs', 'HubSpot'],
            priority: 2
          },
          {
            name: 'Marketing Technology',
            skills: ['Marketing Automation', 'CRM', 'A/B Testing', 'Conversion Optimization', 'Landing Pages'],
            priority: 3
          },
          {
            name: 'Creative & Content',
            skills: ['Copywriting', 'Content Strategy', 'Graphic Design', 'Video Marketing', 'Brand Management'],
            priority: 3
          }
        ],
        displayFormat: 'categorized',
        maxSkillsPerCategory: 7
      },
      
      experienceEnhancements: [
        {
          roleLevel: 'junior',
          bulletPointTemplate: 'Managed [CHANNEL] campaigns with [BUDGET] budget achieving [ROI] return on ad spend',
          achievementTemplate: 'Increased [METRIC] by [PERCENTAGE] through [MARKETING_STRATEGY] implementation',
          quantificationGuide: 'Include metrics like traffic growth, conversion rates, lead generation, ROI, and engagement rates',
          actionVerbs: ['Managed', 'Created', 'Optimized', 'Executed', 'Analyzed', 'Developed', 'Monitored']
        },
        {
          roleLevel: 'mid',
          bulletPointTemplate: 'Led [CAMPAIGN_TYPE] strategy across [CHANNELS] resulting in [LEADS] qualified leads and [REVENUE] revenue',
          achievementTemplate: 'Developed and executed [MARKETING_INITIATIVE] that increased [KPI] by [PERCENTAGE] within [TIMEFRAME]',
          quantificationGuide: 'Focus on campaign scale, revenue impact, lead quality, and cross-channel performance',
          actionVerbs: ['Led', 'Strategized', 'Launched', 'Scaled', 'Optimized', 'Drove', 'Transformed']
        },
        {
          roleLevel: 'senior',
          bulletPointTemplate: 'Architected digital marketing strategy generating [REVENUE] in revenue and [GROWTH] YoY growth',
          achievementTemplate: 'Established marketing framework that scaled customer acquisition from [START] to [END] while reducing CAC by [PERCENTAGE]',
          quantificationGuide: 'Emphasize strategic impact, revenue generation, team leadership, and market expansion',
          actionVerbs: ['Architected', 'Spearheaded', 'Transformed', 'Pioneered', 'Established', 'Orchestrated']
        }
      ],
      
      achievementTemplates: [
        'Increased organic traffic by [PERCENTAGE] through comprehensive SEO strategy',
        'Achieved [ROI]% return on ad spend across [BUDGET] marketing budget',
        'Generated [NUMBER] qualified leads resulting in [REVENUE] in new business',
        'Grew social media following by [PERCENTAGE] and engagement rate by [PERCENTAGE]',
        'Reduced customer acquisition cost by [PERCENTAGE] while scaling growth by [PERCENTAGE]'
      ],
      
      keywordOptimization: [
        'digital marketing strategy', 'performance marketing', 'growth marketing',
        'conversion optimization', 'customer acquisition', 'brand awareness',
        'marketing analytics', 'campaign optimization', 'roi optimization',
        'multi-channel marketing', 'marketing automation', 'data-driven marketing'
      ]
    },
    
    validationRules: {
      requiredSections: [
        CVSection.PROFESSIONAL_SUMMARY,
        CVSection.EXPERIENCE,
        CVSection.SKILLS,
        CVSection.ACHIEVEMENTS
      ],
      optionalSections: [
        CVSection.EDUCATION,
        CVSection.CERTIFICATIONS,
        CVSection.PROJECTS
      ],
      minExperienceYears: 2,
      criticalSkills: ['Digital Marketing', 'Analytics', 'Campaign Management']
    },
    
    version: '1.0.0',
    isActive: true
  },

  // UI/UX Designer Profile
  {
    name: 'UI/UX Designer',
    category: RoleCategory.DESIGN,
    description: 'Creates intuitive and visually appealing user interfaces while ensuring exceptional user experiences. Conducts user research, creates wireframes and prototypes, and collaborates with cross-functional teams to deliver user-centered design solutions.',
    keywords: [
      'ux design', 'ui design', 'user experience', 'user interface', 'product design',
      'interaction design', 'visual design', 'prototyping', 'wireframing', 'user research',
      'design systems', 'usability testing', 'information architecture', 'responsive design'
    ],
    requiredSkills: [
      'Figma', 'Sketch', 'Adobe XD', 'Prototyping', 'User Research',
      'Wireframing', 'Design Systems', 'Visual Design', 'Interaction Design'
    ],
    preferredSkills: [
      'Adobe Creative Suite', 'InVision', 'Principle', 'Framer', 'HTML/CSS',
      'JavaScript', 'Design Thinking', 'User Testing', 'Information Architecture',
      'Accessibility', 'Mobile Design', 'Motion Design', 'Illustration'
    ],
    experienceLevel: ExperienceLevel.MID,
    industryFocus: ['Technology', 'SaaS', 'E-commerce', 'Mobile Apps', 'Fintech', 'Healthcare'],
    
    matchingCriteria: {
      titleKeywords: [
        'ux designer', 'ui designer', 'product designer', 'user experience designer',
        'interaction designer', 'visual designer', 'ux/ui designer', 'digital designer',
        'web designer', 'mobile designer', 'design lead'
      ],
      skillKeywords: [
        'figma', 'sketch', 'adobe xd', 'prototyping', 'wireframing',
        'user research', 'design systems', 'user testing', 'visual design',
        'interaction design', 'responsive design', 'design thinking'
      ],
      industryKeywords: [
        'design', 'tech', 'startup', 'agency', 'digital', 'product',
        'software', 'mobile', 'web', 'saas'
      ],
      experienceKeywords: [
        'designed', 'created', 'developed', 'prototyped', 'researched',
        'tested', 'collaborated', 'iterated', 'implemented', 'delivered',
        'improved', 'optimized', 'conceptualized', 'crafted'
      ],
      educationKeywords: [
        'design', 'graphic design', 'interaction design', 'human computer interaction',
        'visual communication', 'digital media', 'fine arts', 'psychology'
      ]
    },
    
    enhancementTemplates: {
      professionalSummary: 'Creative UI/UX Designer with [X] years of experience designing user-centered digital products for [USER_COUNT] users. Expert in translating complex requirements into intuitive interfaces that increased user engagement by [PERCENTAGE]. Proficient in Figma, user research, and design systems with a proven track record of improving [METRIC] through thoughtful design solutions.',
      
      skillsStructure: {
        categories: [
          {
            name: 'Design Tools',
            skills: ['Figma', 'Sketch', 'Adobe XD', 'Adobe Creative Suite', 'InVision', 'Principle'],
            priority: 1
          },
          {
            name: 'UX Skills',
            skills: ['User Research', 'Wireframing', 'Prototyping', 'User Testing', 'Information Architecture'],
            priority: 1
          },
          {
            name: 'UI Skills',
            skills: ['Visual Design', 'Interaction Design', 'Design Systems', 'Typography', 'Color Theory'],
            priority: 2
          },
          {
            name: 'Technical Skills',
            skills: ['HTML/CSS', 'Responsive Design', 'Mobile Design', 'Accessibility', 'Animation'],
            priority: 3
          },
          {
            name: 'Methodologies',
            skills: ['Design Thinking', 'Agile', 'Design Sprints', 'Lean UX', 'User-Centered Design'],
            priority: 3
          }
        ],
        displayFormat: 'categorized',
        maxSkillsPerCategory: 8
      },
      
      experienceEnhancements: [
        {
          roleLevel: 'junior',
          bulletPointTemplate: 'Designed [PRODUCT/FEATURE] interfaces improving [USABILITY_METRIC] by [PERCENTAGE]',
          achievementTemplate: 'Created [NUMBER] prototypes and wireframes for [PROJECT] resulting in [OUTCOME]',
          quantificationGuide: 'Include metrics like user satisfaction, task completion rates, design iterations, and time savings',
          actionVerbs: ['Designed', 'Created', 'Prototyped', 'Collaborated', 'Researched', 'Developed', 'Illustrated']
        },
        {
          roleLevel: 'mid',
          bulletPointTemplate: 'Led design for [PRODUCT] serving [USER_BASE] users, increasing [METRIC] by [PERCENTAGE]',
          achievementTemplate: 'Established design system adopted across [TEAM_SIZE] teams reducing design inconsistencies by [PERCENTAGE]',
          quantificationGuide: 'Focus on user impact, design system adoption, conversion improvements, and team collaboration',
          actionVerbs: ['Led', 'Established', 'Redesigned', 'Optimized', 'Facilitated', 'Streamlined', 'Championed']
        },
        {
          roleLevel: 'senior',
          bulletPointTemplate: 'Directed design strategy for [PRODUCT_SUITE] improving overall UX metrics by [PERCENTAGE] across [USER_COUNT] users',
          achievementTemplate: 'Transformed design culture and processes resulting in [PERCENTAGE] faster time-to-market and [NPS_IMPROVEMENT] NPS increase',
          quantificationGuide: 'Emphasize strategic design decisions, organizational impact, and business outcomes',
          actionVerbs: ['Directed', 'Transformed', 'Pioneered', 'Architected', 'Influenced', 'Mentored', 'Evolved']
        }
      ],
      
      achievementTemplates: [
        'Redesigned [PRODUCT] interface resulting in [PERCENTAGE] increase in user engagement',
        'Conducted [NUMBER] user research sessions leading to [PERCENTAGE] improvement in task completion',
        'Created design system adopted by [NUMBER] products reducing design debt by [PERCENTAGE]',
        'Improved conversion rate by [PERCENTAGE] through iterative design optimization',
        'Reduced customer support tickets by [PERCENTAGE] through improved UX design'
      ],
      
      keywordOptimization: [
        'user-centered design', 'design thinking', 'usability testing',
        'responsive design', 'mobile-first design', 'accessibility standards',
        'design systems', 'interaction patterns', 'visual hierarchy',
        'user journey mapping', 'persona development', 'design iteration'
      ]
    },
    
    validationRules: {
      requiredSections: [
        CVSection.PROFESSIONAL_SUMMARY,
        CVSection.EXPERIENCE,
        CVSection.SKILLS,
        CVSection.PROJECTS
      ],
      optionalSections: [
        CVSection.EDUCATION,
        CVSection.ACHIEVEMENTS,
        CVSection.CERTIFICATIONS
      ],
      minExperienceYears: 2,
      criticalSkills: ['Design Tools', 'User Research', 'Prototyping']
    },
    
    version: '1.0.0',
    isActive: true
  },

  // Business Analyst Profile
  {
    name: 'Business Analyst',
    category: RoleCategory.BUSINESS,
    description: 'Bridges the gap between business needs and technical solutions by analyzing processes, gathering requirements, and ensuring successful implementation of business initiatives. Specializes in data analysis, process improvement, and stakeholder management.',
    keywords: [
      'business analysis', 'requirements gathering', 'process improvement', 'stakeholder management',
      'data analysis', 'project management', 'system analysis', 'business intelligence',
      'agile', 'user stories', 'documentation', 'process mapping', 'gap analysis'
    ],
    requiredSkills: [
      'Requirements Gathering', 'Process Mapping', 'SQL', 'JIRA', 'Agile',
      'Stakeholder Management', 'Data Analysis', 'Documentation', 'Problem Solving'
    ],
    preferredSkills: [
      'Business Intelligence', 'Tableau', 'Power BI', 'Excel', 'Visio',
      'Confluence', 'User Acceptance Testing', 'Change Management', 'Risk Analysis',
      'Financial Analysis', 'Project Management', 'Scrum', 'Python'
    ],
    experienceLevel: ExperienceLevel.MID,
    industryFocus: ['Finance', 'Technology', 'Healthcare', 'Consulting', 'Insurance', 'Retail'],
    
    matchingCriteria: {
      titleKeywords: [
        'business analyst', 'ba', 'requirements analyst', 'systems analyst',
        'business systems analyst', 'process analyst', 'functional analyst',
        'senior business analyst', 'lead business analyst', 'product analyst'
      ],
      skillKeywords: [
        'requirements gathering', 'business analysis', 'sql', 'jira', 'agile',
        'process mapping', 'stakeholder management', 'data analysis',
        'user stories', 'documentation', 'testing', 'business intelligence'
      ],
      industryKeywords: [
        'consulting', 'finance', 'technology', 'enterprise', 'business',
        'corporate', 'services', 'solutions', 'systems'
      ],
      experienceKeywords: [
        'analyzed', 'gathered', 'documented', 'implemented', 'improved',
        'facilitated', 'collaborated', 'defined', 'validated', 'optimized',
        'managed', 'coordinated', 'developed', 'designed'
      ],
      educationKeywords: [
        'business', 'information systems', 'computer science', 'economics',
        'finance', 'management', 'engineering', 'analytics'
      ]
    },
    
    enhancementTemplates: {
      professionalSummary: 'Results-oriented Business Analyst with [X] years of experience delivering business solutions that improved efficiency by [PERCENTAGE]. Expert in requirements gathering, process optimization, and stakeholder management with proven success in [INDUSTRY]. Skilled in translating complex business needs into technical specifications that drive [BUSINESS_OUTCOME].',
      
      skillsStructure: {
        categories: [
          {
            name: 'Business Analysis',
            skills: ['Requirements Gathering', 'Process Mapping', 'Gap Analysis', 'Use Case Development', 'User Stories'],
            priority: 1
          },
          {
            name: 'Technical Skills',
            skills: ['SQL', 'JIRA', 'Confluence', 'Visio', 'Excel', 'Python'],
            priority: 2
          },
          {
            name: 'Data & Analytics',
            skills: ['Data Analysis', 'Business Intelligence', 'Tableau', 'Power BI', 'Reporting'],
            priority: 2
          },
          {
            name: 'Project Management',
            skills: ['Agile', 'Scrum', 'Stakeholder Management', 'Change Management', 'Risk Analysis'],
            priority: 3
          },
          {
            name: 'Business Skills',
            skills: ['Financial Analysis', 'Process Improvement', 'Documentation', 'Presentation', 'Problem Solving'],
            priority: 3
          }
        ],
        displayFormat: 'categorized',
        maxSkillsPerCategory: 7
      },
      
      experienceEnhancements: [
        {
          roleLevel: 'junior',
          bulletPointTemplate: 'Gathered and documented requirements for [PROJECT] resulting in [OUTCOME] and [TIME_SAVINGS]',
          achievementTemplate: 'Analyzed [PROCESS/SYSTEM] identifying [NUMBER] improvement opportunities saving [AMOUNT]',
          quantificationGuide: 'Include metrics like cost savings, efficiency improvements, requirements documented, and process optimizations',
          actionVerbs: ['Analyzed', 'Documented', 'Gathered', 'Supported', 'Identified', 'Assisted', 'Contributed']
        },
        {
          roleLevel: 'mid',
          bulletPointTemplate: 'Led business analysis for [INITIATIVE] impacting [USER_COUNT] users and generating [VALUE]',
          achievementTemplate: 'Implemented [SOLUTION] that automated [PROCESS] reducing processing time by [PERCENTAGE]',
          quantificationGuide: 'Focus on project scale, business value delivered, stakeholder impact, and process improvements',
          actionVerbs: ['Led', 'Implemented', 'Facilitated', 'Optimized', 'Designed', 'Managed', 'Delivered']
        },
        {
          roleLevel: 'senior',
          bulletPointTemplate: 'Spearheaded enterprise-wide [TRANSFORMATION] affecting [DEPARTMENTS] and saving [AMOUNT] annually',
          achievementTemplate: 'Architected business solution framework adopted across [SCOPE] improving operational efficiency by [PERCENTAGE]',
          quantificationGuide: 'Emphasize strategic initiatives, enterprise impact, and transformational outcomes',
          actionVerbs: ['Spearheaded', 'Architected', 'Transformed', 'Established', 'Influenced', 'Championed', 'Directed']
        }
      ],
      
      achievementTemplates: [
        'Identified and implemented process improvements saving [AMOUNT] annually',
        'Gathered requirements for [NUMBER] projects with [PERCENTAGE] on-time delivery rate',
        'Reduced operational costs by [PERCENTAGE] through data-driven analysis and recommendations',
        'Facilitated [NUMBER] stakeholder workshops resulting in aligned business objectives',
        'Developed business cases that secured [AMOUNT] in funding for strategic initiatives'
      ],
      
      keywordOptimization: [
        'business process optimization', 'requirements elicitation', 'stakeholder engagement',
        'data-driven decisions', 'process automation', 'business intelligence',
        'change management', 'risk mitigation', 'cost-benefit analysis',
        'system integration', 'user acceptance testing', 'business transformation'
      ]
    },
    
    validationRules: {
      requiredSections: [
        CVSection.PROFESSIONAL_SUMMARY,
        CVSection.EXPERIENCE,
        CVSection.SKILLS,
        CVSection.EDUCATION
      ],
      optionalSections: [
        CVSection.CERTIFICATIONS,
        CVSection.ACHIEVEMENTS,
        CVSection.PROJECTS
      ],
      minExperienceYears: 2,
      criticalSkills: ['Business Analysis', 'Requirements Gathering', 'Communication']
    },
    
    version: '1.0.0',
    isActive: true
  },

  // Project Manager Profile
  {
    name: 'Project Manager',
    category: RoleCategory.MANAGEMENT,
    description: 'Leads and manages projects from initiation to completion, ensuring delivery on time, within budget, and meeting quality standards. Coordinates cross-functional teams, manages stakeholders, and implements project management best practices.',
    keywords: [
      'project management', 'agile', 'scrum', 'program management', 'resource management',
      'risk management', 'stakeholder management', 'project planning', 'budget management',
      'team leadership', 'waterfall', 'pmp', 'sprint planning', 'project delivery'
    ],
    requiredSkills: [
      'Project Planning', 'Agile', 'Scrum', 'Risk Management', 'Stakeholder Management',
      'MS Project', 'Budget Management', 'Team Leadership', 'Communication'
    ],
    preferredSkills: [
      'JIRA', 'Confluence', 'Resource Planning', 'Change Management', 'Kanban',
      'Portfolio Management', 'Earned Value Management', 'Critical Path Method',
      'Slack', 'Asana', 'Monday.com', 'Excel', 'PowerPoint'
    ],
    experienceLevel: ExperienceLevel.MID,
    industryFocus: ['Technology', 'Construction', 'Healthcare', 'Finance', 'Consulting', 'Manufacturing'],
    
    matchingCriteria: {
      titleKeywords: [
        'project manager', 'pm', 'scrum master', 'program manager',
        'senior project manager', 'technical project manager', 'it project manager',
        'agile project manager', 'project coordinator', 'delivery manager'
      ],
      skillKeywords: [
        'project management', 'agile', 'scrum', 'pmp', 'project planning',
        'risk management', 'stakeholder management', 'budget management',
        'team leadership', 'jira', 'ms project', 'resource management'
      ],
      industryKeywords: [
        'project', 'program', 'delivery', 'consulting', 'technology',
        'enterprise', 'implementation', 'solutions', 'services'
      ],
      experienceKeywords: [
        'managed', 'led', 'delivered', 'coordinated', 'planned',
        'executed', 'implemented', 'facilitated', 'oversaw', 'directed',
        'organized', 'tracked', 'monitored', 'controlled'
      ],
      educationKeywords: [
        'project management', 'business administration', 'management',
        'engineering', 'computer science', 'information systems', 'mba'
      ]
    },
    
    enhancementTemplates: {
      professionalSummary: 'Accomplished Project Manager with [X] years of experience successfully delivering [NUMBER] projects worth [TOTAL_VALUE] on time and within budget. Expert in Agile methodologies with proven ability to lead cross-functional teams of [TEAM_SIZE] members. Achieved [PERCENTAGE] project success rate while maintaining [SATISFACTION_SCORE] stakeholder satisfaction.',
      
      skillsStructure: {
        categories: [
          {
            name: 'Project Management',
            skills: ['Project Planning', 'Risk Management', 'Budget Management', 'Resource Management', 'Schedule Management'],
            priority: 1
          },
          {
            name: 'Methodologies',
            skills: ['Agile', 'Scrum', 'Waterfall', 'Kanban', 'Hybrid Approaches', 'Lean'],
            priority: 2
          },
          {
            name: 'Tools & Software',
            skills: ['MS Project', 'JIRA', 'Confluence', 'Asana', 'Monday.com', 'Slack'],
            priority: 2
          },
          {
            name: 'Leadership & Communication',
            skills: ['Team Leadership', 'Stakeholder Management', 'Conflict Resolution', 'Negotiation', 'Presentation'],
            priority: 3
          },
          {
            name: 'Business Skills',
            skills: ['Change Management', 'Vendor Management', 'Contract Management', 'Quality Assurance', 'Process Improvement'],
            priority: 3
          }
        ],
        displayFormat: 'categorized',
        maxSkillsPerCategory: 7
      },
      
      experienceEnhancements: [
        {
          roleLevel: 'junior',
          bulletPointTemplate: 'Managed [PROJECT_TYPE] project with [BUDGET] budget delivering [OUTCOME] on schedule',
          achievementTemplate: 'Successfully coordinated [NUMBER] team members to complete [PROJECT] [PERCENTAGE] under budget',
          quantificationGuide: 'Include metrics like project size, budget, timeline, team size, and delivery success',
          actionVerbs: ['Managed', 'Coordinated', 'Tracked', 'Monitored', 'Supported', 'Organized', 'Facilitated']
        },
        {
          roleLevel: 'mid',
          bulletPointTemplate: 'Led [NUMBER] concurrent projects worth [VALUE] achieving [PERCENTAGE] on-time delivery rate',
          achievementTemplate: 'Implemented [METHODOLOGY] reducing project delivery time by [PERCENTAGE] across [PORTFOLIO]',
          quantificationGuide: 'Focus on portfolio management, process improvements, and organizational impact',
          actionVerbs: ['Led', 'Delivered', 'Implemented', 'Optimized', 'Streamlined', 'Directed', 'Executed']
        },
        {
          roleLevel: 'senior',
          bulletPointTemplate: 'Directed program portfolio of [VALUE] spanning [NUMBER] projects and [TEAM_SIZE] resources',
          achievementTemplate: 'Established PMO framework that improved project success rate from [PERCENTAGE] to [PERCENTAGE]',
          quantificationGuide: 'Emphasize strategic program management, organizational transformation, and enterprise impact',
          actionVerbs: ['Directed', 'Established', 'Transformed', 'Orchestrated', 'Championed', 'Governed', 'Spearheaded']
        }
      ],
      
      achievementTemplates: [
        'Delivered [NUMBER] projects totaling [VALUE] with [PERCENTAGE] on-time completion rate',
        'Reduced project costs by [PERCENTAGE] through effective resource optimization',
        'Improved team productivity by [PERCENTAGE] implementing Agile methodologies',
        'Managed stakeholder relationships across [NUMBER] departments ensuring alignment',
        'Achieved [PERCENTAGE] customer satisfaction score across project portfolio'
      ],
      
      keywordOptimization: [
        'project lifecycle management', 'agile transformation', 'risk mitigation',
        'resource optimization', 'stakeholder alignment', 'cross-functional leadership',
        'project governance', 'delivery excellence', 'scope management',
        'change control', 'quality management', 'continuous improvement'
      ]
    },
    
    validationRules: {
      requiredSections: [
        CVSection.PROFESSIONAL_SUMMARY,
        CVSection.EXPERIENCE,
        CVSection.SKILLS,
        CVSection.ACHIEVEMENTS
      ],
      optionalSections: [
        CVSection.EDUCATION,
        CVSection.CERTIFICATIONS,
        CVSection.PROJECTS
      ],
      minExperienceYears: 3,
      criticalSkills: ['Project Management', 'Leadership', 'Communication']
    },
    
    version: '1.0.0',
    isActive: true
  },

  // DevOps Engineer Profile
  {
    name: 'DevOps Engineer',
    category: RoleCategory.ENGINEERING,
    description: 'Implements and maintains CI/CD pipelines, infrastructure automation, and cloud deployment strategies. Bridges development and operations teams to ensure reliable, scalable, and efficient software delivery and system operations.',
    keywords: [
      'devops', 'ci/cd', 'infrastructure as code', 'cloud', 'automation',
      'docker', 'kubernetes', 'aws', 'jenkins', 'terraform', 'ansible',
      'monitoring', 'linux', 'scripting', 'deployment', 'site reliability'
    ],
    requiredSkills: [
      'Docker', 'Kubernetes', 'Jenkins', 'AWS', 'Terraform', 'CI/CD',
      'Linux', 'Ansible', 'Git', 'Python/Bash Scripting'
    ],
    preferredSkills: [
      'Azure', 'GCP', 'Prometheus', 'Grafana', 'ELK Stack', 'Helm',
      'ArgoCD', 'GitLab CI', 'GitHub Actions', 'CloudFormation', 'Vault',
      'Service Mesh', 'Istio', 'MongoDB', 'Redis'
    ],
    experienceLevel: ExperienceLevel.MID,
    industryFocus: ['Technology', 'SaaS', 'Fintech', 'E-commerce', 'Cloud Services', 'Enterprise'],
    
    matchingCriteria: {
      titleKeywords: [
        'devops engineer', 'site reliability engineer', 'sre', 'infrastructure engineer',
        'cloud engineer', 'platform engineer', 'automation engineer', 'deployment engineer',
        'release engineer', 'systems engineer', 'devops architect'
      ],
      skillKeywords: [
        'devops', 'docker', 'kubernetes', 'jenkins', 'aws', 'terraform',
        'ci/cd', 'linux', 'ansible', 'automation', 'cloud', 'infrastructure',
        'monitoring', 'scripting', 'deployment'
      ],
      industryKeywords: [
        'technology', 'cloud', 'saas', 'infrastructure', 'platform',
        'enterprise', 'startup', 'software', 'services'
      ],
      experienceKeywords: [
        'implemented', 'automated', 'deployed', 'configured', 'maintained',
        'optimized', 'built', 'managed', 'scaled', 'monitored',
        'orchestrated', 'migrated', 'secured', 'troubleshot'
      ],
      educationKeywords: [
        'computer science', 'information technology', 'engineering',
        'systems administration', 'network engineering', 'software engineering'
      ]
    },
    
    enhancementTemplates: {
      professionalSummary: 'Experienced DevOps Engineer with [X] years of expertise in building and maintaining scalable infrastructure serving [USER_COUNT] users. Proficient in AWS, Docker, Kubernetes, and CI/CD with proven track record of reducing deployment time by [PERCENTAGE] and achieving [UPTIME]% system uptime. Expert in infrastructure automation and cloud-native technologies.',
      
      skillsStructure: {
        categories: [
          {
            name: 'Container & Orchestration',
            skills: ['Docker', 'Kubernetes', 'Helm', 'Docker Compose', 'Container Registry', 'Service Mesh'],
            priority: 1
          },
          {
            name: 'CI/CD & Automation',
            skills: ['Jenkins', 'GitLab CI', 'GitHub Actions', 'ArgoCD', 'Terraform', 'Ansible'],
            priority: 1
          },
          {
            name: 'Cloud Platforms',
            skills: ['AWS', 'Azure', 'GCP', 'CloudFormation', 'IAM', 'VPC'],
            priority: 2
          },
          {
            name: 'Monitoring & Logging',
            skills: ['Prometheus', 'Grafana', 'ELK Stack', 'Datadog', 'New Relic', 'CloudWatch'],
            priority: 3
          },
          {
            name: 'Scripting & Tools',
            skills: ['Python', 'Bash', 'Git', 'Linux', 'Nginx', 'Redis'],
            priority: 3
          }
        ],
        displayFormat: 'categorized',
        maxSkillsPerCategory: 8
      },
      
      experienceEnhancements: [
        {
          roleLevel: 'junior',
          bulletPointTemplate: 'Implemented [TOOL/TECHNOLOGY] reducing deployment time from [TIME] to [TIME]',
          achievementTemplate: 'Automated [PROCESS] using [TECHNOLOGY] saving [HOURS] hours weekly',
          quantificationGuide: 'Include metrics like deployment frequency, build times, automation savings, and uptime improvements',
          actionVerbs: ['Implemented', 'Configured', 'Automated', 'Deployed', 'Maintained', 'Monitored', 'Supported']
        },
        {
          roleLevel: 'mid',
          bulletPointTemplate: 'Architected CI/CD pipeline serving [DEPLOYMENTS] daily deployments with [SUCCESS_RATE]% success rate',
          achievementTemplate: 'Migrated [SERVICES] services to Kubernetes reducing infrastructure costs by [PERCENTAGE]',
          quantificationGuide: 'Focus on infrastructure scale, cost optimization, reliability improvements, and automation impact',
          actionVerbs: ['Architected', 'Migrated', 'Optimized', 'Scaled', 'Orchestrated', 'Streamlined', 'Secured']
        },
        {
          roleLevel: 'senior',
          bulletPointTemplate: 'Led DevOps transformation reducing release cycle from [TIME] to [TIME] across [TEAMS] teams',
          achievementTemplate: 'Designed multi-region infrastructure supporting [REQUESTS] requests/second with [UPTIME]% uptime',
          quantificationGuide: 'Emphasize organizational transformation, enterprise scale, and strategic infrastructure decisions',
          actionVerbs: ['Led', 'Designed', 'Transformed', 'Established', 'Pioneered', 'Governed', 'Championed']
        }
      ],
      
      achievementTemplates: [
        'Reduced deployment time by [PERCENTAGE] through CI/CD pipeline optimization',
        'Achieved [UPTIME]% system uptime through proactive monitoring and automation',
        'Cut infrastructure costs by [PERCENTAGE] through resource optimization and auto-scaling',
        'Implemented disaster recovery solution with [RTO] RTO and [RPO] RPO',
        'Automated [NUMBER] manual processes saving [HOURS] hours monthly'
      ],
      
      keywordOptimization: [
        'infrastructure as code', 'continuous integration', 'continuous deployment',
        'cloud automation', 'container orchestration', 'microservices architecture',
        'site reliability', 'infrastructure optimization', 'security automation',
        'monitoring and alerting', 'disaster recovery', 'high availability'
      ]
    },
    
    validationRules: {
      requiredSections: [
        CVSection.PROFESSIONAL_SUMMARY,
        CVSection.EXPERIENCE,
        CVSection.SKILLS,
        CVSection.PROJECTS
      ],
      optionalSections: [
        CVSection.EDUCATION,
        CVSection.CERTIFICATIONS,
        CVSection.ACHIEVEMENTS
      ],
      minExperienceYears: 2,
      criticalSkills: ['CI/CD', 'Cloud Platforms', 'Automation']
    },
    
    version: '1.0.0',
    isActive: true
  }
];