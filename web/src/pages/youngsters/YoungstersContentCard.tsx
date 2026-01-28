/**
 * YoungstersContentCard - Individual content card with thumbnail and metadata
 */

import { useState } from 'react';
import { View, Text, Pressable, Image } from 'react-native';
import { Link } from 'react-router-dom';
import { Clock } from 'lucide-react';
import { Play } from 'lucide-react';
import { z } from 'zod';
import { platformClass } from '@/utils/platformClass';
import { CATEGORY_ICONS } from './constants';
import { YoungstersContentItemSchema } from './types';

const YoungstersContentCardPropsSchema = z.object({
  item: YoungstersContentItemSchema,
});

type YoungstersContentCardProps = z.infer<typeof YoungstersContentCardPropsSchema>;

/**
 * Content card for individual youngsters content item
 * Displays thumbnail, category badge, age rating, duration, and hover effects
 */
export default function YoungstersContentCard({ item }: YoungstersContentCardProps) {
  const [isHovered, setIsHovered] = useState(false);
  const categoryIcon = CATEGORY_ICONS[item.category || 'all'] || 'discover';

  return (
    <Link to={`/vod/${item.id}`} style={{ textDecoration: 'none', flex: 1 }}>
      <Pressable
        onHoverIn={() => setIsHovered(true)}
        onHoverOut={() => setIsHovered(false)}
      >
        <View
          className={platformClass(
            'mx-1 rounded-lg overflow-hidden bg-purple-500/10 transition-transform',
            'mx-1 rounded-lg overflow-hidden bg-purple-500/10'
          )}
          style={isHovered ? { transform: [{ scale: 1.02 }] } : undefined}
        >
          {/* Thumbnail Container */}
          <View className={platformClass('aspect-video relative')}>
            {item.thumbnail ? (
              <Image
                source={{ uri: item.thumbnail }}
                className={platformClass('w-full h-full')}
                resizeMode="cover"
              />
            ) : (
              <View className={platformClass(
                'w-full h-full bg-purple-500/10 justify-center items-center'
              )}>
                <Text className={platformClass('text-3xl')}>{categoryIcon}</Text>
              </View>
            )}

            {/* Category Badge */}
            <View className={platformClass(
              'absolute top-2 left-2 bg-purple-500 px-2 py-1 rounded-full'
            )}>
              <Text className={platformClass('text-sm')}>{categoryIcon}</Text>
            </View>

            {/* Age Rating Badge */}
            {item.age_rating !== undefined && (
              <View className={platformClass(
                'absolute top-2 right-2 bg-green-500/90 px-1.5 py-0.5 rounded'
              )}>
                <Text className={platformClass('text-xs font-bold text-white')}>
                  {item.age_rating}+
                </Text>
              </View>
            )}

            {/* Duration Badge */}
            {item.duration && (
              <View className={platformClass(
                'absolute bottom-2 right-2 flex-row items-center gap-1 bg-black/70 px-1.5 py-0.5 rounded'
              )}>
                <Clock size={10} color="#ffffff" />
                <Text className={platformClass('text-xs text-white')}>
                  {item.duration}
                </Text>
              </View>
            )}

            {/* Hover Overlay */}
            {isHovered && (
              <View className={platformClass(
                'absolute inset-0 bg-black/40 justify-center items-center'
              )}>
                <View className={platformClass(
                  'w-14 h-14 rounded-full bg-purple-500 justify-center items-center'
                )}>
                  <Play size={24} color="#581c87" fill="#581c87" />
                </View>
              </View>
            )}
          </View>

          {/* Content Info */}
          <View className={platformClass('p-2')}>
            <Text
              className={platformClass('text-lg font-semibold text-white')}
              numberOfLines={1}
            >
              {item.title}
            </Text>
            {item.description && (
              <Text
                className={platformClass('text-sm text-gray-400 mt-1')}
                numberOfLines={1}
              >
                {item.description}
              </Text>
            )}
            {item.educational_tags && item.educational_tags.length > 0 && (
              <View className={platformClass('flex-row gap-1 mt-2')}>
                {item.educational_tags.slice(0, 2).map((tag) => (
                  <View
                    key={tag}
                    className={platformClass('bg-purple-500/40 px-2 py-0.5 rounded-full')}
                  >
                    <Text className={platformClass('text-xs text-purple-200')}>
                      {tag}
                    </Text>
                  </View>
                ))}
              </View>
            )}
          </View>
        </View>
      </Pressable>
    </Link>
  );
}
