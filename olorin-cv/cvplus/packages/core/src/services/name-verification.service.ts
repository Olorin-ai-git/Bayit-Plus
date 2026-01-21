import { logger } from 'firebase-functions';

export interface NameExtractionResult {
  extractedNames: string[];
  confidence: number;
  extractionMethod: 'header' | 'email' | 'pattern' | 'fallback';
  rawText?: string;
}

export interface NameVerificationResult {
  isMatch: boolean;
  confidence: number;
  extractedName: string;
  accountName: string;
  matchType: 'exact' | 'partial' | 'fuzzy' | 'none';
  suggestions?: string[];
  shouldFlag: boolean;
}

export interface AccountNameData {
  firstName: string;
  lastName: string;
  fullName: string;
  displayName?: string;
  email?: string;
}

export class NameVerificationService {
  private readonly EXACT_MATCH_THRESHOLD = 1.0;
  private readonly PARTIAL_MATCH_THRESHOLD = 0.8;
  private readonly FUZZY_MATCH_THRESHOLD = 0.6;
  private readonly FLAGGING_THRESHOLD = 0.5;

  /**
   * Extract name from CV content using multiple strategies
    */
  async extractNameFromCV(cvContent: string): Promise<NameExtractionResult> {
    try {
      // Strategy 1: Header detection (highest confidence)
      const headerNames = this.extractFromHeader(cvContent);
      if (headerNames.length > 0) {
        return {
          extractedNames: headerNames,
          confidence: 0.95,
          extractionMethod: 'header',
          rawText: cvContent.substring(0, 200)
        };
      }

      // Strategy 2: Email-based extraction
      const emailNames = this.extractFromEmail(cvContent);
      if (emailNames.length > 0) {
        return {
          extractedNames: emailNames,
          confidence: 0.8,
          extractionMethod: 'email'
        };
      }

      // Strategy 3: Pattern matching
      const patternNames = this.extractFromPatterns(cvContent);
      if (patternNames.length > 0) {
        return {
          extractedNames: patternNames,
          confidence: 0.7,
          extractionMethod: 'pattern'
        };
      }

      // Strategy 4: Fallback - first non-common words
      const fallbackNames = this.extractFallbackNames(cvContent);
      return {
        extractedNames: fallbackNames,
        confidence: 0.3,
        extractionMethod: 'fallback'
      };

    } catch (error) {
      logger.error('Error extracting name from CV', { error });
      return {
        extractedNames: [],
        confidence: 0,
        extractionMethod: 'fallback'
      };
    }
  }

  /**
   * Verify if extracted name matches account name
    */
  async verifyNameMatch(
    extractedResult: NameExtractionResult,
    accountData: AccountNameData
  ): Promise<NameVerificationResult> {
    try {
      if (extractedResult.extractedNames.length === 0) {
        return {
          isMatch: false,
          confidence: 0,
          extractedName: '',
          accountName: accountData.fullName,
          matchType: 'none',
          shouldFlag: true
        };
      }

      let bestMatch: NameVerificationResult = {
        isMatch: false,
        confidence: 0,
        extractedName: extractedResult.extractedNames[0] || 'Unknown',
        accountName: accountData.fullName,
        matchType: 'none',
        shouldFlag: true
      };

      // Test each extracted name against account names
      for (const extractedName of extractedResult.extractedNames) {
        const normalizedExtracted = this.normalizeName(extractedName);
        
        // Check against full name
        const fullNameMatch = this.calculateNameMatch(normalizedExtracted, accountData.fullName);
        if (fullNameMatch.confidence > bestMatch.confidence) {
          bestMatch = { ...fullNameMatch, extractedName, accountName: accountData.fullName };
        }

        // Check against display name if available
        if (accountData.displayName) {
          const displayNameMatch = this.calculateNameMatch(normalizedExtracted, accountData.displayName);
          if (displayNameMatch.confidence > bestMatch.confidence) {
            bestMatch = { ...displayNameMatch, extractedName, accountName: accountData.displayName };
          }
        }

        // Check against first + last name combination
        const combinedName = `${accountData.firstName} ${accountData.lastName}`.trim();
        if (combinedName !== accountData.fullName) {
          const combinedMatch = this.calculateNameMatch(normalizedExtracted, combinedName);
          if (combinedMatch.confidence > bestMatch.confidence) {
            bestMatch = { ...combinedMatch, extractedName, accountName: combinedName };
          }
        }
      }

      // Generate suggestions for partial matches
      if (bestMatch.matchType === 'partial' || bestMatch.matchType === 'fuzzy') {
        bestMatch.suggestions = this.generateNameSuggestions(
          bestMatch.extractedName,
          accountData
        );
      }

      // Apply extraction confidence multiplier
      bestMatch.confidence *= extractedResult.confidence;

      logger.info('Name verification completed', {
        extractedName: bestMatch.extractedName,
        accountName: bestMatch.accountName,
        matchType: bestMatch.matchType,
        confidence: bestMatch.confidence,
        shouldFlag: bestMatch.shouldFlag
      });

      return bestMatch;

    } catch (error) {
      logger.error('Error verifying name match', { error });
      throw new Error('Failed to verify name match');
    }
  }

  /**
   * Extract names from CV header (first 300 characters)
    */
  private extractFromHeader(content: string): string[] {
    const header = content.substring(0, 300);
    const names: string[] = [];

    // Look for name patterns at the beginning of document
    const namePatterns = [
      // Full name at start of line
      /^([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)/m,
      // Name after common prefixes
      /(?:Name:|Name\s*:|Full Name:|Full Name\s*:)\s*([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)/i,
      // Name in all caps (common CV format)
      /^([A-Z]{2,}(?:\s+[A-Z]{2,})+)/m
    ];

    for (const pattern of namePatterns) {
      const match = header.match(pattern);
      if (match && match[1]) {
        const cleanName = this.cleanExtractedName(match[1]);
        if (this.isValidName(cleanName)) {
          names.push(cleanName);
        }
      }
    }

    return [...new Set(names)]; // Remove duplicates
  }

  /**
   * Extract names from email addresses
    */
  private extractFromEmail(content: string): string[] {
    const names: string[] = [];
    const emailPattern = /([a-zA-Z0-9._%+-]+)@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
    
    let match;
    while ((match = emailPattern.exec(content)) !== null) {
      const localPart = match[1];
      
      // Skip generic email prefixes
      if (localPart && this.isGenericEmail(localPart)) continue;
      
      // Extract name from email local part
      const nameFromEmail = localPart ? this.extractNameFromEmailLocal(localPart) : null;
      if (nameFromEmail && this.isValidName(nameFromEmail)) {
        names.push(nameFromEmail);
      }
    }

    return [...new Set(names)];
  }

  /**
   * Extract names using pattern matching
    */
  private extractFromPatterns(content: string): string[] {
    const names: string[] = [];

    // Pattern for name followed by contact info
    const contactPattern = /([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)[\s\n]*(?:Email|Phone|Tel|Mobile|Address|LinkedIn)/i;
    const contactMatch = content.match(contactPattern);
    if (contactMatch && contactMatch[1]) {
      const cleanName = this.cleanExtractedName(contactMatch[1]);
      if (this.isValidName(cleanName)) {
        names.push(cleanName);
      }
    }

    // Pattern for name before professional title
    const titlePattern = /([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)[\s\n]*(?:Software|Engineer|Developer|Manager|Director|Analyst|Consultant|Specialist)/i;
    const titleMatch = content.match(titlePattern);
    if (titleMatch && titleMatch[1]) {
      const cleanName = this.cleanExtractedName(titleMatch[1]);
      if (this.isValidName(cleanName)) {
        names.push(cleanName);
      }
    }

    return [...new Set(names)];
  }

  /**
   * Fallback name extraction - first capitalized words
    */
  private extractFallbackNames(content: string): string[] {
    const words = content.split(/\s+/).slice(0, 50); // First 50 words only
    const names: string[] = [];

    for (let i = 0; i < words.length - 1; i++) {
      const word1 = words[i];
      const word2 = words[i + 1];

      if (word1 && word2 && this.isCapitalizedWord(word1) && this.isCapitalizedWord(word2)) {
        const candidate = `${word1} ${word2}`;
        if (this.isValidName(candidate) && !this.isCommonPhrase(candidate)) {
          names.push(candidate);
        }
      }
    }

    return [...new Set(names)];
  }

  /**
   * Calculate similarity between extracted and account names
    */
  private calculateNameMatch(extractedName: string, accountName: string): NameVerificationResult {
    const normalizedAccount = this.normalizeName(accountName);
    
    // Exact match
    if (extractedName === normalizedAccount) {
      return {
        isMatch: true,
        confidence: this.EXACT_MATCH_THRESHOLD,
        extractedName,
        accountName,
        matchType: 'exact',
        shouldFlag: false
      };
    }

    // Partial match (words contained in each other)
    const partialMatch = this.calculatePartialMatch(extractedName, normalizedAccount);
    if (partialMatch >= this.PARTIAL_MATCH_THRESHOLD) {
      return {
        isMatch: true,
        confidence: partialMatch,
        extractedName,
        accountName,
        matchType: 'partial',
        shouldFlag: false
      };
    }

    // Fuzzy match using string similarity
    const fuzzyMatch = this.calculateStringSimilarity(extractedName, normalizedAccount);
    if (fuzzyMatch >= this.FUZZY_MATCH_THRESHOLD) {
      return {
        isMatch: true,
        confidence: fuzzyMatch,
        extractedName,
        accountName,
        matchType: 'fuzzy',
        shouldFlag: fuzzyMatch < this.FLAGGING_THRESHOLD
      };
    }

    return {
      isMatch: false,
      confidence: fuzzyMatch,
      extractedName,
      accountName,
      matchType: 'none',
      shouldFlag: true
    };
  }

  /**
   * Calculate partial name match (words overlap)
    */
  private calculatePartialMatch(name1: string, name2: string): number {
    const words1 = name1.toLowerCase().split(/\s+/);
    const words2 = name2.toLowerCase().split(/\s+/);
    
    const commonWords = words1.filter(word => 
      words2.includes(word) && word.length > 1
    );
    
    const totalUniqueWords = new Set([...words1, ...words2]).size;
    return commonWords.length / totalUniqueWords;
  }

  /**
   * Calculate string similarity using Levenshtein distance
    */
  private calculateStringSimilarity(str1: string, str2: string): number {
    if (str1 === str2) return 1.0;
    
    const longer = str1.length > str2.length ? str1 : str2;
    const shorter = str1.length > str2.length ? str2 : str1;
    
    if (longer.length === 0) return 1.0;
    
    const distance = this.levenshteinDistance(longer, shorter);
    return (longer.length - distance) / longer.length;
  }

  /**
   * Calculate Levenshtein distance
    */
  private levenshteinDistance(str1: string, str2: string): number {
    const matrix: number[][] = [];

    for (let i = 0; i <= str2.length; i++) {
      matrix[i] = [i];
    }

    for (let j = 0; j <= str1.length; j++) {
      matrix[0]![j] = j;
    }
    
    for (let i = 1; i <= str2.length; i++) {
      for (let j = 1; j <= str1.length; j++) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
          matrix[i]![j] = matrix[i - 1]?.[j - 1] ?? 0;
        } else {
          matrix[i]![j] = Math.min(
            (matrix[i - 1]?.[j - 1] ?? 0) + 1,
            (matrix[i]?.[j - 1] ?? 0) + 1,
            (matrix[i - 1]?.[j] ?? 0) + 1
          );
        }
      }
    }
    
    return matrix[str2.length]?.[str1.length] ?? 0;
  }

  /**
   * Generate name suggestions for user correction
    */
  private generateNameSuggestions(extractedName: string, accountData: AccountNameData): string[] {
    return [
      accountData.fullName,
      accountData.displayName,
      `${accountData.firstName || ''} ${accountData.lastName || ''}`.trim(),
      extractedName
    ].filter((name): name is string => Boolean(name) && typeof name === 'string' && name.trim().length > 0).filter((name, index, arr) => {
      if (!name) return false;
      return arr.indexOf(name) === index;
    });
  }

  /**
   * Normalize name for comparison
    */
  private normalizeName(name: string): string {
    return name
      .trim()
      .replace(/\s+/g, ' ')
      .toLowerCase()
      .replace(/[^\w\s]/g, ''); // Remove punctuation
  }

  /**
   * Clean extracted name
    */
  private cleanExtractedName(name: string): string {
    return name
      .trim()
      .replace(/\s+/g, ' ')
      .replace(/[^\w\s]/g, ' ')
      .trim();
  }

  /**
   * Check if string is a valid name
    */
  private isValidName(name: string): boolean {
    if (!name || name.length < 3 || name.length > 100) return false;
    
    const words = name.split(/\s+/);
    if (words.length < 2 || words.length > 5) return false;
    
    // All words should be capitalized
    return words.every(word =>
      word && word.length > 0 &&
      word[0] && word[0] === word[0].toUpperCase() &&
      /^[A-Za-z]+$/.test(word)
    );
  }

  /**
   * Check if word is capitalized
    */
  private isCapitalizedWord(word: string): boolean {
    return Boolean(word && word.length > 1 &&
           word[0] && word[0] === word[0].toUpperCase() &&
           /^[A-Za-z]+$/.test(word));
  }

  /**
   * Check if email local part is generic
    */
  private isGenericEmail(localPart: string): boolean {
    const genericPrefixes = [
      'admin', 'info', 'support', 'contact', 'help', 'no-reply', 'noreply',
      'test', 'demo', 'example', 'user', 'customer', 'mail'
    ];
    
    return genericPrefixes.some(prefix => 
      localPart.toLowerCase().includes(prefix)
    );
  }

  /**
   * Extract name from email local part
    */
  private extractNameFromEmailLocal(localPart: string): string | null {
    // Handle common email formats: first.last, firstname.lastname, firstnamelastname
    const withDots = localPart.replace(/[._-]/g, ' ');
    const words = withDots.split(/\s+/).map(word => 
      word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
    );
    
    if (words.length >= 2 && words.every(word => /^[A-Za-z]+$/.test(word))) {
      return words.slice(0, 3).join(' '); // Max 3 words
    }
    
    return null;
  }

  /**
   * Check if phrase is common and not a name
    */
  private isCommonPhrase(phrase: string): boolean {
    const commonPhrases = [
      'Curriculum Vitae', 'Cover Letter', 'Personal Statement', 'Professional Summary',
      'Work Experience', 'Education Background', 'Skills Summary', 'Contact Information',
      'References Available', 'Upon Request'
    ];
    
    return commonPhrases.some(common => 
      phrase.toLowerCase().includes(common.toLowerCase())
    );
  }
}