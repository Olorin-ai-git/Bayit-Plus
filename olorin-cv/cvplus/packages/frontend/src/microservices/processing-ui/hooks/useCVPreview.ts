import { useState } from 'react';

export const useCVPreview = () => {
  const [preview, setPreview] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const updatePreview = (data: any) => {
    setPreview(data);
  };

  return {
    preview,
    loading,
    error,
    updatePreview,
    setLoading,
    setError
  };
};
