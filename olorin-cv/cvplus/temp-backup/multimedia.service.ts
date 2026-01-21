import {
  GeneratedContent,
  ContentType,
  GenerationStatus,
  GenerationRequest
} from '../../../shared/types/generated-content';
import { ProcessedCV } from '../../../shared/types/processed-cv';
import {
  createGeneratedContent,
  updateGenerationStatus,
  completeGeneration,
  failGeneration
} from '../models/generated-content.service';
import { getProcessedCV } from '../models/processed-cv.service';
import { getUserProfile } from '../models/user-profile.service';
import * as admin from 'firebase-admin';
import axios from 'axios';

interface MultimediaGenerationOptions {
  cvId: string;
  userId: string;
  contentType: ContentType;
  features?: {
    voiceId?: string;
    avatarId?: string;
    templateId?: string;
    backgroundMusic?: boolean;
    customizations?: Record<string, any>;
  };
}

interface PodcastGenerationResult {
  audioUrl: string;
  duration: number;
  transcript: string;
  fileSize: number;
}

interface VideoGenerationResult {
  videoUrl: string;
  duration: number;
  thumbnailUrl: string;
  fileSize: number;
}

interface DocumentGenerationResult {
  documentUrl: string;
  fileSize: number;
  pageCount: number;
}

interface ElevenLabsConfig {
  apiKey: string;
  baseUrl: string;
  defaultVoiceId: string;
}

interface DIDConfig {
  apiKey: string;
  baseUrl: string;
  defaultAvatarId: string;
}

export class MultimediaService {
  private elevenLabsConfig: ElevenLabsConfig;
  private didConfig: DIDConfig;
  private storage: admin.storage.Storage;

  constructor() {
    this.elevenLabsConfig = {
      apiKey: process.env.ELEVENLABS_API_KEY || '',
      baseUrl: 'https://api.elevenlabs.io/v1',
      defaultVoiceId: process.env.ELEVENLABS_DEFAULT_VOICE_ID || 'pNInz6obpgDQGcFmaJgB'
    };

    this.didConfig = {
      apiKey: process.env.DID_API_KEY || '',
      baseUrl: 'https://api.d-id.com',
      defaultAvatarId: process.env.DID_DEFAULT_AVATAR_ID || 'amy-jcwCkr1grs'
    };

    this.storage = admin.storage();
  }

  /**
   * Generate multimedia content based on CV data
   */
  async generateContent(options: MultimediaGenerationOptions): Promise<GeneratedContent> {
    console.log(`Starting multimedia generation for CV ${options.cvId}, type: ${options.contentType}`);

    // Create initial content record
    const content = await createGeneratedContent({
      userId: options.userId,
      cvId: options.cvId,
      contentType: options.contentType,
      generationRequest: {
        features: options.features || {},
        timestamp: admin.firestore.Timestamp.now(),
        requestId: `${options.contentType}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      },
      status: GenerationStatus.PENDING
    });

    try {
      // Update to processing status
      await updateGenerationStatus(content.id, GenerationStatus.PROCESSING, 'Starting content generation');

      // Get CV data
      const cvData = await getProcessedCV(options.cvId);
      if (!cvData) {
        throw new Error('CV data not found');
      }

      let result: any;

      switch (options.contentType) {
        case ContentType.PODCAST:
          result = await this.generatePodcast(cvData, options.features);
          break;
        case ContentType.VIDEO_INTRO:
          result = await this.generateVideoIntro(cvData, options.features);
          break;
        case ContentType.PORTFOLIO_PDF:
          result = await this.generatePortfolioPDF(cvData, options.features);
          break;
        case ContentType.COVER_LETTER:
          result = await this.generateCoverLetter(cvData, options.features);
          break;
        default:
          throw new Error(`Unsupported content type: ${options.contentType}`);
      }

      // Complete generation
      const completedContent = await completeGeneration(
        content.id,
        result.url,
        result.fileSize,
        result.duration,
        result.qualityScore
      );

      console.log(`Multimedia generation completed for content ${content.id}`);
      return completedContent;

    } catch (error) {
      console.error(`Multimedia generation failed for content ${content.id}:`, error);

      const errorMessage = error instanceof Error ? error.message : 'Unknown generation error';
      await failGeneration(content.id, errorMessage);

      throw error;
    }
  }

  /**
   * Generate podcast based on CV content
   */
  private async generatePodcast(cvData: ProcessedCV, features: any = {}): Promise<PodcastGenerationResult> {
    console.log('Generating podcast for CV:', cvData.id);

    // Generate podcast script
    const script = this.generatePodcastScript(cvData);

    // Use ElevenLabs to generate audio
    const voiceId = features.voiceId || this.elevenLabsConfig.defaultVoiceId;

    const audioResponse = await axios.post(
      `${this.elevenLabsConfig.baseUrl}/text-to-speech/${voiceId}`,
      {
        text: script,
        model_id: "eleven_multilingual_v2",
        voice_settings: {
          stability: 0.5,
          similarity_boost: 0.8,
          style: 0.2,
          use_speaker_boost: true
        }
      },
      {
        headers: {
          'Accept': 'audio/mpeg',
          'Content-Type': 'application/json',
          'xi-api-key': this.elevenLabsConfig.apiKey
        },
        responseType: 'arraybuffer'
      }
    );

    // Upload to Firebase Storage
    const fileName = `podcasts/${cvData.id}_${Date.now()}.mp3`;
    const file = this.storage.bucket().file(fileName);

    await file.save(Buffer.from(audioResponse.data), {
      metadata: {
        contentType: 'audio/mpeg',
        metadata: {
          cvId: cvData.id,
          generatedAt: new Date().toISOString(),
          voiceId: voiceId
        }
      }
    });

    await file.makePublic();
    const audioUrl = `https://storage.googleapis.com/${this.storage.bucket().name}/${fileName}`;

    // Estimate duration (roughly 150 words per minute)
    const wordCount = script.split(' ').length;
    const estimatedDuration = Math.round((wordCount / 150) * 60);

    return {
      audioUrl,
      duration: estimatedDuration,
      transcript: script,
      fileSize: audioResponse.data.byteLength
    };
  }

  /**
   * Generate video introduction using D-ID
   */
  private async generateVideoIntro(cvData: ProcessedCV, features: any = {}): Promise<VideoGenerationResult> {
    console.log('Generating video intro for CV:', cvData.id);

    // Generate video script
    const script = this.generateVideoScript(cvData);
    const avatarId = features.avatarId || this.didConfig.defaultAvatarId;

    // Create D-ID talk
    const createResponse = await axios.post(
      `${this.didConfig.baseUrl}/talks`,
      {
        script: {
          type: "text",
          subtitles: "false",
          provider: {
            type: "microsoft",
            voice_id: "en-US-JennyNeural"
          },
          input: script
        },
        config: {
          fluent: "false",
          pad_audio: "0.0"
        },
        source_url: `https://create-images-results.d-id.com/api_docs/assets/noelle.jpeg`
      },
      {
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          'Authorization': `Basic ${this.didConfig.apiKey}`
        }
      }
    );

    const talkId = createResponse.data.id;

    // Poll for completion
    let videoUrl = '';
    let attempts = 0;
    const maxAttempts = 60; // 5 minutes max

    while (attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 5000)); // Wait 5 seconds

      const statusResponse = await axios.get(
        `${this.didConfig.baseUrl}/talks/${talkId}`,
        {
          headers: {
            'Authorization': `Basic ${this.didConfig.apiKey}`
          }
        }
      );

      if (statusResponse.data.status === 'done') {
        videoUrl = statusResponse.data.result_url;
        break;
      } else if (statusResponse.data.status === 'error') {
        throw new Error(`D-ID video generation failed: ${statusResponse.data.error}`);
      }

      attempts++;
    }

    if (!videoUrl) {
      throw new Error('Video generation timed out');
    }

    // Download and re-upload to Firebase Storage
    const videoResponse = await axios.get(videoUrl, { responseType: 'arraybuffer' });
    const fileName = `videos/${cvData.id}_${Date.now()}.mp4`;
    const file = this.storage.bucket().file(fileName);

    await file.save(Buffer.from(videoResponse.data), {
      metadata: {
        contentType: 'video/mp4',
        metadata: {
          cvId: cvData.id,
          generatedAt: new Date().toISOString(),
          avatarId: avatarId
        }
      }
    });

    await file.makePublic();
    const finalVideoUrl = `https://storage.googleapis.com/${this.storage.bucket().name}/${fileName}`;

    // Generate thumbnail
    const thumbnailUrl = await this.generateThumbnail(finalVideoUrl, fileName);

    return {
      videoUrl: finalVideoUrl,
      duration: 60, // Estimate 1 minute
      thumbnailUrl,
      fileSize: videoResponse.data.byteLength
    };
  }

  /**
   * Generate portfolio PDF
   */
  private async generatePortfolioPDF(cvData: ProcessedCV, features: any = {}): Promise<DocumentGenerationResult> {
    console.log('Generating portfolio PDF for CV:', cvData.id);

    // For now, use a simple HTML to PDF conversion
    // In production, you might use Puppeteer, jsPDF, or similar
    const htmlContent = this.generatePortfolioHTML(cvData, features);

    // This is a simplified approach - in production use proper PDF generation
    const fileName = `portfolios/${cvData.id}_${Date.now()}.pdf`;
    const file = this.storage.bucket().file(fileName);

    // Mock PDF generation for now
    const pdfBuffer = Buffer.from('PDF placeholder content');

    await file.save(pdfBuffer, {
      metadata: {
        contentType: 'application/pdf',
        metadata: {
          cvId: cvData.id,
          generatedAt: new Date().toISOString(),
          template: features.templateId || 'default'
        }
      }
    });

    await file.makePublic();
    const documentUrl = `https://storage.googleapis.com/${this.storage.bucket().name}/${fileName}`;

    return {
      documentUrl,
      fileSize: pdfBuffer.length,
      pageCount: 1
    };
  }

  /**
   * Generate cover letter
   */
  private async generateCoverLetter(cvData: ProcessedCV, features: any = {}): Promise<DocumentGenerationResult> {
    console.log('Generating cover letter for CV:', cvData.id);

    const coverLetterContent = this.generateCoverLetterContent(cvData, features);

    const fileName = `cover-letters/${cvData.id}_${Date.now()}.pdf`;
    const file = this.storage.bucket().file(fileName);

    // Mock PDF generation for now
    const pdfBuffer = Buffer.from(coverLetterContent);

    await file.save(pdfBuffer, {
      metadata: {
        contentType: 'application/pdf',
        metadata: {
          cvId: cvData.id,
          generatedAt: new Date().toISOString(),
          targetRole: features.targetRole || 'General'
        }
      }
    });

    await file.makePublic();
    const documentUrl = `https://storage.googleapis.com/${this.storage.bucket().name}/${fileName}`;

    return {
      documentUrl,
      fileSize: pdfBuffer.length,
      pageCount: 1
    };
  }

  /**
   * Generate podcast script from CV data
   */
  private generatePodcastScript(cvData: ProcessedCV): string {
    const { personalInfo, summary, experience, skills } = cvData.structuredData;

    return `
Welcome to ${personalInfo.fullName}'s professional podcast introduction.

Let me tell you about my professional journey. ${summary || 'I am a dedicated professional with diverse experience and skills.'}

My experience includes working ${experience.length > 0 ? `at organizations like ${experience.slice(0, 3).map(exp => exp.company).join(', ')}` : 'in various professional roles'}.

Some of my key strengths include ${skills.technical.slice(0, 5).join(', ')}, which have helped me deliver exceptional results throughout my career.

${cvData.aiAnalysis?.personalityProfile?.summary || 'I bring a unique combination of analytical thinking and creative problem-solving to every project I work on.'}

Thank you for listening to my professional introduction. I look forward to discussing how I can contribute to your organization.
    `.trim();
  }

  /**
   * Generate video script from CV data
   */
  private generateVideoScript(cvData: ProcessedCV): string {
    const { personalInfo, summary } = cvData.structuredData;

    return `
Hello! I'm ${personalInfo.fullName}, and I'm excited to introduce myself to you.

${summary || 'I am a passionate professional with a proven track record of success in my field.'}

I believe in delivering excellence and bringing innovative solutions to complex challenges. My experience has taught me the value of collaboration and continuous learning.

I would love the opportunity to discuss how I can contribute to your team's success. Thank you for considering my application!
    `.trim();
  }

  /**
   * Generate portfolio HTML content
   */
  private generatePortfolioHTML(cvData: ProcessedCV, features: any): string {
    const { personalInfo, experience, skills, education } = cvData.structuredData;

    return `
<!DOCTYPE html>
<html>
<head>
    <title>${personalInfo.fullName} - Portfolio</title>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; margin: 40px; }
        h1 { color: #2c3e50; border-bottom: 2px solid #3498db; }
        h2 { color: #34495e; margin-top: 30px; }
        .contact { background: #ecf0f1; padding: 15px; border-radius: 5px; }
        .experience-item { margin-bottom: 20px; border-left: 3px solid #3498db; padding-left: 15px; }
    </style>
</head>
<body>
    <h1>${personalInfo.fullName}</h1>

    <div class="contact">
        <p>Email: ${personalInfo.email} | Phone: ${personalInfo.phone}</p>
        <p>Location: ${personalInfo.location}</p>
    </div>

    <h2>Professional Summary</h2>
    <p>${cvData.structuredData.summary}</p>

    <h2>Experience</h2>
    ${experience.map(exp => `
        <div class="experience-item">
            <h3>${exp.title} at ${exp.company}</h3>
            <p><em>${exp.startDate} - ${exp.endDate || 'Present'}</em></p>
            <p>${exp.description}</p>
        </div>
    `).join('')}

    <h2>Skills</h2>
    <p><strong>Technical:</strong> ${skills.technical.join(', ')}</p>
    <p><strong>Soft Skills:</strong> ${skills.soft.join(', ')}</p>

    <h2>Education</h2>
    ${education.map(edu => `
        <p><strong>${edu.degree}</strong> - ${edu.institution} (${edu.year})</p>
    `).join('')}
</body>
</html>
    `.trim();
  }

  /**
   * Generate cover letter content
   */
  private generateCoverLetterContent(cvData: ProcessedCV, features: any): string {
    const { personalInfo } = cvData.structuredData;
    const targetRole = features.targetRole || 'the position';
    const company = features.company || 'your organization';

    return `
Dear Hiring Manager,

I am writing to express my strong interest in ${targetRole} at ${company}. With my background and experience, I am confident that I would be a valuable addition to your team.

${cvData.structuredData.summary || 'My professional experience has equipped me with the skills and knowledge necessary to excel in this role.'}

I am particularly excited about the opportunity to contribute to ${company} because of your reputation for innovation and excellence in the industry.

Thank you for considering my application. I look forward to the opportunity to discuss how my skills and passion align with your needs.

Sincerely,
${personalInfo.fullName}

Contact Information:
Email: ${personalInfo.email}
Phone: ${personalInfo.phone}
    `.trim();
  }

  /**
   * Generate thumbnail for video
   */
  private async generateThumbnail(videoUrl: string, fileName: string): Promise<string> {
    // In production, use FFmpeg or similar to extract thumbnail
    // For now, return a placeholder
    const thumbnailFileName = fileName.replace('.mp4', '_thumb.jpg');
    return `https://storage.googleapis.com/${this.storage.bucket().name}/${thumbnailFileName}`;
  }

  /**
   * Get estimated generation cost
   */
  async getEstimatedCost(contentType: ContentType, features: any = {}): Promise<number> {
    switch (contentType) {
      case ContentType.PODCAST:
        return 0.15; // $0.15 per podcast
      case ContentType.VIDEO_INTRO:
        return 0.50; // $0.50 per video
      case ContentType.PORTFOLIO_PDF:
        return 0.05; // $0.05 per PDF
      case ContentType.COVER_LETTER:
        return 0.03; // $0.03 per cover letter
      default:
        return 0.10;
    }
  }

  /**
   * Check if user has sufficient credits
   */
  async checkUserCredits(userId: string, contentType: ContentType, features: any = {}): Promise<boolean> {
    const user = await getUserProfile(userId);
    const cost = await this.getEstimatedCost(contentType, features);

    return user.credits >= cost;
  }
}

// Export singleton instance
export const multimediaService = new MultimediaService();

// Export individual functions for direct use
export async function generateMultimediaContent(options: MultimediaGenerationOptions): Promise<GeneratedContent> {
  return multimediaService.generateContent(options);
}

export async function getGenerationCost(contentType: ContentType, features: any = {}): Promise<number> {
  return multimediaService.getEstimatedCost(contentType, features);
}

export async function validateUserCredits(userId: string, contentType: ContentType, features: any = {}): Promise<boolean> {
  return multimediaService.checkUserCredits(userId, contentType, features);
}