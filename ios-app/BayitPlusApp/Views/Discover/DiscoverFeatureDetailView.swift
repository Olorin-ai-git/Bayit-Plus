import BayitCore
import BayitDesignSystem
import BayitLocalization
import SwiftUI

struct DiscoverFeatureDetailView: View {
    let feature: DiscoverFeature
    @Bindable var viewModel: DiscoverViewModel
    @Environment(LocalizationManager.self) private var localization
    @Environment(NavigationCoordinator.self) private var coordinator
    @Environment(\.dismiss) private var dismiss

    private var availability: FeatureAvailabilityState {
        viewModel.availability(for: feature.id)
    }

    var body: some View {
        ScrollView(.vertical, showsIndicators: false) {
            VStack(alignment: .leading, spacing: DesignTokens.Spacing.lg) {
                headerSection
                DiscoverAvailabilityBadge(state: availability)
                descriptionSection
                prerequisitesSection
                demoThumbnailSection
                actionButtons
            }
            .padding(DesignTokens.Spacing.xl)
        }
        .background(DesignTokens.Glass.bgStrong)
        .presentationDetents([.medium, .large])
        .presentationDragIndicator(.visible)
    }

    private var headerSection: some View {
        HStack(spacing: DesignTokens.Spacing.md) {
            Image(systemName: feature.iconName)
                .font(DesignTokens.Typography.title)
                .foregroundStyle(DesignTokens.Primary.default)

            VStack(alignment: .leading, spacing: DesignTokens.Spacing.xs) {
                Text(localization.t(feature.nameKey))
                    .font(DesignTokens.Typography.title3)
                    .foregroundStyle(DesignTokens.Text.primary)

                Text(localization.t(feature.taglineKey))
                    .font(DesignTokens.Typography.callout)
                    .foregroundStyle(DesignTokens.Text.secondary)
            }
        }
        .accessibilityIdentifier("discover_detail_header")
    }

    private var descriptionSection: some View {
        Text(localization.t(feature.descriptionKey))
            .font(DesignTokens.Typography.body)
            .foregroundStyle(DesignTokens.Text.primary)
            .fixedSize(horizontal: false, vertical: true)
    }

    @ViewBuilder
    private var prerequisitesSection: some View {
        if !feature.prerequisites.isEmpty {
            VStack(alignment: .leading, spacing: DesignTokens.Spacing.sm) {
                Text(localization.t("discover.prerequisites.title"))
                    .font(DesignTokens.Typography.headline)
                    .foregroundStyle(DesignTokens.Text.primary)

                ForEach(feature.prerequisites) { prereq in
                    prerequisiteRow(prereq)
                }
            }
            .accessibilityIdentifier("discover_prerequisites")
        }
    }

    private func prerequisiteRow(_ prereq: FeaturePrerequisite) -> some View {
        HStack(spacing: DesignTokens.Spacing.sm) {
            Image(systemName: prerequisiteIcon(for: prereq))
                .foregroundStyle(prerequisiteColor(for: prereq))
                .font(DesignTokens.Typography.body)

            if let route = prereq.fixRoute, !prerequisiteMet(prereq),
               let url = URL(string: route)
            {
                GlassButton(localization.t(prereq.labelKey), variant: .ghost, size: .small) {
                    dismiss()
                    UIApplication.shared.open(url)
                }
            } else {
                Text(localization.t(prereq.labelKey))
                    .font(DesignTokens.Typography.callout)
                    .foregroundStyle(DesignTokens.Text.secondary)
            }
        }
        .accessibilityElement(children: .combine)
    }

    @ViewBuilder
    private var demoThumbnailSection: some View {
        if let thumbnailURL = viewModel.demoThumbnailURL(for: feature.id) {
            AsyncImage(url: thumbnailURL) { phase in
                if case let .success(image) = phase {
                    image.resizable().aspectRatio(16 / 9, contentMode: .fit)
                        .clipShape(RoundedRectangle(cornerRadius: DesignTokens.Radius.md))
                } else if case .empty = phase {
                    ProgressView()
                        .frame(maxWidth: .infinity)
                        .aspectRatio(16 / 9, contentMode: .fit)
                }
            }
        }
    }

    private var actionButtons: some View {
        VStack(spacing: DesignTokens.Spacing.md) {
            if let url = viewModel.walkthroughURL(for: feature) {
                GlassButton(
                    localization.t("discover.action.tryIt"),
                    variant: .primary,
                    size: .large
                ) {
                    viewModel.startWalkthroughSession(for: feature)
                    dismiss()
                    UIApplication.shared.open(url)
                }
                .accessibilityIdentifier("discover_action_tryIt")
                .accessibilityLabel(localization.t("discover.action.tryIt"))
            }

            if let demoURL = viewModel.demoVideoURL(for: feature.id) {
                GlassButton(
                    localization.t("discover.action.watchDemo"),
                    variant: .secondary,
                    size: .large
                ) {
                    dismiss()
                    viewModel.pendingDemoVideoURL = demoURL
                }
                .accessibilityIdentifier("discover_action_watchDemo")
                .accessibilityLabel(localization.t("discover.action.watchDemo"))
            }
        }
    }

    private func prerequisiteIcon(for prereq: FeaturePrerequisite) -> String {
        prerequisiteMet(prereq) ? "checkmark.circle.fill" : "exclamationmark.triangle.fill"
    }

    private func prerequisiteColor(for prereq: FeaturePrerequisite) -> Color {
        prerequisiteMet(prereq) ? DesignTokens.Success.default : DesignTokens.Warning.default
    }

    private func prerequisiteMet(_ prereq: FeaturePrerequisite) -> Bool {
        guard case let .setupNeeded(missing) = availability else { return true }
        return !missing.contains(where: { $0.id == prereq.id })
    }
}
