/**
 * Home Page Configuration Types
 * Defines section visibility and ordering preferences for home page
 */

/**
 * Available home page section identifiers
 * These map to the actual section components rendered on the home page
 */
export type HomeSectionId =
  | 'continue_watching'
  | 'live_tv'
  | 'trending'
  | 'jerusalem'
  | 'tel_aviv'
  | 'featured'
  | 'categories';

/**
 * Icons for each section (emoji-based for cross-platform compatibility)
 */
export const SECTION_ICONS: Record<HomeSectionId, string> = {
  continue_watching: '▶️',
  live_tv: '📺',
  trending: '🔥',
  jerusalem: '🕌',
  tel_aviv: '🏙️',
  featured: '⭐',
  categories: '📂',
};

/**
 * i18n label keys for each section
 */
export const SECTION_LABEL_KEYS: Record<HomeSectionId, string> = {
  continue_watching: 'home.continueWatching',
  live_tv: 'home.liveTV',
  trending: 'home.trendingInIsrael',
  jerusalem: 'home.jerusalemConnection',
  tel_aviv: 'home.telAvivConnection',
  featured: 'home.featuredContent',
  categories: 'home.categories',
};

/**
 * Configuration for a single home page section
 */
export interface HomeSectionConfig {
  /** Unique identifier for the section */
  id: HomeSectionId;
  /** i18n key for the section label */
  labelKey: string;
  /** Whether the section is visible on the home page */
  visible: boolean;
  /** Display order (lower numbers appear first) */
  order: number;
  /** Icon to display in the configuration UI */
  icon: string;
}

/**
 * Complete home page preferences object
 */
export interface HomePagePreferences {
  /** Configuration for all sections */
  sections: HomeSectionConfig[];
}

/**
 * Default section configuration with all sections visible in default order
 */
export const DEFAULT_HOME_SECTIONS: HomeSectionConfig[] = [
  {
    id: 'continue_watching',
    labelKey: SECTION_LABEL_KEYS.continue_watching,
    visible: true,
    order: 0,
    icon: SECTION_ICONS.continue_watching,
  },
  {
    id: 'live_tv',
    labelKey: SECTION_LABEL_KEYS.live_tv,
    visible: true,
    order: 1,
    icon: SECTION_ICONS.live_tv,
  },
  {
    id: 'trending',
    labelKey: SECTION_LABEL_KEYS.trending,
    visible: true,
    order: 2,
    icon: SECTION_ICONS.trending,
  },
  {
    id: 'jerusalem',
    labelKey: SECTION_LABEL_KEYS.jerusalem,
    visible: true,
    order: 3,
    icon: SECTION_ICONS.jerusalem,
  },
  {
    id: 'tel_aviv',
    labelKey: SECTION_LABEL_KEYS.tel_aviv,
    visible: true,
    order: 4,
    icon: SECTION_ICONS.tel_aviv,
  },
  {
    id: 'featured',
    labelKey: SECTION_LABEL_KEYS.featured,
    visible: true,
    order: 5,
    icon: SECTION_ICONS.featured,
  },
  {
    id: 'categories',
    labelKey: SECTION_LABEL_KEYS.categories,
    visible: true,
    order: 6,
    icon: SECTION_ICONS.categories,
  },
];

/**
 * Default home page preferences
 */
export const DEFAULT_HOME_PAGE_PREFERENCES: HomePagePreferences = {
  sections: DEFAULT_HOME_SECTIONS,
};

/**
 * Helper function to get sorted visible sections
 */
export function getSortedVisibleSections(sections: HomeSectionConfig[]): HomeSectionConfig[] {
  return sections
    .filter((section) => section.visible)
    .sort((a, b) => a.order - b.order);
}

/**
 * Helper function to get hidden sections
 */
export function getHiddenSections(sections: HomeSectionConfig[]): HomeSectionConfig[] {
  return sections.filter((section) => !section.visible);
}

/**
 * Helper function to update section order after a move
 */
export function reorderSection(
  sections: HomeSectionConfig[],
  sectionId: HomeSectionId,
  newOrder: number
): HomeSectionConfig[] {
  const updatedSections = [...sections];
  const sectionIndex = updatedSections.findIndex((s) => s.id === sectionId);

  if (sectionIndex === -1) return sections;

  const currentOrder = updatedSections[sectionIndex].order;

  // Update orders of affected sections
  updatedSections.forEach((section, index) => {
    if (section.id === sectionId) {
      updatedSections[index] = { ...section, order: newOrder };
    } else if (currentOrder < newOrder) {
      // Moving down: decrement orders between old and new position
      if (section.order > currentOrder && section.order <= newOrder) {
        updatedSections[index] = { ...section, order: section.order - 1 };
      }
    } else {
      // Moving up: increment orders between new and old position
      if (section.order >= newOrder && section.order < currentOrder) {
        updatedSections[index] = { ...section, order: section.order + 1 };
      }
    }
  });

  return updatedSections;
}

/**
 * Helper function to toggle section visibility
 */
export function toggleSectionVisibility(
  sections: HomeSectionConfig[],
  sectionId: HomeSectionId
): HomeSectionConfig[] {
  return sections.map((section) => {
    if (section.id === sectionId) {
      return { ...section, visible: !section.visible };
    }
    return section;
  });
}
