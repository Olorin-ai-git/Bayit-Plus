// @ts-ignore
/**
 * Media Generation Service for Video Intros and Podcasts
  */

import OpenAI from 'openai';
import * as admin from 'firebase-admin';
import ffmpeg from 'fluent-ffmpeg';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import axios from 'axios';
import { config } from '../config/environment';
import { ParsedCV } from '../types/enhanced-models';

// Set FFmpeg path for fluent-ffmpeg (environment-aware)
const ffmpegPath = process.env.FFMPEG_PATH || 
                   '/usr/local/bin/ffmpeg' ||
                   '/usr/bin/ffmpeg' || 
                   '/layers/google.nodejs.ffmpeg/bin/ffmpeg';
ffmpeg.setFfmpegPath(ffmpegPath);

export class MediaGenerationService {
  private openai: OpenAI | null = null;
  
  constructor() {
    // Initialize OpenAI lazily when needed
  }

  private getOpenAI(): OpenAI {
    if (!this.openai) {
      this.openai = new OpenAI({
        apiKey: config.rag?.openaiApiKey || process.env.OPENAI_API_KEY || '',
      });
    }
    return this.openai;
  }
  
  /**
   * Generate video intro script
    */
  async generateVideoIntroScript(
    parsedCV: ParsedCV,
    duration: number = 60, // seconds
    style: 'professional' | 'casual' | 'creative' = 'professional'
  ): Promise<{
    script: string;
    scenes: VideoScene[];
    duration: number;
    voiceoverText: string;
  }> {
    // Calculate words based on average speaking rate (150 words per minute)
    const targetWords = Math.floor((duration / 60) * 150);
    
    // Generate script using AI
    const script = await this.generateIntroScript(parsedCV, targetWords, style);
    
    // Break down into scenes
    const scenes = this.createVideoScenes(script, parsedCV, duration);
    
    // Extract voiceover text
    const voiceoverText = this.extractVoiceoverText(scenes);
    
    return {
      script,
      scenes,
      duration,
      voiceoverText
    };
  }
  
  /**
   * Generate podcast script from CV
    */
  async generatePodcastScript(
    parsedCV: ParsedCV,
    format: 'interview' | 'narrative' | 'highlights' = 'interview',
    duration: number = 300 // 5 minutes default
  ): Promise<{
    script: string;
    segments: PodcastSegment[];
    totalDuration: number;
    metadata: PodcastMetadata;
  }> {
    const targetWords = Math.floor((duration / 60) * 150);
    
    let script: string;
    let segments: PodcastSegment[];
    
    switch (format) {
      case 'interview':
        const interview = await this.generateInterviewFormat(parsedCV, targetWords);
        script = interview.script;
        segments = interview.segments;
        break;
        
      case 'narrative':
        const narrative = await this.generateNarrativeFormat(parsedCV, targetWords);
        script = narrative.script;
        segments = narrative.segments;
        break;
        
      case 'highlights':
        const highlights = await this.generateHighlightsFormat(parsedCV, targetWords);
        script = highlights.script;
        segments = highlights.segments;
        break;
    }
    
    // Generate metadata
    const metadata = this.generatePodcastMetadata(parsedCV, format);
    
    return {
      script,
      segments,
      totalDuration: duration,
      metadata
    };
  }
  
  /**
   * Generate intro script using AI
    */
  private async generateIntroScript(
    cv: ParsedCV,
    targetWords: number,
    style: string
  ): Promise<string> {
    const stylePrompts = {
      professional: 'formal and authoritative, focusing on achievements and expertise',
      casual: 'friendly and conversational, making the person relatable',
      creative: 'engaging and dynamic, highlighting unique aspects and personality'
    };
    
    const prompt = `Create a ${targetWords}-word video introduction script for a professional. Style: ${stylePrompts[style as keyof typeof stylePrompts]}.

Professional Details:
Name: ${cv.personalInfo?.name || 'Professional'}
Current Role: ${cv.experience?.[0]?.position || 'Experienced Professional'}
Summary: ${cv.personalInfo?.summary || 'Skilled professional'}
Key Skills: ${this.getTechnicalSkills(cv.skills)?.slice(0, 5).join(', ') || 'Various technical skills'}
Notable Achievement: ${cv.experience?.[0]?.achievements?.[0] || cv.achievements?.[0] || 'Multiple accomplishments'}

Write in first person, as if the professional is speaking. Include:
1. Strong opening hook
2. Professional background
3. Key expertise areas
4. Notable achievement or impact
5. Forward-looking statement

Keep it exactly ${targetWords} words.`;

    try {
      const response = await this.getOpenAI().chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: targetWords * 2,
        temperature: 0.7
      });
      
      return response.choices[0].message?.content?.trim() || this.generateDefaultIntroScript(cv, targetWords);
    } catch (error) {
      return this.generateDefaultIntroScript(cv, targetWords);
    }
  }
  
  /**
   * Create video scenes from script
    */
  private createVideoScenes(
    script: string,
    cv: ParsedCV,
    totalDuration: number
  ): VideoScene[] {
    const sentences = script.split(/[.!?]+/).filter(s => s.trim().length > 0);
    const sceneDuration = totalDuration / sentences.length;
    
    const scenes: VideoScene[] = [];
    let currentTime = 0;
    
    sentences.forEach((sentence, index) => {
      const scene: VideoScene = {
        id: `scene-${index + 1}`,
        text: sentence.trim() + '.',
        startTime: currentTime,
        duration: sceneDuration,
        visualSuggestions: this.getVisualSuggestions(sentence, cv, index),
        transitions: index === 0 ? 'fade-in' : 'smooth'
      };
      
      scenes.push(scene);
      currentTime += sceneDuration;
    });
    
    // Add closing scene
    scenes[scenes.length - 1].transitions = 'fade-out';
    
    return scenes;
  }
  
  /**
   * Get visual suggestions for a scene
    */
  private getVisualSuggestions(
    text: string,
    cv: ParsedCV,
    sceneIndex: number
  ): string[] {
    const suggestions: string[] = [];
    
    // Opening scene
    if (sceneIndex === 0) {
      suggestions.push('Professional headshot or avatar');
      suggestions.push('Name and title overlay');
      suggestions.push('Subtle background animation');
    }
    
    // Skills mentioned
    else if (text.toLowerCase().includes('skill') || text.toLowerCase().includes('expert')) {
      suggestions.push('Skills visualization or icons');
      suggestions.push('Technology logos');
      suggestions.push('Competency chart');
    }
    
    // Experience mentioned
    else if (text.toLowerCase().includes('experience') || text.toLowerCase().includes('work')) {
      suggestions.push('Timeline visualization');
      suggestions.push('Company logos');
      suggestions.push('Achievement highlights');
    }
    
    // Achievement mentioned
    else if (text.toLowerCase().includes('achiev') || text.toLowerCase().includes('success')) {
      suggestions.push('Achievement badge or award');
      suggestions.push('Success metrics visualization');
      suggestions.push('Impact statistics');
    }
    
    // Default
    else {
      suggestions.push('Professional working environment');
      suggestions.push('Abstract professional background');
      suggestions.push('Text emphasis overlay');
    }
    
    return suggestions;
  }
  
  /**
   * Extract voiceover text from scenes
    */
  private extractVoiceoverText(scenes: VideoScene[]): string {
    return scenes.map(scene => scene.text).join(' ');
  }
  
  /**
   * Generate interview format podcast
    */
  private async generateInterviewFormat(
    cv: ParsedCV,
    targetWords: number
  ): Promise<{ script: string; segments: PodcastSegment[] }> {
    const segments: PodcastSegment[] = [];
    const scripts: string[] = [];
    
    // Introduction segment
    const introPrompt = `Create an interview introduction for a podcast. The host introduces:
${cv.personalInfo?.name || 'our guest'}, ${cv.experience?.[0]?.position || 'professional'} with expertise in ${this.getTechnicalSkills(cv.skills)?.slice(0, 3).join(', ')}.
Keep it to 50 words, conversational tone.`;

    const intro = await this.generateSegment(introPrompt, 50);
    segments.push({
      type: 'intro',
      speaker: 'host',
      text: intro,
      duration: 20
    });
    scripts.push(`[HOST]: ${intro}`);
    
    // Q&A segments
    const questions = [
      {
        q: 'Tell us about your professional journey',
        focus: 'career progression and key experiences'
      },
      {
        q: 'What has been your most significant achievement?',
        focus: 'specific accomplishment and its impact'
      },
      {
        q: 'What skills do you think are most important in your field?',
        focus: 'technical and soft skills expertise'
      },
      {
        q: 'What excites you about the future of your industry?',
        focus: 'forward-thinking and industry trends'
      }
    ];
    
    for (const qa of questions) {
      // Host question
      segments.push({
        type: 'question',
        speaker: 'host',
        text: qa.q,
        duration: 5
      });
      scripts.push(`\n[HOST]: ${qa.q}`);
      
      // Guest answer
      const answerPrompt = `As ${cv.personalInfo?.name}, answer this interview question: "${qa.q}"
Focus on: ${qa.focus}
Use information from: ${this.summarizeForPrompt(cv)}
Keep it to ${Math.floor(targetWords / questions.length)} words, first person.`;

      const answer = await this.generateSegment(answerPrompt, Math.floor(targetWords / questions.length));
      segments.push({
        type: 'answer',
        speaker: 'guest',
        text: answer,
        duration: Math.floor((targetWords / questions.length) / 2.5) // seconds
      });
      scripts.push(`\n[GUEST]: ${answer}`);
    }
    
    // Outro
    const outro = "Thank you for sharing your insights with us today. It's been fascinating to learn about your journey and expertise.";
    segments.push({
      type: 'outro',
      speaker: 'host',
      text: outro,
      duration: 10
    });
    scripts.push(`\n[HOST]: ${outro}`);
    
    return {
      script: scripts.join('\n'),
      segments
    };
  }
  
  /**
   * Generate narrative format podcast
    */
  private async generateNarrativeFormat(
    cv: ParsedCV,
    targetWords: number
  ): Promise<{ script: string; segments: PodcastSegment[] }> {
    const narrativePrompt = `Write a ${targetWords}-word professional narrative podcast script about:
${cv.personalInfo?.name || 'A Professional'}'s career journey.

Include:
1. Opening hook about their current role/impact
2. Early career and education background
3. Key career milestones and transitions
4. Major achievements and challenges overcome
5. Current expertise and contributions
6. Vision for the future

Use third person, storytelling style. Data: ${this.summarizeForPrompt(cv)}`;

    const narrative = await this.generateSegment(narrativePrompt, targetWords);
    
    // Break into segments
    const paragraphs = narrative.split('\n\n').filter(p => p.trim());
    const segments: PodcastSegment[] = paragraphs.map((para, index) => ({
      type: index === 0 ? 'intro' : index === paragraphs.length - 1 ? 'outro' : 'content',
      speaker: 'narrator',
      text: para,
      duration: Math.floor((para.split(' ').length / 150) * 60)
    }));
    
    return {
      script: narrative,
      segments
    };
  }
  
  /**
   * Generate highlights format podcast
    */
  private async generateHighlightsFormat(
    cv: ParsedCV,
    targetWords: number
  ): Promise<{ script: string; segments: PodcastSegment[] }> {
    const segments: PodcastSegment[] = [];
    const scripts: string[] = [];
    
    // Career highlights structure
    const highlights = [
      {
        title: 'Professional Summary',
        content: cv.personalInfo?.summary || '',
        focus: 'who they are and what they do'
      },
      {
        title: 'Top Skills',
        content: cv.skills ? [...this.getTechnicalSkills(cv.skills), ...this.getSoftSkills(cv.skills)].join(', ') : '',
        focus: 'key competencies and expertise'
      },
      {
        title: 'Career Achievements',
        content: cv.experience?.map(e => e.achievements || []).flat().join('. ') || '',
        focus: 'major accomplishments and impact'
      },
      {
        title: 'Current Focus',
        content: cv.experience?.[0]?.description || '',
        focus: 'current role and responsibilities'
      }
    ];
    
    // Intro
    const intro = `Welcome to Career Highlights, featuring ${cv.personalInfo?.name || 'an accomplished professional'}. In the next few minutes, we'll explore their key achievements, skills, and professional journey.`;
    segments.push({
      type: 'intro',
      speaker: 'narrator',
      text: intro,
      duration: 10
    });
    scripts.push(intro);
    
    // Generate each highlight
    for (const highlight of highlights) {
      const segmentWords = Math.floor(targetWords / highlights.length);
      const prompt = `Create a ${segmentWords}-word highlight segment about "${highlight.title}".
Focus: ${highlight.focus}
Content: ${highlight.content}
Style: Concise, impactful, third-person narrative.`;

      const text = await this.generateSegment(prompt, segmentWords);
      
      segments.push({
        type: 'highlight',
        speaker: 'narrator',
        text: text,
        duration: Math.floor((segmentWords / 150) * 60),
        metadata: { title: highlight.title }
      });
      scripts.push(`\n[${highlight.title.toUpperCase()}]\n${text}`);
    }
    
    return {
      script: scripts.join('\n'),
      segments
    };
  }
  
  /**
   * Generate a segment using AI
    */
  private async generateSegment(prompt: string, targetWords: number): Promise<string> {
    try {
      const response = await this.getOpenAI().chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: targetWords * 2,
        temperature: 0.7
      });
      
      return response.choices[0].message?.content?.trim() || '';
    } catch (error) {
      return '';
    }
  }
  
  /**
   * Summarize CV for prompts
    */
  private summarizeForPrompt(cv: ParsedCV): string {
    const parts = [];
    
    if (cv.personalInfo?.name) parts.push(`Name: ${cv.personalInfo.name}`);
    if (cv.experience?.[0]) {
      parts.push(`Current: ${cv.experience[0].position} at ${cv.experience[0].company}`);
    }
    const technicalSkills = this.getTechnicalSkills(cv.skills);
    if (technicalSkills.length > 0) {
      parts.push(`Skills: ${technicalSkills.slice(0, 5).join(', ') || 'Various skills'}`);
    }
    if (cv.achievements && cv.achievements.length > 0) {
      parts.push(`Achievement: ${cv.achievements[0]}`);
    }
    
    return parts.join('. ');
  }
  
  /**
   * Get technical skills from skills union type
    */
  private getTechnicalSkills(skills: string[] | { [key: string]: string[]; technical?: string[]; soft?: string[]; languages?: string[]; tools?: string[]; frontend?: string[]; backend?: string[]; databases?: string[]; cloud?: string[]; competencies?: string[]; frameworks?: string[]; expertise?: string[]; } | undefined): string[] {
    if (!skills) return [];
    if (Array.isArray(skills)) return skills;
    // For object format, try technical first, then other technical categories
    if (typeof skills === 'object') {
      return skills.technical || skills.frontend || skills.backend || skills.frameworks || skills.tools || skills.expertise || [];
    }
    return [];
  }

  /**
   * Get soft skills from skills union type
    */
  private getSoftSkills(skills: string[] | { [key: string]: string[]; technical?: string[]; soft?: string[]; languages?: string[]; tools?: string[]; frontend?: string[]; backend?: string[]; databases?: string[]; cloud?: string[]; competencies?: string[]; frameworks?: string[]; expertise?: string[]; } | undefined): string[] {
    if (!skills || Array.isArray(skills)) return [];
    // For object format, try soft skills or competencies
    if (typeof skills === 'object') {
      return skills.soft || skills.competencies || [];
    }
    return [];
  }

  /**
   * Generate default intro script
    */
  private generateDefaultIntroScript(cv: ParsedCV, targetWords: number): string {
    const name = cv.personalInfo?.name || 'I';
    const role = cv.experience?.[0]?.position || 'professional';
    const company = cv.experience?.[0]?.company || '';
    const skills = this.getTechnicalSkills(cv.skills)?.slice(0, 3).join(', ') || 'various technologies';
    
    return `Hello, I'm ${name}, a ${role}${company ? ` at ${company}` : ''}. With expertise in ${skills}, I've dedicated my career to delivering innovative solutions and driving meaningful results. Throughout my journey, I've had the opportunity to work on challenging projects that have shaped my professional growth. My passion lies in leveraging technology to solve complex problems and create value. I believe in continuous learning and collaboration, always seeking new ways to contribute to my field. Looking ahead, I'm excited about the evolving landscape of technology and the opportunities it presents to make a lasting impact.`;
  }
  
  /**
   * Generate podcast metadata
    */
  private generatePodcastMetadata(cv: ParsedCV, format: string): PodcastMetadata {
    return {
      title: `${cv.personalInfo?.name || 'Professional'} - Career ${format === 'interview' ? 'Interview' : format === 'narrative' ? 'Story' : 'Highlights'}`,
      description: `An ${format} podcast featuring ${cv.personalInfo?.name || 'a professional'}, ${cv.experience?.[0]?.position || 'experienced professional'} with expertise in ${this.getTechnicalSkills(cv.skills)?.slice(0, 3).join(', ') || 'various fields'}.`,
      tags: [
        ...this.getTechnicalSkills(cv.skills)?.slice(0, 5) || [],
        'career',
        'professional',
        format
      ],
      category: 'Career & Business',
      duration: '5:00',
      language: 'en'
    };
  }
  
  /**
   * Generate audio file from text (placeholder)
    */
  async generateAudio(
    text: string,
    voice: 'male' | 'female' = 'male',
    speed: number = 1.0
  ): Promise<{ audioUrl: string; duration: number }> {
    // TODO: Integrate with TTS service (Google Cloud TTS, Amazon Polly, etc.)
    // For now, return placeholder
    
    const duration = Math.ceil((text.split(' ').length / 150) * 60); // Estimate duration
    
    return {
      audioUrl: 'placeholder-audio-url',
      duration
    };
  }
  
  /**
   * Merge audio segments for podcast
    */
  async mergeAudioSegments(
    segments: Array<{ audioUrl: string; duration: number }>,
    transitions: boolean = true
  ): Promise<string> {
    const tempDir = path.join(os.tmpdir(), `merge-${Date.now()}`);
    const outputPath = path.join(tempDir, 'merged-audio.mp3');
    
    try {
      // Create temp directory
      if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true });
      }
      
      // Download audio files to temp directory
      const tempFiles: string[] = [];
      const listFileContent: string[] = [];
      
      for (let i = 0; i < segments.length; i++) {
        const segment = segments[i];
        const tempFile = path.join(tempDir, `segment-${i}.mp3`);
        
        // Download audio file
        const response = await axios.get(segment.audioUrl, { 
          responseType: 'arraybuffer' 
        });
        fs.writeFileSync(tempFile, Buffer.from(response.data));
        
        tempFiles.push(tempFile);
        listFileContent.push(`file '${tempFile}'`);
        
        // Add transition silence if requested
        if (transitions && i < segments.length - 1) {
          const silenceFile = path.join(tempDir, `silence-${i}.mp3`);
          await this.generateSilenceFile(500, silenceFile); // 500ms pause
          tempFiles.push(silenceFile);
          listFileContent.push(`file '${silenceFile}'`);
        }
      }
      
      // Write list file for FFmpeg concat
      const listFilePath = path.join(tempDir, 'filelist.txt');
      fs.writeFileSync(listFilePath, listFileContent.join('\n'));
      
      // Merge audio files using FFmpeg
      await new Promise<void>((resolve, reject) => {
        ffmpeg()
          .input(listFilePath)
          .inputOptions(['-f', 'concat', '-safe', '0'])
          .audioCodec('mp3')
          .audioBitrate('128k')
          .audioFrequency(44100)
          .audioChannels(2)
          .output(outputPath)
          .on('end', () => resolve())
          .on('error', (err) => reject(new Error(`Audio merging failed: ${err.message}`)))
          .run();
      });
      
      // Upload merged file to storage (implement based on your storage solution)
      const mergedBuffer = fs.readFileSync(outputPath);
      const bucket = admin.storage().bucket();
      const fileName = `merged-audio/${Date.now()}/merged.mp3`;
      const file = bucket.file(fileName);
      
      await file.save(mergedBuffer, {
        metadata: {
          contentType: 'audio/mpeg',
          metadata: {
            segmentCount: segments.length,
            totalDuration: segments.reduce((sum, s) => sum + s.duration, 0)
          }
        }
      });
      
      await file.makePublic();
      
      // Clean up temp files
      this.cleanupTempFiles([...tempFiles, listFilePath, outputPath]);
      
      return `https://storage.googleapis.com/${bucket.name}/${fileName}`;
      
    } catch (error) {
      this.cleanupTempFiles([tempDir]);
      throw new Error(`Failed to merge audio segments: ${error}`);
    }
  }
  
  /**
   * Generate silence file using FFmpeg
    */
  private async generateSilenceFile(durationMs: number, outputPath: string): Promise<void> {
    const durationSeconds = durationMs / 1000;
    
    return new Promise<void>((resolve, reject) => {
      ffmpeg()
        .input('anullsrc=channel_layout=stereo:sample_rate=44100')
        .inputOptions(['-f', 'lavfi'])
        .audioCodec('mp3')
        .audioBitrate('128k')
        .duration(durationSeconds)
        .output(outputPath)
        .on('end', () => resolve())
        .on('error', (err) => reject(err))
        .run();
    });
  }
  
  /**
   * Clean up temporary files
    */
  private cleanupTempFiles(filePaths: string[]): void {
    filePaths.forEach(filePath => {
      try {
        if (fs.existsSync(filePath)) {
          if (fs.lstatSync(filePath).isDirectory()) {
            fs.rmSync(filePath, { recursive: true, force: true });
          } else {
            fs.unlinkSync(filePath);
          }
        }
      } catch (error) {
      }
    });
  }
  
  /**
   * Generate video from script and images
    */
  async generateVideo(
    scenes: VideoScene[],
    backgroundMusic?: string,
    voiceoverUrl?: string
  ): Promise<string> {
    // TODO: Integrate with video generation service
    // Options:
    // 1. Remotion (React-based video generation)
    // 2. FFmpeg for basic video creation
    // 3. Cloud services like Synthesia or D-ID
    
    return 'generated-video-url';
  }
}

// Type definitions
interface VideoScene {
  id: string;
  text: string;
  startTime: number;
  duration: number;
  visualSuggestions: string[];
  transitions: 'fade-in' | 'fade-out' | 'smooth' | 'cut';
}

interface PodcastSegment {
  type: 'intro' | 'outro' | 'question' | 'answer' | 'content' | 'highlight';
  speaker: 'host' | 'guest' | 'narrator';
  text: string;
  duration: number;
  metadata?: any;
}

interface PodcastMetadata {
  title: string;
  description: string;
  tags: string[];
  category: string;
  duration: string;
  language: string;
}

export const mediaGenerationService = new MediaGenerationService();