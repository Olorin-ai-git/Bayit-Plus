import BayitDesignSystem
import BayitLocalization
import SwiftUI

// MARK: - TVAccessibilitySettingsView + Display, Audio, ColorBlind Sections

extension TVAccessibilitySettingsView {
    // MARK: - Display

    func displaySection(
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

    func audioSection(
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

    func colorBlindSection(
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

    func saveButton(
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

    func sectionLabel(_ text: String) -> some View {
        Text(text)
            .font(.system(size: TVDesignTokens.FontSize.sm, weight: .semibold))
            .foregroundStyle(DesignTokens.Text.muted)
            .textCase(.uppercase)
    }

    func accessibilityToggle(
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
