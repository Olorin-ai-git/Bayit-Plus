#if os(tvOS)
    import BayitCore
    import BayitDesignSystem
    import BayitLocalization
    import SwiftUI

    struct TVDiscoverFeatureCard: View {
        let feature: DiscoverFeature
        let availability: FeatureAvailabilityState
        let thumbnailURL: URL?
        let onSelect: () -> Void
        @Environment(LocalizationManager.self) private var localization
        @FocusState private var isFocused: Bool

        var body: some View {
            Button(action: onSelect) {
                cardContent
            }
            .buttonStyle(TVDiscoverCardButtonStyle())
            .accessibilityIdentifier("tv_discover_feature_\(feature.id)")
            .focused($isFocused)
            .scaleEffect(isFocused ? TVDesignTokens.Focus.scaleAmount : 1.0)
            .shadow(
                color: isFocused ? DesignTokens.Primary.default.opacity(0.5) : .clear,
                radius: isFocused ? 20 : 0
            )
            .animation(
                .easeInOut(duration: TVDesignTokens.Focus.animationDuration),
                value: isFocused
            )
        }

        private var cardContent: some View {
            HStack(alignment: .top, spacing: TVDesignTokens.Spacing.base) {
                iconSection
                textSection
            }
            .padding(TVDesignTokens.Spacing.lg)
            .frame(maxWidth: .infinity, minHeight: 180, alignment: .topLeading)
            .background(DesignTokens.Glass.bg)
            .clipShape(RoundedRectangle(cornerRadius: TVDesignTokens.Radius.card))
            .overlay(
                RoundedRectangle(cornerRadius: TVDesignTokens.Radius.card)
                    .stroke(
                        isFocused ? DesignTokens.Glass.borderFocus : DesignTokens.Glass.border,
                        lineWidth: isFocused ? TVDesignTokens.Focus.ringWidth : 1
                    )
            )
            .overlay(alignment: .topTrailing) {
                TVDiscoverAvailabilityBadge(availability: availability)
                    .padding(TVDesignTokens.Spacing.sm)
            }
        }

        private var iconSection: some View {
            Group {
                if let url = thumbnailURL {
                    AsyncImage(url: url) { phase in
                        if case let .success(image) = phase {
                            image.resizable()
                                .aspectRatio(contentMode: .fill)
                                .frame(width: 100, height: 100)
                                .clipShape(RoundedRectangle(cornerRadius: TVDesignTokens.Radius.sm))
                        } else {
                            sfSymbolFallback
                        }
                    }
                } else {
                    sfSymbolFallback
                }
            }
        }

        private var sfSymbolFallback: some View {
            Image(systemName: feature.iconName)
                .font(.system(size: TVDesignTokens.FontSize.xxl))
                .foregroundStyle(DesignTokens.Primary.default)
                .frame(width: 100, height: 100)
                .background(DesignTokens.Glass.purpleLight)
                .clipShape(RoundedRectangle(cornerRadius: TVDesignTokens.Radius.sm))
        }

        private var textSection: some View {
            VStack(alignment: .leading, spacing: TVDesignTokens.Spacing.xs) {
                Text(localization.t(feature.nameKey))
                    .font(.system(size: TVDesignTokens.FontSize.lg, weight: .bold))
                    .foregroundStyle(DesignTokens.Text.primary)
                    .lineLimit(1)

                Text(localization.t(feature.descriptionKey))
                    .font(.system(size: TVDesignTokens.FontSize.sm))
                    .foregroundStyle(DesignTokens.Text.secondary)
                    .lineLimit(4)
                    .multilineTextAlignment(.leading)
            }
        }
    }

    struct TVDiscoverCardButtonStyle: ButtonStyle {
        func makeBody(configuration: Configuration) -> some View {
            configuration.label
        }
    }
#endif
