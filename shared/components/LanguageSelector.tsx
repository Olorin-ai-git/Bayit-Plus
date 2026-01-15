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
import { useDirection } from '../hooks/useDirection';
import { GlassView } from './ui';
import { languages, saveLanguage, getCurrentLanguage } from '../i18n';
import { colors, spacing, borderRadius } from '../theme';

// Check if this is a TV build (set by webpack)
declare const __TV__: boolean;
const IS_TV_BUILD = typeof __TV__ !== 'undefined' && __TV__;

// Conditionally import createPortal for web only (not TV)
let createPortal: typeof import('react-dom').createPortal | null = null;
if (Platform.OS === 'web' && !IS_TV_BUILD) {
  try {
    createPortal = require('react-dom').createPortal;
  } catch {
    // react-dom not available
  }
}

export const LanguageSelector: React.FC = () => {
  const { t, i18n } = useTranslation();
  const { isRTL } = useDirection();
  const [isOpen, setIsOpen] = useState(false);
  const [backdropActive, setBackdropActive] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const [focusedLang, setFocusedLang] = useState<string | null>(null);
  const [currentLang, setCurrentLang] = useState(getCurrentLanguage());
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0, right: 0 });
  const buttonRef = useRef<View>(null);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  // Debounce to prevent double-toggle from onPress + onClick firing together
  const lastToggleTime = useRef<number>(0);

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

  // Delay backdrop activation to prevent immediate close on open
  // Using 500ms to handle slow remote button releases
  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => setBackdropActive(true), 500);
      return () => clearTimeout(timer);
    } else {
      setBackdropActive(false);
    }
  }, [isOpen]);

  const handleSelectLanguage = async (langCode: string) => {
    await saveLanguage(langCode);
    setCurrentLang(languages.find(l => l.code === langCode) || languages[0]);
    setIsOpen(false);
  };

  const handleOpenDropdown = (e?: any) => {
    // Debounce: prevent double-toggle within 300ms (onPress + onClick can fire together)
    const now = Date.now();
    if (now - lastToggleTime.current < 300) {
      return;
    }
    lastToggleTime.current = now;

    // Stop propagation to prevent immediate close
    if (e) {
      e.stopPropagation();
      e.preventDefault?.();
    }
    if (!isOpen && buttonRef.current) {
      // For web, get the DOM node and measure
      const node = buttonRef.current as any;
      if (node && node.measure) {
        node.measure((x: number, y: number, width: number, height: number, pageX: number, pageY: number) => {
          setDropdownPosition({
            top: pageY + height + 8,
            left: isRTL ? undefined : pageX,
            right: isRTL ? window.innerWidth - (pageX + width) : undefined,
          });
        });
      } else if (typeof document !== 'undefined') {
        // Direct DOM access for web
        const element = node as HTMLElement;
        if (element && element.getBoundingClientRect) {
          const rect = element.getBoundingClientRect();
          setDropdownPosition({
            top: rect.bottom + 8,
            left: isRTL ? undefined : rect.left,
            right: isRTL ? window.innerWidth - rect.right : undefined,
          });
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
        // @ts-ignore - Web props for TV remote
        tabIndex={0}
        onClick={handleOpenDropdown}
        onKeyDown={(e: any) => {
          if (e.keyCode === 13 || e.keyCode === 32) {
            e.preventDefault();
            e.stopPropagation();
            handleOpenDropdown(e);
          }
        }}
        style={[styles.button, isFocused && styles.buttonFocused]}
      >
        <Text style={styles.flag}>{currentLang.flag}</Text>
      </TouchableOpacity>

      {/* Web (non-TV): Use portal for dropdown */}
      {isOpen && Platform.OS === 'web' && !IS_TV_BUILD && createPortal && typeof document !== 'undefined' && createPortal(
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
              {
                opacity: fadeAnim,
                top: dropdownPosition.top,
                left: dropdownPosition.left,
                right: dropdownPosition.right,
              },
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

      {/* Native & TV: Use Modal for dropdown */}
      {(Platform.OS !== 'web' || IS_TV_BUILD) && (
        <Modal
          visible={isOpen}
          transparent
          animationType="fade"
          onRequestClose={() => setIsOpen(false)}
        >
          <TouchableOpacity
            style={styles.modalBackdrop}
            activeOpacity={1}
            onPress={backdropActive ? () => setIsOpen(false) : undefined}
          >
            <View
              style={styles.modalContent}
              onStartShouldSetResponder={() => true}
              onTouchEnd={(e) => e.stopPropagation()}
            >
              <GlassView intensity="high" style={styles.dropdown}>
                <Text style={styles.dropdownTitle}>
                  {t('settings.selectLanguage')}
                </Text>
                {languages.map((lang, index) => (
                  <TouchableOpacity
                    key={lang.code}
                    onPress={() => handleSelectLanguage(lang.code)}
                    onFocus={() => setFocusedLang(lang.code)}
                    onBlur={() => setFocusedLang(null)}
                    // @ts-ignore - Web props for TV
                    tabIndex={0}
                    autoFocus={index === 0}
                    style={[
                      styles.languageOption,
                      currentLang.code === lang.code && styles.languageOptionActive,
                      focusedLang === lang.code && styles.languageOptionFocused,
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
    borderRadius: borderRadius.lg,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  buttonFocused: {
    borderColor: colors.primary,
    backgroundColor: 'rgba(107, 33, 168, 0.3)',
  },
  flag: {
    fontSize: 20,
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
    backgroundColor: 'rgba(107, 33, 168, 0.3)',
  },
  languageOptionFocused: {
    backgroundColor: 'rgba(107, 33, 168, 0.3)',
    borderWidth: 2,
    borderColor: colors.primary,
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
