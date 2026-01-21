/**
 * PlatformGrid Component
 * Displays supported platforms with license-compliant brand icons
 */

import React from 'react';
import { SiApple, SiAndroid, SiSamsung, SiLg } from 'react-icons/si';
import { FaTv, FaChrome } from 'react-icons/fa';
import { IconType } from 'react-icons';
import { glassTokens } from '../../styles/glass-tokens';

export type PlatformType = 'ios' | 'android' | 'tvos' | 'web' | 'webos' | 'tizen';

export interface PlatformGridProps {
  platforms: PlatformType[];
  size?: 'sm' | 'md' | 'lg';
  columns?: 2 | 3 | 4 | 6;
  className?: string;
}

interface PlatformConfig {
  icon: IconType;
  label: string;
  description: string;
}

const platformConfig: Record<PlatformType, PlatformConfig> = {
  ios: {
    icon: SiApple,
    label: 'iOS',
    description: 'iPhone & iPad',
  },
  android: {
    icon: SiAndroid,
    label: 'Android',
    description: 'Android Phones & Tablets',
  },
  tvos: {
    icon: FaTv,
    label: 'tvOS',
    description: 'Apple TV',
  },
  web: {
    icon: FaChrome,
    label: 'Web',
    description: 'All Browsers',
  },
  webos: {
    icon: SiLg,
    label: 'WebOS',
    description: 'LG Smart TV',
  },
  tizen: {
    icon: SiSamsung,
    label: 'Tizen',
    description: 'Samsung Smart TV',
  },
};

const sizeClasses = {
  sm: 'w-12 h-12',
  md: 'w-16 h-16',
  lg: 'w-20 h-20',
};

const columnClasses = {
  2: 'grid-cols-2',
  3: 'grid-cols-2 md:grid-cols-3',
  4: 'grid-cols-2 md:grid-cols-4',
  6: 'grid-cols-2 md:grid-cols-3 lg:grid-cols-6',
};

/**
 * PlatformGrid displays a grid of supported platform icons
 *
 * @example
 * <PlatformGrid
 *   platforms={['ios', 'android', 'tvos', 'web']}
 *   size="md"
 *   columns={4}
 * />
 */
export const PlatformGrid: React.FC<PlatformGridProps> = ({
  platforms,
  size = 'md',
  columns = 6,
  className = '',
}) => {
  return (
    <div className={`grid ${columnClasses[columns]} gap-6 ${className}`}>
      {platforms.map((platform) => {
        const config = platformConfig[platform];
        const IconComponent = config.icon;

        return (
          <div
            key={platform}
            className={`
              ${glassTokens.layers.card}
              ${glassTokens.states.hover}
              ${glassTokens.states.focus}
              rounded-2xl p-6 text-center
              cursor-pointer
              transition-all duration-300
            `}
            tabIndex={0}
            role="button"
            aria-label={`${config.label} - ${config.description}`}
          >
            {React.createElement(IconComponent as React.ComponentType<{ className?: string; 'aria-hidden'?: string }>, {
              className: `${sizeClasses[size]} mx-auto mb-3 ${glassTokens.text.primary}`,
              'aria-hidden': 'true',
            })}
            <h3 className={`${glassTokens.text.primary} font-semibold mb-1`}>
              {config.label}
            </h3>
            <p className={`${glassTokens.text.secondary} text-sm`}>
              {config.description}
            </p>
          </div>
        );
      })}
    </div>
  );
};

export default PlatformGrid;
