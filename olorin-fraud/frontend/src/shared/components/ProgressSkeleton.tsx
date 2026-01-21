import React from 'react';
import SkeletonLoader from './SkeletonLoader';

const ProgressSkeleton: React.FC = () => {
  return (
    <div className="space-y-6 p-6">
      <div className="space-y-3">
        <SkeletonLoader width="w-1/3" height="h-8" />
        <SkeletonLoader width="w-full" height="h-24" rounded="lg" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <SkeletonLoader height="h-32" rounded="lg" />
        <SkeletonLoader height="h-32" rounded="lg" />
        <SkeletonLoader height="h-32" rounded="lg" />
      </div>

      <div className="space-y-4">
        <SkeletonLoader width="w-1/4" height="h-6" />
        <div className="space-y-3">
          <SkeletonLoader width="w-full" height="h-20" rounded="lg" />
          <SkeletonLoader width="w-full" height="h-20" rounded="lg" />
          <SkeletonLoader width="w-full" height="h-20" rounded="lg" />
        </div>
      </div>

      <div className="flex items-center justify-between pt-4">
        <SkeletonLoader width="w-24" height="h-10" rounded="md" />
        <SkeletonLoader width="w-32" height="h-10" rounded="md" />
      </div>
    </div>
  );
};

export default ProgressSkeleton;
