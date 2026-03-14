import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useOnlineStatus } from "./useOnlineStatus";
import { useAuthStore } from "@/stores/authStore";

const DOWNLOADS_PATH = "/downloads";

export function useOfflineRedirect(): void {
  const { isOnline } = useOnlineStatus();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuthStore();

  useEffect(() => {
    if (!isOnline && isAuthenticated) {
      navigate(DOWNLOADS_PATH, { replace: true });
    }
  }, [isOnline, isAuthenticated, navigate]);
}
