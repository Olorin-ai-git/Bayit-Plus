// Scope toggle component for system-wide vs per-user view

import React, { useState } from "react";
import { Globe, User } from "lucide-react";
import { GlassButton, GlassSelect } from "@olorin/glass-ui";

interface ScopeToggleProps {
  scope: "system_wide" | "per_user";
  onScopeChange: (scope: "system_wide" | "per_user", userId?: string) => void;
}

export default function ScopeToggle({ scope, onScopeChange }: ScopeToggleProps) {
  const [showUserSelect, setShowUserSelect] = useState(scope === "per_user");

  const handleScopeChange = (newScope: "system_wide" | "per_user") => {
    setShowUserSelect(newScope === "per_user");
    onScopeChange(newScope);
  };

  return (
    <div className="flex items-center gap-4">
      <label className="text-gray-400 font-medium">View:</label>

      <div className="flex gap-2">
        <GlassButton
          variant={scope === "system_wide" ? "primary" : "ghost"}
          onPress={() => handleScopeChange("system_wide")}
          className="flex items-center gap-2"
        >
          <Globe size={16} />
          System-wide
        </GlassButton>

        <GlassButton
          variant={scope === "per_user" ? "primary" : "ghost"}
          onPress={() => handleScopeChange("per_user")}
          className="flex items-center gap-2"
        >
          <User size={16} />
          Per User
        </GlassButton>
      </div>

      {showUserSelect && (
        <GlassSelect
          placeholder="Select user..."
          options={[
            { value: "user1", label: "User 1" },
            { value: "user2", label: "User 2" },
          ]}
          onChange={(value) => onScopeChange("per_user", value as string)}
        />
      )}
    </div>
  );
}
