import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, Modal, StyleSheet, Platform } from 'react-native';
import { useTranslation } from 'react-i18next';
import { NativeIcon } from '@olorin/shared-icons/native';
import { colors } from '@olorin/design-tokens';
import { languages, saveLanguage, getCurrentLanguage } from '../i18n';

interface LanguageSelectorProps {
  /** Compact mode for mobile (48x48px touch target) */
  compact?: boolean;
}

export const LanguageSelector: React.FC<LanguageSelectorProps> = ({ compact = false }) => {
  const { t, i18n } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const [currentLang, setCurrentLang] = useState(getCurrentLanguage());
  const isRTL = i18n.language === 'he' || i18n.language === 'ar';

  useEffect(() => {
    setCurrentLang(getCurrentLanguage());
  }, [i18n.language]);

  const handleSelectLanguage = async (langCode: string) => {
    await saveLanguage(langCode as import('../i18n/types').LanguageCode);
    setCurrentLang(languages.find(l => l.code === langCode) || languages[0]);
    setIsOpen(false);
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity
        onPress={() => setIsOpen(!isOpen)}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        style={[
          styles.button,
          compact && styles.buttonCompact,
          isFocused && styles.buttonFocused,
        ]}
        accessibilityLabel={t('settings.selectLanguage')}
      >
        <Text style={styles.flagText}>{currentLang.flag}</Text>
      </TouchableOpacity>

      <Modal
        visible={isOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setIsOpen(false)}
      >
        <TouchableOpacity
          style={styles.backdrop}
          activeOpacity={1}
          onPress={() => setIsOpen(false)}
        >
          <View style={[styles.dropdown, isRTL ? styles.dropdownRTL : styles.dropdownLTR]}>
            <View style={styles.dropdownInner}>
              <Text style={styles.dropdownTitle}>
                {t('settings.selectLanguage')}
              </Text>

              {languages.map((lang) => (
                <TouchableOpacity
                  key={lang.code}
                  onPress={() => handleSelectLanguage(lang.code)}
                  style={[
                    styles.languageItem,
                    currentLang.code === lang.code && styles.languageItemActive
                  ]}
                >
                  {currentLang.code === lang.code && (
                    <NativeIcon name="check" size={16} color={colors.primary.DEFAULT} style={styles.checkmark} />
                  )}
                  <Text style={styles.flag}>{lang.flag}</Text>
                  <Text
                    style={[
                      styles.languageName,
                      currentLang.code === lang.code && styles.languageNameActive
                    ]}
                  >
                    {lang.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 9999,
  },
  button: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  buttonCompact: {
    width: 48,
    height: 48,
  },
  buttonFocused: {
    borderColor: colors.primary.DEFAULT,
    backgroundColor: 'rgba(139, 92, 246, 0.3)',
  },
  flagText: {
    fontSize: 24,
  },
  backdrop: {
    ...Platform.select({
      web: {
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
      },
      default: {
        flex: 1,
      },
    }),
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  dropdown: {
    ...Platform.select({
      web: {
        position: 'absolute',
        top: 70,
        width: 200,
      },
      default: {
        width: 280,
        maxWidth: '90%',
        marginTop: 80,
      },
    }),
  },
  dropdownLTR: {
    ...Platform.select({
      web: {
        right: 140,
      },
      default: {
        alignSelf: 'flex-end',
        marginRight: 20,
      },
    }),
  },
  dropdownRTL: {
    ...Platform.select({
      web: {
        left: 140,
      },
      default: {
        alignSelf: 'flex-start',
        marginLeft: 20,
      },
    }),
  },
  dropdownInner: {
    backgroundColor: 'rgba(10, 10, 10, 0.95)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.3)',
    padding: 16,
    ...Platform.select({
      web: {
        backdropFilter: 'blur(20px)',
        // @ts-ignore
        WebkitBackdropFilter: 'blur(20px)',
      },
    }),
  },
  dropdownTitle: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: 12,
  },
  languageItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginBottom: 4,
  },
  languageItemActive: {
    backgroundColor: 'rgba(139, 92, 246, 0.2)',
  },
  checkmark: {
    width: 24,
    textAlign: 'center',
  },
  flag: {
    fontSize: 24,
    marginHorizontal: 8,
  },
  languageName: {
    fontSize: 16,
    color: colors.text,
    flex: 1,
  },
  languageNameActive: {
    color: colors.primary.DEFAULT,
    fontWeight: 'bold',
  },
});

export default LanguageSelector;
