import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Animated,
  Platform,
  Modal,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useDirection } from '../hooks/useDirection';
import { GlassView } from './ui';
import { languages, saveLanguage, getCurrentLanguage } from '../i18n';
import { colors } from '../theme';

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
    <View className="relative justify-center items-center z-[9999]">
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
        className={`w-11 h-11 justify-center items-center rounded-lg bg-white/5 border ${
          isFocused ? 'border-purple-500 bg-purple-500/30' : 'border-transparent'
        }`}
      >
        <Text className="text-xl">{currentLang.flag}</Text>
      </TouchableOpacity>

      {/* Web (non-TV): Use portal for dropdown */}
      {isOpen && Platform.OS === 'web' && !IS_TV_BUILD && createPortal && typeof document !== 'undefined' && createPortal(
        <>
          {/* Backdrop to close on click outside */}
          <TouchableOpacity
            className="fixed inset-0 bg-transparent z-[9998]"
            activeOpacity={1}
            onPress={() => setIsOpen(false)}
          />
          {/* Dropdown positioned fixed to viewport */}
          <Animated.View
            className="fixed w-[200px] z-[10000]"
            style={{
              opacity: fadeAnim,
              top: dropdownPosition.top,
              left: dropdownPosition.left,
              right: dropdownPosition.right,
            }}
          >
            <GlassView intensity="high" className="p-4 rounded-lg">
              <Text className="text-sm text-center mb-3" style={{ color: colors.textSecondary }}>
                {t('settings.selectLanguage')}
              </Text>
              {languages.map((lang) => (
                <TouchableOpacity
                  key={lang.code}
                  onPress={() => handleSelectLanguage(lang.code)}
                  className={`flex-row items-center py-2 px-3 rounded-md mb-1 ${
                    currentLang.code === lang.code ? 'bg-purple-500/30' : ''
                  }`}
                >
                  {currentLang.code === lang.code && (
                    <Text className="text-base font-bold w-6 text-center" style={{ color: colors.primary }}>✓</Text>
                  )}
                  <Text className="text-2xl mx-2">{lang.flag}</Text>
                  <Text
                    className={`text-base flex-1 ${
                      currentLang.code === lang.code ? 'font-bold' : ''
                    }`}
                    style={{ color: currentLang.code === lang.code ? colors.primary : colors.text }}
                  >
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
            className="flex-1 bg-black/50 justify-center items-center"
            activeOpacity={1}
            onPress={backdropActive ? () => setIsOpen(false) : undefined}
          >
            <View
              className="w-[280px] max-w-[80%]"
              onStartShouldSetResponder={() => true}
              onTouchEnd={(e) => e.stopPropagation()}
            >
              <GlassView intensity="high" className="p-4 rounded-lg">
                <Text className="text-sm text-center mb-3" style={{ color: colors.textSecondary }}>
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
                    className={`flex-row items-center py-2 px-3 rounded-md mb-1 ${
                      currentLang.code === lang.code ? 'bg-purple-500/30' : ''
                    } ${
                      focusedLang === lang.code ? 'bg-purple-500/30 border-2 border-purple-500' : ''
                    }`}
                  >
                    {currentLang.code === lang.code && (
                      <Text className="text-base font-bold w-6 text-center" style={{ color: colors.primary }}>✓</Text>
                    )}
                    <Text className="text-2xl mx-2">{lang.flag}</Text>
                    <Text
                      className={`text-base flex-1 ${
                        currentLang.code === lang.code ? 'font-bold' : ''
                      }`}
                      style={{ color: currentLang.code === lang.code ? colors.primary : colors.text }}
                    >
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

export default LanguageSelector;
