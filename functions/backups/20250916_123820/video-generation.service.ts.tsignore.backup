// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts/**
 * Video Generation Service
 * Creates professional video introductions with AI avatars
 */

import { ParsedCV } from '../types/enhanced-models';
import * as admin from 'firebase-admin';
import axios from 'axios';
import OpenAI from 'openai';
import { config } from '../config/environment';
import { 
  advancedPromptEngine, 
  PromptEngineOptions, 
  EnhancedScriptResult 
} from './enhanced-prompt-engine.service';

interface VideoGenerationOptions {
  duration?: 'short' | 'medium' | 'long'; // 30s, 60s, 90s
  style?: 'professional' | 'friendly' | 'energetic';
  avatarStyle?: 'realistic' | 'illustrated' | 'corporate';
  background?: 'office' | 'modern' | 'gradient' | 'custom';
  includeSubtitles?: boolean;
  includeNameCard?: boolean;
  // Enhanced prompt engine options
  useAdvancedPrompts?: boolean;
  targetIndustry?: string;
  optimizationLevel?: 'basic' | 'enhanced' | 'premium';
}

interface VideoResult {
  videoUrl: string;
  thumbnailUrl: string;
  duration: number;
  script: string;
  subtitles?: string;
  metadata: {
    resolution: string;
    format: string;
    size: number;
  };
  // Enhanced script generation results
  enhancedScript?: EnhancedScriptResult;
  scriptQualityScore?: number;
  industryAlignment?: number;
  generationMethod: 'basic' | 'enhanced';
}

interface AvatarConfig {
  avatarId: string;
  voiceId: string;
  name: string;
  style: string;
}

export class VideoGenerationService {
  private openai: OpenAI;
  private didApiKey: string;
  private avatarConfig: Record<string, AvatarConfig>;
  
  constructor() {
    this.openai = new OpenAI({
      apiKey: config.openai?.apiKey || process.env.OPENAI_API_KEY || ''
    });
    
    this.didApiKey = config.videoGeneration?.didApiKey || process.env.DID_API_KEY || '';
    
    // Configure available avatars
    this.avatarConfig = {
      professional: {
        avatarId: config.videoGeneration?.avatars?.professional?.id || process.env.DID_PROFESSIONAL_AVATAR_ID || 'amy-Aq6OmGZnMt',
        voiceId: config.videoGeneration?.avatars?.professional?.voiceId || process.env.DID_PROFESSIONAL_VOICE_ID || 'en-US-JennyNeural',
        name: 'Professional Amy',
        style: 'Corporate professional'
      },
      friendly: {
        avatarId: config.videoGeneration?.avatars?.friendly?.id || process.env.DID_FRIENDLY_AVATAR_ID || 'josh-z3Y1cJO7mR',
        voiceId: config.videoGeneration?.avatars?.friendly?.voiceId || process.env.DID_FRIENDLY_VOICE_ID || 'en-US-GuyNeural',
        name: 'Friendly Josh',
        style: 'Approachable and warm'
      },
      energetic: {
        avatarId: config.videoGeneration?.avatars?.energetic?.id || process.env.DID_ENERGETIC_AVATAR_ID || 'maya-pI7XQbvFNY',
        voiceId: config.videoGeneration?.avatars?.energetic?.voiceId || process.env.DID_ENERGETIC_VOICE_ID || 'en-US-AriaNeural',
        name: 'Energetic Maya',
        style: 'Dynamic and enthusiastic'
      }
    };
  }

  /**
   * Helper function to safely extract technical skills
   */
  private getTechnicalSkills(skills: string[] | { [key: string]: string[]; technical?: string[]; soft?: string[]; languages?: string[]; tools?: string[]; frontend?: string[]; backend?: string[]; databases?: string[]; cloud?: string[]; competencies?: string[]; frameworks?: string[]; expertise?: string[]; } | undefined): string[] {
    if (!skills) return [];
    if (Array.isArray(skills)) return skills;
    
    // Combine all technical skill categories
    const technicalCategories = ['technical', 'frontend', 'backend', 'databases', 'cloud', 'frameworks', 'tools', 'expertise'];
    const allTechnicalSkills: string[] = [];
    
    for (const category of technicalCategories) {
      if (skills[category] && Array.isArray(skills[category])) {
        allTechnicalSkills.push(...skills[category]);
      }
    }
    
    return allTechnicalSkills;
  }
  
  /**
   * Generate a complete video introduction
   */
  async generateVideoIntroduction(
    parsedCV: ParsedCV,
    jobId: string,
    options: VideoGenerationOptions = {}
  ): Promise<VideoResult> {
    try {
      let script: string;
      let enhancedScript: EnhancedScriptResult | undefined;
      let generationMethod: 'basic' | 'enhanced' = 'basic';

      // Step 1: Generate optimized script using enhanced or basic method
      if (options.useAdvancedPrompts !== false) { // Default to enhanced
        try {
          const promptOptions: PromptEngineOptions = {
            ...options,
            targetIndustry: options.targetIndustry,
            optimizationLevel: options.optimizationLevel || 'enhanced'
          };
          
          enhancedScript = await advancedPromptEngine.generateEnhancedScript(
            parsedCV, 
            promptOptions
          );
          
          script = enhancedScript.script;
          generationMethod = 'enhanced';
          
        } catch (enhancedError) {
          script = await this.generateVideoScript(parsedCV, options);
          generationMethod = 'basic';
        }
      } else {
        script = await this.generateVideoScript(parsedCV, options);
        generationMethod = 'basic';
      }
      
      // Step 2: Create video with D-ID
      const videoData = await this.createVideoWithAvatar(script, jobId, options);
      
      // Step 3: Generate thumbnail
      const thumbnailUrl = await this.generateThumbnail(videoData.videoUrl, jobId);
      
      // Step 4: Generate subtitles if requested
      let subtitles;
      if (options.includeSubtitles) {
        subtitles = await this.generateSubtitles(script, videoData.duration);
      }
      
      // Step 5: Store video in Firebase Storage
      const finalVideoUrl = await this.storeVideo(videoData, jobId);
      
      return {
        videoUrl: finalVideoUrl,
        thumbnailUrl,
        duration: videoData.duration,
        script,
        subtitles,
        metadata: {
          resolution: '1920x1080',
          format: 'mp4',
          size: videoData.size || 0
        },
        enhancedScript,
        scriptQualityScore: enhancedScript?.qualityMetrics.overallScore,
        industryAlignment: enhancedScript?.qualityMetrics.industryAlignment,
        generationMethod
      };
    } catch (error: any) {
      throw new Error(`Video generation failed: ${error.message}`);
    }
  }

  /**
   * Generate enhanced script with quality metrics (without video creation)
   */
  async generateEnhancedScriptOnly(
    parsedCV: ParsedCV,
    options: VideoGenerationOptions = {}
  ): Promise<EnhancedScriptResult> {
    try {
      const promptOptions: PromptEngineOptions = {
        ...options,
        targetIndustry: options.targetIndustry,
        optimizationLevel: options.optimizationLevel || 'enhanced'
      };
      
      return await advancedPromptEngine.generateEnhancedScript(parsedCV, promptOptions);
    } catch (error: any) {
      throw new Error(`Enhanced script generation failed: ${error.message}`);
    }
  }

  /**
   * Get industry template recommendations for a CV
   */
  getIndustryRecommendations(parsedCV: ParsedCV): any[] {
    try {
      const { industryTemplatesService } = require('./industry-templates.service');
      return industryTemplatesService.analyzeAndRecommendTemplate(parsedCV);
    } catch (error) {
      return [];
    }
  }
  
  /**
   * Generate video script optimized for AI avatar delivery
   */
  private async generateVideoScript(
    cv: ParsedCV,
    options: VideoGenerationOptions
  ): Promise<string> {
    const durationWords = {
      short: 75,   // ~30 seconds
      medium: 150, // ~60 seconds
      long: 225    // ~90 seconds
    };
    
    const targetWords = durationWords[options.duration || 'medium'];
    const style = options.style || 'professional';
    
    const stylePrompts = {
      professional: 'formal, confident, and authoritative tone',
      friendly: 'warm, approachable, and conversational tone',
      energetic: 'enthusiastic, dynamic, and passionate tone'
    };
    
    const prompt = `Create a ${targetWords}-word video introduction script for an AI avatar to deliver. The avatar will speak directly to camera.

Professional Details:
Name: ${cv.personalInfo?.name || 'Professional'}
Current Role: ${cv.experience?.[0]?.position || 'Experienced Professional'} at ${cv.experience?.[0]?.company || 'leading organization'}
Key Skills: ${this.getTechnicalSkills(cv.skills).slice(0, 5).join(', ') || 'Various technical skills'}
Notable Achievement: ${cv.experience?.[0]?.achievements?.[0] || cv.achievements?.[0] || 'Multiple accomplishments'}

Requirements:
- Write in first person as if ${cv.personalInfo?.name} is speaking
- Use ${stylePrompts[style]}
- Include natural pauses for emphasis (mark with "...")
- Structure: Hook → Introduction → Experience highlight → Skills showcase → Achievement → Call to action
- End with invitation to connect or learn more
- Make it sound natural for video delivery, not like reading text

Keep it exactly ${targetWords} words.`;

    try {
      const response = await this.openai.chat.completions.create({
        model: 'gpt-4',
        messages: [
          {
            role: 'system',
            content: 'You are a professional scriptwriter creating video scripts for AI avatars. Make the script sound natural, engaging, and optimized for video delivery.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.7,
        max_tokens: targetWords * 2
      });
      
      const script = response.choices[0].message?.content || '';
      
      // Process script for better avatar delivery
      return this.optimizeScriptForAvatar(script);
    } catch (error) {
      // Fallback to template script
      return this.generateTemplateVideoScript(cv, targetWords);
    }
  }
  
  /**
   * Optimize script for avatar delivery
   */
  private optimizeScriptForAvatar(script: string): string {
    // Add natural pauses and emphasis
    let optimized = script
      .replace(/\. /g, '. ... ')  // Add pause after sentences
      .replace(/! /g, '! ... ')   // Add pause after exclamations
      .replace(/\? /g, '? ... ')  // Add pause after questions
      .replace(/: /g, ': ... ')   // Add pause after colons
      .replace(/\.\.\. \.\.\./g, '...'); // Remove double pauses
    
    // Clean up spacing
    optimized = optimized.replace(/\s+/g, ' ').trim();
    
    return optimized;
  }
  
  /**
   * Create video using D-ID API
   */
  async createVideoWithAvatar(
    script: string,
    jobId: string,
    options: VideoGenerationOptions
  ): Promise<{ videoUrl: string; duration: number; size: number }> {
    const avatarStyle = options.style || 'professional';
    const avatar = this.avatarConfig[avatarStyle];
    
    try {
      // Step 1: Create talk
      const talkResponse = await axios.post(
        'https://api.d-id.com/talks',
        {
          script: {
            type: 'text',
            input: script,
            provider: {
              type: 'microsoft',
              voice_id: avatar.voiceId,
              voice_config: {
                style: avatarStyle === 'energetic' ? 'Cheerful' : 'Default'
              }
            }
          },
          source_url: `https://create-new-talks.s3.us-west-2.amazonaws.com/${avatar.avatarId}.jpg`,
          config: {
            stitch: true,
            pad_audio: 0.5,
            align_driver: true,
            auto_match: true,
            result_format: 'mp4'
          }
        },
        {
          headers: {
            'Authorization': `Basic ${this.didApiKey}`,
            'Content-Type': 'application/json'
          }
        }
      );
      
      const talkId = talkResponse.data.id;
      
      // Step 2: Poll for completion
      let videoUrl = '';
      let attempts = 0;
      const maxAttempts = 60; // 5 minutes timeout
      
      while (!videoUrl && attempts < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, 5000)); // Wait 5 seconds
        
        const statusResponse = await axios.get(
          `https://api.d-id.com/talks/${talkId}`,
          {
            headers: {
              'Authorization': `Basic ${this.didApiKey}`
            }
          }
        );
        
        if (statusResponse.data.status === 'done') {
          videoUrl = statusResponse.data.result_url;
          break;
        } else if (statusResponse.data.status === 'error') {
          throw new Error('Video generation failed: ' + statusResponse.data.error?.message);
        }
        
        attempts++;
      }
      
      if (!videoUrl) {
        throw new Error('Video generation timed out');
      }
      
      // Step 3: Get video metadata
      const videoResponse = await axios.head(videoUrl);
      const size = parseInt(videoResponse.headers['content-length'] || '0');
      
      // Calculate duration based on script length
      const words = script.split(' ').length;
      const duration = Math.ceil((words / 150) * 60); // 150 words per minute
      
      return { videoUrl, duration, size };
      
    } catch (error: any) {
      
      // Fallback to alternative video generation
      return this.createFallbackVideo(script, jobId, options);
    }
  }
  
  /**
   * Create fallback video using alternative method
   */
  private async createFallbackVideo(
    script: string,
    jobId: string,
    options: VideoGenerationOptions
  ): Promise<{ videoUrl: string; duration: number; size: number }> {
    // Use Synthesia API as fallback
    if (process.env.SYNTHESIA_API_KEY) {
      return this.createSynthesiaVideo(script, jobId, options);
    }
    
    // Ultimate fallback: Create animated text video
    return this.createAnimatedTextVideo(script, jobId, options);
  }
  
  /**
   * Create video using Synthesia API
   */
  private async createSynthesiaVideo(
    script: string,
    jobId: string,
    options: VideoGenerationOptions
  ): Promise<{ videoUrl: string; duration: number; size: number }> {
    const apiKey = process.env.SYNTHESIA_API_KEY || '';
    
    try {
      const response = await axios.post(
        'https://api.synthesia.io/v2/videos',
        {
          test: false,
          visibility: 'private',
          title: `CV Introduction - ${jobId}`,
          description: 'Professional introduction video',
          input: [
            {
              avatarSettings: {
                horizontalAlign: 'center',
                scale: 1,
                style: options.avatarStyle === 'realistic' ? 'rectangular' : 'circular'
              },
              backgroundSettings: {
                videoSettings: {
                  shortBackgroundContentMatchMode: 'freeze',
                  longBackgroundContentMatchMode: 'trim'
                }
              },
              scriptText: script,
              avatar: 'anna_costume1_cameraA',
              background: options.background === 'office' ? 'off_office_background_happy' : 'gradient_01'
            }
          ]
        },
        {
          headers: {
            'Authorization': apiKey,
            'Content-Type': 'application/json'
          }
        }
      );
      
      const videoId = response.data.id;
      
      // Poll for completion
      let videoUrl = '';
      let attempts = 0;
      
      while (!videoUrl && attempts < 60) {
        await new Promise(resolve => setTimeout(resolve, 10000)); // Wait 10 seconds
        
        const statusResponse = await axios.get(
          `https://api.synthesia.io/v2/videos/${videoId}`,
          {
            headers: {
              'Authorization': apiKey
            }
          }
        );
        
        if (statusResponse.data.status === 'complete') {
          videoUrl = statusResponse.data.download;
          break;
        }
        
        attempts++;
      }
      
      const duration = Math.ceil((script.split(' ').length / 150) * 60);
      
      return { videoUrl, duration, size: 10485760 }; // ~10MB estimate
    } catch (error) {
      throw error;
    }
  }
  
  /**
   * Create animated text video as last resort
   */
  private async createAnimatedTextVideo(
    script: string,
    jobId: string,
    options: VideoGenerationOptions
  ): Promise<{ videoUrl: string; duration: number; size: number }> {
    // This would integrate with a service like Remotion or use FFmpeg
    // For now, we'll create a placeholder that indicates the feature is in beta
    
    const bucket = admin.storage().bucket();
    const fileName = `videos/${jobId}/intro-placeholder.mp4`;
    
    // In production, this would generate an actual video
    // For now, store a placeholder reference
    const placeholderData = {
      type: 'animated-text',
      script,
      generatedAt: new Date().toISOString(),
      status: 'placeholder'
    };
    
    const file = bucket.file(fileName + '.json');
    await file.save(JSON.stringify(placeholderData), {
      metadata: {
        contentType: 'application/json'
      }
    });
    
    // Return a placeholder URL
    const duration = Math.ceil((script.split(' ').length / 150) * 60);
    return {
      videoUrl: `https://storage.googleapis.com/${bucket.name}/${fileName}`,
      duration,
      size: 5242880 // 5MB estimate
    };
  }
  
  /**
   * Generate video thumbnail
   */
  async generateThumbnail(videoUrl: string, jobId: string): Promise<string> {
    // In production, use FFmpeg or a video processing service to extract frame
    // For now, generate a branded thumbnail
    
    // const bucket = admin.storage().bucket(); // Unused for now
    // const fileName = `videos/${jobId}/thumbnail.jpg`; // Unused for now
    
    // This would be replaced with actual thumbnail generation
    // For demo, we'll reference a default thumbnail
    const defaultThumbnail = 'https://storage.googleapis.com/cvplus-assets/video-thumbnail-default.jpg';
    
    return defaultThumbnail;
  }
  
  /**
   * Generate subtitles in WebVTT format
   */
  private async generateSubtitles(script: string, duration: number): Promise<string> {
    const words = script.split(' ');
    const wordsPerSecond = words.length / duration;
    const subtitles: string[] = ['WEBVTT\n'];
    
    let currentTime = 0;
    let currentLine = '';
    let wordCount = 0;
    
    for (let i = 0; i < words.length; i++) {
      currentLine += words[i] + ' ';
      wordCount++;
      
      // Create subtitle every 8-10 words or at punctuation
      if (wordCount >= 8 || words[i].match(/[.!?]$/) || i === words.length - 1) {
        const startTime = this.formatTime(currentTime);
        const endTime = this.formatTime(currentTime + (wordCount / wordsPerSecond));
        
        subtitles.push(`${startTime} --> ${endTime}`);
        subtitles.push(currentLine.trim());
        subtitles.push('');
        
        currentTime += wordCount / wordsPerSecond;
        currentLine = '';
        wordCount = 0;
      }
    }
    
    return subtitles.join('\n');
  }
  
  /**
   * Format time for WebVTT
   */
  private formatTime(seconds: number): string {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    const ms = Math.floor((seconds % 1) * 1000);
    
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}.${ms.toString().padStart(3, '0')}`;
  }
  
  /**
   * Store video in Firebase Storage
   */
  private async storeVideo(
    videoData: { videoUrl: string; duration: number; size: number },
    jobId: string
  ): Promise<string> {
    try {
      // Download video from temporary URL
      const response = await axios.get(videoData.videoUrl, {
        responseType: 'arraybuffer'
      });
      
      const bucket = admin.storage().bucket();
      const fileName = `videos/${jobId}/introduction.mp4`;
      const file = bucket.file(fileName);
      
      await file.save(Buffer.from(response.data), {
        metadata: {
          contentType: 'video/mp4',
          metadata: {
            jobId,
            duration: videoData.duration.toString(),
            generatedAt: new Date().toISOString()
          }
        }
      });
      
      // Make file public
      await file.makePublic();
      
      return `https://storage.googleapis.com/${bucket.name}/${fileName}`;
    } catch (error) {
      // Return original URL as fallback
      return videoData.videoUrl;
    }
  }
  
  /**
   * Generate template video script
   */
  private generateTemplateVideoScript(cv: ParsedCV, targetWords: number): string {
    const name = cv.personalInfo?.name || 'I';
    const role = cv.experience?.[0]?.position || 'professional';
    const company = cv.experience?.[0]?.company || 'my company';
    const skills = this.getTechnicalSkills(cv.skills).slice(0, 3).join(', ') || 'various technologies';
    const achievement = cv.experience?.[0]?.achievements?.[0] || cv.achievements?.[0] || 'driving meaningful results';
    
    const templates = {
      75: `Hi, I'm ${name}. As a ${role} at ${company}, I specialize in ${skills}. ${achievement}. I'm passionate about leveraging technology to create innovative solutions. Let's connect and explore how we can work together to achieve great things.`,
      
      150: `Hello! I'm ${name}, a ${role} at ${company}. With expertise in ${skills}, I've dedicated my career to excellence and innovation. One of my proudest achievements is ${achievement}. I thrive on solving complex challenges and collaborating with talented teams. My approach combines technical expertise with strategic thinking to deliver impactful results. I'm always excited to connect with fellow professionals and explore new opportunities. Feel free to reach out if you'd like to discuss potential collaborations or learn more about my work.`,
      
      225: `Greetings! I'm ${name}, currently serving as ${role} at ${company}. Throughout my career, I've developed deep expertise in ${skills}, which has enabled me to tackle complex challenges and deliver innovative solutions. A highlight of my journey has been ${achievement}, which demonstrates my commitment to excellence and impact. I believe in the power of technology to transform businesses and improve lives. My approach combines technical proficiency with strategic vision, always focusing on creating value and driving results. I'm passionate about continuous learning and staying at the forefront of industry developments. Whether you're looking for expertise in ${skills.split(',')[0] || 'technology solutions'}, seeking innovative solutions, or interested in collaboration, I'd love to connect. Let's explore how we can work together to achieve remarkable outcomes.`
    };
    
    // Return the template closest to target words
    const closest = Object.keys(templates)
      .map(Number)
      .reduce((prev, curr) => 
        Math.abs(curr - targetWords) < Math.abs(prev - targetWords) ? curr : prev
      );
    
    return templates[closest as keyof typeof templates];
  }
}

export const videoGenerationService = new VideoGenerationService();