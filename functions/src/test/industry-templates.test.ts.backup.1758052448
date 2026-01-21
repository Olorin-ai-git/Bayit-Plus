/**
 * Industry Templates Service Test Suite
 * 
 * Tests for industry-specific template system
 * 
 * @author Gil Klainert
 * @version 1.0.0
 */

import { 
  IndustryTemplatesService,
  IndustryTemplate,
  TemplateMatchScore 
} from '../services/industry-templates.service';
import { ParsedCV } from '../types/enhanced-models';

describe('Industry Templates Service Test Suite', () => {
  let industryService: IndustryTemplatesService;
  let mockTechCV: ParsedCV;
  let mockMarketingCV: ParsedCV;
  let mockFinanceCV: ParsedCV;
  let mockHealthcareCV: ParsedCV;
  let mockManufacturingCV: ParsedCV;

  beforeEach(() => {
    industryService = new IndustryTemplatesService();
    
    // Mock Technology CV
    mockTechCV = {
      personalInfo: {
        name: 'Alice Johnson',
        title: 'Senior Software Engineer',
        summary: 'Experienced software engineer specializing in cloud architecture and microservices'
      },
      experience: [
        {
          company: 'TechGiant Corp',
          position: 'Senior Software Engineer',
          duration: '4 years',
          startDate: '2020-01-01',
          description: 'Led development of scalable cloud-native applications using React and Node.js',
          achievements: [
            'Improved system performance by 45%',
            'Architected microservices platform serving 1M+ users',
            'Reduced deployment time by 70% through CI/CD automation'
          ],
          technologies: ['React', 'Node.js', 'AWS', 'Kubernetes', 'Docker']
        }
      ],
      skills: {
        technical: ['JavaScript', 'TypeScript', 'React', 'Node.js', 'Python', 'AWS', 'Docker', 'Kubernetes', 'GraphQL'],
        soft: ['Problem Solving', 'Leadership', 'Agile Methodology']
      },
      achievements: ['AWS Certified Solutions Architect', 'Published 5 technical articles on Medium']
    };

    // Mock Marketing CV
    mockMarketingCV = {
      personalInfo: {
        name: 'Bob Wilson',
        title: 'Marketing Director',
        summary: 'Results-driven marketing professional with expertise in digital marketing and brand management'
      },
      experience: [
        {
          company: 'BrandCorp',
          position: 'Marketing Director',
          duration: '3 years',
          startDate: '2021-01-01',
          description: 'Led integrated marketing campaigns and brand strategy initiatives',
          achievements: [
            'Increased brand awareness by 60%',
            'Generated $2M in additional revenue through digital campaigns',
            'Improved customer acquisition cost by 35%'
          ]
        }
      ],
      skills: {
        technical: ['Google Analytics', 'Salesforce', 'HubSpot', 'Adobe Creative Suite'],
        soft: ['Creative Problem Solving', 'Strategic Planning', 'Team Leadership']
      },
      achievements: ['Google Ads Certified', 'Facebook Blueprint Certified']
    };

    // Mock Finance CV
    mockFinanceCV = {
      personalInfo: {
        name: 'Carol Davis',
        title: 'Financial Analyst',
        summary: 'Detail-oriented financial analyst with expertise in risk management and portfolio optimization'
      },
      experience: [
        {
          company: 'Investment Partners LLC',
          position: 'Senior Financial Analyst',
          duration: '5 years',
          startDate: '2019-01-01',
          description: 'Conducted financial modeling and risk assessment for investment portfolios',
          achievements: [
            'Managed $50M investment portfolio with 12% annual return',
            'Reduced portfolio risk by 25% through diversification strategies',
            'Developed automated risk monitoring system'
          ]
        }
      ],
      skills: {
        technical: ['Excel', 'Bloomberg Terminal', 'Python', 'R', 'SQL', 'Tableau'],
        soft: ['Analytical Thinking', 'Risk Assessment', 'Strategic Planning']
      },
      achievements: ['CFA Level II Candidate', 'Financial Risk Manager (FRM) Certified']
    };

    // Mock Healthcare CV
    mockHealthcareCV = {
      personalInfo: {
        name: 'Dr. David Chen',
        title: 'Senior Clinical Researcher',
        summary: 'Experienced clinical researcher with focus on cardiovascular disease treatment protocols'
      },
      experience: [
        {
          company: 'Medical Research Institute',
          position: 'Senior Clinical Researcher',
          duration: '6 years',
          startDate: '2018-01-01',
          description: 'Led clinical trials and research studies for cardiovascular treatments',
          achievements: [
            'Published 15 peer-reviewed research papers',
            'Led Phase III clinical trial with 500+ participants',
            'Improved patient outcomes by 30% through protocol optimization'
          ]
        }
      ],
      skills: {
        technical: ['Clinical Trial Design', 'Statistical Analysis', 'R', 'SAS', 'SPSS'],
        soft: ['Patient Care', 'Research Ethics', 'Team Collaboration']
      },
      achievements: ['Board Certified in Internal Medicine', 'NIH Research Grant Recipient']
    };

    // Mock Manufacturing CV
    mockManufacturingCV = {
      personalInfo: {
        name: 'Emily Rodriguez',
        title: 'Operations Manager',
        summary: 'Operations manager specializing in lean manufacturing and process optimization'
      },
      experience: [
        {
          company: 'Manufacturing Solutions Inc',
          position: 'Operations Manager',
          duration: '4 years',
          startDate: '2020-01-01',
          description: 'Managed production operations and implemented lean manufacturing principles',
          achievements: [
            'Reduced production costs by 20% through process optimization',
            'Improved product quality scores by 35%',
            'Implemented lean manufacturing reducing waste by 40%'
          ]
        }
      ],
      skills: {
        technical: ['Lean Manufacturing', 'Six Sigma', 'SAP', 'AutoCAD', 'Quality Control'],
        soft: ['Process Improvement', 'Team Leadership', 'Problem Solving']
      },
      achievements: ['Six Sigma Black Belt', 'Lean Manufacturing Certified']
    };
  });

  describe('Template Retrieval', () => {
    
    test('should return all available templates', () => {
      const templates = industryService.getAllTemplates();
      
      expect(templates).toBeDefined();
      expect(Array.isArray(templates)).toBe(true);
      expect(templates.length).toBeGreaterThan(5); // Should have at least 6 templates
      
      // Check that key templates exist
      const templateNames = templates.map(t => t.name);
      expect(templateNames).toContain('Technology & Software');
      expect(templateNames).toContain('Marketing & Sales');
      expect(templateNames).toContain('Finance & Consulting');
      expect(templateNames).toContain('Healthcare & Life Sciences');
      expect(templateNames).toContain('Manufacturing & Operations');
      expect(templateNames).toContain('General Business Professional');
    });

    test('should retrieve specific template by ID', () => {
      const techTemplate = industryService.getTemplate('technology');
      
      expect(techTemplate).toBeDefined();
      expect(techTemplate?.name).toBe('Technology & Software');
      expect(techTemplate?.sector).toBe('Technology');
      expect(techTemplate?.vocabularyFocus).toContain('innovate');
      expect(techTemplate?.commonKeywords).toContain('software development');
      expect(techTemplate?.scoringWeights.technicalSkills).toBeGreaterThan(0.3);
    });

    test('should return null for non-existent template', () => {
      const template = industryService.getTemplate('non-existent-industry');
      
      expect(template).toBeNull();
    });

    test('should return fallback template when requested', () => {
      const fallbackTemplate = industryService.getTemplate('general-business');
      
      expect(fallbackTemplate).toBeDefined();
      expect(fallbackTemplate?.name).toBe('General Business Professional');
      expect(fallbackTemplate?.sector).toBe('General Business');
    });
  });

  describe('Template Matching Analysis', () => {
    
    test('should correctly identify technology professional', () => {
      const recommendations = industryService.analyzeAndRecommendTemplate(mockTechCV);
      
      expect(recommendations).toBeDefined();
      expect(Array.isArray(recommendations)).toBe(true);
      expect(recommendations.length).toBeGreaterThan(0);
      
      // Should rank technology template highest
      const topRecommendation = recommendations[0];
      expect(topRecommendation.templateId).toBe('technology');
      expect(topRecommendation.score).toBeGreaterThan(0.6);
      expect(topRecommendation.strengthAreas).toContain('Technical Skills');
      expect(topRecommendation.confidence).toBeGreaterThan(0.7);
    });

    test('should correctly identify marketing professional', () => {
      const recommendations = industryService.analyzeAndRecommendTemplate(mockMarketingCV);
      
      const topRecommendation = recommendations[0];
      expect(topRecommendation.templateId).toBe('marketing-sales');
      expect(topRecommendation.score).toBeGreaterThan(0.5);
      expect(topRecommendation.strengthAreas).toContain('Industry Experience');
    });

    test('should correctly identify finance professional', () => {
      const recommendations = industryService.analyzeAndRecommendTemplate(mockFinanceCV);
      
      const topRecommendation = recommendations[0];
      expect(topRecommendation.templateId).toBe('finance-consulting');
      expect(topRecommendation.score).toBeGreaterThan(0.5);
    });

    test('should correctly identify healthcare professional', () => {
      const recommendations = industryService.analyzeAndRecommendTemplate(mockHealthcareCV);
      
      const topRecommendation = recommendations[0];
      expect(topRecommendation.templateId).toBe('healthcare');
      expect(topRecommendation.score).toBeGreaterThan(0.5);
    });

    test('should correctly identify manufacturing professional', () => {
      const recommendations = industryService.analyzeAndRecommendTemplate(mockManufacturingCV);
      
      const topRecommendation = recommendations[0];
      expect(topRecommendation.templateId).toBe('manufacturing');
      expect(topRecommendation.score).toBeGreaterThan(0.5);
    });

    test('should provide meaningful match reasons', () => {
      const recommendations = industryService.analyzeAndRecommendTemplate(mockTechCV);
      const topRecommendation = recommendations[0];
      
      expect(topRecommendation.matchReasons).toBeDefined();
      expect(Array.isArray(topRecommendation.matchReasons)).toBe(true);
      expect(topRecommendation.matchReasons.length).toBeGreaterThan(0);
      
      const reasons = topRecommendation.matchReasons.join(' ');
      expect(reasons.toLowerCase()).toContain('technical');
    });

    test('should identify strength and improvement areas', () => {
      const recommendations = industryService.analyzeAndRecommendTemplate(mockTechCV);
      const topRecommendation = recommendations[0];
      
      expect(Array.isArray(topRecommendation.strengthAreas)).toBe(true);
      expect(Array.isArray(topRecommendation.improvementAreas)).toBe(true);
      
      if (topRecommendation.strengthAreas.length > 0) {
        expect(topRecommendation.strengthAreas[0]).toBeDefined();
      }
    });

    test('should handle CV with minimal data', () => {
      const minimalCV: ParsedCV = {
        personalInfo: { name: 'John Doe' },
        experience: []
      };

      const recommendations = industryService.analyzeAndRecommendTemplate(minimalCV);
      
      expect(recommendations).toBeDefined();
      expect(Array.isArray(recommendations)).toBe(true);
      expect(recommendations.length).toBeGreaterThan(0);
      
      // Should default to general business or lowest scoring template
      const topRecommendation = recommendations[0];
      expect(topRecommendation.score).toBeGreaterThanOrEqual(0);
      expect(topRecommendation.confidence).toBeLessThan(0.8); // Low confidence due to minimal data
    });

    test('should return recommendations in descending score order', () => {
      const recommendations = industryService.analyzeAndRecommendTemplate(mockTechCV);
      
      for (let i = 1; i < recommendations.length; i++) {
        expect(recommendations[i-1].score).toBeGreaterThanOrEqual(recommendations[i].score);
      }
    });
  });

  describe('Template Assessment Algorithms', () => {
    
    test('should assess technical skills alignment correctly', () => {
      const service = industryService as any; // Access private methods
      const techTemplate = industryService.getTemplate('technology')!;
      
      const alignment = service.assessTechnicalAlignment(mockTechCV, techTemplate);
      
      expect(alignment).toBeGreaterThan(0.3); // Should have good technical alignment
      expect(alignment).toBeLessThanOrEqual(1.0);
    });

    test('should assess experience relevance correctly', () => {
      const service = industryService as any;
      const techTemplate = industryService.getTemplate('technology')!;
      
      const relevance = service.assessExperienceRelevance(mockTechCV, techTemplate);
      
      expect(relevance).toBeGreaterThan(0.2); // Should have some experience relevance
      expect(relevance).toBeLessThanOrEqual(1.0);
    });

    test('should assess achievement alignment correctly', () => {
      const service = industryService as any;
      const techTemplate = industryService.getTemplate('technology')!;
      
      const alignment = service.assessAchievementAlignment(mockTechCV, techTemplate);
      
      expect(alignment).toBeGreaterThanOrEqual(0);
      expect(alignment).toBeLessThanOrEqual(1.0);
    });

    test('should assess keyword presence correctly', () => {
      const service = industryService as any;
      const techTemplate = industryService.getTemplate('technology')!;
      
      const presence = service.assessKeywordPresence(mockTechCV, techTemplate);
      
      expect(presence).toBeGreaterThanOrEqual(0);
      expect(presence).toBeLessThanOrEqual(1.0);
    });

    test('should assess career progression correctly', () => {
      const service = industryService as any;
      const techTemplate = industryService.getTemplate('technology')!;
      
      const progression = service.assessCareerProgression(mockTechCV, techTemplate);
      
      expect(progression).toBeGreaterThanOrEqual(0);
      expect(progression).toBeLessThanOrEqual(1.0);
    });

    test('should calculate confidence correctly', () => {
      const service = industryService as any;
      const techTemplate = industryService.getTemplate('technology')!;
      
      const confidence = service.calculateConfidence(0.8, mockTechCV, techTemplate);
      
      expect(confidence).toBeGreaterThan(0.8); // Should boost confidence for rich CV
      expect(confidence).toBeLessThanOrEqual(1.0);
    });
  });

  describe('Template Content Validation', () => {
    
    test('should have properly structured technology template', () => {
      const template = industryService.getTemplate('technology')!;
      
      expect(template.id).toBe('technology');
      expect(template.name).toBeDefined();
      expect(template.sector).toBeDefined();
      expect(template.description).toBeDefined();
      expect(Array.isArray(template.keyCharacteristics)).toBe(true);
      expect(Array.isArray(template.vocabularyFocus)).toBe(true);
      expect(Array.isArray(template.requirements)).toBe(true);
      expect(template.messageStructure).toBeDefined();
      expect(template.scoringWeights).toBeDefined();
      expect(template.personalityFit).toBeDefined();
      expect(Array.isArray(template.commonKeywords)).toBe(true);
      expect(Array.isArray(template.avoidKeywords)).toBe(true);
      expect(Array.isArray(template.industrySpecificMetrics)).toBe(true);
    });

    test('should have appropriate scoring weights for technology template', () => {
      const template = industryService.getTemplate('technology')!;
      const weights = template.scoringWeights;
      
      expect(weights.technicalSkills).toBeGreaterThan(0.3); // High emphasis on technical skills
      expect(weights.innovation).toBeGreaterThan(0.2); // Important for tech
      expect(weights.leadership + weights.results + weights.innovation + 
             weights.collaboration + weights.technicalSkills).toBeCloseTo(1.35, 1); // Sum should be reasonable
    });

    test('should have different scoring weights for marketing template', () => {
      const techTemplate = industryService.getTemplate('technology')!;
      const marketingTemplate = industryService.getTemplate('marketing-sales')!;
      
      // Marketing should emphasize results more than technology
      expect(marketingTemplate.scoringWeights.results).toBeGreaterThan(techTemplate.scoringWeights.results);
      
      // Technology should emphasize technical skills more than marketing
      expect(techTemplate.scoringWeights.technicalSkills).toBeGreaterThan(marketingTemplate.scoringWeights.technicalSkills);
    });

    test('should have meaningful vocabulary focus for each template', () => {
      const templates = industryService.getAllTemplates();
      
      templates.forEach(template => {
        expect(template.vocabularyFocus.length).toBeGreaterThan(3);
        expect(template.vocabularyFocus.every(word => typeof word === 'string')).toBe(true);
        expect(template.vocabularyFocus.every(word => word.length > 2)).toBe(true);
      });
    });

    test('should have industry-specific keywords', () => {
      const techTemplate = industryService.getTemplate('technology')!;
      const marketingTemplate = industryService.getTemplate('marketing-sales')!;
      
      expect(techTemplate.commonKeywords).toContain('software development');
      expect(marketingTemplate.commonKeywords).toContain('revenue growth');
      
      // Keywords should be different between industries
      const techKeywords = new Set(techTemplate.commonKeywords);
      const marketingKeywords = new Set(marketingTemplate.commonKeywords);
      const overlap = new Set([...techKeywords].filter(x => marketingKeywords.has(x)));
      
      expect(overlap.size).toBeLessThan(Math.min(techKeywords.size, marketingKeywords.size) * 0.5);
    });
  });

  describe('Edge Cases and Error Handling', () => {
    
    test('should handle CV with no experience', () => {
      const noExperienceCV: ParsedCV = {
        personalInfo: { name: 'Fresh Graduate' },
        skills: { technical: ['Python', 'Java'], soft: ['Learning'] }
      };

      const recommendations = industryService.analyzeAndRecommendTemplate(noExperienceCV);
      
      expect(recommendations).toBeDefined();
      expect(recommendations.length).toBeGreaterThan(0);
      expect(recommendations[0].confidence).toBeLessThan(0.7); // Lower confidence
    });

    test('should handle CV with no skills', () => {
      const noSkillsCV: ParsedCV = {
        personalInfo: { name: 'Career Changer' },
        experience: [
          {
            company: 'Previous Industry Corp',
            position: 'Generic Role',
            duration: '2 years',
            startDate: '2022-01-01'
          }
        ]
      };

      const recommendations = industryService.analyzeAndRecommendTemplate(noSkillsCV);
      
      expect(recommendations).toBeDefined();
      expect(recommendations.length).toBeGreaterThan(0);
      expect(recommendations[0].score).toBeLessThan(0.8); // Lower score due to missing skills
    });

    test('should handle empty CV gracefully', () => {
      const emptyCV: ParsedCV = {};

      const recommendations = industryService.analyzeAndRecommendTemplate(emptyCV);
      
      expect(recommendations).toBeDefined();
      expect(recommendations.length).toBeGreaterThan(0);
      expect(recommendations[0].confidence).toBeLessThan(0.5); // Very low confidence
    });

    test('should handle CV with avoid keywords appropriately', () => {
      const basicSkillsCV: ParsedCV = {
        personalInfo: { name: 'Basic User' },
        skills: { technical: ['Microsoft Office', 'basic computer skills', 'data entry'] }
      };

      const recommendations = industryService.analyzeAndRecommendTemplate(basicSkillsCV);
      const techRecommendation = recommendations.find(r => r.templateId === 'technology');
      
      expect(techRecommendation).toBeDefined();
      expect(techRecommendation!.score).toBeLessThan(0.6); // Should score lower due to avoid keywords
    });
  });

  describe('Performance and Scalability', () => {
    
    test('should complete analysis within reasonable time', () => {
      const startTime = Date.now();
      
      const recommendations = industryService.analyzeAndRecommendTemplate(mockTechCV);
      
      const analysisTime = Date.now() - startTime;
      expect(analysisTime).toBeLessThan(1000); // Should complete under 1 second
      expect(recommendations).toBeDefined();
    });

    test('should handle multiple concurrent analyses', () => {
      const cvs = [mockTechCV, mockMarketingCV, mockFinanceCV];
      
      const promises = cvs.map(cv => 
        Promise.resolve(industryService.analyzeAndRecommendTemplate(cv))
      );

      return Promise.all(promises).then(results => {
        expect(results).toHaveLength(3);
        results.forEach(recommendations => {
          expect(recommendations).toBeDefined();
          expect(recommendations.length).toBeGreaterThan(0);
        });
      });
    });

    test('should maintain consistent results for same input', () => {
      const recommendations1 = industryService.analyzeAndRecommendTemplate(mockTechCV);
      const recommendations2 = industryService.analyzeAndRecommendTemplate(mockTechCV);
      
      expect(recommendations1).toEqual(recommendations2);
    });
  });
});