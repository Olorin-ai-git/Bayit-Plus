// Legacy cvService re-exports for compatibility

export const analyzeAchievements = async (jobId: string) => {
  return {
    keyAchievements: [],
    overallScore: 0
  };
};

export const getPodcastStatus = async (jobId: string) => {
  return {
    status: 'not-started',
    audioUrl: undefined,
    transcript: undefined
  };
};

export const generateEnhancedPodcast = async (jobId: string, style: string) => {
  return { success: false };
};

export const regeneratePodcast = async (jobId: string) => {
  return { success: false };
};
