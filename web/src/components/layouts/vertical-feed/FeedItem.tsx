/**
 * FeedItem Component
 * Renders individual feed item with video/image content
 */

import { View, Image, StyleSheet } from 'react-native';
import { useRef, useEffect } from 'react';
import { FeedItem as FeedItemType } from './schemas';

interface FeedItemProps {
  item: FeedItemType;
  index: number;
  isActive: boolean;
  autoPlay: boolean;
}

export function FeedItem({ item, index, isActive, autoPlay }: FeedItemProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    if (isActive && autoPlay) {
      video.play().catch(() => {
        // Auto-play prevented
      });
    } else {
      video.pause();
    }
  }, [isActive, autoPlay]);

  return (
    <View className="flex-1 relative" style={[isActive ? styles.zActive : styles.zInactive]}>
      {item.type === 'video' || item.stream_url ? (
        <video
          ref={videoRef}
          src={item.stream_url || item.url}
          poster={item.thumbnail}
          muted
          playsInline
          loop
          className="w-full h-full object-cover"
        />
      ) : item.thumbnail ? (
        <Image
          source={{ uri: item.thumbnail }}
          className="w-full h-full"
          resizeMode="cover"
        />
      ) : (
        <View className="w-full h-full bg-black/30" />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  zActive: {
    zIndex: 10,
  },
  zInactive: {
    zIndex: 0,
  },
});
