/**
 * TypeScript interfaces for WidgetsIntroVideo component
 */

export interface WidgetsIntroVideoProps {
  videoUrl: string;
  visible: boolean;
  onComplete: () => void;
  onDismiss?: () => void;
  showDismissButton?: boolean;
  autoPlay?: boolean;
}

export interface CaptionUrls {
  en: string;
  es: string;
  he: string;
}
