#if os(tvOS)
    import BayitCore
    import BayitDesignSystem
    import BayitLocalization
    import SwiftUI

    struct TVDiscoverView: View {
        @Environment(TVRepositoryProvider.self) private var repos
        @Environment(LocalizationManager.self) private var localization
        @State private var viewModel: DiscoverViewModel?
        @State private var selectedCategory: DiscoverCategory = .watchingMovies
        @FocusState private var focusedTab: DiscoverCategory?

        var body: some View {
            VStack(alignment: .leading, spacing: TVDesignTokens.Spacing.lg) {
                headerSection
                categoryTabs
                contentArea
            }
            .padding(.top, TVDesignTokens.Spacing.xl)
            .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
            .accessibilityIdentifier("tv_discover_main")
            .background(DesignTokens.Background.primary)
            .fullScreenCover(isPresented: Binding(
                get: { viewModel?.pendingDemoVideoURL != nil },
                set: { if !$0 { viewModel?.pendingDemoVideoURL = nil } }
            )) {
                if let url = viewModel?.pendingDemoVideoURL {
                    TVDemoVideoPlayerView(url: url) {
                        viewModel?.pendingDemoVideoURL = nil
                    }
                }
            }
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
            VStack(spacing: TVDesignTokens.Spacing.xs) {
                Text(localization.t("discover.title"))
                    .font(.system(size: TVDesignTokens.FontSize.hero, weight: .bold))
                    .foregroundStyle(DesignTokens.Text.primary)

                Text(localization.t("discover.subtitle"))
                    .font(.system(size: TVDesignTokens.FontSize.base))
                    .foregroundStyle(DesignTokens.Text.secondary)
            }
            .frame(maxWidth: .infinity)
        }

        private var categoryTabs: some View {
            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: TVDesignTokens.Spacing.focusGap) {
                    ForEach(DiscoverCategory.allCases.sorted {
                        $0.sortOrder < $1.sortOrder
                    }) { category in
                        categoryTabButton(category)
                    }
                }
                .padding(.horizontal, TVDesignTokens.Spacing.xl)
            }
        }

        private func categoryTabButton(_ category: DiscoverCategory) -> some View {
            let isSelected = selectedCategory == category
            return Button {
                selectedCategory = category
            } label: {
                HStack(spacing: TVDesignTokens.Spacing.sm) {
                    Image(systemName: category.iconName)
                        .font(.system(size: TVDesignTokens.FontSize.sm))
                    Text(localization.t(category.nameKey))
                        .font(.system(size: TVDesignTokens.FontSize.tab, weight: .semibold))
                }
                .padding(.horizontal, TVDesignTokens.Spacing.base)
                .padding(.vertical, TVDesignTokens.Spacing.sm)
                .background(isSelected ? DesignTokens.Glass.purpleStrong : DesignTokens.Glass.bg)
                .foregroundStyle(isSelected ? DesignTokens.Text.primary : DesignTokens.Text.secondary)
                .clipShape(RoundedRectangle(cornerRadius: TVDesignTokens.Radius.default))
                .overlay(
                    RoundedRectangle(cornerRadius: TVDesignTokens.Radius.default)
                        .stroke(
                            isSelected ? DesignTokens.Glass.borderFocus : DesignTokens.Glass.border,
                            lineWidth: isSelected ? TVDesignTokens.Focus.ringWidth : 1
                        )
                )
            }
            .buttonStyle(.plain)
            .accessibilityIdentifier("tv_discover_tab_\(category.id)")
            .focused($focusedTab, equals: category)
            .onChange(of: focusedTab) { _, newValue in
                if let newValue {
                    selectedCategory = newValue
                }
            }
        }

        private var contentArea: some View {
            ScrollView(.vertical, showsIndicators: false) {
                if let vm = viewModel {
                    if vm.isLoading {
                        loadingState
                    } else {
                        TVDiscoverCategorySection(
                            category: selectedCategory,
                            features: vm.features(for: selectedCategory),
                            viewModel: vm
                        )
                    }
                }
            }
        }

        private var loadingState: some View {
            VStack(spacing: TVDesignTokens.Spacing.xl) {
                ProgressView()
                    .tint(DesignTokens.Primary.default)
                    .scaleEffect(1.5)
                Text(localization.t("discover.loading"))
                    .font(.system(size: TVDesignTokens.FontSize.lg))
                    .foregroundStyle(DesignTokens.Text.muted)
            }
            .frame(maxWidth: .infinity, minHeight: 400)
        }

        private func buildAvailabilityDependencies() -> FeatureAvailabilityDependencies {
            FeatureAvailabilityDependencies(
                isPremium: { [repos] in
                    await MainActor.run {
                        repos.storeManager.isPlusSubscribed
                    }
                },
                hasAvatar: { false },
                hasMicrophonePermission: { false },
                hasCompletedPreference: { _ in false }
            )
        }
    }
#endif
