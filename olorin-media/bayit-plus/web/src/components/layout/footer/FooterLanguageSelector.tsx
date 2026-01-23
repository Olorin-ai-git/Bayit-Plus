/**
 * FooterLanguageSelector Component
 *
 * Language picker dropdown for i18n
 * Part of Footer - StyleSheet implementation for RN Web compatibility
 *
 * Features:
 * - Globe icon + current language display
 * - Dropdown menu with flag emojis
 * - Supports English, Hebrew, Spanish
 * - Highlights active language
 * - i18n.changeLanguage() integration
 * - Touch targets meet accessibility standards (44x44pt/48x48dp)
 * - Backdrop blur glassmorphism effect
 */

import { useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { z } from 'zod';
import { Globe, ChevronUp } from 'lucide-react';

// Zod schema for language codes
const LanguageCodeSchema = z.object({
  code: z.enum(['en', 'he', 'es']),
  flag: z.string(),
});

const FooterLanguageSelectorPropsSchema = z.object({
  languageCodes: z.array(LanguageCodeSchema).optional(),
});

type LanguageCode = z.infer<typeof LanguageCodeSchema>;
type FooterLanguageSelectorProps = z.infer<typeof FooterLanguageSelectorPropsSchema>;

const DEFAULT_LANGUAGE_CODES: LanguageCode[] = [
  { code: 'en', flag: '🇺🇸' },
  { code: 'he', flag: '🇮🇱' },
  { code: 'es', flag: '🇪🇸' },
];

export default function FooterLanguageSelector({
  languageCodes = DEFAULT_LANGUAGE_CODES,
}: Partial<FooterLanguageSelectorProps>) {
  const { t, i18n } = useTranslation();
  const [showMenu, setShowMenu] = useState(false);

  // Validate props
  FooterLanguageSelectorPropsSchema.partial().parse({ languageCodes });

  const currentLanguage =
    languageCodes.find((lang) => lang.code === i18n.language) ||
    languageCodes[0];
  const currentLanguageLabel = t(`settings.languages.${i18n.language}`);

  const handleLanguageChange = (langCode: string) => {
    i18n.changeLanguage(langCode);
    setShowMenu(false);
  };

  return (
    <View style={styles.container}>
      {/* Language Button */}
      <Pressable
        style={styles.languageButton}
        onPress={() => setShowMenu(!showMenu)}
        accessibilityLabel={t(
          'footer.languageSelector.label',
          'Change language'
        )}
        accessibilityRole="button"
        // Touch target: 44x44pt minimum
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      >
        <Globe size={14} color="rgba(255, 255, 255, 0.6)" />
        <Text style={styles.languageButtonText}>
          {currentLanguage.flag} {currentLanguageLabel}
        </Text>
        <ChevronUp size={12} color="rgba(255, 255, 255, 0.6)" />
      </Pressable>

      {/* Language Menu (Dropdown) */}
      {showMenu && (
        <View style={styles.languageMenu}>
          {languageCodes.map((lang) => {
            const isActive = lang.code === i18n.language;
            return (
              <Pressable
                key={lang.code}
                style={[
                  styles.languageOption,
                  isActive && styles.languageOptionActive,
                ]}
                onPress={() => handleLanguageChange(lang.code)}
                accessibilityLabel={t(`settings.languages.${lang.code}`)}
                accessibilityRole="button"
                accessibilityState={{ selected: isActive }}
                // Touch target: 44x44pt minimum
                hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
              >
                <Text style={styles.languageOptionFlag}>{lang.flag}</Text>
                <Text
                  style={[
                    styles.languageOptionText,
                    isActive && styles.languageOptionTextActive,
                  ]}
                >
                  {t(`settings.languages.${lang.code}`)}
                </Text>
              </Pressable>
            );
          })}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
  },
  languageButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  languageButtonText: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.6)',
  },
  languageMenu: {
    position: 'absolute',
    bottom: '100%',
    right: 0,
    marginBottom: 8,
    backgroundColor: 'rgba(20, 20, 30, 0.95)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    overflow: 'hidden',
    minWidth: 120,
    // @ts-ignore - Web CSS property
    backdropFilter: 'blur(20px)',
    boxShadow: '0 -10px 40px rgba(0, 0, 0, 0.5)',
    zIndex: 100,
  },
  languageOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  languageOptionActive: {
    backgroundColor: 'rgba(168, 85, 247, 0.3)', // purple-500/30
  },
  languageOptionFlag: {
    fontSize: 14,
  },
  languageOptionText: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.6)',
  },
  languageOptionTextActive: {
    color: '#a855f7', // purple-400
    fontWeight: '600',
  },
});

// Export default language codes for reuse
export { DEFAULT_LANGUAGE_CODES };
