/**
 * Spritesheet Configuration
 * Centralized configuration for all wizard spritesheet animations
 * Ported from WizardSprite.web.tsx for use with Remotion
 */

export interface SpritesheetConfig {
  url: string;
  frameWidth: number;
  frameHeight: number;
  columns: number;
  rows: number;
  totalFrames: number;
  fps: number;
  loop: boolean;
}

export const SPRITESHEET_CONFIG: Record<string, SpritesheetConfig> = {
  // Large 6×6 grid spritesheets (330×362 per frame)
  clapping: {
    url: '/assets/images/characters/wizard/spritesheets/clapping/spritesheet.png',
    frameWidth: 330,
    frameHeight: 362,
    columns: 6,
    rows: 6,
    totalFrames: 35,
    fps: 10,
    loop: true,
  },
  speaking: {
    url: '/assets/images/characters/wizard/spritesheets/speaking/spritesheet.png',
    frameWidth: 330,
    frameHeight: 362,
    columns: 6,
    rows: 6,
    totalFrames: 35,
    fps: 10,
    loop: true,
  },
  thinking: {
    url: '/assets/images/characters/wizard/spritesheets/thinking/spritesheet.png',
    frameWidth: 330,
    frameHeight: 362,
    columns: 6,
    rows: 6,
    totalFrames: 35,
    fps: 5,
    loop: true,
  },
  crying: {
    url: '/assets/images/characters/wizard/spritesheets/crying/spritesheet.png',
    frameWidth: 330,
    frameHeight: 362,
    columns: 6,
    rows: 6,
    totalFrames: 35,
    fps: 5,
    loop: true,
  },
  smacking: {
    url: '/assets/images/characters/wizard/spritesheets/smacking/spritesheet.png',
    frameWidth: 330,
    frameHeight: 362,
    columns: 6,
    rows: 6,
    totalFrames: 35,
    fps: 8,
    loop: false,
  },
  listening: {
    url: '/assets/images/characters/wizard/spritesheets/listening/spritesheet.png',
    frameWidth: 331,
    frameHeight: 363,
    columns: 6,
    rows: 6,
    totalFrames: 35,
    fps: 5,
    loop: true,
  },
  clarification: {
    url: '/assets/images/characters/wizard/spritesheets/clarification/spritesheet.png',
    frameWidth: 331,
    frameHeight: 363,
    columns: 6,
    rows: 6,
    totalFrames: 35,
    fps: 6,
    loop: false,
  },
  warning: {
    url: '/assets/images/characters/wizard/spritesheets/warning/spritesheet.png',
    frameWidth: 330,
    frameHeight: 362,
    columns: 6,
    rows: 6,
    totalFrames: 35,
    fps: 6,
    loop: false,
  },

  // 6×4 grid spritesheet
  conjuring: {
    url: '/assets/images/characters/wizard/spritesheets/conjuring/spritesheet.png',
    frameWidth: 329,
    frameHeight: 359,
    columns: 6,
    rows: 4,
    totalFrames: 24,
    fps: 6,
    loop: true,
  },

  // Wide 6×1 spritesheets (6 frames in single row, 528×1344 per frame)
  agreement: {
    url: '/assets/images/characters/wizard/spritesheets/agreement/spritesheet.png',
    frameWidth: 528,
    frameHeight: 1344,
    columns: 6,
    rows: 1,
    totalFrames: 6,
    fps: 6,
    loop: false,
  },
  attentive: {
    url: '/assets/images/characters/wizard/spritesheets/attentive/spritesheet.png',
    frameWidth: 528,
    frameHeight: 1344,
    columns: 6,
    rows: 1,
    totalFrames: 6,
    fps: 5,
    loop: true,
  },
  disagreement: {
    url: '/assets/images/characters/wizard/spritesheets/disagreement/spritesheet.png',
    frameWidth: 528,
    frameHeight: 1344,
    columns: 6,
    rows: 1,
    totalFrames: 6,
    fps: 5,
    loop: false,
  },
  magical_reveal: {
    url: '/assets/images/characters/wizard/spritesheets/magical_reveal/spritesheet.png',
    frameWidth: 528,
    frameHeight: 1344,
    columns: 6,
    rows: 1,
    totalFrames: 6,
    fps: 6,
    loop: false,
  },
  single_result: {
    url: '/assets/images/characters/wizard/spritesheets/single_result/spritesheet.png',
    frameWidth: 528,
    frameHeight: 1344,
    columns: 6,
    rows: 1,
    totalFrames: 6,
    fps: 6,
    loop: false,
  },
  success: {
    url: '/assets/images/characters/wizard/spritesheets/success/spritesheet.png',
    frameWidth: 528,
    frameHeight: 1344,
    columns: 6,
    rows: 1,
    totalFrames: 6,
    fps: 8,
    loop: false,
  },
  waiting: {
    url: '/assets/images/characters/wizard/spritesheets/waiting/spritesheet.png',
    frameWidth: 528,
    frameHeight: 1344,
    columns: 6,
    rows: 1,
    totalFrames: 6,
    fps: 4,
    loop: true,
  },

  // Small spritesheets (single row, varying dimensions)
  browsing: {
    url: '/assets/images/characters/wizard/spritesheets/browsing/spritesheet.png',
    frameWidth: 77,
    frameHeight: 89,
    columns: 5,
    rows: 1,
    totalFrames: 5,
    fps: 6,
    loop: true,
  },
  cheering: {
    url: '/assets/images/characters/wizard/spritesheets/cheering/spritesheet.png',
    frameWidth: 86,
    frameHeight: 97,
    columns: 3,
    rows: 1,
    totalFrames: 3,
    fps: 8,
    loop: true,
  },
  confirmation: {
    url: '/assets/images/characters/wizard/spritesheets/confirmation/spritesheet.png',
    frameWidth: 88,
    frameHeight: 90,
    columns: 2,
    rows: 1,
    totalFrames: 2,
    fps: 5,
    loop: false,
  },
  confused: {
    url: '/assets/images/characters/wizard/spritesheets/confused/spritesheet.png',
    frameWidth: 84,
    frameHeight: 88,
    columns: 3,
    rows: 1,
    totalFrames: 3,
    fps: 5,
    loop: true,
  },
  emphatic: {
    url: '/assets/images/characters/wizard/spritesheets/emphatic/spritesheet.png',
    frameWidth: 81,
    frameHeight: 87,
    columns: 3,
    rows: 1,
    totalFrames: 3,
    fps: 8,
    loop: true,
  },
  farewell: {
    url: '/assets/images/characters/wizard/spritesheets/farewell/spritesheet.png',
    frameWidth: 82,
    frameHeight: 97,
    columns: 4,
    rows: 1,
    totalFrames: 4,
    fps: 6,
    loop: false,
  },
  greeting: {
    url: '/assets/images/characters/wizard/spritesheets/greeting/spritesheet.png',
    frameWidth: 86,
    frameHeight: 86,
    columns: 4,
    rows: 1,
    totalFrames: 4,
    fps: 6,
    loop: false,
  },
  presenting: {
    url: '/assets/images/characters/wizard/spritesheets/presenting/spritesheet.png',
    frameWidth: 105,
    frameHeight: 97,
    columns: 2,
    rows: 1,
    totalFrames: 2,
    fps: 6,
    loop: true,
  },
  reading: {
    url: '/assets/images/characters/wizard/spritesheets/reading/spritesheet.png',
    frameWidth: 70,
    frameHeight: 91,
    columns: 4,
    rows: 1,
    totalFrames: 4,
    fps: 5,
    loop: true,
  },
  shrugging: {
    url: '/assets/images/characters/wizard/spritesheets/shrugging/spritesheet.png',
    frameWidth: 86,
    frameHeight: 92,
    columns: 3,
    rows: 1,
    totalFrames: 3,
    fps: 6,
    loop: false,
  },

  // Idle behaviors (large frames)
  shifts_weight: {
    url: '/assets/images/characters/wizard/spritesheets/idle/shifts_weight/spritesheet.png',
    frameWidth: 396,
    frameHeight: 672,
    columns: 3,
    rows: 1,
    totalFrames: 3,
    fps: 4,
    loop: false,
  },
  adjusts_hat: {
    url: '/assets/images/characters/wizard/spritesheets/idle/adjusts_hat/spritesheet.png',
    frameWidth: 396,
    frameHeight: 672,
    columns: 4,
    rows: 1,
    totalFrames: 4,
    fps: 5,
    loop: false,
  },
  looks_around: {
    url: '/assets/images/characters/wizard/spritesheets/idle/looks_around/spritesheet.png',
    frameWidth: 396,
    frameHeight: 672,
    columns: 5,
    rows: 1,
    totalFrames: 5,
    fps: 5,
    loop: false,
  },
  puffs_in: {
    url: '/assets/images/characters/wizard/spritesheets/idle/puffs_in/spritesheet.png',
    frameWidth: 396,
    frameHeight: 672,
    columns: 5,
    rows: 1,
    totalFrames: 5,
    fps: 3, // Slower FPS for smoother appearing effect
    loop: false,
  },
  puffs_out: {
    url: '/assets/images/characters/wizard/spritesheets/idle/puffs_out/spritesheet.png',
    frameWidth: 396,
    frameHeight: 672,
    columns: 5,
    rows: 1,
    totalFrames: 5,
    fps: 3, // Slower FPS for smoother disappearing effect
    loop: false,
  },
} as const;

export type SpritesheetType = keyof typeof SPRITESHEET_CONFIG;

/**
 * Calculate the total duration in Remotion frames (at 60fps) for a spritesheet
 */
export function calculateRemotionDuration(spritesheet: SpritesheetType): number {
  const config = SPRITESHEET_CONFIG[spritesheet];
  const durationInSeconds = config.totalFrames / config.fps;
  return Math.ceil(durationInSeconds * 60); // Convert to 60fps frames
}

/**
 * Get the current spritesheet frame index based on Remotion frame
 */
export function getSpritesheetFrame(
  remotionFrame: number,
  spritesheet: SpritesheetType
): number {
  const config = SPRITESHEET_CONFIG[spritesheet];
  const frameRate = 60 / config.fps; // How many Remotion frames per spritesheet frame
  const spritesheetFrame = Math.floor(remotionFrame / frameRate);

  if (config.loop) {
    return spritesheetFrame % config.totalFrames;
  }

  return Math.min(spritesheetFrame, config.totalFrames - 1);
}
