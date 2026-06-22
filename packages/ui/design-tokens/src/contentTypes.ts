export const CONTENT_TYPE_CONFIG = {
  movie: {
    icon: '',
    label: 'Movie',
    ttsLabel: 'movie poster',
    iconSize: { ios: 48, tvos: 96, web: 48 },
    aspectRatio: 2/3
  },
  series: {
    icon: '',
    label: 'Series',
    ttsLabel: 'television series',
    iconSize: { ios: 48, tvos: 96, web: 48 },
    aspectRatio: 2/3
  },
  podcast: {
    icon: '',
    label: 'Podcast',
    ttsLabel: 'podcast',
    iconSize: { ios: 48, tvos: 96, web: 48 },
    aspectRatio: 1
  },
  live: {
    icon: '',
    label: 'Live TV',
    ttsLabel: 'live television',
    iconSize: { ios: 64, tvos: 128, web: 64 },
    aspectRatio: 16/9
  },
  radio: {
    icon: '',
    label: 'Radio',
    ttsLabel: 'radio station',
    iconSize: { ios: 48, tvos: 96, web: 48 },
    aspectRatio: 1
  },
  vod: {
    icon: '',
    label: 'Video',
    ttsLabel: 'video',
    iconSize: { ios: 48, tvos: 96, web: 48 },
    aspectRatio: 2/3
  },
  audiobook: {
    icon: '',
    label: 'Audiobook',
    ttsLabel: 'audiobook',
    iconSize: { ios: 48, tvos: 96, web: 48 },
    aspectRatio: 1
  },
  culture: {
    icon: '', // Location/culture marker icon
    label: 'Local Story',
    ttsLabel: 'local cultural story',
    iconSize: { ios: 48, tvos: 96, web: 48 },
    aspectRatio: 16/9
  },
} as const;

// Freeze to prevent runtime modification (security)
Object.freeze(CONTENT_TYPE_CONFIG);

export type ContentType = keyof typeof CONTENT_TYPE_CONFIG;

export const getContentTypeConfig = (type: ContentType) => {
  if (!type || !(type in CONTENT_TYPE_CONFIG)) {
    throw new Error(`Invalid content type: ${type}`);
  }
  return CONTENT_TYPE_CONFIG[type];
};
