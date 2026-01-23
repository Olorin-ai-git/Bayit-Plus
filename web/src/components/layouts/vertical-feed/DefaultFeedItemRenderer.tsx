/**
 * DefaultFeedItemRenderer Component
 * Default renderer combining FeedItem and FeedOverlay
 */

import { View } from 'react-native';
import { FeedItem as FeedItemType } from './schemas';
import { FeedItem } from './FeedItem';
import { FeedOverlay } from './FeedOverlay';

interface DefaultFeedItemRendererProps {
  item: FeedItemType;
  index: number;
  isActive: boolean;
  autoPlay: boolean;
}

export function DefaultFeedItemRenderer({
  item,
  index,
  isActive,
  autoPlay,
}: DefaultFeedItemRendererProps) {
  return (
    <View className="flex-1 relative">
      <FeedItem
        item={item}
        index={index}
        isActive={isActive}
        autoPlay={autoPlay}
      />
      <FeedOverlay item={item} />
    </View>
  );
}
