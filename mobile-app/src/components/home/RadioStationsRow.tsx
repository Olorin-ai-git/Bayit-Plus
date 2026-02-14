/**
 * RadioStationsRow - Horizontal scrollable row of radio stations
 *
 * Circular station logos with live/playing indicator animation.
 * Supports RTL layout and accessibility.
 */
import React, { useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  Image,
  Pressable,
  StyleSheet,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useDirection } from '@bayit/shared-hooks';
import { colors, spacing, borderRadius, fontSize } from '@olorin/design-tokens';
import { NativeIcon } from '@olorin/shared-icons/native';
import logger from '@/utils/logger';

const moduleLogger = logger.scope('RadioStationsRow');

interface RadioStation {
  id: string;
  name: string;
  logoUrl: string;
  isLive: boolean;
}

interface RadioStationsRowProps {
  stations: RadioStation[];
  onStationPress: (station: RadioStation) => void;
}

const STATION_SIZE = 80;
const LOGO_SIZE = 56;

export const RadioStationsRow: React.FC<RadioStationsRowProps> = ({
  stations,
  onStationPress,
}) => {
  const { t } = useTranslation();
  const { isRTL } = useDirection();

  const handlePress = useCallback(
    (station: RadioStation) => {
      moduleLogger.debug('Station pressed', { stationId: station.id });
      onStationPress(station);
    },
    [onStationPress],
  );

  const renderStation = useCallback(
    ({ item }: { item: RadioStation }) => (
      <Pressable
        onPress={() => handlePress(item)}
        style={styles.stationItem}
        accessibilityLabel={item.name}
        accessibilityHint={
          item.isLive
            ? t('radio.liveStationHint', { name: item.name })
            : t('radio.stationHint', { name: item.name })
        }
        accessibilityRole="button"
      >
        <View style={[styles.logoContainer, item.isLive && styles.logoContainerLive]}>
          {item.logoUrl ? (
            <Image
              source={{ uri: item.logoUrl }}
              style={styles.logo}
              resizeMode="cover"
            />
          ) : (
            <View style={styles.logoPlaceholder}>
              <NativeIcon name="radio" size="lg" color={colors.textMuted} />
            </View>
          )}
          {item.isLive && (
            <View style={styles.liveIndicator}>
              <View style={styles.liveDot} />
            </View>
          )}
        </View>
        <Text
          style={[styles.stationName, { textAlign: isRTL ? 'right' : 'left' }]}
          numberOfLines={2}
        >
          {item.name}
        </Text>
      </Pressable>
    ),
    [handlePress, isRTL, t],
  );

  if (stations.length === 0) return null;

  return (
    <View
      style={styles.container}
      accessibilityLabel={t('radio.stationsRowLabel')}
      accessibilityRole="list"
    >
      <Text style={[styles.sectionTitle, { textAlign: isRTL ? 'right' : 'left' }]}>
        {t('radio.stations')}
      </Text>
      <FlatList
        data={stations}
        renderItem={renderStation}
        keyExtractor={(item) => item.id}
        horizontal
        inverted={isRTL}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.md,
  },
  sectionTitle: {
    fontSize: fontSize.lg,
    fontWeight: '600',
    color: colors.text,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.sm,
  },
  listContent: {
    paddingHorizontal: spacing.md,
    gap: spacing.md,
  },
  stationItem: {
    width: STATION_SIZE,
    alignItems: 'center',
  },
  logoContainer: {
    width: LOGO_SIZE,
    height: LOGO_SIZE,
    borderRadius: LOGO_SIZE / 2,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: colors.glassBorder,
    marginBottom: spacing.xs,
  },
  logoContainerLive: {
    borderColor: colors.error,
    borderWidth: 2,
  },
  logo: {
    width: '100%',
    height: '100%',
  },
  logoPlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: colors.glassMedium,
    justifyContent: 'center',
    alignItems: 'center',
  },
  liveIndicator: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: colors.background,
    borderRadius: borderRadius.full,
    padding: 2,
  },
  liveDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.error,
  },
  stationName: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: fontSize.xs * 1.3,
  },
});
