#if os(tvOS)
    import BayitCore
    import BayitDesignSystem
    import BayitLocalization
    import SwiftUI

    struct TVDiscoverCategorySection: View {
        let category: DiscoverCategory
        let features: [DiscoverFeature]
        let viewModel: DiscoverViewModel
        @Environment(LocalizationManager.self) private var localization
        @FocusState private var focusedFeatureId: String?
        @State private var selectedFeature: DiscoverFeature?

        var body: some View {
            VStack(alignment: .leading, spacing: TVDesignTokens.Spacing.lg) {
                featureList
            }
            .padding(.horizontal, TVDesignTokens.Spacing.xl)
            .padding(.vertical, TVDesignTokens.Spacing.md)
            .accessibilityIdentifier("tv_discover_section_\(category.id)")
            .fullScreenCover(item: $selectedFeature) { feature in
                TVDiscoverFeatureDetailView(
                    feature: feature,
                    viewModel: viewModel,
                    onDismiss: { selectedFeature = nil }
                )
            }
        }

        private var categoryHeader: some View {
            HStack(spacing: TVDesignTokens.Spacing.sm) {
                Image(systemName: category.iconName)
                    .font(.system(size: TVDesignTokens.FontSize.xl))
                    .foregroundStyle(DesignTokens.Primary.default)

                Text(localization.t(category.nameKey))
                    .font(.system(size: TVDesignTokens.FontSize.xxl, weight: .bold))
                    .foregroundStyle(DesignTokens.Text.primary)
            }
            .padding(.bottom, TVDesignTokens.Spacing.xs)
        }

        private let gridColumns = [
            GridItem(.flexible(), spacing: TVDesignTokens.Spacing.lg),
            GridItem(.flexible(), spacing: TVDesignTokens.Spacing.lg),
        ]

        private var featureList: some View {
            Group {
                if features.isEmpty {
                    emptyState
                } else {
                    LazyVGrid(columns: gridColumns, spacing: TVDesignTokens.Spacing.lg) {
                        ForEach(features) { feature in
                            TVDiscoverFeatureCard(
                                feature: feature,
                                availability: viewModel.availability(for: feature.id),
                                thumbnailURL: viewModel.demoThumbnailURL(for: feature.id),
                                onSelect: { selectedFeature = feature }
                            )
                            .focused($focusedFeatureId, equals: feature.id)
                        }
                    }
                }
            }
        }

        private var emptyState: some View {
            VStack(spacing: TVDesignTokens.Spacing.md) {
                Image(systemName: "sparkles")
                    .font(.system(size: TVDesignTokens.FontSize.hero))
                    .foregroundStyle(DesignTokens.Text.muted)

                Text(localization.t("discover.empty.title"))
                    .font(.system(size: TVDesignTokens.FontSize.lg))
                    .foregroundStyle(DesignTokens.Text.muted)
                    .multilineTextAlignment(.center)
            }
            .frame(maxWidth: .infinity)
            .padding(.top, TVDesignTokens.Spacing.xxxxl)
        }
    }

    extension DiscoverFeature: @retroactive Hashable {
        public func hash(into hasher: inout Hasher) {
            hasher.combine(id)
        }

        public static func == (lhs: DiscoverFeature, rhs: DiscoverFeature) -> Bool {
            lhs.id == rhs.id
        }
    }
#endif
