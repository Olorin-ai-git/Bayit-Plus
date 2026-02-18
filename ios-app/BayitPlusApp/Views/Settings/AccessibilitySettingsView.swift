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
                        ProgressView().tint(.white)
                            .padding(.top, DesignTokens.Spacing.xxxxl)
                    } else {
                        displaySection(vm)
                        audioSection(vm)
                        colorBlindSection(vm)
                        saveButton(vm)
                    }
                }
                .padding(.vertical, DesignTokens.Spacing.lg)
            } else {
                ScreenLoadingView()
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

    // MARK: - Header

    private var headerSection: some View {
        VStack(spacing: DesignTokens.Spacing.sm) {
            Image(systemName: "accessibility")
                .font(.system(size: 48))
                .foregroundStyle(DesignTokens.Primary.p400)
            Text(localization.t("settings.accessibility.title"))
                .font(.system(size: DesignTokens.FontSize.xl, weight: .bold))
                .foregroundStyle(DesignTokens.Text.primary)
            Text(localization.t("settings.accessibility.description"))
                .font(.system(size: DesignTokens.FontSize.sm))
                .foregroundStyle(DesignTokens.Text.secondary)
                .multilineTextAlignment(.center)
        }
        .padding(.horizontal, DesignTokens.Spacing.lg)
    }

    // MARK: - Display

    private func displaySection(_ vm: AccessibilitySettingsViewModel) -> some View {
        VStack(spacing: DesignTokens.Spacing.sm) {
            sectionLabel(localization.t("settings.accessibility.display"))
            toggleRow(
                icon: "textformat.size.larger",
                title: localization.t("settings.accessibility.largeText"),
                subtitle: localization.t("settings.accessibility.largeTextDesc"),
                isOn: Binding(get: { vm.largeText }, set: { vm.largeText = $0 })
            )
            toggleRow(
                icon: "bold",
                title: localization.t("settings.accessibility.boldText"),
                subtitle: nil,
                isOn: Binding(get: { vm.boldText }, set: { vm.boldText = $0 })
            )
            toggleRow(
                icon: "circle.lefthalf.filled",
                title: localization.t("settings.accessibility.highContrast"),
                subtitle: nil,
                isOn: Binding(get: { vm.highContrast }, set: { vm.highContrast = $0 })
            )
            toggleRow(
                icon: "figure.walk",
                title: localization.t("settings.accessibility.reduceMotion"),
                subtitle: localization.t("settings.accessibility.reduceMotionDesc"),
                isOn: Binding(get: { vm.reduceMotion }, set: { vm.reduceMotion = $0 })
            )
        }
        .padding(.horizontal, DesignTokens.Spacing.lg)
    }

    // MARK: - Audio

    private func audioSection(_ vm: AccessibilitySettingsViewModel) -> some View {
        VStack(spacing: DesignTokens.Spacing.sm) {
            sectionLabel(localization.t("settings.accessibility.audioVisual"))
            toggleRow(
                icon: "speaker.wave.2.bubble",
                title: localization.t("settings.accessibility.audioDescriptions"),
                subtitle: localization.t("settings.accessibility.audioDescDesc"),
                isOn: Binding(
                    get: { vm.audioDescriptions },
                    set: { vm.audioDescriptions = $0 }
                )
            )
            toggleRow(
                icon: "captions.bubble",
                title: localization.t("settings.accessibility.closedCaptions"),
                subtitle: nil,
                isOn: Binding(
                    get: { vm.closedCaptions },
                    set: { vm.closedCaptions = $0 }
                )
            )
        }
        .padding(.horizontal, DesignTokens.Spacing.lg)
    }

    // MARK: - Color Blind

    private func colorBlindSection(_ vm: AccessibilitySettingsViewModel) -> some View {
        VStack(alignment: .leading, spacing: DesignTokens.Spacing.sm) {
            sectionLabel(localization.t("settings.accessibility.colorBlind"))
            ForEach(ColorBlindMode.allCases) { mode in
                selectionRow(
                    title: mode.displayName,
                    isSelected: vm.colorBlindMode == mode
                ) { vm.colorBlindMode = mode }
            }
        }
        .padding(.horizontal, DesignTokens.Spacing.lg)
    }

    // MARK: - Save

    private func saveButton(_ vm: AccessibilitySettingsViewModel) -> some View {
        GlassButton(
            localization.t("common.save"),
            isLoading: vm.isSaving
        ) { Task { await vm.save() } }
        .padding(.horizontal, DesignTokens.Spacing.lg)
    }
}

// MARK: - Shared Components

extension AccessibilitySettingsView {
    private func sectionLabel(_ text: String) -> some View {
        HStack {
            Text(text)
                .font(.system(size: DesignTokens.FontSize.sm, weight: .semibold))
                .foregroundStyle(DesignTokens.Text.muted)
                .textCase(.uppercase)
            Spacer()
        }
    }

    private func toggleRow(
        icon: String,
        title: String,
        subtitle: String?,
        isOn: Binding<Bool>
    ) -> some View {
        GlassCard {
            HStack(spacing: DesignTokens.Spacing.md) {
                Image(systemName: icon)
                    .font(.system(size: DesignTokens.FontSize.lg))
                    .foregroundStyle(DesignTokens.Primary.default)
                    .frame(width: 32)
                VStack(alignment: .leading, spacing: DesignTokens.Spacing.xxs) {
                    Text(title)
                        .font(.system(size: DesignTokens.FontSize.md))
                        .foregroundStyle(DesignTokens.Text.primary)
                    if let subtitle {
                        Text(subtitle)
                            .font(.system(size: DesignTokens.FontSize.xs))
                            .foregroundStyle(DesignTokens.Text.muted)
                            .lineLimit(2)
                    }
                }
                Spacer()
                Toggle("", isOn: isOn)
                    .tint(DesignTokens.Primary.default)
                    .labelsHidden()
            }
            .padding(DesignTokens.Spacing.md)
        }
    }

    private func selectionRow(
        title: String, isSelected: Bool, action: @escaping () -> Void
    ) -> some View {
        Button(action: action) {
            HStack {
                Text(title)
                    .font(.system(size: DesignTokens.FontSize.md))
                    .foregroundStyle(DesignTokens.Text.primary)
                Spacer()
                if isSelected {
                    Image(systemName: "checkmark")
                        .foregroundStyle(DesignTokens.Primary.default)
                }
            }
            .padding(DesignTokens.Spacing.md)
            .glassCard(radius: DesignTokens.Radius.md, padding: 0)
        }
        .buttonStyle(.plain)
    }
}
