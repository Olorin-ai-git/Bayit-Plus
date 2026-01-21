// @ts-ignore - Export conflicts/**
 * Podcast Generation Service
 * Creates conversational podcasts using AI voices
 */

import { ParsedCV, FlexibleSkillsFormat } from '../types/enhanced-models';
import * as admin from 'firebase-admin';
import axios from 'axios';
import OpenAI from 'openai';
import { config } from '../config/environment';
import ffmpeg from 'fluent-ffmpeg';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

// Set FFmpeg path for fluent-ffmpeg (environment-aware)
const ffmpegPath = process.env.FFMPEG_PATH || 
                   '/usr/local/bin/ffmpeg' ||
                   '/usr/bin/ffmpeg' || 
                   '/layers/google.nodejs.ffmpeg/bin/ffmpeg';
ffmpeg.setFfmpegPath(ffmpegPath);

interface ConversationalScript {
  segments: Array<{
    speaker: 'host1' | 'host2';
    text: string;
    emotion?: 'excited' | 'curious' | 'thoughtful' | 'impressed';
    pause?: number; // milliseconds
  }>;
  totalDuration: number;
}

interface VoiceConfig {
  host1: {
    voiceId: string;
    name: string;
    style: string;
  };
  host2: {
    voiceId: string;
    name: string;
    style: string;
  };
}

export class PodcastGenerationService {
  private openai: OpenAI;
  private elevenLabsApiKey: string;
  private voiceConfig: VoiceConfig;
  
  constructor() {
    // Enhanced API key retrieval with proper error handling
    const openaiKey = this.getSecretValue('OPENAI_API_KEY') || config.openai?.apiKey || process.env.OPENAI_API_KEY || '';
    if (!openaiKey) {
      throw new Error('OpenAI API key is required but not found in secrets or environment');
    }
    
    this.openai = new OpenAI({
      apiKey: openaiKey
    });
    
    // Enhanced ElevenLabs API key retrieval
    this.elevenLabsApiKey = (
      this.getSecretValue('ELEVENLABS_API_KEY') ||
      config.elevenLabs?.apiKey || 
      process.env.ELEVENLABS_API_KEY || ''
    ).trim();
    
    if (!this.elevenLabsApiKey) {
      throw new Error('ElevenLabs API key is required but not found in secrets or environment');
    }
    
    // Configure voices for conversational podcast with enhanced secret retrieval
    this.voiceConfig = {
      host1: {
        voiceId: this.getSecretValue('ELEVENLABS_HOST1_VOICE_ID') || 
                 config.elevenLabs?.host1VoiceId || 
                 process.env.ELEVENLABS_HOST1_VOICE_ID || 
                 'yoZ06aMxZJJ28mfd3POQ',
        name: 'Sarah',
        style: 'Professional podcast host'
      },
      host2: {
        voiceId: this.getSecretValue('ELEVENLABS_HOST2_VOICE_ID') || 
                 config.elevenLabs?.host2VoiceId || 
                 process.env.ELEVENLABS_HOST2_VOICE_ID || 
                 'pNInz6obpgDQGcFmaJgB',
        name: 'Mike',
        style: 'Engaging co-host'
      }
    };
    
  }
  
  /**
   * Safely retrieve secret values from Firebase Functions secrets
   */
  private getSecretValue(secretName: string): string | undefined {
    try {
      // Firebase Functions v2 secrets are available as environment variables
      const secretValue = process.env[secretName];
      if (secretValue && secretValue.trim().length > 0) {
        return secretValue.trim();
      }
      return undefined;
    } catch (error) {
      return undefined;
    }
  }
  
  /**
   * Validate environment and dependencies
   */
  private async validateEnvironment(): Promise<void> {
    
    // Check ElevenLabs API key
    if (!this.elevenLabsApiKey || this.elevenLabsApiKey.length < 10) {
      throw new Error('ElevenLabs API key is missing or invalid');
    }
    
    // Test ElevenLabs API key validity by making a simple API call
    try {
      const cleanApiKey = this.elevenLabsApiKey.replace(/[\s\n\r\t]/g, '');
      
      const testResponse = await axios.get('https://api.elevenlabs.io/v1/user', {
        headers: {
          'xi-api-key': cleanApiKey,
          'Content-Type': 'application/json'
        },
        timeout: 10000
      });
    } catch (error: any) {
      console.error('❌ ElevenLabs API validation failed:', {
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
        message: error.message
      });
      
      if (error.response?.status === 401) {
        throw new Error('ElevenLabs API key is invalid or expired. Please update your ELEVENLABS_API_KEY secret in Firebase Console.');
      } else if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
      } else {
      }
    }
    
    // Check voice configuration
    if (!this.voiceConfig.host1.voiceId || !this.voiceConfig.host2.voiceId) {
      throw new Error('Voice configuration is incomplete - missing voice IDs');
    }
    
    // Check FFmpeg availability
    try {
      await new Promise<void>((resolve, reject) => {
        ffmpeg.getAvailableFormats((err, formats) => {
          if (err) {
            reject(new Error(`FFmpeg not available: ${err.message}`));
          } else {
            resolve();
          }
        });
      });
    } catch (error: any) {
      throw new Error(`FFmpeg validation failed: ${error.message}`);
    }
    
  }
  
  /**
   * Generate a conversational podcast from CV data
   */
  async generatePodcast(
    parsedCV: ParsedCV,
    jobId: string,
    userId: string,
    options: {
      duration?: 'short' | 'medium' | 'long'; // 2-3min, 5-7min, 10-12min
      style?: 'professional' | 'casual' | 'enthusiastic';
      focus?: 'achievements' | 'journey' | 'skills' | 'balanced';
    } = {}
  ): Promise<{
    audioUrl: string;
    transcript: string;
    duration: string;
    chapters: Array<{ title: string; startTime: number; endTime: number; }>;
  }> {
    
    try {
      // Step 0: Validate environment and dependencies
      await this.validateEnvironment();
      
      // Step 1: Generate conversational script
      const script = await this.generateConversationalScript(parsedCV, options);
      
      if (!script || !script.segments || script.segments.length === 0) {
        throw new Error('Failed to generate valid script - no segments created');
      }
      
      // Step 2: Generate audio for each segment
      const audioSegments = await this.generateAudioSegments(script);
      
      if (!audioSegments || audioSegments.length === 0) {
        throw new Error('Failed to generate any audio segments');
      }
      
      // Step 3: Merge audio segments into final podcast
      const podcastUrl = await this.mergeAudioSegments(audioSegments, jobId, userId);
      
      if (!podcastUrl) {
        throw new Error('Failed to generate podcast URL after merging');
      }
      
      // Step 4: Generate chapters from script
      const chapters = this.generateChapters(script);
      
      // Step 5: Create readable transcript
      const transcript = this.formatTranscript(script);
      
      // Step 6: Calculate total duration
      const duration = this.calculateDuration(audioSegments);
      
      
      return {
        audioUrl: podcastUrl,
        transcript,
        duration,
        chapters
      };
    } catch (error: any) {
      console.error('Error generating podcast:', {
        error: error.message,
        stack: error.stack,
        jobId,
        userId
      });
      throw new Error(`Podcast generation failed: ${error.message}`);
    }
  }

  /**
   * Get technical skills from skills union type
   */
  private getTechnicalSkills(skills: FlexibleSkillsFormat): string[] {
    if (!skills) return [];
    if (Array.isArray(skills)) return skills;
    
    // Combine all technical-related skills from the object
    const technicalSkills: string[] = [];
    
    if (skills.technical) technicalSkills.push(...skills.technical);
    if (skills.frontend) technicalSkills.push(...skills.frontend);
    if (skills.backend) technicalSkills.push(...skills.backend);
    if (skills.databases) technicalSkills.push(...skills.databases);
    if (skills.cloud) technicalSkills.push(...skills.cloud);
    if (skills.tools) technicalSkills.push(...skills.tools);
    if (skills.frameworks) technicalSkills.push(...skills.frameworks);
    if (skills.expertise) technicalSkills.push(...skills.expertise);
    
    return technicalSkills;
  }
  
  /**
   * Generate a conversational script using GPT-4
   */
  private async generateConversationalScript(
    cv: ParsedCV,
    options: any
  ): Promise<ConversationalScript> {
    const durationWords = {
      short: 400,
      medium: 900,
      long: 1800
    };
    
    const targetWords = durationWords[options.duration as keyof typeof durationWords] || durationWords.medium;
    
    const prompt = `Create a natural, engaging podcast conversation between two hosts discussing this professional's career. Write ONLY the spoken dialogue - no stage directions, no emotional cues, no sound effects.

Host 1 (Sarah): Professional podcast host, asks insightful questions
Host 2 (Mike): Engaging co-host, adds color commentary and follow-up questions

Professional Profile:
Name: ${cv.personalInfo?.name || 'The candidate'}
Current Role: ${cv.experience?.[0]?.position || 'Professional'} at ${cv.experience?.[0]?.company || 'their company'}
Key Skills: ${this.getTechnicalSkills(cv.skills)?.slice(0, 5).join(', ') || 'various skills'}
Notable Achievement: ${cv.experience?.[0]?.achievements?.[0] || cv.achievements?.[0] || 'significant accomplishments'}

Create a ${targetWords}-word conversation that includes:
1. Natural opening banter
2. Introduction of the professional
3. Discussion of their career journey
4. Deep dive into key achievements
5. Insights about their skills and expertise
6. Future outlook and advice
7. Engaging closing

Format each line as:
[SARAH]: Spoken dialogue only
[MIKE]: Spoken dialogue only

IMPORTANT RULES:
- Write only what should be spoken aloud
- NO stage directions like "laughs", "chuckles", "pauses"
- NO emotional descriptions like "excitedly" or "thoughtfully"
- NO sound effects or action descriptions
- Use natural conversational language with enthusiasm and personality
- Let the voice actors convey emotion through delivery, not through text

Example of what NOT to do:
[SARAH]: That's amazing! *laughs* I can't believe how impressive that is.

Example of what TO do:
[SARAH]: That's absolutely incredible! I'm genuinely impressed by that achievement.

Style: ${options.style || 'casual'}
Focus: ${options.focus || 'balanced'}`;

    try {
      const response = await this.openai.chat.completions.create({
        model: 'gpt-4',
        messages: [
          {
            role: 'system',
            content: 'You are a podcast script writer creating engaging, natural conversations about professionals. Make it sound like a real podcast with personality, not a formal interview.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.8,
        max_tokens: targetWords * 2
      });
      
      const scriptText = response.choices[0].message?.content || '';
      return this.parseScriptToSegments(scriptText);
    } catch (error) {
      // Fallback to template-based script
      return this.generateTemplateScript(cv, targetWords);
    }
  }
  
  /**
   * Parse script text into segments
   */
  private parseScriptToSegments(scriptText: string): ConversationalScript {
    const lines = scriptText.split('\n').filter(line => line.trim());
    const segments: ConversationalScript['segments'] = [];
    
    for (const line of lines) {
      const match = line.match(/\[(HOST1|HOST2|SARAH|MIKE)\]:\s*(.+)/i);
      if (match) {
        const speaker = match[1].toLowerCase().includes('1') || match[1].toLowerCase() === 'sarah' ? 'host1' : 'host2';
        let text = match[2];
        
        // Clean the text of any stage directions or emotional cues
        text = this.cleanScriptText(text);
        
        // Skip empty segments after cleaning
        if (!text.trim()) {
          continue;
        }
        
        // Detect emotion from text content and punctuation
        let emotion: 'excited' | 'curious' | 'thoughtful' | 'impressed' = 'thoughtful';
        if (text.includes('!') || text.toLowerCase().includes('wow') || text.toLowerCase().includes('amazing') || 
            text.toLowerCase().includes('incredible') || text.toLowerCase().includes('fantastic')) {
          emotion = 'excited';
        } else if (text.includes('?') || text.toLowerCase().includes('how') || text.toLowerCase().includes('what') || 
                  text.toLowerCase().includes('why') || text.toLowerCase().includes('tell us')) {
          emotion = 'curious';
        } else if (text.toLowerCase().includes('impressive') || text.toLowerCase().includes('excellent') || 
                  text.toLowerCase().includes('outstanding') || text.toLowerCase().includes('remarkable')) {
          emotion = 'impressed';
        }
        
        segments.push({
          speaker,
          text,
          emotion,
          pause: text.endsWith('...') ? 500 : 200
        });
      }
    }
    
    // Calculate estimated duration (150 words per minute)
    const totalWords = segments.reduce((sum, seg) => sum + seg.text.split(' ').length, 0);
    const totalDuration = (totalWords / 150) * 60 * 1000; // milliseconds
    
    return { segments, totalDuration };
  }
  
  /**
   * Clean script text of stage directions and emotional cues
   */
  private cleanScriptText(text: string): string {
    // Remove common stage directions and emotional cues
    let cleanText = text
      // Remove content in parentheses (laughs), (chuckles), (pause), etc.
      .replace(/\([^)]*\)/g, '')
      // Remove content in square brackets [laughs], [chuckle], [pause], etc.
      .replace(/\[[^\]]*\]/g, '')
      // Remove content in asterisks *laughs*, *chuckles*, *pauses*, etc.
      .replace(/\*[^*]*\*/g, '')
      // Remove common stage direction words when they appear as standalone elements
      .replace(/\b(laughs?|chuckles?|giggles?|pauses?|sighs?|gasps?)\b/gi, '')
      // Remove multiple spaces and clean up
      .replace(/\s+/g, ' ')
      .trim();
    
    // Remove leading/trailing punctuation that might be left over
    cleanText = cleanText.replace(/^[,\s]+|[,\s]+$/g, '');
    
    return cleanText;
  }
  
  /**
   * Generate audio for each segment using ElevenLabs
   */
  private async generateAudioSegments(
    script: ConversationalScript
  ): Promise<Array<{ speaker: string; audioBuffer: Buffer; duration: number; }>> {
    
    // Validate input
    if (!script || !script.segments || script.segments.length === 0) {
      throw new Error('No script segments provided for audio generation');
    }
    
    const audioSegments = [];
    let processedSegments = 0;
    let skippedSegments = 0;
    
    for (let i = 0; i < script.segments.length; i++) {
      const segment = script.segments[i];
      
      const voiceId = segment.speaker === 'host1' 
        ? this.voiceConfig.host1.voiceId 
        : this.voiceConfig.host2.voiceId;
      
      try {
        // Validate voice configuration
        if (!voiceId || voiceId.length === 0) {
          skippedSegments++;
          continue;
        }
        
        // Validate and clean API key before making request
        if (!this.elevenLabsApiKey || this.elevenLabsApiKey.length < 10) {
          throw new Error('Invalid ElevenLabs API key - check environment configuration');
        }

        // Ensure API key contains only valid characters (remove newlines, spaces, etc.)
        const cleanApiKey = this.elevenLabsApiKey.replace(/[\s\n\r\t]/g, '');
        
        // Clean text one more time before sending to ElevenLabs
        let cleanText = this.cleanScriptText(segment.text);
        
        // Skip if text is empty after cleaning
        if (!cleanText.trim()) {
          skippedSegments++;
          continue;
        }
        
        // Validate text length (ElevenLabs has limits)
        if (cleanText.length > 5000) {
          cleanText = cleanText.substring(0, 5000);
        }
        
        // Enhanced voice settings based on emotion
        const voiceSettings = this.getVoiceSettingsForEmotion(segment.emotion, segment.speaker);
        
        
        // Call ElevenLabs API with timeout and retry logic
        const response = await axios.post(
          `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`,
          {
            text: cleanText,
            model_id: 'eleven_multilingual_v2', // Better for natural conversation
            voice_settings: voiceSettings
          },
          {
            headers: {
              'Accept': 'audio/mpeg',
              'xi-api-key': cleanApiKey,
              'Content-Type': 'application/json'
            },
            responseType: 'arraybuffer',
            timeout: 30000, // 30 second timeout
            validateStatus: (status) => {
              return status >= 200 && status < 300; // Only accept 2xx status codes
            }
          }
        );
        
        
        // Validate response data
        if (!response.data || response.data.byteLength === 0) {
          throw new Error(`Empty audio response from ElevenLabs for segment ${i}`);
        }
        
        const audioBuffer = Buffer.from(response.data);
        if (audioBuffer.length === 0) {
          throw new Error(`Generated audio buffer is empty for segment ${i}`);
        }
        
        const estimatedDuration = this.estimateAudioDuration(cleanText);
        
        audioSegments.push({
          speaker: segment.speaker,
          audioBuffer: audioBuffer,
          duration: estimatedDuration
        });
        
        processedSegments++;
        
        // Small delay to avoid rate limiting
        if (i < script.segments.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
        
        // Add pause if specified (skip for now to avoid FFmpeg lavfi issues)
        // Note: Pauses can be handled by adding brief silence between segments in the concat process
        // if (segment.pause && segment.pause > 200) {
        //   audioSegments.push({
        //     speaker: 'pause',
        //     audioBuffer: this.generateSilence(segment.pause),
        //     duration: segment.pause
        //   });
        // }
      } catch (error: any) {
        console.error(`Error generating audio for segment ${i}:`, {
          speaker: segment.speaker,
          textLength: segment.text?.length || 0,
          error: error.message,
          response: error.response?.status,
          responseData: error.response?.data?.toString?.(),
          voiceId
        });
        
        // Check for authentication error
        if (error.response?.status === 401) {
          throw new Error('ElevenLabs authentication failed. Please check your API key configuration.');
        }
        
        // Check for quota exceeded error
        if (error.response?.data?.includes?.('credits remaining') || 
            error.response?.data?.includes?.('quota exceeded') ||
            error.response?.status === 402) {
          throw new Error('Audio generation quota exceeded. Please upgrade your ElevenLabs plan or try again later.');
        }
        
        skippedSegments++;
        
        // If this is an API rate limit error, add a longer delay before continuing
        if (error.response?.status === 429) {
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
        
        // Continue with other segments instead of failing completely
      }
    }
    
    
    // Validate we have some audio segments
    if (audioSegments.length === 0) {
      throw new Error('No audio segments were successfully generated - all segments failed or were skipped');
    }
    
    if (audioSegments.length < script.segments.length * 0.5) {
    }
    
    // Final validation of audio segments
    const validSegments = audioSegments.filter(seg => 
      seg.audioBuffer && 
      seg.audioBuffer.length > 0 && 
      seg.duration > 0
    );
    
    if (validSegments.length !== audioSegments.length) {
    }
    
    if (validSegments.length === 0) {
      throw new Error('No valid audio segments after validation - all segments have empty or invalid audio data');
    }
    
    return validSegments;
  }
  
  /**
   * Merge audio segments into final podcast using FFmpeg
   */
  private async mergeAudioSegments(
    segments: Array<{ speaker: string; audioBuffer: Buffer; duration: number; }>,
    jobId: string,
    userId: string
  ): Promise<string> {
    const tempDir = path.join(os.tmpdir(), `podcast-${jobId}`);
    const outputPath = path.join(tempDir, 'final-podcast.mp3');
    
    try {
      
      // Validate input segments
      if (!segments || segments.length === 0) {
        throw new Error('No audio segments provided for merging');
      }
      
      // Create temp directory with proper permissions
      if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true, mode: 0o755 });
      }
      
      // Save individual audio segments to temp files and validate
      const tempFiles: string[] = [];
      const listFilePath = path.join(tempDir, 'filelist.txt');
      const listFileContent: string[] = [];
      let validSegmentCount = 0;
      
      for (let i = 0; i < segments.length; i++) {
        const segment = segments[i];
        
        if (segment.speaker === 'pause') {
          // Skip pause segments for now to avoid FFmpeg lavfi issues
          continue;
        }
        
        // Validate segment has audio data
        if (!segment.audioBuffer || segment.audioBuffer.length === 0) {
          continue;
        }
        
        try {
          // Save audio segment with validation
          const segmentFile = path.join(tempDir, `segment-${validSegmentCount}.mp3`);
          fs.writeFileSync(segmentFile, segment.audioBuffer, { mode: 0o644 });
          
          // Verify file was written successfully
          if (!fs.existsSync(segmentFile)) {
            throw new Error(`Failed to write segment file: ${segmentFile}`);
          }
          
          const fileStats = fs.statSync(segmentFile);
          if (fileStats.size === 0) {
            throw new Error(`Written segment file is empty: ${segmentFile}`);
          }
          
          
          tempFiles.push(segmentFile);
          // Properly escape file paths for FFmpeg concat demuxer
          const escapedPath = segmentFile.replace(/\\/g, '\\\\').replace(/'/g, "'\\''");
          listFileContent.push(`file '${escapedPath}'`);
          validSegmentCount++;
        } catch (segmentError) {
          // Continue with other segments
        }
      }
      
      // Validate we have segments to process
      if (validSegmentCount === 0) {
        throw new Error('No valid audio segments found after filtering');
      }
      
      if (listFileContent.length === 0) {
        throw new Error('No files to concatenate - all segments were filtered out');
      }
      
      
      // Write list file for FFmpeg concat with validation
      const listFileData = listFileContent.join('\n') + '\n'; // Ensure newline at end
      fs.writeFileSync(listFilePath, listFileData, { encoding: 'utf8', mode: 0o644 });
      
      // Verify list file was written correctly
      if (!fs.existsSync(listFilePath)) {
        throw new Error(`Failed to create filelist: ${listFilePath}`);
      }
      
      const listFileStats = fs.statSync(listFilePath);
      if (listFileStats.size === 0) {
        throw new Error(`Filelist is empty: ${listFilePath}`);
      }
      
      
      // Validate all referenced files exist before calling FFmpeg
      for (const tempFile of tempFiles) {
        if (!fs.existsSync(tempFile)) {
          throw new Error(`Referenced audio file does not exist: ${tempFile}`);
        }
      }
      
      // Handle single file case (no concatenation needed)
      if (validSegmentCount === 1) {
        const singleFile = tempFiles[0];
        fs.copyFileSync(singleFile, outputPath);
      } else {
        // Merge audio files using FFmpeg with enhanced error handling
        await new Promise<void>((resolve, reject) => {
          const command = ffmpeg()
            .input(listFilePath)
            .inputOptions(['-f', 'concat', '-safe', '0'])
            .audioCodec('libmp3lame')
            .audioBitrate('128k')
            .audioFrequency(44100)
            .audioChannels(2)
            .output(outputPath)
            .on('start', (cmdline: string) => {
            })
            .on('progress', (progress: any) => {
              if (progress.percent) {
              }
            })
            .on('stderr', (stderrLine: string) => {
            })
            .on('end', () => {
              // Verify output file was created
              if (!fs.existsSync(outputPath)) {
                reject(new Error('FFmpeg completed but output file was not created'));
                return;
              }
              const outputStats = fs.statSync(outputPath);
              if (outputStats.size === 0) {
                reject(new Error('FFmpeg completed but output file is empty'));
                return;
              }
              resolve();
            })
            .on('error', (err: any) => {
              console.error('FFmpeg error details:', {
                message: err.message,
                stderr: err.stderr,
                code: err.code,
                signal: err.signal
              });
              
              // Enhanced error reporting
              let errorMessage = `Audio merging failed: ${err.message}`;
              if (err.stderr) {
                errorMessage += `\nFFmpeg stderr: ${err.stderr}`;
              }
              if (err.code) {
                errorMessage += `\nExit code: ${err.code}`;
              }
              
              reject(new Error(errorMessage));
            });
          
          try {
            command.run();
          } catch (runError) {
            reject(new Error(`Failed to start FFmpeg: ${runError.message}`));
          }
        });
      }
      
      // Upload merged file to Firebase Storage
      const bucket = admin.storage().bucket();
      const fileName = `users/${userId}/podcasts/${jobId}/career-podcast.mp3`;
      const file = bucket.file(fileName);
      
      const mergedAudioBuffer = fs.readFileSync(outputPath);
      await file.save(mergedAudioBuffer, {
        metadata: {
          contentType: 'audio/mpeg',
          metadata: {
            jobId,
            generatedAt: new Date().toISOString(),
            segmentCount: segments.length,
            totalDuration: segments.reduce((sum, s) => sum + s.duration, 0)
          }
        }
      });
      
      await file.makePublic();
      
      // Clean up temp files
      this.cleanupTempFiles([...tempFiles, listFilePath, outputPath]);
      
      // Check if we're in emulator environment
      const isEmulator = process.env.FUNCTIONS_EMULATOR === 'true';
      let audioUrl: string;
      
      if (isEmulator) {
        // Use emulator URL format
        audioUrl = `http://localhost:9199/v0/b/${bucket.name}/o/${encodeURIComponent(fileName)}?alt=media`;
      } else {
        // Use production URL format
        audioUrl = `https://storage.googleapis.com/${bucket.name}/${fileName}`;
      }
      
      return audioUrl;
      
    } catch (error: any) {
      console.error('Error merging audio segments:', {
        message: error.message,
        stack: error.stack,
        tempDir,
        segmentCount: segments?.length || 0
      });
      
      // Clean up temp files on error
      try {
        this.cleanupTempFiles([tempDir]);
      } catch (cleanupError) {
      }
      
      // Provide detailed error information
      let errorMessage = 'Failed to merge audio segments';
      if (error.message) {
        errorMessage += `: ${error.message}`;
      }
      
      throw new Error(errorMessage);
    }
  }
  
  /**
   * Generate silence file using FFmpeg
   * Note: Currently disabled due to lavfi compatibility issues
   * Pauses are handled by skipping silence generation for now
   */
  private async generateSilenceFile(durationMs: number, outputPath: string): Promise<void> {
    // This method is currently disabled to avoid FFmpeg lavfi issues
    // In production, silence could be handled by:
    // 1. Using crossfade between audio segments
    // 2. Adding brief delays in the concat process
    // 3. Using a different audio processing library
    // 4. Pre-generating silence files and concatenating them
    
    throw new Error('Silence generation temporarily disabled - use alternative pause handling');
  }
  
  /**
   * Clean up temporary files with enhanced error handling
   */
  private cleanupTempFiles(filePaths: string[]): void {
    
    let cleanedCount = 0;
    let errorCount = 0;
    
    filePaths.forEach(filePath => {
      try {
        if (!filePath || filePath.trim() === '') {
          return;
        }
        
        if (fs.existsSync(filePath)) {
          const stats = fs.lstatSync(filePath);
          
          if (stats.isDirectory()) {
            // Recursively remove directory and all contents
            fs.rmSync(filePath, { recursive: true, force: true });
          } else if (stats.isFile()) {
            // Remove individual file
            fs.unlinkSync(filePath);
          } else {
            return;
          }
          
          cleanedCount++;
        } else {
        }
      } catch (error: any) {
        console.error(`Failed to cleanup ${filePath}:`, {
          error: error.message,
          code: error.code,
          errno: error.errno
        });
        errorCount++;
      }
    });
    
  }
  
  /**
   * Generate template-based script as fallback
   */
  private generateTemplateScript(cv: ParsedCV, targetWords: number): ConversationalScript {
    const name = cv.personalInfo?.name || 'our guest';
    const role = cv.experience?.[0]?.position || 'professional';
    const company = cv.experience?.[0]?.company || 'their company';
    
    const segments: ConversationalScript['segments'] = [
      {
        speaker: 'host1',
        text: `Welcome to Career Conversations! I'm Sarah, and I'm here with my co-host Mike.`,
        emotion: 'excited'
      },
      {
        speaker: 'host2',
        text: `Hey everyone! Today we have a fascinating professional to discuss.`,
        emotion: 'excited'
      },
      {
        speaker: 'host1',
        text: `That's right! We're talking about ${name}, who is currently working as ${role} at ${company}. Their journey is really inspiring.`,
        emotion: 'thoughtful'
      },
      {
        speaker: 'host2',
        text: `What caught my attention immediately was their diverse skill set. They're proficient in ${this.getTechnicalSkills(cv.skills)?.slice(0, 3).join(', ') || 'multiple technologies'}.`,
        emotion: 'impressed'
      },
      {
        speaker: 'host1',
        text: `Absolutely! And if we look at their career progression, it's clear they've been consistently growing. They've worked at ${cv.experience?.length || 'several'} different organizations.`,
        emotion: 'thoughtful'
      },
      {
        speaker: 'host2',
        text: `You know what really stands out to me? ${cv.experience?.[0]?.achievements?.[0] || 'Their ability to drive meaningful results and make a real impact'}.`,
        emotion: 'impressed'
      },
      {
        speaker: 'host1',
        text: `That's such a great point! It shows real leadership and initiative. What do you think makes them particularly effective in their role?`,
        emotion: 'curious'
      },
      {
        speaker: 'host2',
        text: `I think it's the combination of technical expertise and soft skills. They clearly understand not just the how but also the why behind their work.`,
        emotion: 'thoughtful'
      },
      {
        speaker: 'host1',
        text: `Definitely. For our listeners who might be in similar fields, what key takeaways do you see from this career journey?`,
        emotion: 'thoughtful'
      },
      {
        speaker: 'host2',
        text: `Great question! I'd say continuous learning is key. Look at their skill progression - they've stayed current with industry trends while building on their core expertise.`,
        emotion: 'thoughtful'
      },
      {
        speaker: 'host1',
        text: `That's excellent advice. Well, that wraps up today's Career Conversation. Thanks for joining us!`,
        emotion: 'excited'
      },
      {
        speaker: 'host2',
        text: `Thanks everyone! Remember, every career journey is unique, but there's always something to learn from others' experiences. Until next time!`,
        emotion: 'excited'
      }
    ];
    
    const totalDuration = segments.length * 5000; // 5 seconds per segment average
    
    return { segments, totalDuration };
  }
  
  /**
   * Generate chapters from script
   */
  private generateChapters(script: ConversationalScript): Array<{ title: string; startTime: number; endTime: number; }> {
    const chapters = [
      { title: 'Introduction', startTime: 0, endTime: 30 },
      { title: 'Career Overview', startTime: 30, endTime: 90 },
      { title: 'Skills & Expertise', startTime: 90, endTime: 150 },
      { title: 'Key Achievements', startTime: 150, endTime: 210 },
      { title: 'Career Insights', startTime: 210, endTime: 270 },
      { title: 'Closing Thoughts', startTime: 270, endTime: 300 }
    ];
    
    return chapters;
  }
  
  /**
   * Format script as readable transcript
   */
  private formatTranscript(script: ConversationalScript): string {
    const lines = script.segments.map(segment => {
      const speaker = segment.speaker === 'host1' ? 'Sarah' : 'Mike';
      return `${speaker}: ${segment.text}`;
    });
    
    return lines.join('\n\n');
  }
  
  /**
   * Estimate audio duration from text with validation
   */
  private estimateAudioDuration(text: string): number {
    if (!text || text.trim() === '') {
      return 1000; // 1 second minimum for empty text
    }
    
    const words = text.trim().split(/\s+/).length;
    const wordsPerSecond = 2.5; // Average speaking rate
    const baseDuration = (words / wordsPerSecond) * 1000; // milliseconds
    
    // Add minimum duration and account for pauses
    const minDuration = 1000; // 1 second minimum
    const maxDuration = 60000; // 60 seconds maximum for safety
    
    let finalDuration = Math.max(baseDuration, minDuration);
    finalDuration = Math.min(finalDuration, maxDuration);
    
    return Math.round(finalDuration);
  }
  
  /**
   * Generate silence buffer
   */
  private generateSilence(duration: number): Buffer {
    // Generate silent MP3 data
    // In production, use proper audio library
    return Buffer.alloc(duration * 16); // Simplified
  }
  
  /**
   * Get voice settings optimized for emotion and speaker
   */
  private getVoiceSettingsForEmotion(emotion: string, speaker: string) {
    const baseSettings = {
      stability: speaker === 'host1' ? 0.6 : 0.5, // Sarah (host1) slightly more stable
      similarity_boost: 0.8,
      use_speaker_boost: true
    };
    
    switch (emotion) {
      case 'excited':
        return {
          ...baseSettings,
          stability: baseSettings.stability - 0.1, // More expressive
          similarity_boost: 0.9,
          style: 0.8,
          use_speaker_boost: true
        };
      case 'curious':
        return {
          ...baseSettings,
          stability: baseSettings.stability + 0.1, // More controlled
          similarity_boost: 0.75,
          style: 0.4,
          use_speaker_boost: true
        };
      case 'impressed':
        return {
          ...baseSettings,
          stability: baseSettings.stability,
          similarity_boost: 0.85,
          style: 0.6,
          use_speaker_boost: true
        };
      case 'thoughtful':
      default:
        return {
          ...baseSettings,
          stability: baseSettings.stability + 0.05,
          similarity_boost: 0.75,
          style: 0.3,
          use_speaker_boost: true
        };
    }
  }
  
  /**
   * Calculate total duration
   */
  private calculateDuration(segments: Array<{ duration: number }>): string {
    const totalMs = segments.reduce((sum, seg) => sum + seg.duration, 0);
    const totalSeconds = Math.floor(totalMs / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  }
}

// Lazy initialization to prevent runtime errors during module loading
let _podcastGenerationService: PodcastGenerationService | null = null;

export function getPodcastGenerationService(): PodcastGenerationService {
  if (!_podcastGenerationService) {
    _podcastGenerationService = new PodcastGenerationService();
  }
  return _podcastGenerationService;
}

// For backward compatibility
export const podcastGenerationService = {
  generatePodcast: (parsedCV: any, jobId: string, userId: string, options: any = {}) => 
    getPodcastGenerationService().generatePodcast(parsedCV, jobId, userId, options)
};