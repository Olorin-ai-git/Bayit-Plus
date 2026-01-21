import React from 'react';
import { View, Text, Pressable, ScrollView, Platform } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { colors, spacing, borderRadius, fontSize } from '../theme';

interface BreadcrumbItem {
  path: string;
  label: string;
}

interface GlassBreadcrumbsProps {
  items: BreadcrumbItem[];
  onNavigate: (path: string) => void;
  isRTL?: boolean;
  maxItems?: number;
}

export const GlassBreadcrumbs: React.FC<GlassBreadcrumbsProps> = ({
  items,
  onNavigate,
  isRTL = false,
  maxItems = 10,
}) => {
  // Don't render if only one item or empty
  if (items.length <= 1) {
    return null;
  }

  const displayItems = items.slice(-maxItems);
  const chevron = isRTL ? '‹' : '›';
  const flexDirection = isRTL ? 'row-reverse' : 'row';

  const renderContent = () => (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ flexDirection, alignItems: 'center', gap: spacing.xs, paddingVertical: spacing.xs }}
    >
      {displayItems.map((item, index) => {
        const isLast = index === displayItems.length - 1;
        const isFirst = index === 0;

        return (
          <View key={`${item.path}-${index}`} className={`flex items-center ${isRTL ? 'flex-row-reverse' : 'flex-row'}`}>
            <Pressable
              onPress={() => !isLast && onNavigate(item.path)}
              className={`flex items-center px-4 py-2 rounded-lg max-w-[180px] ${isRTL ? 'flex-row-reverse' : 'flex-row'} ${
                isLast ? 'bg-purple-500/20 border border-purple-500/40' : ''
              }`}
              disabled={isLast}
            >
              {isFirst && (
                <Text className={`text-xs ${isRTL ? 'ml-1.5' : 'mr-1.5'}`}>🏠</Text>
              )}
              <Text
                className={`text-sm ${
                  isLast ? 'text-white font-semibold' : 'text-purple-400 font-medium'
                }`}
                numberOfLines={1}
              >
                {item.label}
              </Text>
            </Pressable>

            {!isLast && (
              <View className="px-1">
                <Text className="text-base text-purple-400 font-semibold opacity-70">{chevron}</Text>
              </View>
            )}
          </View>
        );
      })}
    </ScrollView>
  );

  // Web: Use CSS backdrop-filter
  if (Platform.OS === 'web') {
    return (
      <View
        // @ts-ignore - Web-specific className
        className="glass-light px-4 py-2 border-b border-white/10 backdrop-blur-xl bg-white/5"
      >
        {renderContent()}
      </View>
    );
  }

  // Native: Use gradient fallback
  return (
    <LinearGradient
      colors={[colors.glass, colors.glassStrong]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 0 }}
      className="px-4 py-2 border-b border-white/10"
      style={{ borderBottomColor: colors.glassBorder }}
    >
      {renderContent()}
    </LinearGradient>
  );
};

export default GlassBreadcrumbs;
