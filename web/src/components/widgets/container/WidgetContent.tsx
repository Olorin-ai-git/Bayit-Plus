/**
 * WidgetContent - Content renderer for different widget types
 *
 * Renders video, audio, iframe, or custom components based on widget.content.content_type.
 * Handles loading and error states.
 */

import React from 'react';
import { View, Text } from 'react-native';
import { platformClass } from '@/utils/platformClass';
import VideoPlayer from '@/components/player/VideoPlayer';
import AudioPlayer from '@/components/player/AudioPlayer';
import { YnetMivzakimWidget } from '../YnetMivzakimWidget';
import type { Widget } from '@/types/widget';
import logger from '@/utils/logger';

interface WidgetContentProps {
  widget: Widget;
  streamUrl?: string;
  loading: boolean;
  error: string | null;
  isMuted: boolean;
  refreshKey: number;
}

export function WidgetContent({
  widget,
  streamUrl,
  loading,
  error,
  isMuted,
  refreshKey,
}: WidgetContentProps) {
  // Loading state
  if (loading) {
    return (
      <View className="flex-1 justify-center items-center bg-black/80">
        <View className="w-6 h-6 rounded-full border-2 border-white/30 border-t-white" />
        <Text className="mt-2 text-xs text-neutral-400">Loading...</Text>
      </View>
    );
  }

  // Error state
  if (error) {
    return (
      <View className="flex-1 justify-center items-center bg-black/80">
        <Text className="text-xs text-neutral-400">{error}</Text>
      </View>
    );
  }

  const { content_type } = widget.content;

  try {
    switch (content_type) {
      case 'live_channel':
      case 'live':
        if (!streamUrl) {
          return (
            <View className="flex-1 justify-center items-center bg-black/80">
              <Text className="text-xs text-neutral-400">Stream unavailable</Text>
            </View>
          );
        }
        return (
          <div className="w-full h-full flex flex-1">
            <VideoPlayer
              src={streamUrl}
              title={widget.title}
              isLive={true}
              autoPlay={!isMuted}
            />
          </div>
        );

      case 'vod':
        if (!streamUrl) {
          return (
            <View className="flex-1 justify-center items-center bg-black/80">
              <Text className="text-xs text-neutral-400">Content unavailable</Text>
            </View>
          );
        }
        return (
          <div className="w-full h-full flex flex-1">
            <VideoPlayer
              src={streamUrl}
              title={widget.title}
              isLive={false}
              autoPlay={!isMuted}
            />
          </div>
        );

      case 'podcast':
        if (!streamUrl) {
          return (
            <View className="flex-1 justify-center items-center bg-black/80">
              <Text className="text-xs text-neutral-400">Podcast unavailable</Text>
            </View>
          );
        }
        return (
          <div className="w-full h-full flex flex-1">
            <AudioPlayer
              src={streamUrl}
              title={widget.title}
              cover={widget.cover_url || widget.icon || undefined}
              isLive={false}
            />
          </div>
        );

      case 'radio':
        if (!streamUrl) {
          return (
            <View className="flex-1 justify-center items-center bg-black/80">
              <Text className="text-xs text-neutral-400">Station unavailable</Text>
            </View>
          );
        }
        return (
          <div className="w-full h-full flex flex-1">
            <AudioPlayer
              src={streamUrl}
              title={widget.title}
              cover={widget.cover_url || widget.icon || undefined}
              isLive={true}
            />
          </div>
        );

      case 'iframe':
        if (!widget.content.iframe_url) {
          return (
            <View className="flex-1 justify-center items-center bg-black/80">
              <Text className="text-xs text-neutral-400">iFrame URL not configured</Text>
            </View>
          );
        }
        return (
          <iframe
            src={widget.content.iframe_url}
            title={widget.content.iframe_title || widget.title}
            className="w-full h-full border-none"
            sandbox="allow-scripts allow-same-origin"
            allow="autoplay; encrypted-media"
          />
        );

      case 'custom':
        const componentName = widget.content.component_name;
        const isYnetWidget = componentName === 'ynet_mivzakim' ||
          widget.title.includes('Ynet') ||
          widget.title.includes('מבזקי');

        if (isYnetWidget) {
          return <YnetMivzakimWidget key={refreshKey} />;
        }
        return (
          <View className="flex-1 justify-center items-center bg-black/80">
            <Text className="text-xs text-neutral-400">Unknown component: {componentName}</Text>
          </View>
        );

      default:
        return (
          <View className="flex-1 justify-center items-center bg-black/80">
            <Text className="text-xs text-neutral-400">No content configured</Text>
          </View>
        );
    }
  } catch (err) {
    logger.error('Error rendering content', { error: err, component: 'WidgetContent' });
    return (
      <View className="flex-1 justify-center items-center bg-black/80">
        <Text className="text-xs text-neutral-400">Error loading content</Text>
      </View>
    );
  }
}
