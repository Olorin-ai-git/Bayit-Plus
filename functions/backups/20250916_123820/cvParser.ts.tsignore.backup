// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflictsimport pdfParse from 'pdf-parse';
import mammoth from 'mammoth';
import csv from 'csv-parser';
import * as cheerio from 'cheerio';
import axios from 'axios';
import { Readable } from 'stream';

export interface ParsedCV {
  personalInfo: {
    name: string;
    email: string;
    phone: string;
    location: string;
    linkedin?: string;
    github?: string;
    website?: string;
  };
  summary: string;
  experience: Array<{
    company: string;
    position: string;
    duration?: string;
    startDate?: string;
    endDate?: string;
    location: string;
    description?: string;
    achievements?: string[];
    technologies?: string[];
  }>;
  education: Array<{
    institution: string;
    degree: string;
    field: string;
    startDate?: string;
    endDate?: string;
    graduationDate?: string;
    gpa?: string;
    honors?: string[];
  }>;
  skills: {
    technical: string[];
    soft: string[];
    languages: string[];
  };
  certifications: Array<{
    name: string;
    issuer: string;
    date: string;
    credentialId?: string;
  }>;
  projects?: Array<{
    name: string;
    description: string;
    technologies: string[];
    link?: string;
  }>;
  achievements?: string[];
  references?: Array<{
    name: string;
    position: string;
    company: string;
    contact: string;
  }>;
}

export class CVParser {
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

  async parseCV(fileBuffer: Buffer, mimeType: string, userInstructions?: string): Promise<ParsedCV> {
    let text = '';

    // Extract text based on file type
    switch (mimeType) {
      case 'application/pdf':
        text = await this.extractFromPDF(fileBuffer);
        break;
      case 'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
      case 'application/msword':
        text = await this.extractFromDOCX(fileBuffer);
        break;
      case 'text/csv':
        text = await this.extractFromCSV(fileBuffer);
        break;
      case 'text/plain':
      case 'text/txt':
        text = fileBuffer.toString('utf-8');
        break;
      default:
        throw new Error(`Unsupported file type: ${mimeType}`);
    }

    // Use Claude to parse the CV text
    return await this.parseWithClaude(text, userInstructions);
  }

  async parseFromURL(url: string, userInstructions?: string): Promise<ParsedCV> {
    const text = await this.extractFromURL(url);
    return await this.parseWithClaude(text, userInstructions);
  }

  private async extractFromPDF(buffer: Buffer): Promise<string> {
    const data = await pdfParse(buffer);
    return data.text;
  }

  private async extractFromDOCX(buffer: Buffer): Promise<string> {
    const result = await mammoth.extractRawText({ buffer });
    return result.value;
  }

  private async extractFromCSV(buffer: Buffer): Promise<string> {
    return new Promise((resolve, reject) => {
      const results: any[] = [];
      const stream = Readable.from(buffer.toString());
      
      stream
        .pipe(csv())
        .on('data', (data: any) => results.push(data))
        .on('end', () => {
          resolve(JSON.stringify(results, null, 2));
        })
        .on('error', reject);
    });
  }

  private async extractFromURL(url: string): Promise<string> {
    try {
      const response = await axios.get(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; CVPlusBot/1.0)'
        }
      });

      const $ = cheerio.load(response.data);
      
      // Remove script and style elements
      $('script, style').remove();
      
      // Extract text content
      return $('body').text().trim();
    } catch (error) {
      throw new Error(`Failed to fetch URL: ${error}`);
    }
  }

  private async parseWithClaude(text: string, userInstructions?: string): Promise<ParsedCV> {
    const prompt = `Please analyze the following CV/resume text and extract structured information.

${userInstructions ? `USER SPECIAL INSTRUCTIONS (HIGHEST PRIORITY):
${userInstructions}

These user instructions should take precedence and guide how you analyze and extract information from the CV.
` : ''}

IMPORTANT INSTRUCTIONS:
1. Use ONLY the provided context from the CV to answer accurately
2. DO NOT MAKE UP ANY INFORMATION THAT IS NOT IN THE CV
3. If any information isn't in the context, use null or empty values - do not fabricate data
4. Highlight and preserve all relevant skills, experiences, and achievements exactly as stated in the CV
5. ${userInstructions ? 'Pay special attention to the user instructions above when parsing and organizing the CV data' : ''}

Return a JSON object with the following structure:

{
  "personalInfo": {
    "name": "Full name",
    "email": "Email address",
    "phone": "Phone number",
    "location": "City, Country",
    "linkedin": "LinkedIn URL (optional)",
    "github": "GitHub URL (optional)",
    "website": "Personal website (optional)"
  },
  "summary": "Professional summary or objective",
  "experience": [
    {
      "company": "Company name",
      "position": "Job title",
      "duration": "Start date - End date",
      "startDate": "YYYY-MM-DD format start date",
      "endDate": "YYYY-MM-DD format end date (or null if current)",
      "location": "City, Country",
      "description": "Role description",
      "achievements": ["Achievement 1", "Achievement 2"]
    }
  ],
  "education": [
    {
      "institution": "University/School name",
      "degree": "Degree type",
      "field": "Field of study",
      "startDate": "YYYY-MM-DD format start date (extract from dates like '2018-2022', 'Sep 2018 - May 2022', '2018' etc.)",
      "endDate": "YYYY-MM-DD format graduation/end date (extract from dates like '2018-2022', 'Sep 2018 - May 2022', '2022' etc.)",
      "graduationDate": "Graduation date if specifically mentioned",
      "gpa": "GPA (optional)"
    }
  ],
  "skills": {
    "technical": ["Skill 1", "Skill 2"],
    "soft": ["Skill 1", "Skill 2"],
    "languages": ["Language 1", "Language 2"]
  },
  "certifications": [
    {
      "name": "Certification name",
      "issuer": "Issuing organization",
      "date": "Issue date",
      "credentialId": "Credential ID (optional)"
    }
  ],
  "projects": [
    {
      "name": "Project name",
      "description": "Project description",
      "technologies": ["Tech 1", "Tech 2"],
      "link": "Project URL (optional)"
    }
  ],
  "achievements": ["Achievement 1", "Achievement 2"],
  "references": [
    {
      "name": "Reference name",
      "position": "Their position",
      "company": "Their company",
      "contact": "Contact information"
    }
  ]
}

CRITICAL REMINDERS:
- Extract ONLY information that is explicitly stated in the CV text below
- DO NOT invent, assume, or add any information not present in the source
- If a field is not found in the CV, set it to null or an empty array
- Preserve the exact wording of achievements, skills, and experiences
- Fix only obvious typos while maintaining the original meaning

CV Text to analyze:
${text}`;

    try {
      const anthropic = await this.getAnthropicClient();
      const response = await anthropic.messages.create({
        model: 'claude-3-5-haiku-20241022',
        max_tokens: 4000,
        temperature: 0,
        system: 'You are a professional CV parser that extracts structured data from CVs with absolute accuracy. You MUST only extract information that is explicitly present in the CV text. Never make up, invent, or assume any information. If data is not present, use null or empty values. Your role is to faithfully represent what is in the CV, not to enhance or add to it.',
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ]
      });

      const content = response.content[0];
      if (content.type === 'text') {
        // Extract JSON from the response
        const jsonMatch = content.text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          return JSON.parse(jsonMatch[0]);
        }
      }

      throw new Error('Failed to parse CV data from Claude response');
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
      
      // Generic error for other cases
      throw new Error(`Failed to analyze CV with AI: ${error.message || 'Unknown error occurred'}`);
    }
  }
}