import BayitDesignSystem
import BayitLocalization
import SwiftUI

/// tvOS accessibility settings: large text, bold text, high contrast,
/// reduce motion, audio descriptions, closed captions, and color blind mode.
/// Reuses AccessibilitySettingsViewModel from shared ViewModels.
struct TVAccessibilitySettingsView: View {
    @Environment(LocalizationManager.self) private var localization
    @Environment(TVRepositoryProvider.self) private var repos
    @State private var viewModel: AccessibilitySettingsViewModel?

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
                        displaySection(vm)
                        audioSection(vm)
                        colorBlindSection(vm)
                        saveButton(vm)
                    }
                }
                .padding(.horizontal, TVDesignTokens.Spacing.xl)
                .padding(.vertical, TVDesignTokens.Spacing.lg)
            }
        }
        .background(DesignTokens.Background.primary)
        .task {
            if viewModel == nil {
                viewModel = AccessibilitySettingsViewModel(
                    repository: repos.userSettings
                )
            }
            await viewModel?.load()
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

    private func errorState(
        _ message: String,
        vm: AccessibilitySettingsViewModel
    ) -> some View {
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
            Image(systemName: "accessibility")
                .font(.system(size: TVDesignTokens.FontSize.hero))
                .foregroundStyle(DesignTokens.Primary.p400)

            Text(localization.t("settings.accessibility.title"))
                .font(.system(size: TVDesignTokens.FontSize.xxxl, weight: .bold))
                .foregroundStyle(DesignTokens.Text.primary)

            Text(localization.t("settings.accessibility.description"))
                .font(.system(size: TVDesignTokens.FontSize.base))
                .foregroundStyle(DesignTokens.Text.secondary)
                .multilineTextAlignment(.center)
        }
    }

    // MARK: - Display

    private func displaySection(
        _ vm: AccessibilitySettingsViewModel
    ) -> some View {
        VStack(alignment: .leading, spacing: TVDesignTokens.Spacing.sm) {
            sectionLabel(localization.t("settings.accessibility.display"))

            accessibilityToggle(
                icon: "textformat.size.larger",
                title: localization.t("settings.accessibility.largeText"),
                subtitle: localization.t("settings.accessibility.largeTextDesc"),
                isOn: Binding(
                    get: { vm.largeText },
                    set: { vm.largeText = $0 }
                )
            )
            accessibilityToggle(
                icon: "bold",
                title: localization.t("settings.accessibility.boldText"),
                subtitle: nil,
                isOn: Binding(
                    get: { vm.boldText },
                    set: { vm.boldText = $0 }
                )
            )
            accessibilityToggle(
                icon: "circle.lefthalf.filled",
                title: localization.t("settings.accessibility.highContrast"),
                subtitle: nil,
                isOn: Binding(
                    get: { vm.highContrast },
                    set: { vm.highContrast = $0 }
                )
            )
            accessibilityToggle(
                icon: "figure.walk",
                title: localization.t("settings.accessibility.reduceMotion"),
                subtitle: localization.t(
                    "settings.accessibility.reduceMotionDesc"
                ),
                isOn: Binding(
                    get: { vm.reduceMotion },
                    set: { vm.reduceMotion = $0 }
                )
            )
        }
    }

    // MARK: - Audio & Visual

    private func audioSection(
        _ vm: AccessibilitySettingsViewModel
    ) -> some View {
        VStack(alignment: .leading, spacing: TVDesignTokens.Spacing.sm) {
            sectionLabel(localization.t("settings.accessibility.audioVisual"))

            accessibilityToggle(
                icon: "speaker.wave.2.bubble",
                title: localization.t(
                    "settings.accessibility.audioDescriptions"
                ),
                subtitle: localization.t(
                    "settings.accessibility.audioDescDesc"
                ),
                isOn: Binding(
                    get: { vm.audioDescriptions },
                    set: { vm.audioDescriptions = $0 }
                )
            )
            accessibilityToggle(
                icon: "captions.bubble",
                title: localization.t("settings.accessibility.closedCaptions"),
                subtitle: nil,
                isOn: Binding(
                    get: { vm.closedCaptions },
                    set: { vm.closedCaptions = $0 }
                )
            )
        }
    }

    // MARK: - Color Blind Mode

    private func colorBlindSection(
        _ vm: AccessibilitySettingsViewModel
    ) -> some View {
        VStack(alignment: .leading, spacing: TVDesignTokens.Spacing.sm) {
            sectionLabel(localization.t("settings.accessibility.colorBlind"))

            HStack(spacing: TVDesignTokens.Spacing.md) {
                ForEach(ColorBlindMode.allCases) { mode in
                    GlassButton(
                        mode.displayName,
                        variant: vm.colorBlindMode == mode
                            ? .primary : .ghost,
                        size: .medium
                    ) {
                        vm.colorBlindMode = mode
                    }
                }
            }
        }
    }

    // MARK: - Save

    private func saveButton(
        _ vm: AccessibilitySettingsViewModel
    ) -> some View {
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

    // MARK: - Helpers

    private func sectionLabel(_ text: String) -> some View {
        Text(text)
            .font(.system(size: TVDesignTokens.FontSize.sm, weight: .semibold))
            .foregroundStyle(DesignTokens.Text.muted)
            .textCase(.uppercase)
    }

    private func accessibilityToggle(
        icon: String,
        title: String,
        subtitle: String?,
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

                if let subtitle {
                    Text(subtitle)
                        .font(.system(size: TVDesignTokens.FontSize.sm))
                        .foregroundStyle(DesignTokens.Text.muted)
                        .lineLimit(2)
                }
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
}
