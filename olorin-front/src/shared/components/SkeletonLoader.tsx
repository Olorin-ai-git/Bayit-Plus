import React from 'react';

interface SkeletonLoaderProps {
  width?: string;
  height?: string;
  className?: string;
  count?: number;
  animated?: boolean;
  rounded?: 'none' | 'sm' | 'md' | 'lg' | 'full';
}

const SkeletonLoader: React.FC<SkeletonLoaderProps> = ({
  width = 'w-full',
  height = 'h-4',
  className = '',
  count = 1,
  animated = true,
  rounded = 'md'
}) => {
  const roundedClasses = {
    none: '',
    sm: 'rounded-sm',
    md: 'rounded-md',
    lg: 'rounded-lg',
    full: 'rounded-full'
  };

  const baseClasses = `
    bg-black/30 backdrop-blur
    ${roundedClasses[rounded]}
    ${animated ? 'animate-pulse' : ''}
    ${width}
    ${height}
    ${className}
  `.trim().replace(/\s+/g, ' ');

  if (count === 1) {
    return <div className={baseClasses} />;
  }

  return (
    <>
      {Array.from({ length: count }).map((_, index) => (
        <div key={index} className={baseClasses} />
      ))}
    </>
  );
};

export default SkeletonLoader;
