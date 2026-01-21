import React from 'react';
import SkeletonLoader from './SkeletonLoader';

interface EventListSkeletonProps {
  count?: number;
}

const EventListSkeleton: React.FC<EventListSkeletonProps> = ({ count = 5 }) => {
  return (
    <div className="space-y-4">
      {Array.from({ length: count }).map((_, index) => (
        <div
          key={index}
          className="flex items-start space-x-3 p-4 bg-black/40 backdrop-blur-md border-2 border-corporate-borderPrimary/40 rounded-lg"
        >
          <SkeletonLoader width="w-2" height="h-16" rounded="full" />

          <div className="flex-1 space-y-2">
            <div className="flex items-center justify-between">
              <SkeletonLoader width="w-1/4" height="h-5" />
              <SkeletonLoader width="w-20" height="h-5" />
            </div>

            <SkeletonLoader width="w-full" height="h-4" />
            <SkeletonLoader width="w-3/4" height="h-4" />
          </div>
        </div>
      ))}
    </div>
  );
};

export default EventListSkeleton;
