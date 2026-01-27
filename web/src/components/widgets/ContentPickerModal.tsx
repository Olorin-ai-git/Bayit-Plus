/**
 * ContentPickerModal Component
 * Modal for selecting content (channels, podcasts, shows) for widgets
 * GLASS DESIGN SYSTEM - Glassmorphic UI
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  Pressable,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { Search, Tv, Radio, Podcast, Film, Headphones } from 'lucide-react';
import { GlassModal, GlassInput } from '@bayit/shared/ui';
import { colors, spacing, borderRadius } from '@olorin/design-tokens';
import { useDirection } from '@/hooks/useDirection';
import { liveService, radioService, podcastService } from '@/services/api';
import { audiobookService } from '@/services/audiobookService';
import logger from '@/utils/logger';
import type { ContentItem } from './form/ContentSelectionSection';

interface ContentPickerModalProps {
  visible: boolean;
  onClose: () => void;
  onSelect: (content: ContentItem) => void;
}

type ContentType = 'channels' | 'podcasts' | 'radio' | 'vod' | 'audiobooks';

interface LiveChannel {
  id: string;
  name: string;
  logo?: string;
}

interface Podcast {
  id: string;
  title: string;
  cover?: string;
}

interface RadioStation {
  id: string;
  name: string;
  logo?: string;
}

interface AudiobookItem {
  id: string;
  title: string;
  thumbnail?: string;
  author?: string;
}

export const ContentPickerModal: React.FC<ContentPickerModalProps> = ({
  visible,
  onClose,
  onSelect,
}) => {
  const { t } = useTranslation();
  const { textAlign, flexDirection } = useDirection();

  const [activeTab, setActiveTab] = useState<ContentType>('channels');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [channels, setChannels] = useState<LiveChannel[]>([]);
  const [podcasts, setPodcasts] = useState<Podcast[]>([]);
  const [radioStations, setRadioStations] = useState<RadioStation[]>([]);
  const [audiobooks, setAudiobooks] = useState<AudiobookItem[]>([]);

  // Load content based on active tab
  useEffect(() => {
    if (visible) {
      loadContent();
    }
  }, [visible, activeTab]);

  const loadContent = async () => {
    setLoading(true);
    try {
      if (activeTab === 'channels') {
        logger.info('Loading channels...', 'ContentPickerModal');
        const response = await liveService.getChannels();
        logger.info(`Loaded ${response.channels?.length || 0} live channels`, 'ContentPickerModal');

        setChannels((response.channels || []).map((item: any) => ({
          id: item.id,
          name: item.name,
          logo: item.thumbnail || item.logo,
        })));
      } else if (activeTab === 'podcasts') {
        logger.info('Loading podcasts...', 'ContentPickerModal');
        const response = await podcastService.getShows();
        logger.info(`Loaded ${response.shows?.length || 0} podcasts`, 'ContentPickerModal');
        setPodcasts((response.shows || []).map((item: any) => ({
          id: item.id,
          title: item.title,
          cover: item.cover,
        })));
      } else if (activeTab === 'radio') {
        logger.info('Loading radio stations...', 'ContentPickerModal');
        const response = await radioService.getStations({});
        logger.info(`Loaded ${response.stations?.length || 0} radio stations`, 'ContentPickerModal');

        setRadioStations((response.stations || []).map((item: any) => ({
          id: item.id,
          name: item.name,
          logo: item.logo || item.thumbnail,
        })));
      } else if (activeTab === 'audiobooks') {
        logger.info('Loading audiobooks...', 'ContentPickerModal');
        const response = await audiobookService.getAudiobooks({ page_size: 100 });
        logger.info(`Loaded ${response.items?.length || 0} audiobooks`, 'ContentPickerModal');

        // Filter to only parent audiobooks (is_series=true, no series_id)
        const parentAudiobooks = (response.items || []).filter((item: any) =>
          item.is_series === true && !item.series_id
        );

        setAudiobooks(parentAudiobooks.map((item: any) => ({
          id: item.id,
          title: item.title,
          thumbnail: item.thumbnail || item.poster_url,
          author: item.author,
        })));
      }
    } catch (err) {
      logger.error('Failed to load content', 'ContentPickerModal', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectItem = (item: any) => {
    let contentItem: ContentItem;

    if (activeTab === 'channels') {
      contentItem = {
        id: item.id,
        title: item.name,
        type: 'live_channel',
        thumbnail: item.logo,
      };
    } else if (activeTab === 'podcasts') {
      contentItem = {
        id: item.id,
        title: item.title,
        type: 'podcast',
        thumbnail: item.cover,
      };
    } else if (activeTab === 'radio') {
      contentItem = {
        id: item.id,
        title: item.name,
        type: 'radio',
        thumbnail: item.logo,
      };
    } else if (activeTab === 'audiobooks') {
      contentItem = {
        id: item.id,
        title: item.title,
        type: 'audiobook',
        thumbnail: item.thumbnail,
      };
    } else {
      contentItem = {
        id: item.id,
        title: item.title || item.name,
        type: 'vod',
      };
    }

    onSelect(contentItem);
  };

  // Filter content based on search
  const filteredChannels = channels.filter((ch) =>
    ch.name.toLowerCase().includes(searchQuery.toLowerCase())
  );
  const filteredPodcasts = podcasts.filter((pod) =>
    pod.title.toLowerCase().includes(searchQuery.toLowerCase())
  );
  const filteredRadio = radioStations.filter((station) =>
    station.name.toLowerCase().includes(searchQuery.toLowerCase())
  );
  const filteredAudiobooks = audiobooks.filter((book) =>
    book.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (book.author && book.author.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const renderTabButton = (type: ContentType, icon: React.ReactNode, label: string) => {
    const isActive = activeTab === type;
    return (
      <Pressable
        style={[styles.tabButton, isActive && styles.tabButtonActive]}
        onPress={() => setActiveTab(type)}
      >
        <View style={styles.tabIcon}>{icon}</View>
        <Text style={[styles.tabLabel, isActive && styles.tabLabelActive]}>{label}</Text>
      </Pressable>
    );
  };

  const renderContentList = () => {
    if (loading) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>{t('common.loading')}</Text>
        </View>
      );
    }

    let items: any[] = [];
    if (activeTab === 'channels') items = filteredChannels;
    else if (activeTab === 'podcasts') items = filteredPodcasts;
    else if (activeTab === 'radio') items = filteredRadio;
    else if (activeTab === 'audiobooks') items = filteredAudiobooks;

    if (items.length === 0) {
      return (
        <View style={styles.emptyContainer}>
          <View style={styles.emptyIconContainer}>
            {activeTab === 'channels' && <Tv size={48} color={colors.textSecondary} />}
            {activeTab === 'podcasts' && <Podcast size={48} color={colors.textSecondary} />}
            {activeTab === 'radio' && <Radio size={48} color={colors.textSecondary} />}
            {activeTab === 'audiobooks' && <Headphones size={48} color={colors.textSecondary} />}
          </View>
          <Text style={styles.emptyText}>
            {searchQuery
              ? t('common.noResults', 'No results found')
              : t('widgets.contentPicker.noContent', 'No content available')}
          </Text>
          <Text style={styles.emptySubtext}>
            {!searchQuery && t('widgets.contentPicker.tryAnotherTab', 'Try selecting another category')}
          </Text>
        </View>
      );
    }

    return (
      <ScrollView style={styles.contentList} contentContainerStyle={styles.contentGrid}>
        {items.map((item) => {
          const thumbnail = item.logo || item.cover || item.thumbnail;
          return (
            <Pressable
              key={item.id}
              style={({ pressed, hovered }: any) => [
                styles.contentCard,
                (hovered || pressed) && styles.contentCardHover,
              ]}
              onPress={() => handleSelectItem(item)}
            >
              {({ hovered }: any) => (
                <>
                  <View style={styles.thumbnailContainer}>
                    {thumbnail ? (
                      <View style={styles.logoWrapper}>
                        <img
                          src={thumbnail}
                          alt={item.name || item.title}
                          style={{
                            maxWidth: '100%',
                            maxHeight: '100%',
                            objectFit: 'contain',
                          }}
                        />
                      </View>
                    ) : (
                      <View style={styles.thumbnailPlaceholder}>
                        {activeTab === 'channels' && <Tv size={32} color={colors.primary} />}
                        {activeTab === 'podcasts' && <Podcast size={32} color={colors.primary} />}
                        {activeTab === 'radio' && <Radio size={32} color={colors.primary} />}
                        {activeTab === 'vod' && <Film size={32} color={colors.primary} />}
                        {activeTab === 'audiobooks' && <Headphones size={32} color={colors.primary} />}
                      </View>
                    )}
                    <View style={[styles.thumbnailOverlay, hovered && styles.thumbnailOverlayHover]}>
                      <View style={styles.selectBadge}>
                        <Text style={styles.selectBadgeText}>{t('common.select', 'Select')}</Text>
                      </View>
                    </View>
                  </View>
                  <View style={styles.cardContent}>
                    <Text style={[styles.cardTitle, { textAlign }]} numberOfLines={2}>
                      {item.name || item.title}
                    </Text>
                    {item.description && (
                      <Text style={[styles.cardDescription, { textAlign }]} numberOfLines={2}>
                        {item.description}
                      </Text>
                    )}
                  </View>
                </>
              )}
            </Pressable>
          );
        })}
      </ScrollView>
    );
  };

  return (
    <GlassModal
      visible={visible}
      title={t('widgets.form.selectContent', 'Select Content')}
      onClose={onClose}
      dismissable
      buttons={[]}
    >
      <View style={styles.container}>
        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <Search size={18} color={colors.textSecondary} />
          <TextInput
            style={styles.searchInput}
            placeholder={t('common.search', 'Search')}
            placeholderTextColor={colors.textSecondary}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>

        {/* Content Type Tabs */}
        <View style={[styles.tabs, { flexDirection }]}>
          {renderTabButton('channels', <Tv size={18} color={activeTab === 'channels' ? colors.text : colors.textSecondary} />, t('nav.liveChannels', 'Channels'))}
          {renderTabButton('podcasts', <Podcast size={18} color={activeTab === 'podcasts' ? colors.text : colors.textSecondary} />, t('nav.podcasts', 'Podcasts'))}
          {renderTabButton('radio', <Radio size={18} color={activeTab === 'radio' ? colors.text : colors.textSecondary} />, t('nav.radio', 'Radio'))}
          {renderTabButton('audiobooks', <Headphones size={18} color={activeTab === 'audiobooks' ? colors.text : colors.textSecondary} />, t('nav.audiobooks', 'Audiobooks'))}
        </View>

        {/* Content List */}
        {renderContentList()}
      </View>
    </GlassModal>
  );
};

const styles = StyleSheet.create({
  container: {
    minHeight: 400,
    maxHeight: 500,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: borderRadius.md,
    marginBottom: spacing.md,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: colors.text,
    padding: 0,
    minHeight: 'auto' as any,
    outlineStyle: 'none' as any,
    backgroundColor: 'transparent',
  },
  tabs: {
    flexDirection: 'row',
    gap: spacing.xs,
    marginBottom: spacing.md,
  },
  tabButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.xs,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
  },
  tabButtonActive: {
    backgroundColor: colors.primary[600],
    borderColor: colors.primary.DEFAULT,
  },
  tabIcon: {
    width: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  tabLabelActive: {
    color: colors.text,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
    paddingVertical: spacing.xl,
  },
  loadingText: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xl,
    gap: spacing.md,
  },
  emptyIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(107, 33, 168, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    textAlign: 'center',
  },
  emptySubtext: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: spacing.xs,
  },
  contentList: {
    flex: 1,
  },
  contentGrid: {
    display: 'grid' as any,
    gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))' as any,
    gap: spacing.md,
    paddingBottom: spacing.md,
  },
  contentCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    overflow: 'hidden',
    cursor: 'pointer' as any,
    transition: 'all 0.2s ease' as any,
  },
  contentCardHover: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderColor: colors.primary.DEFAULT,
    transform: [{ scale: 1.02 }],
    boxShadow: '0 8px 24px rgba(107, 33, 168, 0.3)' as any,
  },
  thumbnailContainer: {
    width: '100%',
    aspectRatio: 1,
    position: 'relative',
    backgroundColor: 'rgba(255, 255, 255, 0.98)',
    overflow: 'hidden',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  } as any,
  logoWrapper: {
    width: '100%',
    height: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.md,
  } as any,
  thumbnailPlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: 'rgba(107, 33, 168, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  thumbnailOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    backdropFilter: 'blur(4px)' as any,
    WebkitBackdropFilter: 'blur(4px)' as any,
    alignItems: 'center',
    justifyContent: 'center',
    opacity: 0,
    transition: 'opacity 0.2s ease' as any,
  },
  thumbnailOverlayHover: {
    opacity: 1,
  },
  selectBadge: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    backgroundColor: colors.primary.DEFAULT,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    boxShadow: '0 4px 12px rgba(107, 33, 168, 0.4)' as any,
  },
  selectBadgeText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.text,
    textTransform: 'uppercase' as any,
    letterSpacing: 1,
  },
  cardContent: {
    padding: spacing.md,
    gap: spacing.xs,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
  },
  cardTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text,
    lineHeight: 18,
    textAlign: 'center',
  },
  cardDescription: {
    fontSize: 12,
    color: colors.textSecondary,
    lineHeight: 18,
  },
});

export default ContentPickerModal;
