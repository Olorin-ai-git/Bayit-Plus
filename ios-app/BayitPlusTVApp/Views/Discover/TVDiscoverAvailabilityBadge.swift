#if os(tvOS)
    import BayitCore
    import BayitDesignSystem
    import BayitLocalization
    import SwiftUI

    struct TVDiscoverAvailabilityBadge: View {
        let availability: FeatureAvailabilityState
        @Environment(LocalizationManager.self) private var localization

        var body: some View {
            Text(localization.t(availability.badgeLabelKey))
                .font(.system(size: TVDesignTokens.FontSize.sm, weight: .semibold))
                .foregroundStyle(foregroundColor)
                .padding(.horizontal, TVDesignTokens.Spacing.md)
                .padding(.vertical, TVDesignTokens.Spacing.xs)
                .background(backgroundColor)
                .clipShape(Capsule())
                .accessibilityIdentifier("tv_discover_badge_\(availability.badgeColorName)")
                .accessibilityLabel(
                    localization.t(availability.badgeLabelKey)
                )
        }

        private var foregroundColor: Color {
            switch availability.badgeColorName {
            case "green":
                return DesignTokens.Success.s400
            case "orange":
                return DesignTokens.Warning.w400
            case "purple":
                return DesignTokens.Primary.p300
            case "gray":
                return DesignTokens.Text.muted
            case "blue":
                return DesignTokens.Info.i400
            default:
                return DesignTokens.Text.muted
            }
        }

        private var backgroundColor: Color {
            switch availability.badgeColorName {
            case "green":
                return DesignTokens.Success.default.opacity(0.15)
            case "orange":
                return DesignTokens.Warning.default.opacity(0.15)
            case "purple":
                return DesignTokens.Primary.default.opacity(0.15)
            case "gray":
                return DesignTokens.Glass.bg
            case "blue":
                return DesignTokens.Info.default.opacity(0.15)
            default:
                return DesignTokens.Glass.bg
            }
        }
    }
#endif
