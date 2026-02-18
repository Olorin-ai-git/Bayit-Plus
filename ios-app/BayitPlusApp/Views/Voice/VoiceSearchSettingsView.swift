import BayitDesignSystem
import BayitLocalization
import BayitVoice
import SwiftUI

/// Settings view for configuring voice search behavior.
///
/// Provides toggles for enabling voice search, auto-search on silence,
/// waveform visualization, language selection, and sensitivity control.
struct VoiceSearchSettingsView: View {

    @Environment(LocalizationManager.self) private var localization

    @AppStorage("voiceSearchEnabled") private var isEnabled = true
    @AppStorage("voiceSearchAutoSearch") private var autoSearchOnSilence = false
    @AppStorage("voiceSearchShowWaveform") private var showWaveform = true
    @AppStorage("voiceSearchLanguage") private var selectedLanguage = "en"
    @AppStorage("voiceSearchSensitivity") private var sensitivity: Double = 0.5

    var body: some View {
        ZStack {
            DesignTokens.Background.primary.ignoresSafeArea()

            ScrollView {
                VStack(spacing: DesignTokens.Spacing.xl) {
                    headerSection
                    togglesSection
                    languageSection
                    sensitivitySection
                }
                .padding(.horizontal, DesignTokens.Spacing.base)
                .padding(.vertical, DesignTokens.Spacing.xl)
            }
        }
        .navigationTitle(localization.t("voiceSearch.settings.title"))
        .navigationBarTitleDisplayMode(.large)
    }

    // MARK: - Header

    private var headerSection: some View {
        VStack(spacing: DesignTokens.Spacing.md) {
            ZStack {
                Circle()
                    .fill(DesignTokens.Glass.purpleLight)
                    .frame(width: 80, height: 80)

                Image(systemName: "mic.badge.xmark")
                    .font(.system(size: 32, weight: .medium))
                    .foregroundStyle(DesignTokens.Primary.p300)
            }

            Text(localization.t("voiceSearch.settings.title"))
                .font(.system(size: DesignTokens.FontSize.xxl, weight: .bold))
                .foregroundStyle(DesignTokens.Text.primary)
        }
    }

    // MARK: - Toggles

    private var togglesSection: some View {
        VStack(spacing: DesignTokens.Spacing.md) {
            settingsToggle(
                titleKey: "voiceSearch.settings.enabled",
                isOn: $isEnabled
            )

            settingsToggle(
                titleKey: "voiceSearch.settings.autoSearch",
                isOn: $autoSearchOnSilence
            )
            .opacity(isEnabled ? 1.0 : 0.5)
            .allowsHitTesting(isEnabled)

            settingsToggle(
                titleKey: "voiceSearch.settings.showWaveform",
                isOn: $showWaveform
            )
            .opacity(isEnabled ? 1.0 : 0.5)
            .allowsHitTesting(isEnabled)
        }
    }

    private func settingsToggle(
        titleKey: String,
        isOn: Binding<Bool>
    ) -> some View {
        HStack {
            Text(localization.t(titleKey))
                .font(.system(size: DesignTokens.FontSize.base, weight: .semibold))
                .foregroundStyle(DesignTokens.Text.primary)

            Spacer()

            Toggle("", isOn: isOn)
                .labelsHidden()
                .tint(DesignTokens.Primary.default)
        }
        .glassCard(radius: DesignTokens.Radius.lg, padding: DesignTokens.Spacing.base)
    }

    // MARK: - Language

    private var languageSection: some View {
        VStack(alignment: .leading, spacing: DesignTokens.Spacing.md) {
            Text(localization.t("voiceSearch.settings.language"))
                .font(.system(size: DesignTokens.FontSize.base, weight: .semibold))
                .foregroundStyle(DesignTokens.Text.primary)

            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: DesignTokens.Spacing.sm) {
                    ForEach(SupportedLanguage.allCases) { language in
                        languageChip(language)
                    }
                }
                .padding(.horizontal, DesignTokens.Spacing.xs)
            }
        }
        .glassCard(radius: DesignTokens.Radius.lg, padding: DesignTokens.Spacing.base)
        .opacity(isEnabled ? 1.0 : 0.5)
        .allowsHitTesting(isEnabled)
    }

    private func languageChip(_ language: SupportedLanguage) -> some View {
        let isSelected = selectedLanguage == language.rawValue

        return Button {
            selectedLanguage = language.rawValue
        } label: {
            VStack(spacing: DesignTokens.Spacing.xxs) {
                Text(language.displayName)
                    .font(.system(size: DesignTokens.FontSize.sm, weight: .semibold))

                Text(language.nativeName)
                    .font(.system(size: DesignTokens.FontSize.xs))
            }
            .foregroundStyle(
                isSelected ? DesignTokens.Text.primary : DesignTokens.Text.muted
            )
            .padding(.horizontal, DesignTokens.Spacing.md)
            .padding(.vertical, DesignTokens.Spacing.sm)
            .background(isSelected ? DesignTokens.Glass.purpleStrong : DesignTokens.Glass.bgMedium)
            .clipShape(RoundedRectangle(cornerRadius: DesignTokens.Radius.md))
            .overlay(
                RoundedRectangle(cornerRadius: DesignTokens.Radius.md)
                    .stroke(
                        isSelected ? DesignTokens.Primary.default : DesignTokens.Glass.border,
                        lineWidth: isSelected ? 2 : 1
                    )
            )
        }
        .accessibilityLabel(language.displayName)
    }

    // MARK: - Sensitivity

    private var sensitivitySection: some View {
        VStack(alignment: .leading, spacing: DesignTokens.Spacing.md) {
            HStack {
                Text(localization.t("voiceSearch.settings.sensitivity"))
                    .font(.system(size: DesignTokens.FontSize.base, weight: .semibold))
                    .foregroundStyle(DesignTokens.Text.primary)

                Spacer()

                Text(sensitivityLabel)
                    .font(.system(size: DesignTokens.FontSize.sm))
                    .foregroundStyle(DesignTokens.Text.muted)
            }

            Slider(value: $sensitivity, in: 0.0 ... 1.0, step: 0.1)
                .tint(DesignTokens.Primary.default)

            HStack {
                Text(localization.t("common.low"))
                    .font(.system(size: DesignTokens.FontSize.xs))
                    .foregroundStyle(DesignTokens.Text.disabled)

                Spacer()

                Text(localization.t("common.high"))
                    .font(.system(size: DesignTokens.FontSize.xs))
                    .foregroundStyle(DesignTokens.Text.disabled)
            }
        }
        .glassCard(radius: DesignTokens.Radius.lg, padding: DesignTokens.Spacing.base)
        .opacity(isEnabled ? 1.0 : 0.5)
        .allowsHitTesting(isEnabled)
    }

    // MARK: - Computed

    private var sensitivityLabel: String {
        if sensitivity < 0.33 { return localization.t("common.low") }
        if sensitivity < 0.66 { return localization.t("common.medium") }
        return localization.t("common.high")
    }
}
