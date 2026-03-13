/**
 * useLastVisitedRoute - Tracks the current route and persists it to
 * localStorage so it can be used for post-login redirects.
 *
 * Must be called inside a component that has access to React Router context
 * (i.e. inside <BrowserRouter>). Tracking is silently skipped when no
 * authenticated user is present.
 */

import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { useAuthStore } from "@/stores/authStore";
import { saveLastVisited } from "@/utils/lastVisitedRoute";

export function useLastVisitedRoute(): void {
  const location = useLocation();
  const userId = useAuthStore((state) => state.user?.id);

  useEffect(() => {
    if (userId) {
      saveLastVisited(location.pathname, userId);
    }
  }, [location.pathname, userId]);
}
