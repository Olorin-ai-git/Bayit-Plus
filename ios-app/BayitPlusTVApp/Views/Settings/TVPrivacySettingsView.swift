import BayitDesignSystem
import BayitLocalization
import SwiftUI

/// tvOS privacy settings: analytics, crash reports, personalization,
/// watch/search history controls with clear actions.
/// Reuses PrivacySettingsViewModel from shared ViewModels.
struct TVPrivacySettingsView: View {
    @Environment(LocalizationManager.self) var localization
    @Environment(TVRepositoryProvider.self) var repos
    @State var viewModel: PrivacySettingsViewModel?
    @State var showClearWatchHistory = false
    @State var showClearSearchHistory = false

    var body: some View {
        ScrollView(.vertical, showsIndicators: false) {
            if let vm = viewModel {
                LazyVStack(spacing: TVDesignTokens.Spacing.xl) {
                    if vm.isLoading {
                        loadingState
                    } else if let error = vm.error {
                        errorState(error, vm: vm)
                    } else {
                        headerSection
                        dataCollectionSection(vm)
                        historySection(vm)
                        saveButton(vm)
                        successBanner(vm)
                    }
                }
                .padding(.horizontal, TVDesignTokens.Spacing.xl)
                .padding(.vertical, TVDesignTokens.Spacing.lg)
            }
        }
        .background(DesignTokens.Background.primary)
        .task {
            if viewModel == nil {
                viewModel = PrivacySettingsViewModel(
                    repository: repos.userSettings
                )
            }
            await viewModel?.load()
        }
        .alert(
            localization.t("settings.privacy.clearWatchHistoryTitle"),
            isPresented: $showClearWatchHistory
        ) {
            Button(localization.t("common.cancel"), role: .cancel) {}
            Button(localization.t("settings.privacy.clear"), role: .destructive) {
                Task { await viewModel?.clearWatchHistory() }
            }
        } message: {
            Text(localization.t("settings.privacy.clearWatchHistoryMessage"))
        }
        .alert(
            localization.t("settings.privacy.clearSearchHistoryTitle"),
            isPresented: $showClearSearchHistory
        ) {
            Button(localization.t("common.cancel"), role: .cancel) {}
            Button(localization.t("settings.privacy.clear"), role: .destructive) {
                Task { await viewModel?.clearSearchHistory() }
            }
        } message: {
            Text(localization.t("settings.privacy.clearSearchHistoryMessage"))
        }
    }

    // MARK: - Loading

    private var loadingState: some View {
        VStack(spacing: TVDesignTokens.Spacing.xl) {
            ProgressView()
                .tint(DesignTokens.Primary.default)
                .scaleEffect(1.5)
            Text(localization.t("common.loading"))
                .font(.system(size: TVDesignTokens.FontSize.lg))
                .foregroundStyle(DesignTokens.Text.muted)
        }
        .frame(maxWidth: .infinity, minHeight: 400)
    }

    // MARK: - Error

    private func errorState(_ message: String, vm: PrivacySettingsViewModel) -> some View {
        VStack(spacing: TVDesignTokens.Spacing.xl) {
            Image(systemName: "exclamationmark.triangle")
                .font(.system(size: TVDesignTokens.FontSize.hero))
                .foregroundStyle(DesignTokens.Warning.default)

            Text(message)
                .font(.system(size: TVDesignTokens.FontSize.lg))
                .foregroundStyle(DesignTokens.Text.secondary)
                .multilineTextAlignment(.center)
                .frame(maxWidth: 600)

            GlassButton(
                localization.t("common.retry"),
                variant: .secondary,
                size: .large
            ) {
                Task { await vm.load() }
            }
            .frame(maxWidth: 300)
        }
        .frame(maxWidth: .infinity)
        .padding(.top, TVDesignTokens.Spacing.xxxxl)
    }

    // MARK: - Header

    var headerSection: some View {
        VStack(spacing: TVDesignTokens.Spacing.lg) {
            Image(systemName: "hand.raised")
                .font(.system(size: TVDesignTokens.FontSize.hero))
                .foregroundStyle(DesignTokens.Primary.p400)

            Text(localization.t("settings.privacy.title"))
                .font(.system(size: TVDesignTokens.FontSize.xxxl, weight: .bold))
                .foregroundStyle(DesignTokens.Text.primary)

            Text(localization.t("settings.privacy.description"))
                .font(.system(size: TVDesignTokens.FontSize.base))
                .foregroundStyle(DesignTokens.Text.secondary)
                .multilineTextAlignment(.center)
        }
    }
}
