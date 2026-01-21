// @ts-ignore - Export conflicts/**
 * Audio processing type definitions for CVPlus multimedia module
 */

import { 
  MediaFile, 
  ProcessedMedia, 
  QualityLevel,
  AudioFormat 
} from './media.types';

// ============================================================================
// AUDIO PROCESSING OPTIONS
// ============================================================================

export interface AudioProcessingOptions {
  /** Target bitrate in bits per second */
  bitrate?: number;
  
  /** Output format */
  format?: AudioFormat;
  
  /** Sample rate in Hz */
  sampleRate?: number;
  
  /** Number of audio channels */
  channels?: number;
  
  /** Quality level */
  quality?: QualityLevel;
  
  /** Normalize audio volume */
  normalize?: boolean;
  
  /** Apply noise reduction */
  noiseReduction?: boolean;
  
  /** Audio enhancement options */
  enhancement?: AudioEnhancementOptions;
  
  /** Volume adjustment (0.0 to 2.0) */
  volume?: number;
  
  /** Fade in duration (seconds) */
  fadeIn?: number;
  
  /** Fade out duration (seconds) */
  fadeOut?: number;
  
  /** Trim start time (seconds) */
  trimStart?: number;
  
  /** Trim end time (seconds) */
  trimEnd?: number;
  
  /** Audio filters to apply */
  filters?: AudioFilter[];
  
  /** Compression settings */
  compression?: CompressionSettings;
  
  /** Generate waveform visualization */
  generateWaveform?: boolean;
  
  /** Waveform options */
  waveformOptions?: WaveformOptions;
}

export interface AudioEnhancementOptions {
  /** Enable voice enhancement */
  voiceEnhancement?: boolean;
  
  /** Enable music enhancement */
  musicEnhancement?: boolean;
  
  /** Bass boost level (0.0 to 1.0) */
  bassBoost?: number;
  
  /** Treble enhancement level (0.0 to 1.0) */
  trebleEnhancement?: number;
  
  /** Enable surround sound simulation */
  surroundSound?: boolean;
  
  /** Dynamic range compression */
  dynamicRangeCompression?: boolean;
  
  /** De-esser for voice content */
  deEsser?: boolean;
  
  /** Stereo width adjustment */
  stereoWidth?: number;
}

export interface CompressionSettings extends Record<string, unknown> {
  /** Compression algorithm */
  algorithm?: CompressionAlgorithm;
  
  /** Compression ratio */
  ratio?: number;
  
  /** Threshold level */
  threshold?: number;
  
  /** Attack time (ms) */
  attack?: number;
  
  /** Release time (ms) */
  release?: number;
  
  /** Make-up gain */
  makeupGain?: number;
}

export type CompressionAlgorithm = 'standard' | 'multiband' | 'adaptive' | 'transparent';

// ============================================================================
// AUDIO FILTERS
// ============================================================================

export interface AudioFilter {
  /** Filter type */
  type: AudioFilterType;
  
  /** Filter parameters */
  parameters: Record<string, unknown>;
  
  /** Filter application order */
  order?: number;
  
  /** Bypass filter */
  bypass?: boolean;
}

export type AudioFilterType = 
  | 'equalizer' | 'compressor' | 'limiter' | 'gate'
  | 'reverb' | 'delay' | 'chorus' | 'flanger'
  | 'distortion' | 'overdrive' | 'bitcrusher'
  | 'highpass' | 'lowpass' | 'bandpass' | 'notch'
  | 'denoiser' | 'deesser' | 'exciter' | 'enhancer'
  | 'pitch_shift' | 'time_stretch' | 'reverse'
  | 'custom';

export interface EqualizerFilter extends AudioFilter {
  type: 'equalizer';
  parameters: {
    /** Equalizer bands */
    bands: EqualizerBand[];
    /** Pre-gain */
    preGain?: number;
  };
}

export interface EqualizerBand {
  /** Frequency in Hz */
  frequency: number;
  
  /** Gain in dB */
  gain: number;
  
  /** Q factor (bandwidth) */
  q?: number;
  
  /** Filter type */
  filterType?: 'peak' | 'shelf' | 'highpass' | 'lowpass';
}

export interface CompressorFilter extends AudioFilter {
  type: 'compressor';
  parameters: CompressionSettings;
}

export interface ReverbFilter extends AudioFilter {
  type: 'reverb';
  parameters: {
    /** Reverb type */
    type: ReverbType;
    /** Wet/dry mix (0.0 to 1.0) */
    mix: number;
    /** Room size */
    roomSize?: number;
    /** Decay time */
    decayTime?: number;
    /** Pre-delay */
    preDelay?: number;
  };
}

export type ReverbType = 'room' | 'hall' | 'chamber' | 'cathedral' | 'spring' | 'plate' | 'custom';

// ============================================================================
// WAVEFORM VISUALIZATION
// ============================================================================

export interface WaveformOptions {
  /** Waveform width in pixels */
  width: number;
  
  /** Waveform height in pixels */
  height: number;
  
  /** Waveform color */
  color: string;
  
  /** Background color */
  backgroundColor?: string;
  
  /** Progress color */
  progressColor?: string;
  
  /** Number of sample points */
  samples?: number;
  
  /** Waveform style */
  style?: WaveformStyle;
  
  /** Show frequency spectrum */
  showSpectrum?: boolean;
  
  /** Spectrum options */
  spectrumOptions?: SpectrumOptions;
  
  /** Generate animated waveform */
  animated?: boolean;
  
  /** Animation options */
  animationOptions?: AnimationOptions;
}

export type WaveformStyle = 'bars' | 'line' | 'filled' | 'mirror' | 'circular';

export interface SpectrumOptions {
  /** FFT size */
  fftSize: number;
  
  /** Frequency range */
  frequencyRange: [number, number];
  
  /** Color mapping */
  colorMap: ColorMapping;
  
  /** Logarithmic scale */
  logarithmic?: boolean;
}

export interface ColorMapping {
  /** Low frequency color */
  low: string;
  
  /** Mid frequency color */
  mid: string;
  
  /** High frequency color */
  high: string;
  
  /** Gradient type */
  gradientType?: 'linear' | 'radial';
}

export interface AnimationOptions {
  /** Animation duration */
  duration: number;
  
  /** Frame rate */
  frameRate: number;
  
  /** Animation type */
  type: 'progress' | 'pulse' | 'bounce' | 'wave';
  
  /** Loop animation */
  loop?: boolean;
}

// ============================================================================
// AUDIO METADATA
// ============================================================================

export interface AudioMetadata {
  /** Duration in seconds */
  duration: number;
  
  /** Sample rate */
  sampleRate: number;
  
  /** Number of channels */
  channels: number;
  
  /** Channel layout */
  channelLayout: string;
  
  /** Bitrate */
  bitrate: number;
  
  /** Bit depth */
  bitDepth: number;
  
  /** Audio codec */
  codec: string;
  
  /** Container format */
  container: string;
  
  /** Music metadata */
  musicMetadata?: MusicMetadata;
  
  /** Audio analysis */
  analysis?: AudioAnalysis;
  
  /** Peak levels */
  peakLevels?: ChannelPeak[];
  
  /** RMS levels */
  rmsLevels?: ChannelRMS[];
  
  /** Loudness information */
  loudness?: LoudnessInfo;
}

export interface MusicMetadata {
  /** Track title */
  title?: string;
  
  /** Artist name */
  artist?: string;
  
  /** Album name */
  album?: string;
  
  /** Track number */
  trackNumber?: number;
  
  /** Total tracks */
  totalTracks?: number;
  
  /** Disc number */
  discNumber?: number;
  
  /** Release year */
  year?: number;
  
  /** Genre */
  genre?: string;
  
  /** Composer */
  composer?: string;
  
  /** Album artist */
  albumArtist?: string;
  
  /** BPM (beats per minute) */
  bpm?: number;
  
  /** Musical key */
  key?: string;
  
  /** Mood */
  mood?: string;
  
  /** Copyright */
  copyright?: string;
  
  /** Comment */
  comment?: string;
  
  /** Album artwork */
  artwork?: MediaFile;
}

export interface AudioAnalysis {
  /** Tempo (BPM) */
  tempo?: number;
  
  /** Musical key */
  key?: string;
  
  /** Time signature */
  timeSignature?: string;
  
  /** Energy level (0-1) */
  energy: number;
  
  /** Valence (mood) (0-1) */
  valence: number;
  
  /** Danceability (0-1) */
  danceability: number;
  
  /** Acousticness (0-1) */
  acousticness: number;
  
  /** Instrumentalness (0-1) */
  instrumentalness: number;
  
  /** Speechiness (0-1) */
  speechiness: number;
  
  /** Liveness (0-1) */
  liveness: number;
  
  /** Dominant frequencies */
  dominantFrequencies: FrequencyPeak[];
  
  /** Silence detection */
  silenceRanges: TimeRange[];
  
  /** Speech detection */
  speechRanges: TimeRange[];
  
  /** Music detection */
  musicRanges: TimeRange[];
}

export interface FrequencyPeak {
  /** Frequency in Hz */
  frequency: number;
  
  /** Amplitude */
  amplitude: number;
  
  /** Q factor */
  q: number;
}

export interface TimeRange {
  /** Start time in seconds */
  start: number;
  
  /** End time in seconds */
  end: number;
  
  /** Duration in seconds */
  duration: number;
  
  /** Confidence level (0-1) */
  confidence?: number;
}

export interface ChannelPeak {
  /** Channel index */
  channel: number;
  
  /** Peak amplitude */
  peak: number;
  
  /** Peak position in seconds */
  position: number;
}

export interface ChannelRMS {
  /** Channel index */
  channel: number;
  
  /** RMS level */
  rms: number;
  
  /** Average RMS over time */
  averageRms: number;
}

export interface LoudnessInfo {
  /** Integrated loudness (LUFS) */
  integratedLoudness: number;
  
  /** Loudness range (LU) */
  loudnessRange: number;
  
  /** True peak (dBTP) */
  truePeak: number;
  
  /** EBU R128 compliant */
  r128Compliant: boolean;
  
  /** Suggested normalization gain */
  normalizationGain?: number;
}

// ============================================================================
// PROCESSED AUDIO RESULTS
// ============================================================================

export interface ProcessedAudio extends ProcessedMedia<AudioProcessingOptions> {
  /** Audio-specific metadata */
  audioMetadata: AudioMetadata;
  
  /** Generated waveform */
  waveform?: WaveformResult;
  
  /** Audio spectrum analysis */
  spectrum?: SpectrumResult;
  
  /** Audio quality assessment */
  audioQuality: AudioQualityAssessment;
  
  /** Processing statistics */
  processingStats: AudioProcessingStats;
  
  /** Alternative formats */
  alternativeFormats?: ProcessedAudioFormat[];
}

export interface WaveformResult {
  /** Waveform image file */
  image: MediaFile;
  
  /** Waveform data points */
  data: WaveformDataPoint[];
  
  /** SVG version */
  svg?: string;
  
  /** Interactive HTML */
  interactive?: string;
  
  /** Animation frames (if animated) */
  animationFrames?: MediaFile[];
}

export interface WaveformDataPoint {
  /** Time position (seconds) */
  time: number;
  
  /** Amplitude value (-1.0 to 1.0) */
  amplitude: number;
  
  /** Frequency analysis */
  frequency?: number;
}

export interface SpectrumResult {
  /** Spectrum image */
  image: MediaFile;
  
  /** Spectrum data */
  data: SpectrumDataPoint[];
  
  /** Peak frequencies */
  peaks: FrequencyPeak[];
  
  /** Spectral centroid */
  spectralCentroid: number;
  
  /** Spectral bandwidth */
  spectralBandwidth: number;
}

export interface SpectrumDataPoint {
  /** Frequency in Hz */
  frequency: number;
  
  /** Magnitude */
  magnitude: number;
  
  /** Phase */
  phase: number;
}

export interface AudioQualityAssessment {
  /** Overall audio quality (0-100) */
  overall: number;
  
  /** Signal-to-noise ratio */
  signalToNoise: number;
  
  /** Dynamic range */
  dynamicRange: number;
  
  /** Frequency response score */
  frequencyResponse: number;
  
  /** Harmonic distortion level */
  harmonicDistortion: number;
  
  /** Stereo imaging quality */
  stereoImaging?: number;
  
  /** Compression quality */
  compressionQuality: number;
  
  /** Perceived quality score */
  perceivedQuality: number;
}

export interface AudioProcessingStats {
  /** Samples processed per second */
  processingSps: number;
  
  /** Peak memory usage */
  peakMemoryUsage: number;
  
  /** CPU usage percentage */
  cpuUsage: number;
  
  /** Processing efficiency */
  efficiency: number;
  
  /** Clipping events */
  clippingEvents: number;
  
  /** Silence removed (seconds) */
  silenceRemoved?: number;
}

export interface ProcessedAudioFormat {
  /** Audio format */
  format: AudioFormat;
  
  /** Processed file */
  file: MediaFile;
  
  /** File URL */
  url: string;
  
  /** Format-specific metadata */
  metadata: AudioMetadata;
  
  /** Quality score for this format */
  qualityScore: number;
  
  /** Compression ratio */
  compressionRatio: number;
  
  /** Compatibility score */
  compatibilityScore: number;
}

// ============================================================================
// PODCAST AND VOICE PROCESSING
// ============================================================================

export interface PodcastProcessingOptions extends AudioProcessingOptions {
  /** Enable voice enhancement */
  voiceEnhancement: boolean;
  
  /** Remove background noise */
  backgroundNoiseRemoval: boolean;
  
  /** Normalize speech levels */
  speechNormalization: boolean;
  
  /** Generate chapters */
  generateChapters?: boolean;
  
  /** Chapter detection options */
  chapterDetection?: ChapterDetectionOptions;
  
  /** Generate transcript */
  generateTranscript?: boolean;
  
  /** Transcript options */
  transcriptOptions?: TranscriptOptions;
  
  /** Audio branding */
  branding?: AudioBrandingOptions;
}

export interface ChapterDetectionOptions {
  /** Minimum chapter length (seconds) */
  minChapterLength: number;
  
  /** Silence threshold for chapter breaks */
  silenceThreshold: number;
  
  /** Volume change threshold */
  volumeChangeThreshold: number;
  
  /** Speaker change detection */
  speakerChangeDetection?: boolean;
}

export interface TranscriptOptions {
  /** Language for transcription */
  language: string;
  
  /** Include timestamps */
  includeTimestamps: boolean;
  
  /** Include speaker identification */
  speakerIdentification?: boolean;
  
  /** Confidence threshold */
  confidenceThreshold?: number;
  
  /** Output format */
  outputFormat: 'text' | 'srt' | 'vtt' | 'json';
}

export interface AudioBrandingOptions {
  /** Intro audio file */
  intro?: MediaFile;
  
  /** Outro audio file */
  outro?: MediaFile;
  
  /** Background music */
  backgroundMusic?: MediaFile;
  
  /** Background music volume */
  backgroundMusicVolume?: number;
  
  /** Jingles or sound effects */
  soundEffects?: SoundEffect[];
}

export interface SoundEffect {
  /** Sound effect file */
  file: MediaFile;
  
  /** Insertion time (seconds) */
  time: number;
  
  /** Volume level */
  volume: number;
  
  /** Fade in/out duration */
  fade?: number;
}

export interface PodcastResult extends ProcessedAudio {
  /** Generated chapters */
  chapters?: AudioChapter[];
  
  /** Generated transcript */
  transcript?: TranscriptResult;
  
  /** Speaker segments */
  speakerSegments?: SpeakerSegment[];
  
  /** Content analysis */
  contentAnalysis: ContentAnalysis;
}

export interface AudioChapter {
  /** Chapter title */
  title: string;
  
  /** Start time (seconds) */
  startTime: number;
  
  /** End time (seconds) */
  endTime: number;
  
  /** Chapter description */
  description?: string;
  
  /** Chapter artwork */
  artwork?: MediaFile;
}

export interface TranscriptResult {
  /** Full transcript text */
  text: string;
  
  /** Formatted transcript file */
  file: MediaFile;
  
  /** Transcript segments */
  segments: TranscriptSegment[];
  
  /** Overall confidence */
  confidence: number;
  
  /** Language detected */
  language: string;
}

export interface TranscriptSegment {
  /** Segment text */
  text: string;
  
  /** Start time (seconds) */
  startTime: number;
  
  /** End time (seconds) */
  endTime: number;
  
  /** Confidence score */
  confidence: number;
  
  /** Speaker ID (if identified) */
  speakerId?: string;
  
  /** Word-level breakdown */
  words?: TranscriptWord[];
}

export interface TranscriptWord {
  /** Word text */
  word: string;
  
  /** Start time (seconds) */
  startTime: number;
  
  /** End time (seconds) */
  endTime: number;
  
  /** Confidence score */
  confidence: number;
}

export interface SpeakerSegment {
  /** Speaker ID */
  speakerId: string;
  
  /** Speaker name (if known) */
  speakerName?: string;
  
  /** Segment start time */
  startTime: number;
  
  /** Segment end time */
  endTime: number;
  
  /** Speaking duration */
  duration: number;
  
  /** Voice characteristics */
  voiceCharacteristics?: VoiceCharacteristics;
}

export interface VoiceCharacteristics {
  /** Fundamental frequency (pitch) */
  f0: number;
  
  /** Speaking rate (words per minute) */
  speakingRate: number;
  
  /** Voice energy */
  energy: number;
  
  /** Gender classification */
  gender?: 'male' | 'female' | 'unknown';
  
  /** Age estimation */
  ageEstimate?: number;
  
  /** Accent/dialect */
  accent?: string;
}

export interface ContentAnalysis {
  /** Content type */
  contentType: 'speech' | 'music' | 'mixed' | 'noise';
  
  /** Speech-to-music ratio */
  speechMusicRatio: number;
  
  /** Content mood */
  mood: 'positive' | 'negative' | 'neutral';
  
  /** Emotional intensity (0-1) */
  emotionalIntensity: number;
  
  /** Engagement score (0-1) */
  engagementScore: number;
  
  /** Content tags */
  tags: string[];
  
  /** Topic detection */
  topics?: ContentTopic[];
}

export interface ContentTopic {
  /** Topic name */
  topic: string;
  
  /** Confidence score */
  confidence: number;
  
  /** Time ranges where topic appears */
  timeRanges: TimeRange[];
  
  /** Keywords related to topic */
  keywords: string[];
}