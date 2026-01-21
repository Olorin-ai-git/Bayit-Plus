// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts/**
 * Role Detection Maps and Configurations
 * 
 * Synonym mappings, abbreviations, and indicators for role detection
 */

import { ExperienceLevel } from '@cvplus/core/types/role-profile.types';

/**
 * Create synonym mappings for role keywords
 */
export function createSynonymMap(): Map<string, string[]> {
  return new Map([
    ['software engineer', ['software developer', 'programmer', 'coder', 'developer', 'swe', 'software dev']],
    ['product manager', ['pm', 'product owner', 'po', 'product lead', 'product head']],
    ['business analyst', ['ba', 'business systems analyst', 'systems analyst', 'requirements analyst']],
    ['ui/ux', ['user experience', 'interface design', 'product design', 'ux design', 'ui design', 'interaction design']],
    ['data scientist', ['data analyst', 'ml engineer', 'machine learning engineer', 'ai engineer', 'data engineer']],
    ['devops', ['dev ops', 'site reliability engineer', 'sre', 'infrastructure engineer', 'platform engineer']],
    ['project manager', ['program manager', 'delivery manager', 'scrum master', 'agile coach']],
    ['quality assurance', ['qa', 'test engineer', 'quality engineer', 'sdet', 'automation engineer']],
    ['full stack', ['fullstack', 'full-stack', 'front and back end', 'frontend and backend']],
    ['frontend', ['front-end', 'front end', 'ui developer', 'client-side developer']],
    ['backend', ['back-end', 'back end', 'server-side developer', 'api developer']],
    ['database', ['db', 'data management', 'sql developer', 'database developer', 'dba']],
    ['cloud', ['aws', 'azure', 'gcp', 'cloud computing', 'cloud infrastructure']],
    ['marketing', ['digital marketing', 'growth marketing', 'product marketing', 'content marketing']],
    ['sales', ['business development', 'bd', 'account executive', 'ae', 'sales representative']]
  ]);
}

/**
 * Create abbreviation mappings
 */
export function createAbbreviationMap(): Map<string, string> {
  return new Map([
    ['pm', 'product manager'],
    ['ba', 'business analyst'],
    ['qa', 'quality assurance'],
    ['swe', 'software engineer'],
    ['sre', 'site reliability engineer'],
    ['po', 'product owner'],
    ['ae', 'account executive'],
    ['bd', 'business development'],
    ['cto', 'chief technology officer'],
    ['ceo', 'chief executive officer'],
    ['cfo', 'chief financial officer'],
    ['vp', 'vice president'],
    ['hr', 'human resources'],
    ['it', 'information technology'],
    ['ui', 'user interface'],
    ['ux', 'user experience'],
    ['api', 'application programming interface'],
    ['ml', 'machine learning'],
    ['ai', 'artificial intelligence'],
    ['dba', 'database administrator'],
    ['sdet', 'software development engineer in test']
  ]);
}

/**
 * Create negative indicators that exclude certain roles
 */
export function createNegativeIndicators(): Map<string, string[]> {
  return new Map([
    ['software engineer', ['no coding', 'non-technical', 'no programming', 'business only', 'non-developer']],
    ['data scientist', ['no statistics', 'no analytics', 'no data analysis', 'no ml experience']],
    ['manager', ['individual contributor', 'ic role', 'no management', 'non-managerial']],
    ['senior', ['entry level', 'junior', 'fresh graduate', 'intern', 'no experience']],
    ['technical', ['non-technical', 'business focused', 'no coding']]
  ]);
}

/**
 * Create seniority keywords for experience level detection
 */
export function createSeniorityKeywords(): Map<ExperienceLevel, string[]> {
  return new Map([
    [ExperienceLevel.ENTRY, ['entry level', 'graduate', 'intern', 'trainee', '0-1 years', 'fresh graduate']],
    [ExperienceLevel.JUNIOR, ['junior', '1-3 years', '2+ years', 'associate', 'jr', 'early career']],
    [ExperienceLevel.MID, ['mid-level', 'mid level', '3-5 years', '4+ years', '5+ years', 'intermediate']],
    [ExperienceLevel.SENIOR, ['senior', 'sr', '5+ years', '7+ years', '8+ years', 'experienced', 'advanced']],
    [ExperienceLevel.LEAD, ['lead', 'team lead', 'tech lead', 'technical lead', '10+ years', 'principal']],
    [ExperienceLevel.PRINCIPAL, ['principal', 'staff', 'architect', '12+ years', '15+ years', 'expert']],
    [ExperienceLevel.EXECUTIVE, ['executive', 'director', 'vp', 'vice president', 'chief', 'cto', 'ceo', 'head of']]
  ]);
}

/**
 * Detect experience level from CV content
 */
export function detectExperienceLevel(text: string, seniorityKeywords: Map<ExperienceLevel, string[]>): {
  level: ExperienceLevel;
  yearsOfExperience?: number;
  keywords: string[];
} {
  const lowerText = text.toLowerCase();
  let detectedLevel = ExperienceLevel.MID; // Default to mid-level
  let yearsOfExperience: number | undefined;
  const matchedKeywords: string[] = [];

  // Extract years of experience
  const yearsPattern = /(\d+)\+?\s*years?\s*(of\s*)?experience/gi;
  const yearsMatches = lowerText.match(yearsPattern);
  if (yearsMatches) {
    const numbers = yearsMatches.map(match => {
      const num = match.match(/\d+/);
      return num ? parseInt(num[0]) : 0;
    });
    yearsOfExperience = Math.max(...numbers);
  }

  // Check for seniority keywords
  for (const [level, keywords] of seniorityKeywords) {
    for (const keyword of keywords) {
      if (lowerText.includes(keyword.toLowerCase())) {
        matchedKeywords.push(keyword);
        // Prioritize executive > principal > lead > senior > mid > junior > entry
        const levelPriority = {
          [ExperienceLevel.EXECUTIVE]: 7,
          [ExperienceLevel.PRINCIPAL]: 6,
          [ExperienceLevel.LEAD]: 5,
          [ExperienceLevel.SENIOR]: 4,
          [ExperienceLevel.MID]: 3,
          [ExperienceLevel.JUNIOR]: 2,
          [ExperienceLevel.ENTRY]: 1
        };
        
        if (levelPriority[level] > levelPriority[detectedLevel]) {
          detectedLevel = level;
        }
      }
    }
  }

  // Adjust based on years of experience if found
  if (yearsOfExperience !== undefined) {
    if (yearsOfExperience >= 15) detectedLevel = ExperienceLevel.PRINCIPAL;
    else if (yearsOfExperience >= 10) detectedLevel = ExperienceLevel.LEAD;
    else if (yearsOfExperience >= 7) detectedLevel = ExperienceLevel.SENIOR;
    else if (yearsOfExperience >= 3) detectedLevel = ExperienceLevel.MID;
    else if (yearsOfExperience >= 1) detectedLevel = ExperienceLevel.JUNIOR;
    else detectedLevel = ExperienceLevel.ENTRY;
  }

  return {
    level: detectedLevel,
    yearsOfExperience,
    keywords: matchedKeywords
  };
}

/**
 * Check for negative indicators that should reduce role confidence
 */
export function checkNegativeIndicators(
  roleKeyword: string,
  cvText: string,
  negativeIndicators: Map<string, string[]>
): number {
  const negatives = negativeIndicators.get(roleKeyword.toLowerCase()) || [];
  const text = cvText.toLowerCase();
  let penaltyFactor = 1.0;

  for (const negative of negatives) {
    if (text.includes(negative)) {
      penaltyFactor *= 0.7; // Reduce confidence by 30% for each negative indicator
    }
  }

  return penaltyFactor;
}