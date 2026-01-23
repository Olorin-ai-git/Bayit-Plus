export const ANIMATION_CONFIG = {
  particles: {
    desktop: parseInt(process.env.REACT_APP_PARTICLE_COUNT_DESKTOP || '50', 10),
    tablet: parseInt(process.env.REACT_APP_PARTICLE_COUNT_TABLET || '30', 10),
    mobile: parseInt(process.env.REACT_APP_PARTICLE_COUNT_MOBILE || '15', 10),
  },
  wizard: {
    speakingMs: parseInt(process.env.REACT_APP_WIZARD_SPEAKING_MS || '2000', 10),
    thinkingMs: parseInt(process.env.REACT_APP_WIZARD_THINKING_MS || '2000', 10),
    resultMs: parseInt(process.env.REACT_APP_WIZARD_RESULT_MS || '3000', 10),
    loopMs: parseInt(process.env.REACT_APP_WIZARD_LOOP_MS || '9000', 10),
    typewriterMs: parseInt(process.env.REACT_APP_TYPEWRITER_SPEED_MS || '100', 10),
  },
  transitions: {
    fast: 0.3,
    normal: 0.6,
    slow: 0.8,
  },
} as const;
