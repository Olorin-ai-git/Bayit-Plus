// @ts-ignore - Export conflicts/**
 * Validation Service
 * 
 * Comprehensive input validation and security scanning for multimedia content
 * including file signature verification, malware scanning, and content analysis.
 */

import { ValidationConfig, SecurityThreat, ValidationResult } from '../../types';
import { Logger } from '../utils/Logger';

export class ValidationService {
  private readonly logger: Logger;
  private readonly config: ValidationConfig;

  // File signatures for common multimedia formats
  private readonly FILE_SIGNATURES: Record<string, Buffer[]> = {
    // Image formats
    'image/jpeg': [
      Buffer.from([0xFF, 0xD8, 0xFF]),
    ],
    'image/png': [
      Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]),
    ],
    'image/gif': [
      Buffer.from('GIF87a'),
      Buffer.from('GIF89a'),
    ],
    'image/webp': [
      Buffer.from('RIFF'), // RIFF header, followed by WEBP at offset 8
    ],
    'image/bmp': [
      Buffer.from([0x42, 0x4D]),
    ],
    
    // Video formats
    'video/mp4': [
      Buffer.from('ftyp'), // At offset 4
    ],
    'video/webm': [
      Buffer.from([0x1A, 0x45, 0xDF, 0xA3]),
    ],
    'video/avi': [
      Buffer.from('RIFF'), // RIFF header, followed by AVI at offset 8
    ],
    
    // Audio formats
    'audio/mp3': [
      Buffer.from([0xFF, 0xFB]), // MP3 frame header
      Buffer.from([0xFF, 0xFA]), // MP3 frame header
      Buffer.from('ID3'), // ID3 tag
    ],
    'audio/wav': [
      Buffer.from('RIFF'), // RIFF header, followed by WAVE at offset 8
    ],
    'audio/ogg': [
      Buffer.from('OggS'),
    ],
    'audio/flac': [
      Buffer.from('fLaC'),
    ],
  };

  // Malicious patterns and known threats
  private readonly MALICIOUS_PATTERNS: Array<{ pattern: Buffer; threat: SecurityThreat }> = [
    // Common virus signatures (simplified examples)
    { pattern: Buffer.from('X5O!P%@AP[4\\PZX54(P^)7CC)7}$EICAR'), threat: 'eicar_test' },
    // JavaScript in image metadata
    { pattern: Buffer.from('<script'), threat: 'embedded_script' },
    { pattern: Buffer.from('javascript:'), threat: 'javascript_url' },
    // Suspicious executable patterns
    { pattern: Buffer.from('MZ'), threat: 'executable_header' },
    // PHP code injection
    { pattern: Buffer.from('<?php'), threat: 'php_injection' },
  ];

  constructor(config: ValidationConfig) {
    this.config = config;
    this.logger = new Logger('ValidationService');
  }

  /**
   * Validate file signature against expected format
   */
  public async validateFileSignature(
    input: File | Buffer | string
  ): Promise<ValidationResult> {
    try {
      const buffer = await this.getFileBuffer(input);
      const detectedFormat = this.detectFileFormat(buffer);
      
      if (input instanceof File) {
        const expectedFormat = input.type;
        if (expectedFormat && detectedFormat !== expectedFormat) {
          return {
            valid: false,
            reason: 'File signature mismatch',
            details: {
              expected: expectedFormat,
              detected: detectedFormat
            }
          };
        }
      }

      return {
        valid: true,
        detectedFormat
      };

    } catch (error) {
      return {
        valid: false,
        reason: `Signature validation failed: ${(error as Error).message}`
      };
    }
  }

  /**
   * Scan for malware and malicious content
   */
  public async scanForMalware(
    input: File | Buffer | string
  ): Promise<ValidationResult> {
    try {
      const buffer = await this.getFileBuffer(input);
      const threats = await this.detectThreats(buffer);

      if (threats.length > 0) {
        return {
          valid: false,
          reason: 'Malicious content detected',
          threats,
          details: {
            threatCount: threats.length,
            highestSeverity: Math.max(...threats.map(t => t.severity || 1))
          }
        };
      }

      return {
        valid: true,
        message: 'No threats detected'
      };

    } catch (error) {
      return {
        valid: false,
        reason: `Malware scan failed: ${(error as Error).message}`
      };
    }
  }

  /**
   * Validate content structure and metadata
   */
  public async validateContent(
    input: File | Buffer | string
  ): Promise<ValidationResult> {
    try {
      const buffer = await this.getFileBuffer(input);
      const format = this.detectFileFormat(buffer);

      // Format-specific validation
      switch (format) {
        case 'image/jpeg':
          return this.validateJpegStructure(buffer);
        case 'image/png':
          return this.validatePngStructure(buffer);
        case 'image/gif':
          return this.validateGifStructure(buffer);
        default:
          return this.validateGenericStructure(buffer);
      }

    } catch (error) {
      return {
        valid: false,
        reason: `Content validation failed: ${(error as Error).message}`
      };
    }
  }

  /**
   * Comprehensive validation combining all checks
   */
  public async validateFile(
    input: File | Buffer | string,
    options: {
      checkSignature?: boolean;
      scanMalware?: boolean;
      validateContent?: boolean;
      maxFileSize?: number;
    } = {}
  ): Promise<ValidationResult> {
    const results: ValidationResult[] = [];

    try {
      // File size check
      if (options.maxFileSize) {
        const size = await this.getFileSize(input);
        if (size > options.maxFileSize) {
          return {
            valid: false,
            reason: `File size ${size} exceeds maximum ${options.maxFileSize}`
          };
        }
      }

      // File signature validation
      if (options.checkSignature !== false) {
        const signatureResult = await this.validateFileSignature(input);
        results.push(signatureResult);
        
        if (!signatureResult.valid) {
          return signatureResult;
        }
      }

      // Malware scanning
      if (options.scanMalware !== false && this.config.enableMalwareScanning) {
        const malwareResult = await this.scanForMalware(input);
        results.push(malwareResult);
        
        if (!malwareResult.valid) {
          return malwareResult;
        }
      }

      // Content validation
      if (options.validateContent !== false) {
        const contentResult = await this.validateContent(input);
        results.push(contentResult);
        
        if (!contentResult.valid) {
          return contentResult;
        }
      }

      return {
        valid: true,
        message: 'All validation checks passed',
        details: {
          checksPerformed: results.length,
          allPassed: true
        }
      };

    } catch (error) {
      return {
        valid: false,
        reason: `Validation failed: ${(error as Error).message}`
      };
    }
  }

  /**
   * Detect file format from buffer content
   */
  private detectFileFormat(buffer: Buffer): string {
    for (const [format, signatures] of Object.entries(this.FILE_SIGNATURES)) {
      for (const signature of signatures) {
        if (this.matchesSignature(buffer, signature, format)) {
          return format;
        }
      }
    }

    return 'unknown';
  }

  /**
   * Check if buffer matches file signature
   */
  private matchesSignature(buffer: Buffer, signature: Buffer, format: string): boolean {
    // Special handling for formats with offset signatures
    if (format === 'video/mp4' && signature.equals(Buffer.from('ftyp'))) {
      return buffer.subarray(4, 8).equals(signature);
    }
    
    if (format === 'image/webp' && signature.equals(Buffer.from('RIFF'))) {
      return buffer.subarray(0, 4).equals(signature) && 
             buffer.subarray(8, 12).equals(Buffer.from('WEBP'));
    }

    if (format === 'video/avi' && signature.equals(Buffer.from('RIFF'))) {
      return buffer.subarray(0, 4).equals(signature) && 
             buffer.subarray(8, 11).equals(Buffer.from('AVI'));
    }

    if (format === 'audio/wav' && signature.equals(Buffer.from('RIFF'))) {
      return buffer.subarray(0, 4).equals(signature) && 
             buffer.subarray(8, 12).equals(Buffer.from('WAVE'));
    }

    // Default signature matching
    return buffer.subarray(0, signature.length).equals(signature);
  }

  /**
   * Detect security threats in buffer
   */
  private async detectThreats(buffer: Buffer): Promise<SecurityThreat[]> {
    const threats: SecurityThreat[] = [];

    for (const { pattern, threat } of this.MALICIOUS_PATTERNS) {
      if (buffer.includes(pattern)) {
        threats.push({
          type: threat,
          severity: this.getThreatSeverity(threat),
          description: this.getThreatDescription(threat),
          location: buffer.indexOf(pattern)
        });
      }
    }

    // Additional heuristic checks
    const heuristicThreats = await this.performHeuristicAnalysis(buffer);
    threats.push(...heuristicThreats);

    return threats;
  }

  /**
   * Perform heuristic analysis for suspicious patterns
   */
  private async performHeuristicAnalysis(buffer: Buffer): Promise<SecurityThreat[]> {
    const threats: SecurityThreat[] = [];

    // Check for suspicious entropy (encrypted/compressed data in unusual places)
    const entropy = this.calculateEntropy(buffer);
    if (entropy > 7.5) {
      threats.push({
        type: 'high_entropy',
        severity: 2,
        description: 'File contains high entropy data, possibly encrypted or compressed',
        metadata: { entropy }
      });
    }

    // Check for unusual metadata patterns
    const hasLargeMetadata = this.hasUnusualMetadata(buffer);
    if (hasLargeMetadata) {
      threats.push({
        type: 'unusual_metadata',
        severity: 1,
        description: 'File contains unusually large metadata sections'
      });
    }

    return threats;
  }

  /**
   * Validate JPEG file structure
   */
  private validateJpegStructure(buffer: Buffer): ValidationResult {
    // JPEG should start with 0xFFD8 and end with 0xFFD9
    if (!buffer.subarray(0, 2).equals(Buffer.from([0xFF, 0xD8]))) {
      return {
        valid: false,
        reason: 'Invalid JPEG header'
      };
    }

    if (!buffer.subarray(-2).equals(Buffer.from([0xFF, 0xD9]))) {
      return {
        valid: false,
        reason: 'Invalid JPEG footer'
      };
    }

    return { valid: true };
  }

  /**
   * Validate PNG file structure
   */
  private validatePngStructure(buffer: Buffer): ValidationResult {
    // PNG signature: 89 50 4E 47 0D 0A 1A 0A
    const pngSignature = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]);
    
    if (!buffer.subarray(0, 8).equals(pngSignature)) {
      return {
        valid: false,
        reason: 'Invalid PNG signature'
      };
    }

    // Check for IHDR chunk (should be first chunk)
    if (!buffer.subarray(12, 16).equals(Buffer.from('IHDR'))) {
      return {
        valid: false,
        reason: 'Missing PNG IHDR chunk'
      };
    }

    return { valid: true };
  }

  /**
   * Validate GIF file structure
   */
  private validateGifStructure(buffer: Buffer): ValidationResult {
    const gif87a = Buffer.from('GIF87a');
    const gif89a = Buffer.from('GIF89a');

    if (!buffer.subarray(0, 6).equals(gif87a) && !buffer.subarray(0, 6).equals(gif89a)) {
      return {
        valid: false,
        reason: 'Invalid GIF header'
      };
    }

    return { valid: true };
  }

  /**
   * Generic structure validation
   */
  private validateGenericStructure(buffer: Buffer): ValidationResult {
    // Basic checks for file integrity
    if (buffer.length === 0) {
      return {
        valid: false,
        reason: 'Empty file'
      };
    }

    if (buffer.length < 10) {
      return {
        valid: false,
        reason: 'File too small to be valid media'
      };
    }

    return { valid: true };
  }

  /**
   * Calculate entropy of buffer (measure of randomness)
   */
  private calculateEntropy(buffer: Buffer): number {
    const frequencies: number[] = new Array(256).fill(0);
    
    for (let i = 0; i < buffer.length; i++) {
      frequencies[buffer[i]]++;
    }

    let entropy = 0;
    const length = buffer.length;

    for (const freq of frequencies) {
      if (freq > 0) {
        const probability = freq / length;
        entropy -= probability * Math.log2(probability);
      }
    }

    return entropy;
  }

  /**
   * Check for unusual metadata patterns
   */
  private hasUnusualMetadata(buffer: Buffer): boolean {
    // Look for EXIF data that's unusually large
    const exifMarker = buffer.indexOf(Buffer.from('Exif'));
    if (exifMarker > -1 && exifMarker > buffer.length * 0.1) {
      return true;
    }

    return false;
  }

  /**
   * Get threat severity level
   */
  private getThreatSeverity(threat: SecurityThreat['type']): number {
    switch (threat) {
      case 'eicar_test':
        return 1; // Test signature, low severity
      case 'embedded_script':
      case 'javascript_url':
      case 'php_injection':
        return 3; // High severity
      case 'executable_header':
        return 4; // Very high severity
      case 'high_entropy':
      case 'unusual_metadata':
        return 2; // Medium severity
      default:
        return 1;
    }
  }

  /**
   * Get threat description
   */
  private getThreatDescription(threat: SecurityThreat['type']): string {
    switch (threat) {
      case 'eicar_test':
        return 'EICAR antivirus test signature detected';
      case 'embedded_script':
        return 'Embedded script code detected in file metadata';
      case 'javascript_url':
        return 'JavaScript URL detected in file content';
      case 'php_injection':
        return 'PHP code injection attempt detected';
      case 'executable_header':
        return 'Executable file header detected in media file';
      case 'high_entropy':
        return 'High entropy data suggests encrypted or compressed content';
      case 'unusual_metadata':
        return 'Unusually large metadata sections detected';
      default:
        return 'Unknown security threat detected';
    }
  }

  /**
   * Get file buffer from various input types
   */
  private async getFileBuffer(input: File | Buffer | string): Promise<Buffer> {
    if (Buffer.isBuffer(input)) {
      return input;
    }

    if (input instanceof File) {
      return Buffer.from(await input.arrayBuffer());
    }

    if (typeof input === 'string' && input.startsWith('data:')) {
      const base64Data = input.split(',')[1];
      return Buffer.from(base64Data, 'base64');
    }

    throw new Error('Invalid input type for validation');
  }

  /**
   * Get file size from various input types
   */
  private async getFileSize(input: File | Buffer | string): Promise<number> {
    if (Buffer.isBuffer(input)) {
      return input.length;
    }

    if (input instanceof File) {
      return input.size;
    }

    if (typeof input === 'string' && input.startsWith('data:')) {
      return Math.floor(input.length * 0.75); // Estimate base64 decoded size
    }

    throw new Error('Cannot determine file size for input type');
  }
}