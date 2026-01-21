import React from 'react';

interface ProgressiveEnhancementRendererProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export const ProgressiveEnhancementRenderer: React.FC<ProgressiveEnhancementRendererProps> = ({
  children,
  fallback,
}) => {
  const [isSupported, setIsSupported] = React.useState(true);
  const [error, setError] = React.useState<Error | null>(null);

  React.useEffect(() => {
    try {
      // Check for required browser APIs
      if (!('fetch' in window)) {
        setIsSupported(false);
      }
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
      setIsSupported(false);
    }
  }, []);

  if (error) {
    return fallback ? <>{fallback}</> : <div className="text-red-600">Error rendering content</div>;
  }

  if (!isSupported) {
    return fallback ? <>{fallback}</> : <div className="text-gray-600">Browser not supported</div>;
  }

  return <>{children}</>;
};
