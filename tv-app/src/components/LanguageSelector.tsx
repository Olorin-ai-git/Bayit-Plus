import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  Animated,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { GlassView } from './ui';
import { languages, saveLanguage, getCurrentLanguage } from '../i18n';
import { colors, spacing, borderRadius } from '../theme';

export const LanguageSelector: React.FC = () => {
  const { i18n } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const [currentLang, setCurrentLang] = useState(getCurrentLanguage());
  const fadeAnim = React.useRef(new Animated.Value(0)).current;

  useEffect(() => {
    setCurrentLang(getCurrentLanguage());
  }, [i18n.language]);

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: isOpen ? 1 : 0,
      duration: 200,
      useNativeDriver: true,
    }).start();
  }, [isOpen]);

  const handleSelectLanguage = async (langCode: string) => {
    await saveLanguage(langCode);
    setCurrentLang(languages.find(l => l.code === langCode) || languages[0]);
    setIsOpen(false);
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity
        onPress={() => setIsOpen(!isOpen)}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        style={[styles.button, isFocused && styles.buttonFocused]}
      >
        <Text style={styles.flag}>{currentLang.flag}</Text>
      </TouchableOpacity>

      <Modal
        visible={isOpen}
        transparent
        animationType="none"
        onRequestClose={() => setIsOpen(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setIsOpen(false)}
        >
          <Animated.View
            style={[
              styles.dropdownContainer,
              { opacity: fadeAnim },
            ]}
          >
            <GlassView intensity="high" style={styles.dropdown}>
              <Text style={styles.dropdownTitle}>
                {i18n.language === 'he' ? 'בחר שפה' : i18n.language === 'es' ? 'Seleccionar idioma' : 'Select Language'}
              </Text>
              {languages.map((lang, index) => (
                <TouchableOpacity
                  key={lang.code}
                  onPress={() => handleSelectLanguage(lang.code)}
                  style={[
                    styles.languageOption,
                    currentLang.code === lang.code && styles.languageOptionActive,
                  ]}
                >
                  <Text style={styles.languageFlag}>{lang.flag}</Text>
                  <Text style={[
                    styles.languageName,
                    currentLang.code === lang.code && styles.languageNameActive,
                  ]}>
                    {lang.name}
                  </Text>
                  {currentLang.code === lang.code && (
                    <Text style={styles.checkmark}>✓</Text>
                  )}
                </TouchableOpacity>
              ))}
            </GlassView>
          </Animated.View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'relative',
  },
  button: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: borderRadius.md,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  buttonFocused: {
    borderColor: colors.primary,
    backgroundColor: 'rgba(0, 217, 255, 0.1)',
  },
  flag: {
    fontSize: 24,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-start',
    alignItems: 'flex-start',
    paddingTop: 70,
    paddingLeft: spacing.xxl,
  },
  dropdownContainer: {
    width: 200,
  },
  dropdown: {
    padding: spacing.lg,
    borderRadius: borderRadius.lg,
  },
  dropdownTitle: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: spacing.md,
    textAlign: 'center',
  },
  languageOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.md,
    marginBottom: spacing.xs,
  },
  languageOptionActive: {
    backgroundColor: 'rgba(0, 217, 255, 0.1)',
  },
  languageFlag: {
    fontSize: 24,
    marginRight: spacing.md,
  },
  languageName: {
    fontSize: 16,
    color: colors.text,
    flex: 1,
  },
  languageNameActive: {
    color: colors.primary,
    fontWeight: 'bold',
  },
  checkmark: {
    fontSize: 16,
    color: colors.primary,
    fontWeight: 'bold',
  },
});

export default LanguageSelector;
