// @ts-ignore - Export conflicts
export interface PIIDetectionResult {
  hasPII: boolean;
  detectedTypes: string[];
  maskedData?: any;
  recommendations: string[];
}

export interface PIIMaskingOptions {
  maskEmails?: boolean;
  maskPhones?: boolean;
  maskAddresses?: boolean;
  maskSSN?: boolean;
  maskCreditCards?: boolean;
  maskBankAccounts?: boolean;
  maskPassportNumbers?: boolean;
  maskDriversLicense?: boolean;
  keepFirstName?: boolean;
  keepLastName?: boolean;
  keepCity?: boolean;
  keepCountry?: boolean;
}

export class PIIDetector {
  private anthropic: any;
  private apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  private async getAnthropicClient() {
    if (!this.anthropic) {
      const Anthropic = (await import('@anthropic-ai/sdk')).default;
      this.anthropic = new Anthropic({
        apiKey: this.apiKey,
      });
    }
    return this.anthropic;
  }

  async detectAndMaskPII(
    cvData: any,
    options: PIIMaskingOptions = {}
  ): Promise<PIIDetectionResult> {
    const defaultOptions: PIIMaskingOptions = {
      maskEmails: false, // Keep email for contact
      maskPhones: false, // Keep phone for contact
      maskAddresses: true, // Mask full addresses
      maskSSN: true,
      maskCreditCards: true,
      maskBankAccounts: true,
      maskPassportNumbers: true,
      maskDriversLicense: true,
      keepFirstName: true,
      keepLastName: true,
      keepCity: true,
      keepCountry: true,
      ...options
    };

    const prompt = `Analyze this CV data for personally identifiable information (PII) and sensitive data.

IMPORTANT INSTRUCTIONS:
1. Use ONLY the provided CV data to identify PII - do not add or assume any information
2. DO NOT MAKE UP any PII that is not explicitly present in the data
3. Only detect and mask information that actually exists in the CV
4. Preserve all other information exactly as provided
    
CV Data:
${JSON.stringify(cvData, null, 2)}

Please:
1. Identify all PII and sensitive information
2. Create a masked version based on these rules:
   - ${defaultOptions.maskEmails ? 'MASK emails' : 'KEEP emails'}
   - ${defaultOptions.maskPhones ? 'MASK phone numbers' : 'KEEP phone numbers'}
   - ${defaultOptions.maskAddresses ? 'MASK street addresses (keep city/country if specified)' : 'KEEP addresses'}
   - ALWAYS mask: SSN, credit cards, bank accounts, passport numbers, driver's license numbers
   - ${defaultOptions.keepFirstName ? 'KEEP first name' : 'MASK first name'}
   - ${defaultOptions.keepLastName ? 'KEEP last name' : 'MASK last name'}
   - ${defaultOptions.keepCity ? 'KEEP city' : 'MASK city'}
   - ${defaultOptions.keepCountry ? 'KEEP country' : 'MASK country'}

Return a JSON response with:
{
  "hasPII": boolean,
  "detectedTypes": ["list of PII types found"],
  "maskedData": { the CV data with PII masked according to rules },
  "recommendations": ["list of privacy recommendations"]
}

For masking, use:
- Email: [EMAIL_MASKED]
- Phone: [PHONE_MASKED]
- Address: [ADDRESS_MASKED]
- SSN: [SSN_MASKED]
- Credit Card: [CC_MASKED]
- Bank Account: [BANK_MASKED]
- Passport: [PASSPORT_MASKED]
- Driver's License: [DL_MASKED]
- Other sensitive: [SENSITIVE_MASKED]`;

    try {
      const anthropic = await this.getAnthropicClient();
      const response = await anthropic.messages.create({
        model: 'claude-3-5-haiku-20241022',
        max_tokens: 4000,
        temperature: 0,
        system: 'You are a privacy expert specializing in PII detection and data protection. You MUST only identify PII that actually exists in the provided data. Never add, assume, or make up any information. Your role is to accurately detect existing PII, not to enhance or add to the data.',
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ]
      });

      const content = response.content[0];
      if (content.type === 'text') {
        const result = this.extractAndParseJSON(content.text);
        if (result) {
          return this.validatePIIDetectionResult(result);
        }
      }

      // Fallback: return safe default result
      return this.createFallbackResult(cvData);
    } catch (error: any) {
      
      // Handle specific API errors with user-friendly messages
      if (error.status === 400 && error.error?.error?.message?.includes('credit balance is too low')) {
        throw new Error('The AI service is temporarily unavailable due to billing issues. Please try again later or contact support.');
      }
      
      if (error.status === 401) {
        throw new Error('Authentication failed with the AI service. Please try again later or contact support.');
      }
      
      if (error.status === 429) {
        throw new Error('The AI service is currently overloaded. Please try again in a few moments.');
      }
      
      if (error.status >= 500) {
        throw new Error('The AI service is temporarily experiencing issues. Please try again later.');
      }
      
      // If all else fails, create a fallback result
      return this.createFallbackResult(cvData);
    }
  }

  /**
   * Robust JSON extraction from AI response text
   * Handles multiple extraction strategies and sanitization
    */
  private extractAndParseJSON(responseText: string): PIIDetectionResult | null {
    // Strategy 1: Try to find JSON using multiple patterns
    const jsonPatterns = [
      // Match complete JSON object (most greedy, might capture extra)
      /\{[\s\S]*\}/,
      // Match JSON starting with expected keys
      /\{[\s\S]*?"hasPII"[\s\S]*?\}/,
      /\{[\s\S]*?"detectedTypes"[\s\S]*?\}/,
      // Match JSON within code blocks
      /```(?:json)?\s*\{[\s\S]*?\}\s*```/i,
      // Match JSON within parentheses or brackets
      /\([\s]*\{[\s\S]*?\}[\s]*\)/,
      /\[[\s]*\{[\s\S]*?\}[\s]*\]/
    ];

    for (const pattern of jsonPatterns) {
      const matches = responseText.match(pattern);
      if (matches) {
        for (const match of matches) {
          const cleanedJson = this.sanitizeJSON(match);
          const parsed = this.attemptJSONParse(cleanedJson);
          if (parsed) {
            return parsed;
          }
        }
      }
    }

    // Strategy 2: Extract JSON by finding balanced braces
    const balancedJson = this.extractBalancedJSON(responseText);
    if (balancedJson) {
      const parsed = this.attemptJSONParse(balancedJson);
      if (parsed) {
        return parsed;
      }
    }

    // Strategy 3: Try to construct JSON from visible structure
    return this.extractJSONFromStructure(responseText);
  }

  /**
   * Sanitize JSON string by removing comments and fixing common issues
    */
  private sanitizeJSON(jsonString: string): string {
    let cleaned = jsonString;

    // Remove code block markers
    cleaned = cleaned.replace(/```(?:json)?\s*/gi, '').replace(/```\s*/g, '');
    
    // Remove surrounding parentheses or brackets
    cleaned = cleaned.replace(/^\s*[\(\[]\s*/, '').replace(/\s*[\)\]]\s*$/, '');
    
    // Remove single-line comments
    cleaned = cleaned.replace(/\/\/.*$/gm, '');
    
    // Remove multi-line comments
    cleaned = cleaned.replace(/\/\*[\s\S]*?\*\//g, '');
    
    // Fix trailing commas before closing braces/brackets
    cleaned = cleaned.replace(/,\s*([}\]])/g, '$1');
    
    // Remove extra text before first brace
    const firstBrace = cleaned.indexOf('{');
    if (firstBrace > 0) {
      cleaned = cleaned.substring(firstBrace);
    }
    
    // Remove extra text after last brace
    const lastBrace = cleaned.lastIndexOf('}');
    if (lastBrace > -1 && lastBrace < cleaned.length - 1) {
      cleaned = cleaned.substring(0, lastBrace + 1);
    }
    
    return cleaned.trim();
  }

  /**
   * Attempt to parse JSON with error handling
    */
  private attemptJSONParse(jsonString: string): PIIDetectionResult | null {
    try {
      const parsed = JSON.parse(jsonString);
      
      // Basic validation - must be an object with expected properties
      if (typeof parsed === 'object' && parsed !== null) {
        return parsed;
      }
    } catch (error) {
      // Silently handle parse errors and try next strategy
    }
    return null;
  }

  /**
   * Extract JSON using balanced brace counting
    */
  private extractBalancedJSON(text: string): string | null {
    const startIndex = text.indexOf('{');
    if (startIndex === -1) return null;
    
    let braceCount = 0;
    let inString = false;
    let escapeNext = false;
    
    for (let i = startIndex; i < text.length; i++) {
      const char = text[i];
      
      if (escapeNext) {
        escapeNext = false;
        continue;
      }
      
      if (char === '\\') {
        escapeNext = true;
        continue;
      }
      
      if (char === '"' && !escapeNext) {
        inString = !inString;
        continue;
      }
      
      if (!inString) {
        if (char === '{') {
          braceCount++;
        } else if (char === '}') {
          braceCount--;
          if (braceCount === 0) {
            return text.substring(startIndex, i + 1);
          }
        }
      }
    }
    
    return null;
  }

  /**
   * Try to extract JSON from structured text patterns
    */
  private extractJSONFromStructure(text: string): PIIDetectionResult | null {
    // Look for key-value patterns that indicate JSON structure
    const hasPIIMatch = text.match(/["']?hasPII["']?\s*:\s*(true|false)/i);
    const detectedTypesMatch = text.match(/["']?detectedTypes["']?\s*:\s*\[(.*?)\]/i);
    const recommendationsMatch = text.match(/["']?recommendations["']?\s*:\s*\[(.*?)\]/i);
    
    if (hasPIIMatch) {
      try {
        const result: PIIDetectionResult = {
          hasPII: hasPIIMatch[1].toLowerCase() === 'true',
          detectedTypes: [],
          recommendations: []
        };
        
        if (detectedTypesMatch) {
          const typesStr = detectedTypesMatch[1];
          result.detectedTypes = typesStr
            .split(',')
            .map(type => type.replace(/["'\s]/g, ''))
            .filter(type => type.length > 0);
        }
        
        if (recommendationsMatch) {
          const recsStr = recommendationsMatch[1];
          result.recommendations = recsStr
            .split(',')
            .map(rec => rec.replace(/^["'\s]+|["'\s]+$/g, ''))
            .filter(rec => rec.length > 0);
        }
        
        return result;
      } catch (error) {
        // Continue to fallback
      }
    }
    
    return null;
  }

  /**
   * Validate and normalize PIIDetectionResult
    */
  private validatePIIDetectionResult(result: any): PIIDetectionResult {
    if (!result || typeof result !== 'object') {
      throw new Error('Invalid PII detection result: not an object');
    }
    
    const validated: PIIDetectionResult = {
      hasPII: Boolean(result.hasPII),
      detectedTypes: Array.isArray(result.detectedTypes) ? result.detectedTypes : [],
      recommendations: Array.isArray(result.recommendations) ? result.recommendations : []
    };
    
    // Include maskedData if present and valid
    if (result.maskedData && typeof result.maskedData === 'object') {
      validated.maskedData = result.maskedData;
    }
    
    return validated;
  }

  /**
   * Create a fallback result when parsing fails
    */
  private createFallbackResult(cvData: any): PIIDetectionResult {
    
    // Use regex-based quick detection as fallback
    const cvText = JSON.stringify(cvData);
    const quickResult = this.quickDetectPII(cvText);
    
    const detectedTypes: string[] = [];
    const recommendations: string[] = [];
    
    // Check for common PII patterns
    if (cvText.includes('@') && cvText.includes('.')) {
      detectedTypes.push('email');
      recommendations.push('Consider masking email addresses for public sharing');
    }
    
    // Phone pattern
    if (/\(\d{3}\)\s*\d{3}-\d{4}|\d{3}-\d{3}-\d{4}|\d{10}/.test(cvText)) {
      detectedTypes.push('phone');
      recommendations.push('Consider masking phone numbers for privacy');
    }
    
    // Address patterns
    if (/\d+\s+[A-Za-z\s]+(?:Street|St|Avenue|Ave|Road|Rd|Drive|Dr|Lane|Ln|Boulevard|Blvd)/i.test(cvText)) {
      detectedTypes.push('address');
      recommendations.push('Consider masking street addresses');
    }
    
    if (quickResult.hasSSN) {
      detectedTypes.push('ssn');
      recommendations.push('SSN detected - this should be removed immediately');
    }
    
    if (quickResult.hasCreditCard) {
      detectedTypes.push('credit_card');
      recommendations.push('Credit card number detected - this should be removed immediately');
    }
    
    if (quickResult.hasBankAccount) {
      detectedTypes.push('bank_account');
      recommendations.push('Bank account information detected - this should be removed immediately');
    }
    
    if (quickResult.hasPassport) {
      detectedTypes.push('passport');
      recommendations.push('Passport number detected - this should be removed');
    }
    
    return {
      hasPII: detectedTypes.length > 0,
      detectedTypes,
      maskedData: cvData, // Return original data as fallback
      recommendations
    };
  }

  // Quick regex-based PII detection for immediate feedback
  quickDetectPII(text: string): {
    hasSSN: boolean;
    hasCreditCard: boolean;
    hasBankAccount: boolean;
    hasPassport: boolean;
  } {
    // SSN patterns (XXX-XX-XXXX or XXXXXXXXX)
    const ssnPattern = /\b\d{3}-?\d{2}-?\d{4}\b/;
    
    // Credit card patterns (basic check for 13-19 digits)
    const ccPattern = /\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{1,7}\b/;
    
    // Bank account patterns (IBAN or US account numbers)
    const bankPattern = /\b[A-Z]{2}\d{2}[A-Z0-9]{4}\d{7}([A-Z0-9]?){0,16}\b|\b\d{8,17}\b/;
    
    // Passport pattern (various formats)
    const passportPattern = /\b[A-Z]{1,2}\d{6,9}\b/;

    return {
      hasSSN: ssnPattern.test(text),
      hasCreditCard: ccPattern.test(text),
      hasBankAccount: bankPattern.test(text),
      hasPassport: passportPattern.test(text)
    };
  }

  // Generate privacy-safe version of CV for public sharing
  async generatePrivacyVersion(cvData: any): Promise<any> {
    const privacyOptions: PIIMaskingOptions = {
      maskEmails: true,
      maskPhones: true,
      maskAddresses: true,
      maskSSN: true,
      maskCreditCards: true,
      maskBankAccounts: true,
      maskPassportNumbers: true,
      maskDriversLicense: true,
      keepFirstName: true,
      keepLastName: false, // Mask last name for privacy
      keepCity: true,
      keepCountry: true
    };

    const result = await this.detectAndMaskPII(cvData, privacyOptions);
    return result.maskedData;
  }
}