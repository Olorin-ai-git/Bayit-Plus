import BayitDesignSystem
import BayitLocalization
import SwiftUI

// MARK: - TVAudioSettingsView + Sections

extension TVAudioSettingsView {
    // MARK: - Language

    func languageSection(_ vm: AudioSettingsViewModel) -> some View {
        VStack(alignment: .leading, spacing: TVDesignTokens.Spacing.md) {
            sectionLabel(localization.t("settings.audio.preferredLanguage"))

            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: TVDesignTokens.Spacing.md) {
                    ForEach(supportedLanguages, id: \.self) { lang in
                        GlassButton(
                            languageDisplayName(lang),
                            variant: vm.preferredLanguage == lang
                                ? .primary : .ghost,
                            size: .medium
                        ) {
                            vm.preferredLanguage = lang
                        }
                        .focused($focusedField, equals: .language(lang))
                    }
                }
            }
        }
    }

    // MARK: - Quality

    func qualitySection(_ vm: AudioSettingsViewModel) -> some View {
        VStack(alignment: .leading, spacing: TVDesignTokens.Spacing.md) {
            sectionLabel(localization.t("settings.audio.quality"))

            HStack(spacing: TVDesignTokens.Spacing.md) {
                ForEach(AudioQuality.allCases) { quality in
                    GlassButton(
                        quality.displayName,
                        variant: vm.quality == quality ? .primary : .ghost,
                        size: .medium
                    ) {
                        vm.quality = quality
                    }
                    .focused($focusedField, equals: .quality(quality))
                }
            }
        }
    }

    // MARK: - Processing

    func processingSection(_ vm: AudioSettingsViewModel) -> some View {
        VStack(alignment: .leading, spacing: TVDesignTokens.Spacing.sm) {
            sectionLabel(localization.t("settings.audio.processing"))

            HStack(spacing: TVDesignTokens.Spacing.lg) {
                Image(systemName: "waveform.path.ecg")
                    .font(.system(size: TVDesignTokens.FontSize.lg))
                    .foregroundStyle(DesignTokens.Primary.p400)
                    .frame(width: 48, height: 48)

                VStack(alignment: .leading, spacing: TVDesignTokens.Spacing.xxs) {
                    Text(localization.t("settings.audio.volumeNormalization"))
                        .font(.system(
                            size: TVDesignTokens.FontSize.base,
                            weight: .semibold
                        ))
                        .foregroundStyle(DesignTokens.Text.primary)

                    Text(localization.t("settings.audio.volumeNormDesc"))
                        .font(.system(size: TVDesignTokens.FontSize.sm))
                        .foregroundStyle(DesignTokens.Text.muted)
                        .lineLimit(2)
                }

                Spacer()

                Toggle("", isOn: Binding(
                    get: { vm.volumeNormalization },
                    set: { vm.volumeNormalization = $0 }
                ))
                .tint(DesignTokens.Primary.default)
                .labelsHidden()
                .focused($focusedField, equals: .normalization)
            }
            .padding(TVDesignTokens.Spacing.lg)
            .background(DesignTokens.Glass.bgLight)
            .clipShape(RoundedRectangle(cornerRadius: TVDesignTokens.Radius.lg))
        }
    }

    // MARK: - Dubbing

    func dubbingSection(_ vm: AudioSettingsViewModel) -> some View {
        VStack(alignment: .leading, spacing: TVDesignTokens.Spacing.sm) {
            sectionLabel(localization.t("settings.audio.dubbing"))

            HStack(spacing: TVDesignTokens.Spacing.lg) {
                Image(systemName: "waveform.and.mic")
                    .font(.system(size: TVDesignTokens.FontSize.lg))
                    .foregroundStyle(DesignTokens.Primary.p400)
                    .frame(width: 48, height: 48)

                Text(localization.t("settings.audio.preferDubbed"))
                    .font(.system(
                        size: TVDesignTokens.FontSize.base,
                        weight: .semibold
                    ))
                    .foregroundStyle(DesignTokens.Text.primary)

                Spacer()

                Toggle("", isOn: Binding(
                    get: { vm.preferDubbed },
                    set: { vm.preferDubbed = $0 }
                ))
                .tint(DesignTokens.Primary.default)
                .labelsHidden()
                .focused($focusedField, equals: .preferDubbed)
            }
            .padding(TVDesignTokens.Spacing.lg)
            .background(DesignTokens.Glass.bgLight)
            .clipShape(RoundedRectangle(cornerRadius: TVDesignTokens.Radius.lg))

            if vm.preferDubbed {
                VStack(alignment: .leading, spacing: TVDesignTokens.Spacing.sm) {
                    Text(localization.t("settings.audio.dubbingLanguage"))
                        .font(.system(size: TVDesignTokens.FontSize.sm))
                        .foregroundStyle(DesignTokens.Text.secondary)

                    ScrollView(.horizontal, showsIndicators: false) {
                        HStack(spacing: TVDesignTokens.Spacing.md) {
                            ForEach(supportedLanguages, id: \.self) { lang in
                                GlassButton(
                                    languageDisplayName(lang),
                                    variant: vm.dubbingLanguage == lang
                                        ? .primary : .ghost,
                                    size: .medium
                                ) {
                                    vm.dubbingLanguage = lang
                                }
                                .focused(
                                    $focusedField,
                                    equals: .dubbingLanguage(lang)
                                )
                            }
                        }
                    }
                }
            }
        }
    }

    // MARK: - Save

    func saveButton(_ vm: AudioSettingsViewModel) -> some View {
        GlassButton(
            localization.t("common.save"),
            variant: .primary,
            size: .large,
            isLoading: vm.isSaving
        ) {
            Task { await vm.save() }
        }
        .focused($focusedField, equals: .save)
        .frame(maxWidth: 400)
    }

    // MARK: - Helpers

    func sectionLabel(_ text: String) -> some View {
        Text(text)
            .font(.system(size: TVDesignTokens.FontSize.sm, weight: .semibold))
            .foregroundStyle(DesignTokens.Text.muted)
            .textCase(.uppercase)
    }

    func languageDisplayName(_ code: String) -> String {
        Locale.current.localizedString(forLanguageCode: code)
            ?? code.uppercased()
    }
}
