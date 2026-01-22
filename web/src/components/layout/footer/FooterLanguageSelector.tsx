/**
 * FooterLanguageSelector Component
 *
 * Language picker dropdown for i18n
 * Part of Footer migration from StyleSheet to TailwindCSS
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
import { View, Text, Pressable } from 'react-native';
import { useTranslation } from 'react-i18next';
import { z } from 'zod';
import { Globe, ChevronUp } from 'lucide-react';
import { platformClass } from '../../../utils/platformClass';

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
    <View className={platformClass('relative')}>
      {/* Language Button */}
      <Pressable
        className={platformClass(
          'flex-row items-center gap-1 bg-white/[0.05] py-2 px-3 rounded border border-white/10',
          'flex-row items-center gap-1 bg-white/[0.05] py-2 px-3 rounded border border-white/10'
        )}
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
        <Text
          className={platformClass(
            'text-[11px] text-white/60',
            'text-[11px] text-white/60'
          )}
        >
          {currentLanguage.flag} {currentLanguageLabel}
        </Text>
        <ChevronUp size={12} color="rgba(255, 255, 255, 0.6)" />
      </Pressable>

      {/* Language Menu (Dropdown) */}
      {showMenu && (
        <View
          className={platformClass(
            'absolute bottom-full right-0 mb-2 bg-[rgba(20,20,30,0.95)] rounded-lg border border-white/10 overflow-hidden min-w-[120px] backdrop-blur-xl shadow-2xl z-[100]',
            'absolute bottom-full right-0 mb-2 bg-[rgba(20,20,30,0.95)] rounded-lg border border-white/10 overflow-hidden min-w-[120px] z-[100]'
          )}
        >
          {languageCodes.map((lang) => {
            const isActive = lang.code === i18n.language;
            return (
              <Pressable
                key={lang.code}
                className={platformClass(
                  `flex-row items-center gap-2 py-2 px-3 ${
                    isActive ? 'bg-purple-500/30' : ''
                  }`,
                  `flex-row items-center gap-2 py-2 px-3 ${
                    isActive ? 'bg-purple-500/30' : ''
                  }`
                )}
                onPress={() => handleLanguageChange(lang.code)}
                accessibilityLabel={t(`settings.languages.${lang.code}`)}
                accessibilityRole="button"
                accessibilityState={{ selected: isActive }}
                // Touch target: 44x44pt minimum
                hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
              >
                <Text className={platformClass('text-sm')}>{lang.flag}</Text>
                <Text
                  className={platformClass(
                    `text-[11px] ${
                      isActive
                        ? 'text-purple-400 font-semibold'
                        : 'text-white/60'
                    }`,
                    `text-[11px] ${
                      isActive
                        ? 'text-purple-400 font-semibold'
                        : 'text-white/60'
                    }`
                  )}
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

// Export default language codes for reuse
export { DEFAULT_LANGUAGE_CODES };
