// @ts-ignore - Export conflicts/**
 * Video processing type definitions for CVPlus multimedia module
 */

import { 
  MediaFile, 
  ProcessedMedia, 
  QualityLevel,
  VideoFormat,
  ImageFormat 
} from './media.types';

// ============================================================================
// VIDEO PROCESSING OPTIONS
// ============================================================================

export interface VideoProcessingOptions {
  /** Target width in pixels */
  width?: number;
  
  /** Target height in pixels */
  height?: number;
  
  /** Video bitrate in bits per second */
  bitrate?: number;
  
  /** Output format */
  format?: VideoFormat;
  
  /** Video codec */
  codec?: VideoCodec;
  
  /** Audio codec */
  audioCodec?: AudioCodec;
  
  /** Quality level */
  quality?: QualityLevel;
  
  /** Frame rate (fps) */
  frameRate?: number;
  
  /** Audio bitrate */
  audioBitrate?: number;
  
  /** Video profile */
  profile?: VideoProfile;
  
  /** Preset for encoding speed vs quality */
  preset?: EncodingPreset;
  
  /** Start time for trimming (seconds) */
  startTime?: number;
  
  /** End time for trimming (seconds) */
  endTime?: number;
  
  /** Duration for trimming (seconds) */
  duration?: number;
  
  /** Enable two-pass encoding */
  twoPass?: boolean;
  
  /** Generate thumbnails */
  generateThumbnails?: boolean;
  
  /** Thumbnail options */
  thumbnailOptions?: ThumbnailGenerationOptions;
  
  /** Video filters to apply */
  filters?: VideoFilter[];
  
  /** Aspect ratio handling */
  aspectRatio?: AspectRatioHandling;
  
  /** Audio processing options */
  audioProcessing?: VideoAudioProcessingOptions;
}

export type VideoCodec = 'h264' | 'h265' | 'vp8' | 'vp9' | 'av1' | 'xvid' | 'mpeg4';
export type AudioCodec = 'aac' | 'mp3' | 'opus' | 'vorbis' | 'ac3' | 'flac';
export type VideoProfile = 'baseline' | 'main' | 'high' | 'high10' | 'high422' | 'high444';
export type EncodingPreset = 'ultrafast' | 'superfast' | 'veryfast' | 'faster' | 'fast' | 'medium' | 'slow' | 'slower' | 'veryslow';

export interface AspectRatioHandling {
  /** How to handle aspect ratio changes */
  mode: 'stretch' | 'crop' | 'pad' | 'maintain';
  
  /** Padding color for 'pad' mode */
  paddingColor?: string;
  
  /** Crop position for 'crop' mode */
  cropPosition?: CropPosition;
}

export type CropPosition = 'center' | 'top' | 'bottom' | 'left' | 'right' | 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';

// ============================================================================
// THUMBNAIL GENERATION
// ============================================================================

export interface ThumbnailGenerationOptions {
  /** Number of thumbnails to generate */
  count?: number;
  
  /** Specific timestamps (seconds) */
  timestamps?: number[];
  
  /** Thumbnail width */
  width?: number;
  
  /** Thumbnail height */
  height?: number;
  
  /** Thumbnail format */
  format?: ImageFormat;
  
  /** Thumbnail quality */
  quality?: number;
  
  /** Generate thumbnail grid/sprite */
  generateSprite?: boolean;
  
  /** Sprite options */
  spriteOptions?: SpriteOptions;
}

export interface SpriteOptions {
  /** Number of columns in sprite */
  columns: number;
  
  /** Number of rows in sprite */
  rows: number;
  
  /** Spacing between thumbnails */
  spacing?: number;
  
  /** Sprite background color */
  backgroundColor?: string;
}

// ============================================================================
// VIDEO FILTERS
// ============================================================================

export interface VideoFilter {
  /** Filter type */
  type: VideoFilterType;
  
  /** Filter parameters */
  parameters: Record<string, unknown>;
  
  /** Filter application order */
  order?: number;
}

export type VideoFilterType = 
  | 'brightness' | 'contrast' | 'saturation' | 'hue'
  | 'blur' | 'sharpen' | 'noise_reduction' | 'deinterlace'
  | 'scale' | 'crop' | 'rotate' | 'flip'
  | 'fade_in' | 'fade_out' | 'watermark'
  | 'color_correction' | 'stabilization' | 'custom';

export interface BrightnessFilter extends VideoFilter {
  type: 'brightness';
  parameters: {
    /** Brightness adjustment (-1.0 to 1.0) */
    value: number;
  };
}

export interface ContrastFilter extends VideoFilter {
  type: 'contrast';
  parameters: {
    /** Contrast adjustment (0.0 to 2.0) */
    value: number;
  };
}

export interface WatermarkFilter extends VideoFilter {
  type: 'watermark';
  parameters: {
    /** Watermark image path or text */
    source: string;
    /** Position on video */
    position: WatermarkPosition;
    /** Opacity (0.0 to 1.0) */
    opacity: number;
    /** Scale factor */
    scale?: number;
  };
}

export type WatermarkPosition = 
  | 'top-left' | 'top-center' | 'top-right'
  | 'middle-left' | 'middle-center' | 'middle-right'
  | 'bottom-left' | 'bottom-center' | 'bottom-right';

// ============================================================================
// AUDIO PROCESSING FOR VIDEO
// ============================================================================

export interface VideoAudioProcessingOptions {
  /** Enable audio processing */
  enabled: boolean;
  
  /** Audio normalization */
  normalize?: boolean;
  
  /** Noise reduction */
  noiseReduction?: boolean;
  
  /** Audio enhancement */
  enhance?: boolean;
  
  /** Volume adjustment (0.0 to 2.0) */
  volume?: number;
  
  /** Audio fade in duration (seconds) */
  fadeIn?: number;
  
  /** Audio fade out duration (seconds) */
  fadeOut?: number;
  
  /** Remove audio track */
  removeAudio?: boolean;
  
  /** Replace audio track */
  replaceAudio?: MediaFile;
  
  /** Audio synchronization adjustment (milliseconds) */
  syncAdjustment?: number;
}

// ============================================================================
// VIDEO METADATA
// ============================================================================

export interface VideoMetadata {
  /** Video width in pixels */
  width: number;
  
  /** Video height in pixels */
  height: number;
  
  /** Duration in seconds */
  duration: number;
  
  /** Frame rate */
  frameRate: number;
  
  /** Total frame count */
  frameCount: number;
  
  /** Video bitrate */
  bitrate: number;
  
  /** Video codec information */
  videoCodec: CodecInfo;
  
  /** Audio codec information */
  audioCodec?: CodecInfo;
  
  /** Audio sample rate */
  audioSampleRate?: number;
  
  /** Audio channels */
  audioChannels?: number;
  
  /** Audio bitrate */
  audioBitrate?: number;
  
  /** Container format */
  container: string;
  
  /** Video streams */
  videoStreams: VideoStreamInfo[];
  
  /** Audio streams */
  audioStreams: AudioStreamInfo[];
  
  /** Subtitle streams */
  subtitleStreams?: SubtitleStreamInfo[];
  
  /** Video creation date */
  creationDate?: Date;
  
  /** Video title */
  title?: string;
  
  /** Video description */
  description?: string;
  
  /** Video tags */
  tags?: string[];
  
  /** GPS location data */
  location?: GPSLocation;
  
  /** Camera/device information */
  deviceInfo?: DeviceInfo;
}

export interface CodecInfo {
  /** Codec name */
  name: string;
  
  /** Long name */
  longName: string;
  
  /** Profile */
  profile?: string;
  
  /** Level */
  level?: string;
  
  /** Pixel format */
  pixelFormat?: string;
  
  /** Color space */
  colorSpace?: string;
  
  /** Color range */
  colorRange?: string;
}

export interface VideoStreamInfo {
  /** Stream index */
  index: number;
  
  /** Stream type */
  type: 'video';
  
  /** Codec information */
  codec: CodecInfo;
  
  /** Stream duration */
  duration: number;
  
  /** Stream bitrate */
  bitrate: number;
  
  /** Language */
  language?: string;
  
  /** Stream title */
  title?: string;
}

export interface AudioStreamInfo {
  /** Stream index */
  index: number;
  
  /** Stream type */
  type: 'audio';
  
  /** Codec information */
  codec: CodecInfo;
  
  /** Sample rate */
  sampleRate: number;
  
  /** Channel count */
  channels: number;
  
  /** Channel layout */
  channelLayout: string;
  
  /** Stream duration */
  duration: number;
  
  /** Stream bitrate */
  bitrate: number;
  
  /** Language */
  language?: string;
  
  /** Stream title */
  title?: string;
}

export interface SubtitleStreamInfo {
  /** Stream index */
  index: number;
  
  /** Stream type */
  type: 'subtitle';
  
  /** Subtitle format */
  format: string;
  
  /** Language */
  language?: string;
  
  /** Stream title */
  title?: string;
  
  /** Is forced subtitle */
  forced?: boolean;
  
  /** Is default subtitle */
  default?: boolean;
}

export interface GPSLocation {
  /** Latitude */
  latitude: number;
  
  /** Longitude */
  longitude: number;
  
  /** Altitude */
  altitude?: number;
  
  /** Location name */
  name?: string;
}

export interface DeviceInfo {
  /** Device make */
  make?: string;
  
  /** Device model */
  model?: string;
  
  /** Software version */
  softwareVersion?: string;
  
  /** Recording settings */
  recordingSettings?: RecordingSettings;
}

export interface RecordingSettings {
  /** ISO sensitivity */
  iso?: number;
  
  /** Exposure time */
  exposureTime?: string;
  
  /** F-number */
  fNumber?: number;
  
  /** White balance */
  whiteBalance?: string;
  
  /** Focus mode */
  focusMode?: string;
}

// ============================================================================
// PROCESSED VIDEO RESULTS
// ============================================================================

export interface ProcessedVideo extends ProcessedMedia<VideoProcessingOptions> {
  /** Video-specific metadata */
  videoMetadata: VideoMetadata;
  
  /** Generated thumbnails */
  thumbnails: VideoThumbnail[];
  
  /** Video preview/poster */
  poster?: VideoThumbnail;
  
  /** Streaming versions */
  streamingVersions?: StreamingVersion[];
  
  /** Quality assessment specific to video */
  videoQuality?: VideoQualityAssessment;
  
  /** Processing statistics */
  processingStats: VideoProcessingStats;
}

export interface VideoThumbnail {
  /** Timestamp in video (seconds) */
  timestamp: number;
  
  /** Thumbnail width */
  width: number;
  
  /** Thumbnail height */
  height: number;
  
  /** Thumbnail file */
  file: MediaFile;
  
  /** Thumbnail URL */
  url: string;
  
  /** Thumbnail format */
  format: ImageFormat;
  
  /** Is poster frame */
  isPoster?: boolean;
}

export interface StreamingVersion {
  /** Quality identifier */
  quality: QualityLevel;
  
  /** Video file */
  file: MediaFile;
  
  /** Stream URL */
  url: string;
  
  /** Bitrate */
  bitrate: number;
  
  /** Resolution */
  resolution: Resolution;
  
  /** Streaming protocol support */
  protocols: StreamingProtocol[];
}

export interface Resolution {
  /** Width in pixels */
  width: number;
  
  /** Height in pixels */
  height: number;
  
  /** Display name (e.g., "720p", "1080p") */
  name: string;
}

export type StreamingProtocol = 'hls' | 'dash' | 'smooth' | 'progressive';

export interface VideoQualityAssessment {
  /** Overall video quality (0-100) */
  overall: number;
  
  /** Visual quality score */
  visual: number;
  
  /** Audio quality score */
  audio?: number;
  
  /** Compression efficiency */
  compressionEfficiency: number;
  
  /** Motion handling quality */
  motionHandling: number;
  
  /** Color reproduction quality */
  colorReproduction: number;
  
  /** Noise level */
  noiseLevel: number;
  
  /** Artifacts level */
  artifacts: number;
}

export interface VideoProcessingStats {
  /** Frames processed per second */
  processingFps: number;
  
  /** Peak memory usage */
  peakMemoryUsage: number;
  
  /** CPU usage percentage */
  cpuUsage: number;
  
  /** Processing efficiency score */
  efficiency: number;
  
  /** Error count during processing */
  errorCount: number;
  
  /** Warning count during processing */
  warningCount: number;
}

// ============================================================================
// STREAMING AND ADAPTIVE BITRATE
// ============================================================================

export interface AdaptiveBitrateOptions {
  /** Generate multiple quality levels */
  generateMultipleQualities: boolean;
  
  /** Quality levels to generate */
  qualityLevels: AdaptiveQualityLevel[];
  
  /** Streaming protocol */
  protocol: StreamingProtocol;
  
  /** Segment duration for streaming */
  segmentDuration?: number;
  
  /** Generate manifests */
  generateManifests?: boolean;
  
  /** Encryption options */
  encryption?: EncryptionOptions;
}

export interface AdaptiveQualityLevel {
  /** Quality name */
  name: string;
  
  /** Video bitrate */
  videoBitrate: number;
  
  /** Audio bitrate */
  audioBitrate: number;
  
  /** Resolution */
  resolution: Resolution;
  
  /** Frame rate */
  frameRate: number;
  
  /** Target file size (optional) */
  targetSize?: number;
}

export interface EncryptionOptions {
  /** Enable encryption */
  enabled: boolean;
  
  /** Encryption method */
  method: 'AES-128' | 'AES-256';
  
  /** Key rotation interval */
  keyRotationInterval?: number;
  
  /** DRM system */
  drm?: DRMSystem;
}

export type DRMSystem = 'widevine' | 'playready' | 'fairplay' | 'custom';

// ============================================================================
// ADDITIONAL REQUIRED EXPORTS FOR COMPATIBILITY
// ============================================================================

// Video transcoding specific options
export interface VideoTranscodingOptions extends VideoProcessingOptions {
  /** Transcoding mode */
  mode?: 'fast' | 'balanced' | 'quality';
  
  /** Multi-pass encoding */
  multiPass?: boolean;
  
  /** Hardware acceleration */
  hardwareAcceleration?: boolean;
  
  /** Transcoding preset */
  transcodingPreset?: TranscodingPreset;
  
  /** Output container */
  container?: VideoContainer;
}

export type TranscodingPreset = 'web' | 'mobile' | 'broadcast' | 'archive' | 'streaming';
export type VideoContainer = 'mp4' | 'webm' | 'avi' | 'mov' | 'mkv' | 'flv';

// Video analysis results
export interface VideoAnalysisResult {
  /** Analysis success */
  success: boolean;
  
  /** Video metadata */
  metadata: VideoMetadata;
  
  /** Quality assessment */
  quality: VideoQualityAssessment;
  
  /** Technical analysis */
  technical: TechnicalAnalysis;
  
  /** Content analysis */
  content?: ContentAnalysis;
  
  /** Recommendations */
  recommendations: ProcessingRecommendation[];
}

export interface TechnicalAnalysis {
  /** Has video stream */
  hasVideo: boolean;
  
  /** Has audio stream */
  hasAudio: boolean;
  
  /** Is valid format */
  isValidFormat: boolean;
  
  /** Codec compatibility */
  codecCompatibility: CodecCompatibility;
  
  /** File integrity */
  integrity: FileIntegrity;
}

export interface CodecCompatibility {
  /** Web compatibility score (0-100) */
  webCompatibility: number;
  
  /** Mobile compatibility score (0-100) */
  mobileCompatibility: number;
  
  /** Supported browsers */
  supportedBrowsers: string[];
  
  /** Recommended formats */
  recommendedFormats: VideoFormat[];
}

export interface FileIntegrity {
  /** File is complete */
  isComplete: boolean;
  
  /** File is corrupted */
  isCorrupted: boolean;
  
  /** Missing data ranges */
  missingRanges: TimeRange[];
  
  /** Integrity score (0-100) */
  score: number;
}

export interface TimeRange {
  /** Start time in seconds */
  start: number;
  
  /** End time in seconds */
  end: number;
}

export interface ContentAnalysis {
  /** Scene detection results */
  scenes: SceneInfo[];
  
  /** Motion analysis */
  motion: MotionAnalysis;
  
  /** Color analysis */
  color: ColorAnalysis;
  
  /** Audio analysis */
  audio?: AudioAnalysisInfo;
}

export interface SceneInfo {
  /** Scene start time */
  startTime: number;
  
  /** Scene end time */
  endTime: number;
  
  /** Scene confidence score */
  confidence: number;
  
  /** Scene thumbnail */
  thumbnail?: VideoThumbnail;
}

export interface MotionAnalysis {
  /** Average motion level (0-100) */
  averageMotion: number;
  
  /** Motion intensity over time */
  motionTimeline: MotionPoint[];
  
  /** Static regions */
  staticRegions: TimeRange[];
  
  /** High motion regions */
  highMotionRegions: TimeRange[];
}

export interface MotionPoint {
  /** Timestamp */
  timestamp: number;
  
  /** Motion intensity (0-100) */
  intensity: number;
}

export interface ColorAnalysis {
  /** Dominant colors */
  dominantColors: string[];
  
  /** Color histogram */
  histogram: ColorHistogram;
  
  /** Brightness distribution */
  brightness: BrightnessDistribution;
  
  /** Contrast level (0-100) */
  contrast: number;
}

export interface ColorHistogram {
  /** Red channel histogram */
  red: number[];
  
  /** Green channel histogram */
  green: number[];
  
  /** Blue channel histogram */
  blue: number[];
}

export interface BrightnessDistribution {
  /** Average brightness (0-100) */
  average: number;
  
  /** Brightness histogram */
  histogram: number[];
  
  /** Dark regions percentage */
  darkRegions: number;
  
  /** Bright regions percentage */
  brightRegions: number;
}

export interface AudioAnalysisInfo {
  /** Average volume level */
  averageVolume: number;
  
  /** Peak volume level */
  peakVolume: number;
  
  /** Silent regions */
  silentRegions: TimeRange[];
  
  /** Audio clipping detected */
  hasClipping: boolean;
}

export interface ProcessingRecommendation {
  /** Recommendation type */
  type: 'quality' | 'performance' | 'compatibility' | 'optimization';
  
  /** Recommendation message */
  message: string;
  
  /** Recommendation priority */
  priority: 'low' | 'medium' | 'high' | 'critical';
  
  /** Suggested action */
  action?: string;
  
  /** Estimated impact */
  impact?: string;
}

// Video thumbnail specific options
export interface VideoThumbnailOptions extends ThumbnailGenerationOptions {
  /** Intelligent thumbnail selection */
  intelligentSelection?: boolean;
  
  /** Avoid black frames */
  avoidBlackFrames?: boolean;
  
  /** Scene-based selection */
  sceneBasedSelection?: boolean;
  
  /** Motion-based selection */
  motionBasedSelection?: boolean;
  
  /** Custom selection algorithm */
  customAlgorithm?: ThumbnailSelectionAlgorithm;
}

export interface ThumbnailSelectionAlgorithm {
  /** Algorithm name */
  name: string;
  
  /** Algorithm parameters */
  parameters: Record<string, unknown>;
  
  /** Scoring weights */
  weights: ThumbnailScoreWeights;
}

export interface ThumbnailScoreWeights {
  /** Motion weight */
  motion: number;
  
  /** Brightness weight */
  brightness: number;
  
  /** Contrast weight */
  contrast: number;
  
  /** Face detection weight */
  faces: number;
  
  /** Object detection weight */
  objects: number;
}