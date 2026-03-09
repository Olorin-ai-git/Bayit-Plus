import BayitDesignSystem
import SwiftUI

/// Shared section label used across all settings sub-views.
func settingsSectionLabel(_ text: String) -> some View {
    HStack {
        Text(text)
            .font(.system(size: DesignTokens.FontSize.sm, weight: .semibold))
            .foregroundStyle(DesignTokens.Text.muted)
            .textCase(.uppercase)
        Spacer()
    }
}

/// Shared toggle row used across settings sub-views.
func settingsToggleRow(title: String, isOn: Binding<Bool>) -> some View {
    GlassCard {
        Toggle(isOn: isOn) {
            Text(title)
                .font(.system(size: DesignTokens.FontSize.md))
                .foregroundStyle(DesignTokens.Text.primary)
        }
        .tint(DesignTokens.Primary.default)
        .padding(DesignTokens.Spacing.md)
    }
}

/// Shared selection row (radio-style) used across settings sub-views.
func settingsSelectionRow(
    title: String, isSelected: Bool, action: @escaping () -> Void
) -> some View {
    Button(action: action) {
        HStack {
            Text(title)
                .font(.system(size: DesignTokens.FontSize.md))
                .foregroundStyle(DesignTokens.Text.primary)
            Spacer()
            if isSelected {
                Image(systemName: "checkmark")
                    .foregroundStyle(DesignTokens.Primary.default)
            }
        }
        .padding(DesignTokens.Spacing.md)
        .glassCard(radius: DesignTokens.Radius.md, padding: 0)
    }
    .buttonStyle(.plain)
}

/// Shared toggle row with icon and optional subtitle.
func settingsIconToggleRow(
    icon: String, title: String, subtitle: String?,
    isOn: Binding<Bool>
) -> some View {
    GlassCard {
        HStack(spacing: DesignTokens.Spacing.md) {
            Image(systemName: icon)
                .font(.system(size: DesignTokens.FontSize.lg))
                .foregroundStyle(DesignTokens.Primary.default)
                .frame(width: 32)
            VStack(alignment: .leading, spacing: DesignTokens.Spacing.xxs) {
                Text(title)
                    .font(.system(size: DesignTokens.FontSize.md))
                    .foregroundStyle(DesignTokens.Text.primary)
                if let subtitle {
                    Text(subtitle)
                        .font(.system(size: DesignTokens.FontSize.xs))
                        .foregroundStyle(DesignTokens.Text.muted)
                        .lineLimit(2)
                }
            }
            Spacer()
            Toggle("", isOn: isOn)
                .tint(DesignTokens.Primary.default)
                .labelsHidden()
        }
        .padding(DesignTokens.Spacing.md)
    }
}

extension Bundle {
    var shortVersion: String {
        infoDictionary?["CFBundleShortVersionString"] as? String ?? "1.0"
    }
}
