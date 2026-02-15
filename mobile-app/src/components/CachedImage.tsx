import React from 'react'
import { StyleSheet, View, ViewStyle } from 'react-native'
import FastImage, { FastImageProps, Priority, ResizeMode } from 'react-native-fast-image'
import { theme } from '../theme'

interface CachedImageProps extends Omit<FastImageProps, 'source'> {
  uri: string
  style?: ViewStyle
  resizeMode?: ResizeMode
  priority?: Priority
  fallback?: React.ReactNode
}

export function CachedImage({
  uri,
  style,
  resizeMode = FastImage.resizeMode.cover,
  priority = FastImage.priority.normal,
  fallback,
  ...props
}: CachedImageProps) {
  if (!uri) {
    return <View style={[styles.fallback, style]}>{fallback}</View>
  }

  return (
    <FastImage
      source={{
        uri,
        priority,
        cache: FastImage.cacheControl.immutable,
      }}
      style={style}
      resizeMode={resizeMode}
      {...props}
    />
  )
}

export const ImageCache = {
  async preload(uris: string[]): Promise<void> {
    await FastImage.preload(
      uris.map(uri => ({
        uri,
        priority: FastImage.priority.high,
        cache: FastImage.cacheControl.immutable,
      }))
    )
  },

  async clearCache(): Promise<void> {
    await FastImage.clearMemoryCache()
    await FastImage.clearDiskCache()
  },

  async getCacheSize(): Promise<string> {
    const stats = await FastImage.getCachePath()
    return stats || 'Unknown'
  },
}

const styles = StyleSheet.create({
  fallback: {
    backgroundColor: theme.colors.glassBackground,
    justifyContent: 'center',
    alignItems: 'center',
  },
})
