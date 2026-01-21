import { useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import ContentCard from './ContentCard';
import AnimatedCard from '@/components/common/AnimatedCard';
import { colors, spacing, borderRadius } from '@bayit/shared/theme';
import { GlassView } from '@bayit/shared/ui';
import { useDirection } from '@/hooks/useDirection';

interface ContentItem {
  id: string;
  title: string;
  thumbnail?: string;
  type?: string;
  duration?: string;
  year?: string;
  category?: string;
  category_name_en?: string;
  category_name_es?: string;
  available_subtitle_languages?: string[];
  has_subtitles?: boolean;
}

interface ContentCarouselProps {
  title: string;
  items?: ContentItem[];
  seeAllLink?: string;
  style?: any;
}

export default function ContentCarousel({
  title,
  items = [],
  seeAllLink,
  style,
}: ContentCarouselProps) {
  const { t } = useTranslation();
  const { isRTL, flexDirection, textAlign } = useDirection();
  const scrollRef = useRef<ScrollView>(null);

  const scroll = (direction: 'left' | 'right') => {
    // On web, we can use scrollTo with smooth behavior
    if (scrollRef.current) {
      const scrollAmount = 800;
      // Flip scroll direction for RTL
      const actualDirection = isRTL ? (direction === 'left' ? 'right' : 'left') : direction;
      // @ts-ignore - Web-specific scrollTo API
      scrollRef.current.scrollTo?.({
        x: actualDirection === 'right' ? scrollAmount : -scrollAmount,
        animated: true,
      });
    }
  };

  if (!items.length) return null;

  // Determine which chevron to show based on RTL
  const SeeAllChevron = isRTL ? ChevronLeft : ChevronRight;

  return (
    <View style={[styles.container, style]}>
      {/* Header */}
      <View style={[styles.header, { flexDirection }]}>
        <Text style={[styles.title, { textAlign }]}>{title}</Text>
        {seeAllLink && (
          <Link to={seeAllLink} style={{ textDecoration: 'none' }}>
            <View style={[styles.seeAllButton, { flexDirection }]}>
              <Text style={styles.seeAllText}>{t('common.seeAll', 'See All')}</Text>
              <SeeAllChevron size={16} color={colors.primary} />
            </View>
          </Link>
        )}
      </View>

      {/* Carousel Container */}
      <View style={styles.carouselContainer}>
        {/* Scroll Buttons */}
        <Pressable
          onPress={() => scroll('right')}
          style={[styles.scrollButton, isRTL ? styles.scrollButtonLeft : styles.scrollButtonRight]}
        >
          <GlassView style={styles.scrollButtonInner}>
            {isRTL ? <ChevronLeft size={28} color={colors.text} /> : <ChevronRight size={28} color={colors.text} />}
          </GlassView>
        </Pressable>
        <Pressable
          onPress={() => scroll('left')}
          style={[styles.scrollButton, isRTL ? styles.scrollButtonRight : styles.scrollButtonLeft]}
        >
          <GlassView style={styles.scrollButtonInner}>
            {isRTL ? <ChevronRight size={28} color={colors.text} /> : <ChevronLeft size={28} color={colors.text} />}
          </GlassView>
        </Pressable>

        {/* Items */}
        <ScrollView
          ref={scrollRef}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={[styles.scrollContent, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}
        >
          {items.map((item, index) => (
            <AnimatedCard
              key={item.id}
              index={index}
              variant="carousel"
              isRTL={isRTL}
              style={styles.cardWrapper}
            >
              <ContentCard content={item} />
            </AnimatedCard>
          ))}
        </ScrollView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    maxWidth: 1400,
    marginHorizontal: 'auto',
    paddingHorizontal: spacing.md,
    width: '100%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.text,
  },
  seeAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  seeAllText: {
    fontSize: 14,
    color: colors.primary,
  },
  carouselContainer: {
    position: 'relative',
  },
  scrollButton: {
    position: 'absolute',
    top: '50%',
    zIndex: 10,
    // @ts-ignore
    transform: [{ translateY: -48 }],
    opacity: 0,
    // @ts-ignore - Web hover support
    ':hover': {
      opacity: 1,
    },
  },
  scrollButtonRight: {
    right: 0,
  },
  scrollButtonLeft: {
    left: 0,
  },
  scrollButtonInner: {
    width: 48,
    height: 96,
    borderRadius: borderRadius.lg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContent: {
    gap: spacing.md,
    paddingBottom: spacing.md,
    paddingHorizontal: spacing.md,
  },
  cardWrapper: {
    width: 220,
    flexShrink: 0,
  },
});
