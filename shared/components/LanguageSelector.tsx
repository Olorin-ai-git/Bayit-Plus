import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Platform,
  Modal,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { GlassView } from './ui';
import { languages, saveLanguage, getCurrentLanguage } from '../i18n';
import { colors, spacing, borderRadius } from '../theme';

// Conditionally import createPortal for web only
let createPortal: typeof import('react-dom').createPortal | null = null;
if (Platform.OS === 'web') {
  try {
    createPortal = require('react-dom').createPortal;
  } catch {
    // react-dom not available
  }
}

export const LanguageSelector: React.FC = () => {
  const { t, i18n } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const [currentLang, setCurrentLang] = useState(getCurrentLanguage());
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0 });
  const buttonRef = useRef<View>(null);
  const fadeAnim = useRef(new Animated.Value(0)).current;

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

  const handleOpenDropdown = () => {
    if (!isOpen && buttonRef.current) {
      // For web, get the DOM node and measure
      const node = buttonRef.current as any;
      if (node && node.measure) {
        node.measure((x: number, y: number, width: number, height: number, pageX: number, pageY: number) => {
          setDropdownPosition({ top: pageY + height + 8, left: pageX });
        });
      } else if (typeof document !== 'undefined') {
        // Direct DOM access for web
        const element = node as HTMLElement;
        if (element && element.getBoundingClientRect) {
          const rect = element.getBoundingClientRect();
          setDropdownPosition({ top: rect.bottom + 8, left: rect.left });
        }
      }
    }
    setIsOpen(!isOpen);
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity
        ref={buttonRef as any}
        onPress={handleOpenDropdown}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        style={[styles.button, isFocused && styles.buttonFocused]}
      >
        <Text style={styles.flag}>{currentLang.flag}</Text>
      </TouchableOpacity>

      {/* Web: Use portal for dropdown */}
      {isOpen && Platform.OS === 'web' && createPortal && typeof document !== 'undefined' && createPortal(
        <>
          {/* Backdrop to close on click outside */}
          <TouchableOpacity
            style={styles.backdrop}
            activeOpacity={1}
            onPress={() => setIsOpen(false)}
          />
          {/* Dropdown positioned fixed to viewport */}
          <Animated.View
            style={[
              styles.dropdownContainer,
              { opacity: fadeAnim, top: dropdownPosition.top, left: dropdownPosition.left },
            ]}
          >
            <GlassView intensity="high" style={styles.dropdown}>
              <Text style={styles.dropdownTitle}>
                {t('settings.selectLanguage')}
              </Text>
              {languages.map((lang) => (
                <TouchableOpacity
                  key={lang.code}
                  onPress={() => handleSelectLanguage(lang.code)}
                  style={[
                    styles.languageOption,
                    currentLang.code === lang.code && styles.languageOptionActive,
                  ]}
                >
                  {currentLang.code === lang.code && (
                    <Text style={styles.checkmark}>✓</Text>
                  )}
                  <Text style={styles.languageFlag}>{lang.flag}</Text>
                  <Text style={[
                    styles.languageName,
                    currentLang.code === lang.code && styles.languageNameActive,
                  ]}>
                    {lang.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </GlassView>
          </Animated.View>
        </>,
        document.body
      )}

      {/* Native: Use Modal for dropdown */}
      {Platform.OS !== 'web' && (
        <Modal
          visible={isOpen}
          transparent
          animationType="fade"
          onRequestClose={() => setIsOpen(false)}
        >
          <TouchableOpacity
            style={styles.modalBackdrop}
            activeOpacity={1}
            onPress={() => setIsOpen(false)}
          >
            <View style={styles.modalContent}>
              <GlassView intensity="high" style={styles.dropdown}>
                <Text style={styles.dropdownTitle}>
                  {t('settings.selectLanguage')}
                </Text>
                {languages.map((lang) => (
                  <TouchableOpacity
                    key={lang.code}
                    onPress={() => handleSelectLanguage(lang.code)}
                    style={[
                      styles.languageOption,
                      currentLang.code === lang.code && styles.languageOptionActive,
                    ]}
                  >
                    {currentLang.code === lang.code && (
                      <Text style={styles.checkmark}>✓</Text>
                    )}
                    <Text style={styles.languageFlag}>{lang.flag}</Text>
                    <Text style={[
                      styles.languageName,
                      currentLang.code === lang.code && styles.languageNameActive,
                    ]}>
                      {lang.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </GlassView>
            </View>
          </TouchableOpacity>
        </Modal>
      )}
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
  backdrop: {
    position: 'fixed' as any,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'transparent',
    zIndex: 9998,
  },
  dropdownContainer: {
    position: 'fixed' as any,
    width: 200,
    zIndex: 10000,
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
    marginHorizontal: spacing.sm,
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
    width: 24,
    textAlign: 'center',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: 280,
    maxWidth: '80%',
  },
});

export default LanguageSelector;
