/**
 * Role Profile System Integration Example
 * 
 * This example demonstrates how to integrate and use the role profile system
 * with the existing CVPlus architecture
 */

import { ParsedCV } from '../types/job';
import { CVTransformationService } from '../services/cv-transformation.service';
import { RoleDetectionService } from '../services/role-detection.service';
import { RoleProfileService } from '../services/role-profile.service';
import { RoleCategory } from '../types/role-profile.types';

/**
 * Example: Complete CV Enhancement Flow with Role Detection
 */
export async function enhanceCVWithRoleDetection(parsedCV: ParsedCV): Promise<{
  originalCV: ParsedCV;
  enhancedCV: ParsedCV;
  detectedRole: string;
  confidence: number;
  appliedEnhancements: string[];
}> {
  
  // Initialize services
  const cvTransformationService = new CVTransformationService();
  const roleDetectionService = new RoleDetectionService();
  
  try {
    // Step 1: Detect the primary role
    const roleResults = await roleDetectionService.detectRoles(parsedCV);
    
    const primaryRole = roleResults[0]; // Get the highest confidence match
    
    // Step 2: Generate role-enhanced recommendations
    const recommendations = await cvTransformationService.generateRoleEnhancedRecommendations(
      parsedCV,
      true, // Enable role detection
      primaryRole.roleName
    );
    
    recommendations.slice(0, 5).forEach((rec, index) => {
    });
    
    // Step 3: Apply top recommendations
    const topRecommendations = recommendations
      .filter(rec => rec.impact === 'high')
      .slice(0, 5);
    
    const transformationResult = await cvTransformationService.applyRoleEnhancedRecommendations(
      parsedCV,
      topRecommendations,
      true
    );
    
    
    return {
      originalCV: parsedCV,
      enhancedCV: transformationResult.improvedCV,
      detectedRole: primaryRole.roleName,
      confidence: primaryRole.confidence,
      appliedEnhancements: transformationResult.appliedRecommendations.map(rec => rec.title)
    };
    
  } catch (error) {
    throw new Error(`CV enhancement failed: ${error}`);
  }
}

/**
 * Example: Role-Specific Template Generation
 */
export async function generateRoleSpecificTemplates(parsedCV: ParsedCV): Promise<{
  detectedRole: string;
  templates: {
    professionalSummary: string;
    experienceBullets: string[];
    skillsRecommendations: string[];
    achievementExamples: string[];
  };
}> {
  
  const cvTransformationService = new CVTransformationService();
  
  const templates = await cvTransformationService.getRoleEnhancementTemplates(parsedCV);
  
  if (!templates.detectedRole) {
    throw new Error('Could not detect role from CV');
  }
  
  return {
    detectedRole: templates.detectedRole.roleName,
    templates: {
      professionalSummary: templates.templates.professionalSummary || 'No template available',
      experienceBullets: templates.templates.experienceEnhancements || [],
      skillsRecommendations: templates.templates.skillsOptimization || [],
      achievementExamples: templates.templates.achievementTemplates || []
    }
  };
}

/**
 * Example: Custom Role Profile Creation
 */
export async function createCustomRoleProfile(roleData: {
  name: string;
  category: RoleCategory;
  description: string;
  requiredSkills: string[];
  industryFocus: string[];
  keywordCriteria: {
    titles: string[];
    skills: string[];
    experience: string[];
  };
}): Promise<string> {
  
  const roleProfileService = new RoleProfileService();
  
  const customProfile = {
    name: roleData.name,
    category: roleData.category,
    description: roleData.description,
    keywords: [...roleData.requiredSkills, ...roleData.industryFocus],
    requiredSkills: roleData.requiredSkills,
    preferredSkills: [],
    experienceLevel: 'mid' as any,
    industryFocus: roleData.industryFocus,
    
    matchingCriteria: {
      titleKeywords: roleData.keywordCriteria.titles,
      skillKeywords: roleData.keywordCriteria.skills,
      industryKeywords: roleData.industryFocus.map(i => i.toLowerCase()),
      experienceKeywords: roleData.keywordCriteria.experience
    },
    
    enhancementTemplates: {
      professionalSummary: `Experienced ${roleData.name} with [X] years of expertise in ${roleData.requiredSkills.slice(0, 3).join(', ')}.`,
      
      skillsStructure: {
        categories: [{
          name: 'Core Skills',
          skills: roleData.requiredSkills,
          priority: 1
        }],
        displayFormat: 'categorized' as const,
        maxSkillsPerCategory: 8
      },
      
      experienceEnhancements: [{
        roleLevel: 'mid' as any,
        bulletPointTemplate: `Led ${roleData.name.toLowerCase()} initiatives resulting in [QUANTIFIABLE_OUTCOME]`,
        achievementTemplate: `Successfully delivered [PROJECT] using ${roleData.requiredSkills[0]} improving [METRIC] by [PERCENTAGE]`,
        quantificationGuide: 'Include specific metrics and business impact',
        actionVerbs: ['Led', 'Delivered', 'Improved', 'Implemented', 'Optimized']
      }],
      
      achievementTemplates: [
        `Delivered [NUMBER] ${roleData.name.toLowerCase()} projects with [SUCCESS_METRIC]`
      ],
      
      keywordOptimization: roleData.requiredSkills
    },
    
    validationRules: {
      requiredSections: ['experience', 'skills'] as any[],
      optionalSections: ['education', 'certifications'] as any[],
      criticalSkills: roleData.requiredSkills.slice(0, 3)
    },
    
    version: '1.0.0',
    isActive: true
  };
  
  // Validate the profile
  const validation = roleProfileService.validateProfile(customProfile);
  
  if (!validation.isValid) {
    throw new Error(`Invalid profile data: ${validation.errors.join(', ')}`);
  }
  
  // Create the profile
  const profileId = await roleProfileService.createProfile(customProfile);
  
  
  return profileId;
}

/**
 * Example usage in a Firebase Function
 */
export const exampleUsageInFirebaseFunction = {
  // Cloud Function for CV enhancement
  enhanceCV: async (parsedCV: ParsedCV) => {
    try {
      const result = await enhanceCVWithRoleDetection(parsedCV);
      
      return {
        success: true,
        data: {
          enhancedCV: result.enhancedCV,
          metadata: {
            detectedRole: result.detectedRole,
            confidence: result.confidence,
            enhancementsApplied: result.appliedEnhancements
          }
        }
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Enhancement failed'
      };
    }
  },
  
  // Cloud Function for role detection only
  detectRole: async (parsedCV: ParsedCV) => {
    const roleDetectionService = new RoleDetectionService();
    
    try {
      const analysis = await roleDetectionService.detectRoles(parsedCV);
      
      return {
        success: true,
        data: {
          primaryRole: analysis[0],
          alternatives: analysis.slice(1, 4),
          recommendations: analysis[0]?.recommendations.slice(0, 5) || [],
          gapAnalysis: analysis[0]?.fitAnalysis || { strengths: [], gaps: [], overallAssessment: '' }
        }
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Role detection failed'
      };
    }
  },
  
  // Cloud Function for getting enhancement templates
  getTemplates: async (parsedCV: ParsedCV) => {
    const cvTransformationService = new CVTransformationService();
    
    try {
      const templates = await cvTransformationService.getRoleEnhancementTemplates(parsedCV);
      
      return {
        success: true,
        data: templates
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Template generation failed'
      };
    }
  }
};