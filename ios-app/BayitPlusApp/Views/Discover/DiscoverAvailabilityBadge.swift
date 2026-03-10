import BayitCore
import BayitDesignSystem
import BayitLocalization
import SwiftUI

struct DiscoverAvailabilityBadge: View {
    let state: FeatureAvailabilityState
    @Environment(LocalizationManager.self) private var localization

    var body: some View {
        Text(localization.t(state.badgeLabelKey))
            .font(DesignTokens.Typography.caption2)
            .foregroundStyle(badgeForeground)
            .padding(.horizontal, DesignTokens.Spacing.sm)
            .padding(.vertical, DesignTokens.Spacing.xs)
            .background(badgeBackground)
            .clipShape(Capsule())
            .animation(.easeInOut, value: state.badgeColorName)
            .accessibilityIdentifier("discover_badge_\(state.badgeColorName)")
            .accessibilityLabel(localization.t(state.badgeLabelKey))
            .accessibilityValue(accessibilityDescription)
    }

    private var badgeForeground: Color {
        switch state.badgeColorName {
        case "green":
            return DesignTokens.Success.default
        case "orange":
            return DesignTokens.Warning.default
        case "purple":
            return DesignTokens.Primary.default
        case "blue":
            return DesignTokens.Info.default
        default:
            return DesignTokens.Text.muted
        }
    }

    private var badgeBackground: Color {
        switch state.badgeColorName {
        case "green":
            return DesignTokens.Success.default.opacity(0.15)
        case "orange":
            return DesignTokens.Warning.default.opacity(0.15)
        case "purple":
            return DesignTokens.Primary.default.opacity(0.15)
        case "blue":
            return DesignTokens.Info.default.opacity(0.15)
        default:
            return DesignTokens.Text.muted.opacity(0.15)
        }
    }

    private var accessibilityDescription: String {
        switch state {
        case .ready:
            return localization.t("discover.a11y.ready")
        case .setupNeeded:
            return localization.t("discover.a11y.setupNeeded")
        case .premiumRequired:
            return localization.t("discover.a11y.premium")
        case .notAvailable:
            return localization.t("discover.a11y.notAvailable")
        case .platformOnly:
            return localization.t("discover.a11y.platformOnly")
        }
    }
}
