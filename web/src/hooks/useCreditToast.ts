import { useCallback } from "react";
import { useTranslation } from "react-i18next";
import { useNotifications } from "@olorin/glass-ui/hooks";

interface CreditToastActions {
  showCreditDeduction: (remainingCredits: number) => void;
}

const LOW_CREDIT_THRESHOLD = 10;

export function useCreditToast(): CreditToastActions {
  const { t } = useTranslation();
  const notifications = useNotifications();

  const showCreditDeduction = useCallback(
    (remainingCredits: number) => {
      const title = t("plus.toast.creditUsed");
      const remaining = t("plus.toast.remaining", { count: remainingCredits });

      if (remainingCredits <= LOW_CREDIT_THRESHOLD && remainingCredits > 0) {
        const upsell = t("plus.toast.getUnlimited");
        notifications.showWarning(`${remaining} - ${upsell}`, title);
      } else if (remainingCredits > 0) {
        notifications.showInfo(`${title} - ${remaining}`);
      } else {
        notifications.showError(t("plus.toast.getUnlimited"), title);
      }
    },
    [t, notifications],
  );

  return { showCreditDeduction };
}
