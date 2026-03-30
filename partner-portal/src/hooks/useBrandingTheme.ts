/**
 * Branding Theme Hook
 *
 * Injects partner branding colors as CSS custom properties
 * so Tailwind utilities (via tailwind.config.js) pick them up.
 */

import { useEffect } from "react";
import { usePartnerStore } from "../stores/partnerStore";

const DEFAULT_PRIMARY = "#6366F1";
const DEFAULT_SECONDARY = "#8B5CF6";
const HEX_PATTERN = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;

function isValidHex(value: string | null | undefined): value is string {
  return typeof value === "string" && HEX_PATTERN.test(value);
}

function hexToRgb(hex: string): string {
  const h = hex.replace("#", "");
  const full =
    h.length === 3
      ? h
          .split("")
          .map((c) => c + c)
          .join("")
      : h;
  const num = parseInt(full, 16);
  return `${(num >> 16) & 255} ${(num >> 8) & 255} ${num & 255}`;
}

function darken(hex: string, amount: number): string {
  const h = hex.replace("#", "");
  const full =
    h.length === 3
      ? h
          .split("")
          .map((c) => c + c)
          .join("")
      : h;
  const num = parseInt(full, 16);
  const r = Math.max(0, ((num >> 16) & 255) - amount);
  const g = Math.max(0, ((num >> 8) & 255) - amount);
  const b = Math.max(0, (num & 255) - amount);
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, "0")}`;
}

export function useBrandingTheme(): void {
  const organization = usePartnerStore((s) => s.organization);

  useEffect(() => {
    const root = document.documentElement;
    const rawPrimary = organization?.branding?.primary_color;
    const rawSecondary = organization?.branding?.secondary_color;
    const primary = isValidHex(rawPrimary) ? rawPrimary : DEFAULT_PRIMARY;
    const secondary = isValidHex(rawSecondary)
      ? rawSecondary
      : DEFAULT_SECONDARY;

    root.style.setProperty("--partner-primary", primary);
    root.style.setProperty("--partner-primary-hover", darken(primary, 20));
    root.style.setProperty("--partner-primary-rgb", hexToRgb(primary));
    root.style.setProperty("--partner-secondary", secondary);

    return () => {
      root.style.removeProperty("--partner-primary");
      root.style.removeProperty("--partner-primary-hover");
      root.style.removeProperty("--partner-primary-rgb");
      root.style.removeProperty("--partner-secondary");
    };
  }, [
    organization?.branding?.primary_color,
    organization?.branding?.secondary_color,
  ]);
}
