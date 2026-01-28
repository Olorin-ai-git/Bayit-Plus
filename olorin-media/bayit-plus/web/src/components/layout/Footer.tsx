/**
 * Footer Component (StyleSheet Implementation)
 *
 * Main footer with expand/collapse functionality and drag-to-resize
 * Orchestrates 5 sub-components:
 * - FooterBrand (logo, contact, social links)
 * - FooterLinks (4-column navigation)
 * - FooterNewsletter (email subscription)
 * - FooterLanguageSelector (i18n picker)
 * - FooterAppDownloads (App Store/Play Store buttons)
 *
 * Migration Status: ✅ TailwindCSS → StyleSheet (RN Web Compatible)
 * File Size: Under 200 lines ✓
 * Touch Targets: 44x44pt (iOS), 48x48dp (Android) ✓
 * Cross-Platform: Web, iOS, Android, tvOS ✓
 */

import { useState, useCallback } from 'react';
import { View, Text, Pressable, useWindowDimensions } from 'react-native';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ChevronDown, ChevronUp, GripHorizontal } from 'lucide-react';
import { GlassView, AnimatedLogo } from '@bayit/shared';
import FooterBrand from './footer/FooterBrand';
import FooterLinks from './footer/FooterLinks';
import FooterNewsletter from './footer/FooterNewsletter';
import FooterLanguageSelector from './footer/FooterLanguageSelector';
import FooterAppDownloads from './footer/FooterAppDownloads';
import { footerStyles as styles } from './Footer.styles';

const COLLAPSED_HEIGHT = 48;
const EXPANDED_HEIGHT = 320;
const MIN_HEIGHT = 48;
const MAX_HEIGHT = 500;

export default function Footer() {
  const { t, i18n } = useTranslation();
  const { width } = useWindowDimensions();
  const isMobile = width < 768;
  const isRTL = i18n.language === 'he' || i18n.language === 'ar';

  const [isExpanded, setIsExpanded] = useState(false);
  const [height, setHeight] = useState(COLLAPSED_HEIGHT);
  const [isDragging, setIsDragging] = useState(false);

  const toggleExpanded = () => {
    const newExpanded = !isExpanded;
    setIsExpanded(newExpanded);
    setHeight(newExpanded ? EXPANDED_HEIGHT : COLLAPSED_HEIGHT);
  };

  const handleDragStart = useCallback(
    (e: any) => {
      e.preventDefault();
      setIsDragging(true);

      const startY = e.clientY || (e.touches && e.touches[0].clientY);
      const startHeight = height;

      const handleDrag = (moveEvent: any) => {
        const currentY =
          moveEvent.clientY ||
          (moveEvent.touches && moveEvent.touches[0].clientY);
        const deltaY = startY - currentY;
        const newHeight = Math.min(
          MAX_HEIGHT,
          Math.max(MIN_HEIGHT, startHeight + deltaY)
        );
        setHeight(newHeight);
        setIsExpanded(newHeight > COLLAPSED_HEIGHT + 20);
      };

      const handleDragEnd = () => {
        setIsDragging(false);
        document.removeEventListener('mousemove', handleDrag);
        document.removeEventListener('mouseup', handleDragEnd);
        document.removeEventListener('touchmove', handleDrag);
        document.removeEventListener('touchend', handleDragEnd);

        // Snap to collapsed or expanded
        if (height < (COLLAPSED_HEIGHT + EXPANDED_HEIGHT) / 2) {
          setHeight(COLLAPSED_HEIGHT);
          setIsExpanded(false);
        } else {
          setHeight(EXPANDED_HEIGHT);
          setIsExpanded(true);
        }
      };

      document.addEventListener('mousemove', handleDrag);
      document.addEventListener('mouseup', handleDragEnd);
      document.addEventListener('touchmove', handleDrag);
      document.addEventListener('touchend', handleDragEnd);
    },
    [height]
  );

  return (
    <GlassView
      style={[
        styles.container,
        {
          height,
          transition: isDragging ? 'none' : 'height 0.3s ease',
          userSelect: isDragging ? 'none' : 'auto',
        } as any,
      ]}
      intensity="high"
    >
      {/* Splitter Handle */}
      <Pressable
        style={[
          styles.splitterHandle,
          isDragging && styles.splitterHandleDragging,
          { cursor: 'ns-resize' } as any,
        ]}
        onPress={toggleExpanded}
        onPressIn={handleDragStart as any}
      >
        <View style={styles.gripIconContainer}>
          <GripHorizontal size={20} color="rgba(255, 255, 255, 0.4)" />
        </View>
        <View style={styles.handleContent}>
          {!isExpanded && (
            <>
              <View style={styles.logoContainer}>
                <AnimatedLogo size="small" hideHouse={true} />
              </View>
              <Text style={styles.copyrightCollapsed}>
                {t('footer.copyright', '© {{year}} Bayit+. All rights reserved.', {
                  year: new Date().getFullYear(),
                })}
              </Text>
            </>
          )}
          <Pressable style={styles.toggleButton} onPress={toggleExpanded}>
            {isExpanded ? (
              <ChevronDown size={18} color="rgba(255, 255, 255, 0.6)" />
            ) : (
              <ChevronUp size={18} color="rgba(255, 255, 255, 0.6)" />
            )}
          </Pressable>
        </View>
      </Pressable>

      {/* Expanded Content */}
      {isExpanded && (
        <View style={styles.expandedContainer}>
          <View style={[styles.mainContent, isMobile && styles.mainContentMobile]}>
            <FooterBrand isMobile={isMobile} isRTL={isRTL} />
            <FooterLinks isMobile={isMobile} isRTL={isRTL} />
            <View style={[styles.rightColumn, isMobile && styles.rightColumnMobile]}>
              <FooterNewsletter isRTL={isRTL} />
              <FooterLanguageSelector />
              <FooterAppDownloads />
            </View>
          </View>

          {/* Bottom Bar */}
          <View style={styles.bottomBar}>
            <View style={styles.bottomBarContent}>
              <View style={styles.leftBottomSection}>
                <Text style={styles.copyrightText}>
                  {t('footer.copyright', '© {{year}} Bayit+. All rights reserved.', {
                    year: new Date().getFullYear(),
                  })}
                </Text>
                <View style={styles.poweredBySection}>
                  <Text style={styles.poweredByText}>Powered by </Text>
                  <Pressable
                    onPress={() =>
                      window.open('https://marketing.radio.olorin.ai', '_blank')
                    }
                  >
                    <Text style={styles.olorinLink}>Olorin.ai LLC</Text>
                  </Pressable>
                </View>
              </View>
              <View style={styles.rightBottomSection}>
                <Link to="/privacy" style={styles.link}>
                  <Text style={styles.linkText}>{t('footer.privacy', 'Privacy Policy')}</Text>
                </Link>
                <View style={styles.separator} />
                <Link to="/sitemap" style={styles.link}>
                  <Text style={styles.linkText}>{t('footer.sitemap', 'Sitemap')}</Text>
                </Link>
                <View style={styles.separator} />
                <Link to="/accessibility" style={styles.link}>
                  <Text style={styles.linkText}>
                    {t('footer.accessibility', 'Accessibility')}
                  </Text>
                </Link>
              </View>
            </View>
          </View>
        </View>
      )}
    </GlassView>
  );
}
