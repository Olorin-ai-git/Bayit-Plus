import React, { useState, useEffect, useRef } from 'react';
import {
  Image,
  View,
  ActivityIndicator,
  ImageProps,
  ImageURISource,
  Platform,
} from 'react-native';
import { colors } from '../theme';

interface OptimizedImageProps extends Omit<ImageProps, 'source'> {
  source: ImageURISource;
  placeholderColor?: string;
  showLoadingIndicator?: boolean;
  lazy?: boolean;
  /** Threshold in pixels for lazy loading (default: 300) */
  lazyThreshold?: number;
}

/**
 * LRU Cache for image loading states
 * Prevents redundant loading for images we've seen before
 */
class ImageCache {
  private cache: Map<string, { loaded: boolean; timestamp: number }>;
  private maxSize: number;

  constructor(maxSize = 100) {
    this.cache = new Map();
    this.maxSize = maxSize;
  }

  set(uri: string, loaded: boolean) {
    // Remove oldest entry if cache is full
    if (this.cache.size >= this.maxSize) {
      const oldestKey = Array.from(this.cache.entries())
        .sort((a, b) => a[1].timestamp - b[1].timestamp)[0][0];
      this.cache.delete(oldestKey);
    }
    this.cache.set(uri, { loaded, timestamp: Date.now() });
  }

  get(uri: string): boolean | undefined {
    return this.cache.get(uri)?.loaded;
  }

  has(uri: string): boolean {
    return this.cache.has(uri);
  }

  clear() {
    this.cache.clear();
  }
}

// Global image cache instance
const imageCache = new ImageCache(100);

/**
 * OptimizedImage Component
 *
 * Features:
 * - Lazy loading with configurable threshold
 * - LRU cache to prevent redundant loads
 * - Loading states with placeholder
 * - Optimized for both web and native platforms
 * - Automatic size optimization based on platform
 *
 * Usage:
 * ```tsx
 * <OptimizedImage
 *   source={{ uri: 'https://example.com/image.jpg' }}
 *   style={styles.image}
 *   lazy={true}
 *   lazyThreshold={500}
 * />
 * ```
 */
export const OptimizedImage: React.FC<OptimizedImageProps> = ({
  source,
  style,
  placeholderColor = colors.backgroundLighter,
  showLoadingIndicator = true,
  lazy = true,
  lazyThreshold = 300,
  ...props
}) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isVisible, setIsVisible] = useState(!lazy);
  const [hasError, setHasError] = useState(false);
  const viewRef = useRef<View>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);

  const uri = typeof source === 'object' ? source.uri : '';

  // Check cache on mount
  useEffect(() => {
    if (uri && imageCache.has(uri)) {
      const cached = imageCache.get(uri);
      if (cached) {
        setIsLoaded(true);
        setIsVisible(true);
      }
    }
  }, [uri]);

  // Lazy loading with IntersectionObserver (web only)
  useEffect(() => {
    if (!lazy || !uri || Platform.OS !== 'web') {
      setIsVisible(true);
      return;
    }

    if (viewRef.current && 'IntersectionObserver' in window) {
      observerRef.current = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              setIsVisible(true);
              observerRef.current?.disconnect();
            }
          });
        },
        {
          rootMargin: `${lazyThreshold}px`,
        }
      );

      // @ts-ignore - Web DOM element
      observerRef.current.observe(viewRef.current);
    } else {
      setIsVisible(true);
    }

    return () => {
      observerRef.current?.disconnect();
    };
  }, [lazy, lazyThreshold, uri]);

  const handleLoad = () => {
    setIsLoaded(true);
    if (uri) {
      imageCache.set(uri, true);
    }
  };

  const handleError = () => {
    setHasError(true);
    if (uri) {
      imageCache.set(uri, false);
    }
  };

  // Don't render anything if not visible (lazy loading)
  if (!isVisible) {
    return <View ref={viewRef} className="justify-center items-center" style={[style, { backgroundColor: placeholderColor }]} />;
  }

  // Show error placeholder
  if (hasError) {
    return (
      <View className="justify-center items-center" style={[style, { backgroundColor: placeholderColor }]}>
        <View className="justify-center items-center">
          <View className="w-6 h-6 rounded-full opacity-30" style={{ backgroundColor: colors.error }} />
        </View>
      </View>
    );
  }

  return (
    <View ref={viewRef} style={style}>
      {/* Loading placeholder */}
      {!isLoaded && (
        <View className="absolute inset-0 justify-center items-center" style={{ backgroundColor: placeholderColor }}>
          {showLoadingIndicator && (
            <ActivityIndicator size="small" color={colors.primary} />
          )}
        </View>
      )}

      {/* Actual image */}
      <Image
        {...props}
        source={source}
        style={style}
        onLoad={handleLoad}
        onError={handleError}
        // Native optimization props
        resizeMode={props.resizeMode || 'cover'}
        // @ts-ignore - Web optimization
        loading="lazy"
        // @ts-ignore - Web optimization
        decoding="async"
      />
    </View>
  );
};

export default OptimizedImage;
