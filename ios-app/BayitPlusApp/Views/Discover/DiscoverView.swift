import BayitCore
import BayitDesignSystem
import BayitLocalization
import SwiftUI

struct DiscoverView: View {
    @Environment(RepositoryProvider.self) private var repos
    @Environment(LocalizationManager.self) private var localization
    @State private var viewModel: DiscoverViewModel?

    var body: some View {
        ScrollView(.vertical, showsIndicators: false) {
            VStack(alignment: .leading, spacing: DesignTokens.Spacing.xl) {
                headerSection

                if let vm = viewModel {
                    if vm.isLoading {
                        loadingIndicator
                    } else {
                        categoryList(vm: vm)
                    }
                }
            }
            .padding(.top, DesignTokens.Spacing.lg)
            .padding(.bottom, DesignTokens.Spacing.xxxl)
        }
        .accessibilityIdentifier("discover_main")
        .background(DesignTokens.Background.primary)
        .task {
            if viewModel == nil {
                let vm = DiscoverViewModel(
                    repository: repos.discover,
                    availabilityService: FeatureAvailabilityService(
                        dependencies: buildAvailabilityDependencies()
                    )
                )
                viewModel = vm
            }
            if let vm = viewModel {
                await vm.loadConfig()
            }
        }
    }

    private var headerSection: some View {
        VStack(alignment: .leading, spacing: DesignTokens.Spacing.sm) {
            Text(localization.t("discover.title"))
                .font(DesignTokens.Typography.title)
                .foregroundStyle(DesignTokens.Text.primary)

            Text(localization.t("discover.subtitle"))
                .font(DesignTokens.Typography.body)
                .foregroundStyle(DesignTokens.Text.secondary)
        }
        .padding(.horizontal, DesignTokens.Spacing.base)
    }

    private var loadingIndicator: some View {
        HStack {
            Spacer()
            ProgressView()
                .tint(DesignTokens.Primary.default)
            Spacer()
        }
        .padding(.top, DesignTokens.Spacing.xxxl)
    }

    private func categoryList(vm: DiscoverViewModel) -> some View {
        ForEach(vm.categories) { category in
            let categoryFeatures = vm.features(for: category)
            if !categoryFeatures.isEmpty {
                DiscoverCategoryRow(
                    category: category,
                    features: categoryFeatures,
                    viewModel: vm
                )
            }
        }
    }

    private func buildAvailabilityDependencies() -> FeatureAvailabilityDependencies {
        FeatureAvailabilityDependencies(
            isPremium: { [repos] in
                await MainActor.run {
                    repos.storeManager.isPlusSubscribed
                }
            },
            hasAvatar: {
                false
            },
            hasMicrophonePermission: {
                false
            },
            hasCompletedPreference: { _ in
                false
            }
        )
    }
}
