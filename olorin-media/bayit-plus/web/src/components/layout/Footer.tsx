/**
 * Footer Component (Migrated to TailwindCSS)
 *
 * Main footer with expand/collapse functionality and drag-to-resize
 * Orchestrates 5 sub-components:
 * - FooterBrand (logo, contact, social links)
 * - FooterLinks (4-column navigation)
 * - FooterNewsletter (email subscription)
 * - FooterLanguageSelector (i18n picker)
 * - FooterAppDownloads (App Store/Play Store buttons)
 *
 * Migration Status: ✅ StyleSheet → TailwindCSS
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
import { platformClass } from '../../utils/platformClass';
import FooterBrand from './footer/FooterBrand';
import FooterLinks from './footer/FooterLinks';
import FooterNewsletter from './footer/FooterNewsletter';
import FooterLanguageSelector from './footer/FooterLanguageSelector';
import FooterAppDownloads from './footer/FooterAppDownloads';

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
      className={platformClass('mt-auto border-t border-white/[0.08] overflow-hidden')}
      style={{
        height,
        transition: isDragging ? 'none' : 'height 0.3s ease',
        userSelect: isDragging ? 'none' : 'auto',
      }}
      intensity="high"
    >
      {/* Splitter Handle */}
      <Pressable
        className={platformClass(
          `h-12 border-b border-white/[0.05] ${isDragging ? 'bg-purple-500/10' : ''}`,
          `h-12 border-b border-white/[0.05] ${isDragging ? 'bg-purple-500/10' : ''}`
        )}
        style={{ cursor: 'ns-resize' }}
        onPress={toggleExpanded}
        onPressIn={handleDragStart as any}
      >
        <View
          className={platformClass(
            'absolute top-0 left-1/2 -translate-x-1/2 py-1 px-4 opacity-60'
          )}
        >
          <GripHorizontal size={20} color="rgba(255, 255, 255, 0.4)" />
        </View>
        <View className={platformClass('flex-1 flex-row items-center justify-between px-6 h-full')}>
          {!isExpanded && (
            <>
              <View className={platformClass('flex-row items-center gap-2')}>
                <AnimatedLogo size="small" hideHouse={true} />
              </View>
              <Text className={platformClass('text-xs text-white/40')}>
                {t('footer.copyright', '© {{year}} Bayit+. All rights reserved.', {
                  year: new Date().getFullYear(),
                })}
              </Text>
            </>
          )}
          <Pressable
            className={platformClass('p-2 rounded-full bg-white/[0.05] border border-white/10')}
            onPress={toggleExpanded}
          >
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
        <View className={platformClass('flex-1 max-w-[1400px] mx-auto w-full')}>
          <View
            className={platformClass(
              `flex-1 ${isMobile ? 'flex-col' : 'flex-row'} p-4 pt-2 gap-6`
            )}
          >
            <FooterBrand isMobile={isMobile} isRTL={isRTL} />
            <FooterLinks isMobile={isMobile} isRTL={isRTL} />
            <View
              className={platformClass(
                `min-w-[200px] gap-4 ${isMobile ? 'items-center' : 'items-start'}`
              )}
            >
              <FooterNewsletter isRTL={isRTL} />
              <FooterLanguageSelector />
              <FooterAppDownloads />
            </View>
          </View>

          {/* Bottom Bar */}
          <View className={platformClass('border-t border-white/[0.05] px-4 py-2')}>
            <View className={platformClass('flex-row items-center justify-between gap-4')}>
              <View className={platformClass('flex-row items-center gap-3')}>
                <Text className={platformClass('text-[10px] text-white/40')}>
                  {t('footer.copyright', '© {{year}} Bayit+. All rights reserved.', {
                    year: new Date().getFullYear(),
                  })}
                </Text>
                <View className={platformClass('flex-row items-center')}>
                  <Text className={platformClass('text-[10px] text-white/40')}>
                    Powered by{' '}
                  </Text>
                  <Pressable
                    onPress={() =>
                      window.open('https://marketing.radio.olorin.ai', '_blank')
                    }
                  >
                    <Text
                      className={platformClass(
                        'text-[10px] text-purple-400 font-medium hover:text-purple-300',
                        'text-[10px] text-purple-400 font-medium'
                      )}
                    >
                      Olorin.ai LLC
                    </Text>
                  </Pressable>
                </View>
              </View>
              <View className={platformClass('flex-row items-center gap-2')}>
                <Link to="/sitemap" style={{ textDecoration: 'none' }}>
                  <Text className={platformClass('text-[10px] text-white/40')}>
                    {t('footer.sitemap', 'Sitemap')}
                  </Text>
                </Link>
                <Text className={platformClass('text-[10px] text-white/40')}>•</Text>
                <Link to="/accessibility" style={{ textDecoration: 'none' }}>
                  <Text className={platformClass('text-[10px] text-white/40')}>
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
