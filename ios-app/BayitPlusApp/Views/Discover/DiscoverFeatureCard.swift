import BayitCore
import BayitDesignSystem
import BayitLocalization
import SwiftUI

struct DiscoverFeatureCard: View {
    let feature: DiscoverFeature
    let availability: FeatureAvailabilityState
    let isExpanded: Bool
    let onTap: () -> Void
    @Environment(LocalizationManager.self) private var localization

    private let cardWidth: CGFloat = 160
    private let cardMinHeight: CGFloat = 180

    var body: some View {
        Button(action: onTap) {
            VStack(alignment: .leading, spacing: DesignTokens.Spacing.sm) {
                iconRow
                nameLabel
                taglineLabel
                Spacer(minLength: DesignTokens.Spacing.xs)
                DiscoverAvailabilityBadge(state: availability)
            }
            .padding(DesignTokens.Spacing.md)
            .frame(width: cardWidth, alignment: .topLeading)
            .frame(minHeight: cardMinHeight)
            .background(DesignTokens.Glass.bg)
            .clipShape(RoundedRectangle(cornerRadius: DesignTokens.Radius.lg))
            .overlay(
                RoundedRectangle(cornerRadius: DesignTokens.Radius.lg)
                    .strokeBorder(
                        isExpanded
                            ? DesignTokens.Glass.borderBright
                            : DesignTokens.Glass.border,
                        lineWidth: 1
                    )
            )
            .shadow(
                color: DesignTokens.Glass.shadow,
                radius: DesignTokens.Spacing.xs,
                y: DesignTokens.Spacing.xxs
            )
        }
        .buttonStyle(.plain)
        .accessibilityIdentifier("discover_feature_\(feature.id)")
        .accessibilityLabel(localization.t(feature.nameKey))
        .accessibilityHint(localization.t(feature.taglineKey))
    }

    private var iconRow: some View {
        Image(systemName: feature.iconName)
            .font(DesignTokens.Typography.title2)
            .foregroundStyle(DesignTokens.Primary.default)
            .frame(
                width: DesignTokens.Spacing.xxl,
                height: DesignTokens.Spacing.xxl,
                alignment: .center
            )
    }

    private var nameLabel: some View {
        Text(localization.t(feature.nameKey))
            .font(DesignTokens.Typography.headline)
            .foregroundStyle(DesignTokens.Text.primary)
            .lineLimit(2)
    }

    private var taglineLabel: some View {
        Text(localization.t(feature.taglineKey))
            .font(DesignTokens.Typography.caption)
            .foregroundStyle(DesignTokens.Text.muted)
            .lineLimit(2)
    }
}
