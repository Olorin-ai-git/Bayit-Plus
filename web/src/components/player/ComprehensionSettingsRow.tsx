/**
 * ComprehensionSettingsRow — Phase 2 DEMO-01 wiring helper
 *
 * Thin wrapper that renders the ComprehensionToggle from
 * @/components/comprehension inside the player settings surface. Extracted
 * from SettingsPanel.tsx so the toggle placement (UI-SPEC §6.1) lives in
 * an isolated, small, @bayit/glass-pure component and the host
 * SettingsPanel file stays untouched except for the single conditional
 * render line that mounts this row.
 *
 * Gates:
 *   - DEMO-04: uses only the ComprehensionToggle component from
 *     @/components/comprehension (which in turn composes @bayit/glass
 *     primitives). No native HTML elements here.
 *   - D-17: no re-start affordance.
 */

import React from "react";
import { ComprehensionToggle } from "@/components/comprehension";

export interface ComprehensionSettingsRowProps {
  userId: string;
  profileId: string;
  contentId: string;
}

const ComprehensionSettingsRow: React.FC<ComprehensionSettingsRowProps> = ({
  userId,
  profileId,
  contentId,
}) => (
  <ComprehensionToggle
    userId={userId}
    profileId={profileId}
    contentId={contentId}
  />
);

export default ComprehensionSettingsRow;
