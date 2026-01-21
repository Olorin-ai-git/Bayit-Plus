// @ts-ignore - Export conflicts/**
 * Image processing type definitions for CVPlus multimedia module
 */

import { 
  MediaFile, 
  ProcessedMedia, 
  QualityLevel,
  ImageFormat
} from './media.types';

// ============================================================================
// IMAGE PROCESSING OPTIONS
// ============================================================================

export interface ImageProcessingOptions {
  /** Target width in pixels */
  width?: number;
  
  /** Target height in pixels */
  height?: number;
  
  /** Quality setting (1-100) */
  quality?: number;
  
  /** Output format */
  format?: ImageFormat;
  
  /** Enable progressive JPEG */
  progressive?: boolean;
  
  /** Use lossless compression */
  lossless?: boolean;
  
  /** Strip metadata from output */
  stripMetadata?: boolean;
  
  /** Resize strategy */
  resizeStrategy?: ResizeStrategy;
  
  /** Background color for transparent images */
  backgroundColor?: string;
  
  /** Enable sharpening */
  sharpen?: boolean | SharpenOptions;
  
  /** Color space conversion */
  colorSpace?: ColorSpace;
  
  /** Compression level (format-specific) */
  compressionLevel?: number;
  
  /** Generate WebP alternative */
  generateWebP?: boolean;
  
  /** Generate AVIF alternative */
  generateAVIF?: boolean;
}

export interface SharpenOptions {
  /** Sharpening sigma (0.3-1000) */
  sigma?: number;
  
  /** Flat area threshold (0-1000) */
  flat?: number;
  
  /** Jaggy threshold (0-1000) */
  jagged?: number;
}

export type ResizeStrategy = 
  | 'cover'        // Crop to cover exact dimensions
  | 'contain'      // Fit within dimensions maintaining aspect ratio
  | 'fill'         // Stretch to fill exact dimensions
  | 'inside'       // Shrink to fit within dimensions if larger
  | 'outside';     // Enlarge to fit dimensions if smaller

export type ColorSpace = 'srgb' | 'rgb' | 'cmyk' | 'lab' | 'grey16';

// ============================================================================
// RESPONSIVE IMAGE OPTIONS
// ============================================================================

export interface ResponsiveImageOptions extends ImageProcessingOptions {
  /** Breakpoints for responsive generation */
  breakpoints: ResponsiveBreakpoint[];
  
  /** Base image size for calculations */
  baseWidth: number;
  
  /** Maximum width to generate */
  maxWidth?: number;
  
  /** Device pixel ratios to support */
  devicePixelRatios?: number[];
  
  /** Art direction alternatives */
  artDirection?: ArtDirectionRule[];
}

export interface ResponsiveBreakpoint {
  /** Breakpoint identifier */
  name: string;
  
  /** Minimum viewport width */
  minWidth: number;
  
  /** Maximum viewport width */
  maxWidth?: number;
  
  /** Target image width */
  targetWidth: number;
  
  /** Quality override for this breakpoint */
  quality?: number;
  
  /** Format override for this breakpoint */
  format?: ImageFormat;
}

export interface ArtDirectionRule {
  /** Media query for this rule */
  mediaQuery: string;
  
  /** Crop area for this rule */
  cropArea?: CropArea;
  
  /** Specific processing options */
  processingOptions?: Partial<ImageProcessingOptions>;
}

export interface CropArea {
  /** Left position (0-1) */
  left: number;
  
  /** Top position (0-1) */
  top: number;
  
  /** Width (0-1) */
  width: number;
  
  /** Height (0-1) */
  height: number;
}

// ============================================================================
// IMAGE METADATA
// ============================================================================

export interface ImageMetadata {
  /** Image width in pixels */
  width: number;
  
  /** Image height in pixels */
  height: number;
  
  /** Aspect ratio */
  aspectRatio: number;
  
  /** Color depth (bits per pixel) */
  colorDepth: number;
  
  /** Color space */
  colorSpace: string;
  
  /** Has alpha channel */
  hasAlpha: boolean;
  
  /** DPI/resolution */
  density?: number;
  
  /** EXIF data */
  exif?: ImageEXIF;
  
  /** Color palette (for indexed images) */
  colorPalette?: ColorInfo[];
  
  /** Dominant colors */
  dominantColors?: ColorInfo[];
  
  /** Animated (for GIF/WebP) */
  animated?: boolean;
  
  /** Number of frames (for animated images) */
  frameCount?: number;
}

export interface ImageEXIF {
  /** Camera make */
  make?: string;
  
  /** Camera model */
  model?: string;
  
  /** Camera settings */
  cameraSettings?: CameraSettings;
  
  /** GPS coordinates */
  gps?: GPSCoordinates;
  
  /** Date taken */
  dateTaken?: Date;
  
  /** Image orientation */
  orientation?: number;
  
  /** Copyright information */
  copyright?: string;
  
  /** Artist/photographer */
  artist?: string;
}

export interface CameraSettings {
  /** Aperture (f-stop) */
  aperture?: number;
  
  /** Shutter speed */
  shutterSpeed?: string;
  
  /** ISO sensitivity */
  iso?: number;
  
  /** Focal length */
  focalLength?: number;
  
  /** Flash used */
  flash?: boolean;
  
  /** White balance */
  whiteBalance?: string;
}

export interface GPSCoordinates {
  /** Latitude */
  latitude: number;
  
  /** Longitude */
  longitude: number;
  
  /** Altitude */
  altitude?: number;
  
  /** Direction */
  direction?: number;
}

export interface ColorInfo {
  /** Color in hex format */
  hex: string;
  
  /** RGB values */
  rgb: [number, number, number];
  
  /** HSL values */
  hsl: [number, number, number];
  
  /** Color percentage in image */
  percentage?: number;
}

// ============================================================================
// PROCESSED IMAGE RESULTS
// ============================================================================

export interface ProcessedImage extends ProcessedMedia<ImageProcessingOptions> {
  /** Image-specific metadata */
  imageMetadata: ImageMetadata;
  
  /** Generated thumbnails */
  thumbnails?: ImageThumbnail[];
  
  /** Alternative formats generated */
  alternativeFormats?: ProcessedImageFormat[];
  
  /** Color analysis results */
  colorAnalysis?: ColorAnalysis;
}

export interface ImageThumbnail {
  /** Thumbnail size identifier */
  size: string;
  
  /** Thumbnail width */
  width: number;
  
  /** Thumbnail height */
  height: number;
  
  /** Thumbnail file */
  file: MediaFile;
  
  /** Thumbnail URL */
  url: string;
  
  /** Quality level */
  quality: QualityLevel;
}

export interface ProcessedImageFormat {
  /** Format type */
  format: ImageFormat;
  
  /** Processed file */
  file: MediaFile;
  
  /** File URL */
  url: string;
  
  /** Format-specific metadata */
  metadata: ImageMetadata;
  
  /** Quality score for this format */
  qualityScore: number;
  
  /** Compression ratio achieved */
  compressionRatio: number;
}

export interface ColorAnalysis {
  /** Dominant color palette */
  dominantColors: ColorInfo[];
  
  /** Color harmony analysis */
  colorHarmony: ColorHarmony;
  
  /** Color temperature */
  colorTemperature: number;
  
  /** Brightness level (0-100) */
  brightness: number;
  
  /** Contrast level (0-100) */
  contrast: number;
  
  /** Saturation level (0-100) */
  saturation: number;
  
  /** Color distribution */
  colorDistribution: Record<string, number>;
}

export interface ColorHarmony {
  /** Color scheme type */
  scheme: 'monochromatic' | 'analogous' | 'complementary' | 'triadic' | 'tetradic' | 'split-complementary';
  
  /** Harmony score (0-100) */
  score: number;
  
  /** Suggested color improvements */
  suggestions?: string[];
}

// ============================================================================
// BATCH IMAGE PROCESSING
// ============================================================================

export interface BatchImageProcessingOptions extends ImageProcessingOptions {
  /** Apply same settings to all images */
  uniformProcessing?: boolean;
  
  /** Individual settings per file */
  fileSpecificSettings?: Record<string, ImageProcessingOptions>;
  
  /** Generate responsive sets for all images */
  generateResponsiveSets?: boolean;
  
  /** Responsive options to apply */
  responsiveOptions?: ResponsiveImageOptions;
  
  /** Naming pattern for processed files */
  namingPattern?: string;
  
  /** Output directory structure */
  directoryStructure?: string;
}

export interface ImageOptimizationResult {
  /** Original image file */
  original: MediaFile;
  
  /** Optimized image file */
  optimized: MediaFile;
  
  /** Optimization settings used */
  settings: ImageProcessingOptions;
  
  /** Size reduction achieved */
  sizeReduction: number;
  
  /** Quality loss (0-100) */
  qualityLoss: number;
  
  /** Optimization score (0-100) */
  optimizationScore: number;
  
  /** Processing time */
  processingTime: number;
}

// ============================================================================
// WATERMARK AND OVERLAY OPTIONS
// ============================================================================

export interface WatermarkOptions {
  /** Watermark image or text */
  source: MediaFile | string;
  
  /** Watermark position */
  position: WatermarkPosition;
  
  /** Opacity (0-1) */
  opacity: number;
  
  /** Scaling factor */
  scale?: number;
  
  /** Rotation angle */
  rotation?: number;
  
  /** Blend mode */
  blendMode?: BlendMode;
  
  /** Margin from edges */
  margin?: MarginOptions;
}

export type WatermarkPosition = 
  | 'top-left' | 'top-center' | 'top-right'
  | 'middle-left' | 'middle-center' | 'middle-right'
  | 'bottom-left' | 'bottom-center' | 'bottom-right'
  | 'custom';

export type BlendMode = 
  | 'normal' | 'multiply' | 'screen' | 'overlay' | 'soft-light' | 'hard-light'
  | 'color-dodge' | 'color-burn' | 'darken' | 'lighten' | 'difference' | 'exclusion';

export interface MarginOptions {
  /** Top margin */
  top?: number;
  
  /** Right margin */
  right?: number;
  
  /** Bottom margin */
  bottom?: number;
  
  /** Left margin */
  left?: number;
}