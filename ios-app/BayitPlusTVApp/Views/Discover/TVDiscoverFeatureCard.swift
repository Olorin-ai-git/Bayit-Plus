#if os(tvOS)
    import BayitCore
    import BayitDesignSystem
    import BayitLocalization
    import SwiftUI

    struct TVDiscoverFeatureCard: View {
        let feature: DiscoverFeature
        let availability: FeatureAvailabilityState
        let onSelect: () -> Void
        @Environment(LocalizationManager.self) private var localization
        @Environment(\.isFocused) private var parentFocused
        @FocusState private var isFocused: Bool

        var body: some View {
            Button(action: onSelect) {
                cardContent
            }
            .buttonStyle(.plain)
            .accessibilityIdentifier("tv_discover_feature_\(feature.id)")
            .focused($isFocused)
            .scaleEffect(isFocused ? TVDesignTokens.Focus.scaleAmount : 1.0)
            .shadow(
                color: isFocused ? DesignTokens.Glass.shadow : .clear,
                radius: isFocused ? TVDesignTokens.Focus.shadowRadius : 0
            )
            .animation(
                .easeInOut(duration: TVDesignTokens.Focus.animationDuration),
                value: isFocused
            )
            .accessibilityLabel(localization.t(feature.nameKey))
            .accessibilityHint(localization.t(feature.taglineKey))
        }

        private var cardContent: some View {
            HStack(spacing: TVDesignTokens.Spacing.base) {
                iconSection
                textSection
                Spacer()
                TVDiscoverAvailabilityBadge(availability: availability)
            }
            .padding(TVDesignTokens.Spacing.base)
            .background(DesignTokens.Glass.bg)
            .clipShape(RoundedRectangle(cornerRadius: TVDesignTokens.Radius.card))
            .overlay(
                RoundedRectangle(cornerRadius: TVDesignTokens.Radius.card)
                    .stroke(
                        isFocused ? DesignTokens.Glass.borderFocus : DesignTokens.Glass.border,
                        lineWidth: isFocused ? TVDesignTokens.Focus.ringWidth : 1
                    )
            )
        }

        private var iconSection: some View {
            Image(systemName: feature.iconName)
                .font(.system(size: TVDesignTokens.FontSize.xl))
                .foregroundStyle(DesignTokens.Primary.default)
                .frame(
                    width: TVDesignTokens.MinSize.focusableWidth,
                    height: TVDesignTokens.MinSize.focusableHeight
                )
                .background(DesignTokens.Glass.purpleLight)
                .clipShape(RoundedRectangle(cornerRadius: TVDesignTokens.Radius.sm))
        }

        private var textSection: some View {
            VStack(alignment: .leading, spacing: TVDesignTokens.Spacing.xxs) {
                Text(localization.t(feature.nameKey))
                    .font(.system(size: TVDesignTokens.FontSize.md, weight: .semibold))
                    .foregroundStyle(DesignTokens.Text.primary)
                    .lineLimit(1)

                Text(localization.t(feature.taglineKey))
                    .font(.system(size: TVDesignTokens.FontSize.sm))
                    .foregroundStyle(DesignTokens.Text.secondary)
                    .lineLimit(2)
            }
        }
    }
#endif
