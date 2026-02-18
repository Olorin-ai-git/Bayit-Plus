import BayitDesignSystem
import BayitLocalization
import SwiftUI

/// Accessibility preferences: large text, bold text, high contrast,
/// reduce motion, audio descriptions, closed captions, and color blind mode.
struct AccessibilitySettingsView: View {
    @Environment(RepositoryProvider.self) private var repos
    @Environment(LocalizationManager.self) private var localization
    @State private var viewModel: AccessibilitySettingsViewModel?

    var body: some View {
        ScrollView(.vertical, showsIndicators: false) {
            if let vm = viewModel {
                VStack(spacing: DesignTokens.Spacing.lg) {
                    headerSection
                    if vm.isLoading {
                        ProgressView().tint(.white).padding(.top, DesignTokens.Spacing.xxxxl)
                    } else {
                        displaySection(vm)
                        audioSection(vm)
                        colorBlindSection(vm)
                        GlassButton(localization.t("common.save"), isLoading: vm.isSaving) {
                            Task { await vm.save() }
                        }.padding(.horizontal, DesignTokens.Spacing.lg)
                    }
                }.padding(.vertical, DesignTokens.Spacing.lg)
            } else { ScreenLoadingView() }
        }
        .background(DesignTokens.Background.primary)
        .task {
            if viewModel == nil { viewModel = AccessibilitySettingsViewModel(repository: repos.userSettings) }
            await viewModel?.load()
        }
    }

    private var headerSection: some View {
        VStack(spacing: DesignTokens.Spacing.sm) {
            Image(systemName: "accessibility").font(.system(size: 48))
                .foregroundStyle(DesignTokens.Primary.p400)
            Text(localization.t("settings.accessibility.title"))
                .font(.system(size: DesignTokens.FontSize.xl, weight: .bold))
                .foregroundStyle(DesignTokens.Text.primary)
            Text(localization.t("settings.accessibility.description"))
                .font(.system(size: DesignTokens.FontSize.sm))
                .foregroundStyle(DesignTokens.Text.secondary).multilineTextAlignment(.center)
        }.padding(.horizontal, DesignTokens.Spacing.lg)
    }

    private func displaySection(_ vm: AccessibilitySettingsViewModel) -> some View {
        VStack(spacing: DesignTokens.Spacing.sm) {
            settingsSectionLabel(localization.t("settings.accessibility.display"))
            settingsIconToggleRow(
                icon: "textformat.size.larger",
                title: localization.t("settings.accessibility.largeText"),
                subtitle: localization.t("settings.accessibility.largeTextDesc"),
                isOn: Binding(get: { vm.largeText }, set: { vm.largeText = $0 })
            )
            settingsIconToggleRow(
                icon: "bold",
                title: localization.t("settings.accessibility.boldText"),
                subtitle: nil,
                isOn: Binding(get: { vm.boldText }, set: { vm.boldText = $0 })
            )
            settingsIconToggleRow(
                icon: "circle.lefthalf.filled",
                title: localization.t("settings.accessibility.highContrast"),
                subtitle: nil,
                isOn: Binding(get: { vm.highContrast }, set: { vm.highContrast = $0 })
            )
            settingsIconToggleRow(
                icon: "figure.walk",
                title: localization.t("settings.accessibility.reduceMotion"),
                subtitle: localization.t("settings.accessibility.reduceMotionDesc"),
                isOn: Binding(get: { vm.reduceMotion }, set: { vm.reduceMotion = $0 })
            )
        }.padding(.horizontal, DesignTokens.Spacing.lg)
    }

    private func audioSection(_ vm: AccessibilitySettingsViewModel) -> some View {
        VStack(spacing: DesignTokens.Spacing.sm) {
            settingsSectionLabel(localization.t("settings.accessibility.audioVisual"))
            settingsIconToggleRow(
                icon: "speaker.wave.2.bubble",
                title: localization.t("settings.accessibility.audioDescriptions"),
                subtitle: localization.t("settings.accessibility.audioDescDesc"),
                isOn: Binding(get: { vm.audioDescriptions }, set: { vm.audioDescriptions = $0 })
            )
            settingsIconToggleRow(
                icon: "captions.bubble",
                title: localization.t("settings.accessibility.closedCaptions"),
                subtitle: nil,
                isOn: Binding(get: { vm.closedCaptions }, set: { vm.closedCaptions = $0 })
            )
        }.padding(.horizontal, DesignTokens.Spacing.lg)
    }

    private func colorBlindSection(_ vm: AccessibilitySettingsViewModel) -> some View {
        VStack(alignment: .leading, spacing: DesignTokens.Spacing.sm) {
            settingsSectionLabel(localization.t("settings.accessibility.colorBlind"))
            ForEach(ColorBlindMode.allCases) { mode in
                settingsSelectionRow(title: mode.displayName,
                                     isSelected: vm.colorBlindMode == mode) { vm.colorBlindMode = mode }
            }
        }.padding(.horizontal, DesignTokens.Spacing.lg)
    }
}
