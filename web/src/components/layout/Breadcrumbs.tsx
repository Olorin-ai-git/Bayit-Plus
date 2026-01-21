import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { GlassBreadcrumbs } from '@bayit/shared/ui';
import { useDirection } from '@/hooks/useDirection';

interface BreadcrumbItem {
  path: string;
  label: string;
}

// Route label mapping - maps paths to translation keys
const ROUTE_LABELS: Record<string, string> = {
  '/': 'nav.home',
  '/live': 'nav.liveTV',
  '/vod': 'nav.vod',
  '/radio': 'nav.radio',
  '/podcasts': 'nav.podcasts',
  '/flows': 'nav.flows',
  '/judaism': 'nav.judaism',
  '/children': 'nav.children',
  '/search': 'nav.search',
  '/profile': 'nav.profile',
  '/settings': 'nav.settings',
  '/favorites': 'nav.favorites',
  '/watchlist': 'breadcrumbs.watchlist',
  '/downloads': 'breadcrumbs.downloads',
  '/admin': 'nav.admin',
  '/login': 'account.login',
};

// Dynamic route patterns
const DYNAMIC_ROUTES: { pattern: RegExp; getLabel: (match: RegExpMatchArray, t: any) => string }[] = [
  {
    pattern: /^\/vod\/series\/(.+)$/,
    getLabel: (_, t) => t('breadcrumbs.series'),
  },
  {
    pattern: /^\/vod\/movie\/(.+)$/,
    getLabel: (_, t) => t('breadcrumbs.movie'),
  },
  {
    pattern: /^\/vod\/(.+)$/,
    getLabel: (_, t) => t('breadcrumbs.watching'),
  },
  {
    pattern: /^\/live\/(.+)$/,
    getLabel: (_, t) => t('breadcrumbs.channel'),
  },
  {
    pattern: /^\/radio\/(.+)$/,
    getLabel: (_, t) => t('breadcrumbs.station'),
  },
  {
    pattern: /^\/podcasts\/(.+)$/,
    getLabel: (_, t) => t('breadcrumbs.podcast'),
  },
];

// Storage key for breadcrumb history
const BREADCRUMB_STORAGE_KEY = 'bayit-breadcrumbs';
const MAX_BREADCRUMBS = 10;

export default function Breadcrumbs() {
  const { t } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();
  const { isRTL } = useDirection();

  const [history, setHistory] = useState<BreadcrumbItem[]>([]);

  // Get label for a path
  const getPathLabel = (path: string): string => {
    // Check static routes first
    if (ROUTE_LABELS[path]) {
      return t(ROUTE_LABELS[path]);
    }

    // Check dynamic routes
    for (const route of DYNAMIC_ROUTES) {
      const match = path.match(route.pattern);
      if (match) {
        return route.getLabel(match, t);
      }
    }

    // Fallback: use path segment
    const segments = path.split('/').filter(Boolean);
    if (segments.length > 0) {
      const lastSegment = segments[segments.length - 1];
      return lastSegment.charAt(0).toUpperCase() + lastSegment.slice(1);
    }

    return t('nav.home');
  };

  // Load history from storage on mount
  useEffect(() => {
    try {
      const stored = sessionStorage.getItem(BREADCRUMB_STORAGE_KEY);
      if (stored) {
        const parsedHistory = JSON.parse(stored);
        // Re-translate labels on load (in case language changed)
        const translatedHistory = parsedHistory.map((item: BreadcrumbItem) => ({
          ...item,
          label: getPathLabel(item.path),
        }));
        setHistory(translatedHistory);
      } else {
        // Initialize with home if no history
        const currentPath = location.pathname;
        const initialHistory: BreadcrumbItem[] = [];

        // Always start with home if not on home page
        if (currentPath !== '/') {
          initialHistory.push({ path: '/', label: t('nav.home') });
        }
        initialHistory.push({ path: currentPath, label: getPathLabel(currentPath) });
        setHistory(initialHistory);
      }
    } catch (e) {
      console.warn('Failed to load breadcrumb history:', e);
    }
  }, []);

  // Update history when location changes
  useEffect(() => {
    const currentPath = location.pathname;

    setHistory((prev) => {
      // Check if we're navigating back to an existing item
      const existingIndex = prev.findIndex((item) => item.path === currentPath);

      let newHistory: BreadcrumbItem[];

      if (existingIndex >= 0) {
        // Navigating back - truncate history to that point
        newHistory = prev.slice(0, existingIndex + 1);
        // Update the label in case language changed
        newHistory[existingIndex] = {
          ...newHistory[existingIndex],
          label: getPathLabel(currentPath),
        };
      } else {
        // New navigation - add to history
        const newItem: BreadcrumbItem = {
          path: currentPath,
          label: getPathLabel(currentPath),
        };

        // Ensure home is always first if not navigating to home
        let base = prev.filter((item) => item.path !== currentPath);
        if (currentPath !== '/' && !base.some((item) => item.path === '/')) {
          base = [{ path: '/', label: t('nav.home') }, ...base];
        }

        newHistory = [...base, newItem].slice(-MAX_BREADCRUMBS);
      }

      // Save to session storage
      try {
        sessionStorage.setItem(BREADCRUMB_STORAGE_KEY, JSON.stringify(newHistory));
      } catch (e) {
        console.warn('Failed to save breadcrumb history:', e);
      }

      return newHistory;
    });
  }, [location.pathname, t]);

  const handleNavigate = (path: string) => {
    navigate(path);
  };

  return (
    <GlassBreadcrumbs
      items={history}
      onNavigate={handleNavigate}
      isRTL={isRTL}
      maxItems={MAX_BREADCRUMBS}
    />
  );
}
