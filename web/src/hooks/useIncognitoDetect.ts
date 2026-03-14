import { useState, useEffect } from "react";

const INCOGNITO_QUOTA_THRESHOLD = 120 * 1024 * 1024; // 120 MB

interface IncognitoDetectResult {
  isIncognito: boolean;
}

export function useIncognitoDetect(): IncognitoDetectResult {
  const [isIncognito, setIsIncognito] = useState(false);

  useEffect(() => {
    if (typeof navigator === "undefined" || !navigator.storage?.estimate)
      return;

    navigator.storage.estimate().then((estimate) => {
      if (
        estimate.quota !== undefined &&
        estimate.quota < INCOGNITO_QUOTA_THRESHOLD
      ) {
        setIsIncognito(true);
      }
    });
  }, []);

  return { isIncognito };
}
