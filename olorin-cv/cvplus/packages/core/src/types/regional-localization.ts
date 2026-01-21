export interface RegionalLocalization {
  region: string;
  country: string;
  language: string;
  currency: string;
  dateFormat: string;
  timeZone: string;
}

export interface LocalizedContent {
  region: string;
  content: Record<string, string>;
  formatting: {
    currency: string;
    date: string;
    number: string;
  };
}

export interface RegionalPreferences {
  cvFormat: string;
  preferredSections: string[];
  culturalNorms: string[];
  commonPhrases: Record<string, string>;
}

export interface RegionalConfiguration {
  id: string;
  region: string;
  localization: RegionalLocalization;
  preferences: RegionalPreferences;
  content: LocalizedContent;
}

export type RegionalTypes = 'north_america' | 'europe' | 'asia_pacific' | 'latin_america' | 'africa' | 'middle_east';