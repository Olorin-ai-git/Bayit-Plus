import BayitDesignSystem
import BayitLocalization
import SwiftUI

// MARK: - TVPrivacySettingsView + Reusable Components

extension TVPrivacySettingsView {
    func privacyToggle(
        icon: String,
        title: String,
        subtitle: String,
        isOn: Binding<Bool>
    ) -> some View {
        Button { isOn.wrappedValue.toggle() } label: {
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

                TVSettingsPillToggle(isOn: isOn.wrappedValue)
            }
            .padding(TVDesignTokens.Spacing.lg)
            .background(DesignTokens.Glass.bgLight)
            .clipShape(RoundedRectangle(cornerRadius: TVDesignTokens.Radius.lg))
        }
        .tvCardStyle()
    }

    func historyRow(
        title: String,
        isOn: Binding<Bool>,
        clearTitle: String,
        isClearing: Bool,
        onClear: @escaping () -> Void
    ) -> some View {
        VStack(spacing: TVDesignTokens.Spacing.md) {
            Button { isOn.wrappedValue.toggle() } label: {
                HStack {
                    Text(title)
                        .font(.system(
                            size: TVDesignTokens.FontSize.base,
                            weight: .semibold
                        ))
                        .foregroundStyle(DesignTokens.Text.primary)
                    Spacer()
                    TVSettingsPillToggle(isOn: isOn.wrappedValue)
                }
            }
            .tvCardStyle()

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

    // MARK: - Data Collection

    func dataCollectionSection(_ vm: PrivacySettingsViewModel) -> some View {
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

    func historySection(_ vm: PrivacySettingsViewModel) -> some View {
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

    func saveButton(_ vm: PrivacySettingsViewModel) -> some View {
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
    func successBanner(_ vm: PrivacySettingsViewModel) -> some View {
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

    func sectionLabel(_ text: String) -> some View {
        Text(text)
            .font(.system(size: TVDesignTokens.FontSize.sm, weight: .semibold))
            .foregroundStyle(DesignTokens.Text.muted)
            .textCase(.uppercase)
    }
}
