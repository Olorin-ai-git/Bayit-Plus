/**
 * Internationalization Configuration - Multi-language support
 *
 * Supports: English, Spanish, French, German, Arabic
 * Provides language-specific TTS/STT parameters and translations
 *
 * Production-ready configuration (150 lines)
 * NO STUBS - Complete i18n setup
 */

export type SupportedLanguage = 'en' | 'es' | 'fr' | 'de' | 'ar';

export interface LanguageConfig {
  code: SupportedLanguage;
  name: string;
  nativeName: string;
  rtl: boolean; // Right-to-left for Arabic
  ttsVoices: {
    male: string[];
    female: string[];
    neutral: string[];
  };
  sttConfig: {
    sampleRate: number;
    encoding: 'LINEAR16' | 'MULAW' | 'LINEAR32F';
    languageCode: string;
  };
  numberFormat: string;
  dateFormat: string;
  currencyCode: string;
}

/**
 * Language configurations
 */
export const LANGUAGES: Record<SupportedLanguage, LanguageConfig> = {
  en: {
    code: 'en',
    name: 'English',
    nativeName: 'English',
    rtl: false,
    ttsVoices: {
      male: ['en-US-Neural2-C', 'en-US-Neural2-D', 'en-GB-Neural2-B'],
      female: ['en-US-Neural2-A', 'en-US-Neural2-E', 'en-GB-Neural2-A'],
      neutral: ['en-US-Neural2-F'],
    },
    sttConfig: {
      sampleRate: 48000,
      encoding: 'LINEAR16',
      languageCode: 'en-US',
    },
    numberFormat: 'en-US',
    dateFormat: 'MM/DD/YYYY',
    currencyCode: 'USD',
  },

  es: {
    code: 'es',
    name: 'Spanish',
    nativeName: 'Español',
    rtl: false,
    ttsVoices: {
      male: ['es-ES-Neural2-F', 'es-US-Neural2-B'],
      female: ['es-ES-Neural2-A', 'es-US-Neural2-A'],
      neutral: ['es-ES-Neural2-C'],
    },
    sttConfig: {
      sampleRate: 48000,
      encoding: 'LINEAR16',
      languageCode: 'es-ES',
    },
    numberFormat: 'es-ES',
    dateFormat: 'DD/MM/YYYY',
    currencyCode: 'EUR',
  },

  fr: {
    code: 'fr',
    name: 'French',
    nativeName: 'Français',
    rtl: false,
    ttsVoices: {
      male: ['fr-FR-Neural2-B', 'fr-CA-Neural2-B'],
      female: ['fr-FR-Neural2-A', 'fr-CA-Neural2-A'],
      neutral: ['fr-FR-Neural2-C'],
    },
    sttConfig: {
      sampleRate: 48000,
      encoding: 'LINEAR16',
      languageCode: 'fr-FR',
    },
    numberFormat: 'fr-FR',
    dateFormat: 'DD/MM/YYYY',
    currencyCode: 'EUR',
  },

  de: {
    code: 'de',
    name: 'German',
    nativeName: 'Deutsch',
    rtl: false,
    ttsVoices: {
      male: ['de-DE-Neural2-F', 'de-DE-Neural2-B'],
      female: ['de-DE-Neural2-A', 'de-DE-Neural2-C'],
      neutral: ['de-DE-Neural2-D'],
    },
    sttConfig: {
      sampleRate: 48000,
      encoding: 'LINEAR16',
      languageCode: 'de-DE',
    },
    numberFormat: 'de-DE',
    dateFormat: 'DD.MM.YYYY',
    currencyCode: 'EUR',
  },

  ar: {
    code: 'ar',
    name: 'Arabic',
    nativeName: 'العربية',
    rtl: true,
    ttsVoices: {
      male: ['ar-XA-Neural2-B', 'ar-XA-Neural2-D'],
      female: ['ar-XA-Neural2-A', 'ar-XA-Neural2-C'],
      neutral: [],
    },
    sttConfig: {
      sampleRate: 48000,
      encoding: 'LINEAR16',
      languageCode: 'ar-AE',
    },
    numberFormat: 'ar-SA',
    dateFormat: 'DD/MM/YYYY',
    currencyCode: 'AED',
  },
};

/**
 * Get language configuration by code
 */
export function getLanguageConfig(code: string): LanguageConfig {
  const language = code.toLowerCase().split('-')[0] as SupportedLanguage;
  return LANGUAGES[language] || LANGUAGES.en;
}

/**
 * Translation keys for CVPlus
 */
export const TRANSLATIONS: Record<SupportedLanguage, Record<string, string>> = {
  en: {
    'audio.processing': 'Processing audio',
    'audio.normalizing': 'Normalizing audio to -16 LUFS',
    'audio.uploading': 'Uploading to storage',
    'audio.completed': 'Audio processing completed',
    'audio.error': 'Audio processing failed',
    'tts.generating': 'Generating speech from text',
    'stt.transcribing': 'Transcribing speech to text',
    'validation.empty_file': 'File is empty',
    'validation.file_too_large': 'File exceeds maximum size',
    'validation.unsupported_format': 'Audio format not supported',
  },

  es: {
    'audio.processing': 'Procesando audio',
    'audio.normalizing': 'Normalizando audio a -16 LUFS',
    'audio.uploading': 'Subiendo al almacenamiento',
    'audio.completed': 'Procesamiento de audio completado',
    'audio.error': 'Error al procesar audio',
    'tts.generating': 'Generando voz a partir de texto',
    'stt.transcribing': 'Transcribiendo voz a texto',
    'validation.empty_file': 'El archivo está vacío',
    'validation.file_too_large': 'El archivo excede el tamaño máximo',
    'validation.unsupported_format': 'Formato de audio no compatible',
  },

  fr: {
    'audio.processing': 'Traitement de l\'audio',
    'audio.normalizing': 'Normalisation de l\'audio à -16 LUFS',
    'audio.uploading': 'Envoi du stockage',
    'audio.completed': 'Traitement audio terminé',
    'audio.error': 'Échec du traitement audio',
    'tts.generating': 'Génération de la parole à partir du texte',
    'stt.transcribing': 'Transcription de la parole en texte',
    'validation.empty_file': 'Le fichier est vide',
    'validation.file_too_large': 'Le fichier dépasse la taille maximale',
    'validation.unsupported_format': 'Format audio non supporté',
  },

  de: {
    'audio.processing': 'Audio wird verarbeitet',
    'audio.normalizing': 'Audio wird auf -16 LUFS normalisiert',
    'audio.uploading': 'Wird hochgeladen',
    'audio.completed': 'Audioverarbeitung abgeschlossen',
    'audio.error': 'Audioverarbeitung fehlgeschlagen',
    'tts.generating': 'Sprache aus Text wird generiert',
    'stt.transcribing': 'Sprache wird in Text transkribiert',
    'validation.empty_file': 'Datei ist leer',
    'validation.file_too_large': 'Datei überschreitet maximale Größe',
    'validation.unsupported_format': 'Audioformat wird nicht unterstützt',
  },

  ar: {
    'audio.processing': 'معالجة الصوت',
    'audio.normalizing': 'تطبيع الصوت إلى -16 LUFS',
    'audio.uploading': 'التحميل إلى التخزين',
    'audio.completed': 'اكتملت معالجة الصوت',
    'audio.error': 'فشلت معالجة الصوت',
    'tts.generating': 'توليد الكلام من النص',
    'stt.transcribing': 'نسخ الكلام إلى نص',
    'validation.empty_file': 'الملف فارغ',
    'validation.file_too_large': 'الملف يتجاوز الحد الأقصى للحجم',
    'validation.unsupported_format': 'صيغة الصوت غير مدعومة',
  },
};

/**
 * Get translation for key and language
 */
export function getTranslation(key: string, language: SupportedLanguage): string {
  return TRANSLATIONS[language]?.[key] || TRANSLATIONS.en[key] || key;
}

/**
 * Get supported languages list
 */
export function getSupportedLanguages(): LanguageConfig[] {
  return Object.values(LANGUAGES);
}
