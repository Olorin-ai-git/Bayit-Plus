import BayitDesignSystem
import BayitLocalization
import SwiftUI

/// tvOS privacy settings: analytics, crash reports, personalization,
/// watch/search history controls with clear actions.
/// Reuses PrivacySettingsViewModel from shared ViewModels.
struct TVPrivacySettingsView: View {
    @Environment(LocalizationManager.self) private var localization
    @Environment(TVRepositoryProvider.self) private var repos
    @State private var viewModel: PrivacySettingsViewModel?
    @State private var showClearWatchHistory = false
    @State private var showClearSearchHistory = false

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

    private var headerSection: some View {
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

    // MARK: - Data Collection

    private func dataCollectionSection(_ vm: PrivacySettingsViewModel) -> some View {
        VStack(alignment: .leading, spacing: TVDesignTokens.Spacing.sm) {
            sectionLabel(localization.t("settings.privacy.dataCollection"))

            privacyToggle(
                icon: "chart.bar",
                title: localization.t("settings.privacy.analytics"),
                subtitle: localization.t("settings.privacy.analyticsDesc"),
                isOn: Binding(
                    get: { vm.analyticsEnabled },
                    set: { vm.analyticsEnabled = $0 }
                )
            )
            privacyToggle(
                icon: "exclamationmark.triangle",
                title: localization.t("settings.privacy.crashReports"),
                subtitle: localization.t("settings.privacy.crashReportsDesc"),
                isOn: Binding(
                    get: { vm.crashReports },
                    set: { vm.crashReports = $0 }
                )
            )
            privacyToggle(
                icon: "sparkles",
                title: localization.t("settings.privacy.personalization"),
                subtitle: localization.t("settings.privacy.personalizationDesc"),
                isOn: Binding(
                    get: { vm.personalization },
                    set: { vm.personalization = $0 }
                )
            )
        }
    }

    // MARK: - History

    private func historySection(_ vm: PrivacySettingsViewModel) -> some View {
        VStack(alignment: .leading, spacing: TVDesignTokens.Spacing.sm) {
            sectionLabel(localization.t("settings.privacy.history"))

            historyRow(
                title: localization.t("settings.privacy.watchHistory"),
                isOn: Binding(
                    get: { vm.watchHistoryEnabled },
                    set: { vm.watchHistoryEnabled = $0 }
                ),
                clearTitle: localization.t("settings.privacy.clearWatchHistory"),
                isClearing: vm.isClearingWatchHistory,
                onClear: { showClearWatchHistory = true }
            )
            historyRow(
                title: localization.t("settings.privacy.searchHistory"),
                isOn: Binding(
                    get: { vm.searchHistoryEnabled },
                    set: { vm.searchHistoryEnabled = $0 }
                ),
                clearTitle: localization.t("settings.privacy.clearSearchHistory"),
                isClearing: vm.isClearingSearchHistory,
                onClear: { showClearSearchHistory = true }
            )
        }
    }

    // MARK: - Save & Success

    private func saveButton(_ vm: PrivacySettingsViewModel) -> some View {
        GlassButton(
            localization.t("common.save"),
            variant: .primary,
            size: .large,
            isLoading: vm.isSaving
        ) {
            Task { await vm.save() }
        }
        .frame(maxWidth: 400)
    }

    @ViewBuilder
    private func successBanner(_ vm: PrivacySettingsViewModel) -> some View {
        if let message = vm.successMessage {
            HStack(spacing: TVDesignTokens.Spacing.md) {
                Image(systemName: "checkmark.circle.fill")
                    .foregroundStyle(DesignTokens.Success.default)
                Text(message)
                    .font(.system(size: TVDesignTokens.FontSize.base))
                    .foregroundStyle(DesignTokens.Text.primary)
            }
            .padding(TVDesignTokens.Spacing.lg)
            .background(DesignTokens.Success.default.opacity(0.1))
            .clipShape(RoundedRectangle(cornerRadius: TVDesignTokens.Radius.md))
        }
    }

    // MARK: - Reusable Components

    private func sectionLabel(_ text: String) -> some View {
        Text(text)
            .font(.system(size: TVDesignTokens.FontSize.sm, weight: .semibold))
            .foregroundStyle(DesignTokens.Text.muted)
            .textCase(.uppercase)
    }

    private func privacyToggle(
        icon: String,
        title: String,
        subtitle: String,
        isOn: Binding<Bool>
    ) -> some View {
        HStack(spacing: TVDesignTokens.Spacing.lg) {
            Image(systemName: icon)
                .font(.system(size: TVDesignTokens.FontSize.lg))
                .foregroundStyle(DesignTokens.Primary.p400)
                .frame(width: 48, height: 48)

            VStack(alignment: .leading, spacing: TVDesignTokens.Spacing.xxs) {
                Text(title)
                    .font(.system(
                        size: TVDesignTokens.FontSize.base,
                        weight: .semibold
                    ))
                    .foregroundStyle(DesignTokens.Text.primary)

                Text(subtitle)
                    .font(.system(size: TVDesignTokens.FontSize.sm))
                    .foregroundStyle(DesignTokens.Text.muted)
                    .lineLimit(2)
            }

            Spacer()

            Toggle("", isOn: isOn)
                .tint(DesignTokens.Primary.default)
                .labelsHidden()
        }
        .padding(TVDesignTokens.Spacing.lg)
        .background(DesignTokens.Glass.bgLight)
        .clipShape(RoundedRectangle(cornerRadius: TVDesignTokens.Radius.lg))
    }

    private func historyRow(
        title: String,
        isOn: Binding<Bool>,
        clearTitle: String,
        isClearing: Bool,
        onClear: @escaping () -> Void
    ) -> some View {
        VStack(spacing: TVDesignTokens.Spacing.md) {
            HStack {
                Text(title)
                    .font(.system(
                        size: TVDesignTokens.FontSize.base,
                        weight: .semibold
                    ))
                    .foregroundStyle(DesignTokens.Text.primary)
                Spacer()
                Toggle("", isOn: isOn)
                    .tint(DesignTokens.Primary.default)
                    .labelsHidden()
            }

            GlassButton(
                clearTitle,
                variant: .destructive,
                size: .medium,
                isLoading: isClearing,
                action: onClear
            )
        }
        .padding(TVDesignTokens.Spacing.lg)
        .background(DesignTokens.Glass.bgLight)
        .clipShape(RoundedRectangle(cornerRadius: TVDesignTokens.Radius.lg))
    }
}
