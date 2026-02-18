import BayitDesignSystem
import BayitLocalization
import SwiftUI

/// Privacy preferences: analytics, crash reports, personalization,
/// watch/search history controls with clear actions.
struct PrivacySettingsView: View {
    @Environment(RepositoryProvider.self) private var repos
    @Environment(LocalizationManager.self) private var localization
    @State private var viewModel: PrivacySettingsViewModel?
    @State private var showClearWatchHistory = false
    @State private var showClearSearchHistory = false

    var body: some View {
        ScrollView(.vertical, showsIndicators: false) {
            if let vm = viewModel {
                VStack(spacing: DesignTokens.Spacing.lg) {
                    headerSection
                    if vm.isLoading {
                        ProgressView().tint(.white).padding(.top, DesignTokens.Spacing.xxxxl)
                    } else {
                        dataCollectionSection(vm)
                        historySection(vm)
                        GlassButton(localization.t("common.save"), isLoading: vm.isSaving) {
                            Task { await vm.save() }
                        }.padding(.horizontal, DesignTokens.Spacing.lg)
                        successBanner(vm)
                    }
                }.padding(.vertical, DesignTokens.Spacing.lg)
            } else { ScreenLoadingView() }
        }
        .background(DesignTokens.Background.primary)
        .task {
            if viewModel == nil { viewModel = PrivacySettingsViewModel(repository: repos.userSettings) }
            await viewModel?.load()
        }
        .alert(localization.t("settings.privacy.clearWatchHistoryTitle"),
               isPresented: $showClearWatchHistory) {
            Button(localization.t("common.cancel"), role: .cancel) {}
            Button(localization.t("settings.privacy.clear"), role: .destructive) {
                Task { await viewModel?.clearWatchHistory() }
            }
        } message: { Text(localization.t("settings.privacy.clearWatchHistoryMessage")) }
        .alert(localization.t("settings.privacy.clearSearchHistoryTitle"),
               isPresented: $showClearSearchHistory) {
            Button(localization.t("common.cancel"), role: .cancel) {}
            Button(localization.t("settings.privacy.clear"), role: .destructive) {
                Task { await viewModel?.clearSearchHistory() }
            }
        } message: { Text(localization.t("settings.privacy.clearSearchHistoryMessage")) }
    }

    private var headerSection: some View {
        VStack(spacing: DesignTokens.Spacing.sm) {
            Image(systemName: "hand.raised").font(.system(size: 48))
                .foregroundStyle(DesignTokens.Primary.p400)
            Text(localization.t("settings.privacy.title"))
                .font(.system(size: DesignTokens.FontSize.xl, weight: .bold))
                .foregroundStyle(DesignTokens.Text.primary)
            Text(localization.t("settings.privacy.description"))
                .font(.system(size: DesignTokens.FontSize.sm))
                .foregroundStyle(DesignTokens.Text.secondary).multilineTextAlignment(.center)
        }.padding(.horizontal, DesignTokens.Spacing.lg)
    }

    private func dataCollectionSection(_ vm: PrivacySettingsViewModel) -> some View {
        VStack(spacing: DesignTokens.Spacing.sm) {
            settingsSectionLabel(localization.t("settings.privacy.dataCollection"))
            settingsIconToggleRow(
                icon: "chart.bar",
                title: localization.t("settings.privacy.analytics"),
                subtitle: localization.t("settings.privacy.analyticsDesc"),
                isOn: Binding(get: { vm.analyticsEnabled }, set: { vm.analyticsEnabled = $0 })
            )
            settingsIconToggleRow(
                icon: "exclamationmark.triangle",
                title: localization.t("settings.privacy.crashReports"),
                subtitle: localization.t("settings.privacy.crashReportsDesc"),
                isOn: Binding(get: { vm.crashReports }, set: { vm.crashReports = $0 })
            )
            settingsIconToggleRow(
                icon: "sparkles",
                title: localization.t("settings.privacy.personalization"),
                subtitle: localization.t("settings.privacy.personalizationDesc"),
                isOn: Binding(get: { vm.personalization }, set: { vm.personalization = $0 })
            )
        }.padding(.horizontal, DesignTokens.Spacing.lg)
    }

    private func historySection(_ vm: PrivacySettingsViewModel) -> some View {
        VStack(spacing: DesignTokens.Spacing.sm) {
            settingsSectionLabel(localization.t("settings.privacy.history"))
            historyToggleRow(
                title: localization.t("settings.privacy.watchHistory"),
                isOn: Binding(get: { vm.watchHistoryEnabled }, set: { vm.watchHistoryEnabled = $0 }),
                clearTitle: localization.t("settings.privacy.clearWatchHistory"),
                isClearing: vm.isClearingWatchHistory,
                onClear: { showClearWatchHistory = true }
            )
            historyToggleRow(
                title: localization.t("settings.privacy.searchHistory"),
                isOn: Binding(get: { vm.searchHistoryEnabled }, set: { vm.searchHistoryEnabled = $0 }),
                clearTitle: localization.t("settings.privacy.clearSearchHistory"),
                isClearing: vm.isClearingSearchHistory,
                onClear: { showClearSearchHistory = true }
            )
        }.padding(.horizontal, DesignTokens.Spacing.lg)
    }

    @ViewBuilder
    private func successBanner(_ vm: PrivacySettingsViewModel) -> some View {
        if let message = vm.successMessage {
            GlassCard {
                HStack(spacing: DesignTokens.Spacing.sm) {
                    Image(systemName: "checkmark.circle.fill").foregroundStyle(.green)
                    Text(message).font(.system(size: DesignTokens.FontSize.sm))
                        .foregroundStyle(DesignTokens.Text.primary)
                }.padding(DesignTokens.Spacing.md)
            }.padding(.horizontal, DesignTokens.Spacing.lg)
        }
    }

    private func historyToggleRow(
        title: String, isOn: Binding<Bool>,
        clearTitle: String, isClearing: Bool,
        onClear: @escaping () -> Void
    ) -> some View {
        GlassCard {
            VStack(spacing: DesignTokens.Spacing.sm) {
                Toggle(isOn: isOn) {
                    Text(title).font(.system(size: DesignTokens.FontSize.md))
                        .foregroundStyle(DesignTokens.Text.primary)
                }.tint(DesignTokens.Primary.default)
                GlassButton(clearTitle, variant: .destructive, size: .small,
                             isLoading: isClearing, action: onClear)
            }.padding(DesignTokens.Spacing.md)
        }
    }
}
