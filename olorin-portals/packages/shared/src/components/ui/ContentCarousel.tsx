/**
 * ContentCarousel Component
 * Horizontal scrolling carousel for content preview
 * Supports RTL and respects prefers-reduced-motion
 */

import React, { useRef, useCallback, useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { glassTokens } from '../../styles/glass-tokens';

export interface ContentItem {
  image: string;
  title: string;
  category: string;
}

export interface ContentCarouselProps {
  items: ContentItem[];
  autoplay?: boolean;
  rtl?: boolean;
  reducedMotion?: boolean;
  className?: string;
}

export const ContentCarousel: React.FC<ContentCarouselProps> = ({
  items,
  autoplay = false,
  rtl = false,
  reducedMotion = false,
  className = '',
}) => {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  const checkScrollButtons = useCallback(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const { scrollLeft, scrollWidth, clientWidth } = container;
    const isAtStart = rtl ? scrollLeft >= -5 : scrollLeft <= 5;
    const isAtEnd = rtl
      ? Math.abs(scrollLeft) + clientWidth >= scrollWidth - 5
      : scrollLeft + clientWidth >= scrollWidth - 5;

    setCanScrollLeft(rtl ? isAtEnd : !isAtStart);
    setCanScrollRight(rtl ? !isAtStart : !isAtEnd);
  }, [rtl]);

  const scroll = useCallback(
    (direction: 'left' | 'right') => {
      const container = scrollContainerRef.current;
      if (!container) return;

      const scrollAmount = container.clientWidth * 0.8;
      const scrollDirection = rtl ? (direction === 'left' ? 1 : -1) : direction === 'left' ? -1 : 1;

      container.scrollBy({
        left: scrollAmount * scrollDirection,
        behavior: reducedMotion ? 'auto' : 'smooth',
      });
    },
    [rtl, reducedMotion]
  );

  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    checkScrollButtons();
    container.addEventListener('scroll', checkScrollButtons);
    window.addEventListener('resize', checkScrollButtons);

    return () => {
      container.removeEventListener('scroll', checkScrollButtons);
      window.removeEventListener('resize', checkScrollButtons);
    };
  }, [checkScrollButtons]);

  useEffect(() => {
    if (!autoplay || reducedMotion) return;

    const interval = setInterval(() => {
      if (canScrollRight) {
        scroll('right');
      } else {
        scroll('left');
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [autoplay, reducedMotion, canScrollRight, scroll]);

  if (items.length === 0) return null;

  return (
    <div className={`relative ${className}`}>
      {/* Navigation Buttons */}
      {canScrollLeft && (
        <button
          onClick={() => scroll('left')}
          className={`absolute left-4 top-1/2 -translate-y-1/2 z-10 ${glassTokens.layers.card} ${glassTokens.states.hover} rounded-full p-3`}
          aria-label={rtl ? 'Next items' : 'Previous items'}
        >
          {rtl ? <ChevronRight className="w-6 h-6 text-white" /> : <ChevronLeft className="w-6 h-6 text-white" />}
        </button>
      )}

      {canScrollRight && (
        <button
          onClick={() => scroll('right')}
          className={`absolute right-4 top-1/2 -translate-y-1/2 z-10 ${glassTokens.layers.card} ${glassTokens.states.hover} rounded-full p-3`}
          aria-label={rtl ? 'Previous items' : 'Next items'}
        >
          {rtl ? <ChevronLeft className="w-6 h-6 text-white" /> : <ChevronRight className="w-6 h-6 text-white" />}
        </button>
      )}

      {/* Carousel Container */}
      <div
        ref={scrollContainerRef}
        className={`flex gap-6 overflow-x-auto scrollbar-hide ${rtl ? 'flex-row-reverse' : ''}`}
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {items.map((item, index) => (
          <div
            key={index}
            className={`flex-shrink-0 w-80 ${glassTokens.layers.card} ${glassTokens.states.hover} rounded-xl overflow-hidden cursor-pointer`}
            role="article"
            aria-label={`${item.title} - ${item.category}`}
          >
            <div className="aspect-video bg-black/30 overflow-hidden">
              <img
                src={item.image}
                alt={item.title}
                className="w-full h-full object-cover"
                loading="lazy"
              />
            </div>
            <div className="p-4">
              <p className={`${glassTokens.text.secondary} text-sm mb-1`}>{item.category}</p>
              <h3 className={`${glassTokens.text.primary} font-semibold`}>{item.title}</h3>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ContentCarousel;
