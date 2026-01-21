/**
 * @fileoverview Test setup for @cvplus/i18n
  */

import { vi } from 'vitest';

// Mock i18next for testing
vi.mock('i18next', () => ({
  default: {
    init: vi.fn().mockResolvedValue(undefined),
    t: vi.fn((key: string) => key),
    changeLanguage: vi.fn().mockResolvedValue(undefined),
    language: 'en',
    languages: ['en', 'es'],
    exists: vi.fn().mockReturnValue(true),
    getResource: vi.fn(),
    addResource: vi.fn(),
    removeResourceBundle: vi.fn(),
    loadLanguages: vi.fn().mockResolvedValue(undefined),
    use: vi.fn().mockReturnThis(),
    services: {
      postProcessor: {
        addPostProcessor: vi.fn(),
      },
    },
  },
}));

// Mock react-i18next for testing
vi.mock('react-i18next', () => ({
  useTranslation: vi.fn(() => ({
    t: vi.fn((key: string) => key),
    i18n: {
      language: 'en',
      changeLanguage: vi.fn().mockResolvedValue(undefined),
    },
  })),
  initReactI18next: {
    type: 'postProcessor',
    process: vi.fn((value: string) => value),
  },
  I18nextProvider: ({ children }: { children: React.ReactNode }) => children,
}));

// Mock browser APIs
Object.defineProperty(window, 'localStorage', {
  value: {
    getItem: vi.fn(),
    setItem: vi.fn(),
    removeItem: vi.fn(),
    clear: vi.fn(),
  },
});

Object.defineProperty(document, 'documentElement', {
  value: {
    dir: 'ltr',
    lang: 'en',
    classList: {
      add: vi.fn(),
      remove: vi.fn(),
      toggle: vi.fn(),
    },
    style: {
      setProperty: vi.fn(),
    },
  },
});

// Mock Intl APIs for consistent testing
const mockIntl = {
  NumberFormat: vi.fn().mockImplementation((locale, options) => ({
    format: vi.fn((value) => value.toString()),
  })),
  DateTimeFormat: vi.fn().mockImplementation((locale, options) => ({
    format: vi.fn((date) => date.toLocaleDateString()),
  })),
  RelativeTimeFormat: vi.fn().mockImplementation((locale, options) => ({
    format: vi.fn((value, unit) => `${value} ${unit} ago`),
  })),
  ListFormat: vi.fn().mockImplementation((locale, options) => ({
    format: vi.fn((list) => list.join(', ')),
  })),
  PluralRules: vi.fn().mockImplementation((locale, options) => ({
    select: vi.fn(() => 'other'),
  })),
};

Object.defineProperty(global, 'Intl', {
  value: mockIntl,
});

// Set up test environment
beforeEach(() => {
  vi.clearAllMocks();
});