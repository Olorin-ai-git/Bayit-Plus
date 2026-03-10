import BayitCore
import BayitDesignSystem
import BayitLocalization
import SwiftUI

struct DiscoverCategoryRow: View {
    let category: DiscoverCategory
    let features: [DiscoverFeature]
    @Bindable var viewModel: DiscoverViewModel
    @Environment(LocalizationManager.self) private var localization

    var body: some View {
        VStack(alignment: .leading, spacing: DesignTokens.Spacing.md) {
            categoryHeader
            featureCarousel
        }
        .accessibilityIdentifier("discover_category_\(category.id)")
    }

    private var categoryHeader: some View {
        HStack(spacing: DesignTokens.Spacing.sm) {
            Image(systemName: category.iconName)
                .font(DesignTokens.Typography.headline)
                .foregroundStyle(DesignTokens.Primary.default)

            Text(localization.t(category.nameKey))
                .font(DesignTokens.Typography.title3)
                .foregroundStyle(DesignTokens.Text.primary)
        }
        .padding(.horizontal, DesignTokens.Spacing.base)
        .accessibilityElement(children: .combine)
        .accessibilityLabel(localization.t(category.nameKey))
    }

    private var featureCarousel: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            LazyHStack(spacing: DesignTokens.Spacing.md) {
                ForEach(features) { feature in
                    let isExpanded = viewModel.expandedFeatureId == feature.id
                    let availability = viewModel.availability(for: feature.id)

                    DiscoverFeatureCard(
                        feature: feature,
                        availability: availability,
                        isExpanded: isExpanded,
                        onTap: {
                            viewModel.toggleExpanded(featureId: feature.id)
                        }
                    )
                    .sheet(
                        isPresented: Binding(
                            get: { isExpanded },
                            set: { newValue in
                                if !newValue {
                                    viewModel.toggleExpanded(featureId: feature.id)
                                }
                            }
                        )
                    ) {
                        DiscoverFeatureDetailView(
                            feature: feature,
                            viewModel: viewModel
                        )
                    }
                }
            }
            .padding(.horizontal, DesignTokens.Spacing.base)
        }
    }
}
