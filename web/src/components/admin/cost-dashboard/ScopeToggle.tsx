// Scope toggle component for system-wide vs per-user view

import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { usersService } from "@/services/adminApi";
import { Globe, User } from "lucide-react";
import { GlassButton, GlassSelect } from "@olorin/glass-ui";

interface ScopeToggleProps {
  scope: "system_wide" | "per_user";
  onScopeChange: (scope: "system_wide" | "per_user", userId?: string) => void;
}

export default function ScopeToggle({ scope, onScopeChange }: ScopeToggleProps) {
  const { t } = useTranslation();
  const showUserSelect = scope === 'per_user';
  const [options, setOptions] = useState<{ value: string; label: string }[]>([]);
  const [userError, setUserError] = useState(false);
  useEffect(() => {
    if (!showUserSelect) return;
    let active = true;
    setUserError(false);
    usersService.getUsers().then(response => {
      if (active) setOptions(response.items.map(user => ({ value: user.id, label: user.name || user.email })));
    }).catch(() => { if (active) { setOptions([]); setUserError(true); } });
    return () => { active = false; };
  }, [showUserSelect]);

  const handleScopeChange = (newScope: "system_wide" | "per_user") => {
    onScopeChange(newScope);
  };

  return (
    <div className="flex items-center gap-4">
      <label className="text-gray-400 font-medium">{t('admin.costDashboard.view')}:</label>

      <div className="flex gap-2">
        <GlassButton
          variant={scope === "system_wide" ? "primary" : "ghost"}
          onPress={() => handleScopeChange("system_wide")}
          className="flex items-center gap-2"
        >
          <Globe size={16} />
          {t("admin.costDashboard.systemWide")}
        </GlassButton>

        <GlassButton
          variant={scope === "per_user" ? "primary" : "ghost"}
          onPress={() => handleScopeChange("per_user")}
          className="flex items-center gap-2"
        >
          <User size={16} />
          {t("admin.costDashboard.perUser")}
        </GlassButton>
      </div>

      {userError && <span role="alert">{t("common.error")}</span>}
      {showUserSelect && (
        <GlassSelect
          placeholder={t('admin.costDashboard.selectUser')}
          options={options}
          onChange={(value: string) => onScopeChange("per_user", value as string)}
        />
      )}
    </div>
  );
}
