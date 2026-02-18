import BayitDesignSystem
import BayitLocalization
import SwiftUI

/// Audio preferences: preferred language, quality, volume normalization,
/// dubbed audio preference, and dubbing language selection.
struct AudioSettingsView: View {
    @Environment(RepositoryProvider.self) private var repos
    @Environment(LocalizationManager.self) private var localization
    @State private var viewModel: AudioSettingsViewModel?

    private let supportedLanguages = [
        "he", "en", "ar", "ru", "fr", "es", "de", "pt", "zh", "ja",
    ]

    var body: some View {
        ScrollView(.vertical, showsIndicators: false) {
            if let vm = viewModel {
                VStack(spacing: DesignTokens.Spacing.lg) {
                    headerSection
                    if vm.isLoading {
                        ProgressView().tint(.white).padding(.top, DesignTokens.Spacing.xxxxl)
                    } else {
                        languageSection(vm)
                        qualitySection(vm)
                        normalizationSection(vm)
                        dubbingSection(vm)
                        GlassButton(localization.t("common.save"), isLoading: vm.isSaving) {
                            Task { await vm.save() }
                        }.padding(.horizontal, DesignTokens.Spacing.lg)
                    }
                }.padding(.vertical, DesignTokens.Spacing.lg)
            } else { ScreenLoadingView() }
        }
        .background(DesignTokens.Background.primary)
        .task {
            if viewModel == nil { viewModel = AudioSettingsViewModel(repository: repos.userSettings) }
            await viewModel?.load()
        }
    }

    private var headerSection: some View {
        VStack(spacing: DesignTokens.Spacing.sm) {
            Image(systemName: "speaker.wave.3").font(.system(size: 48))
                .foregroundStyle(DesignTokens.Primary.p400)
            Text(localization.t("settings.audio.title"))
                .font(.system(size: DesignTokens.FontSize.xl, weight: .bold))
                .foregroundStyle(DesignTokens.Text.primary)
            Text(localization.t("settings.audio.description"))
                .font(.system(size: DesignTokens.FontSize.sm))
                .foregroundStyle(DesignTokens.Text.secondary).multilineTextAlignment(.center)
        }.padding(.horizontal, DesignTokens.Spacing.lg)
    }

    private func languageSection(_ vm: AudioSettingsViewModel) -> some View {
        VStack(alignment: .leading, spacing: DesignTokens.Spacing.sm) {
            settingsSectionLabel(localization.t("settings.audio.preferredLanguage"))
            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: DesignTokens.Spacing.sm) {
                    ForEach(supportedLanguages, id: \.self) { lang in
                        GlassChip(
                            title: Locale.current.localizedString(forLanguageCode: lang) ?? lang.uppercased(),
                            isSelected: vm.preferredLanguage == lang,
                            onTap: { vm.preferredLanguage = lang }
                        )
                    }
                }
            }
        }.padding(.horizontal, DesignTokens.Spacing.lg)
    }

    private func qualitySection(_ vm: AudioSettingsViewModel) -> some View {
        VStack(alignment: .leading, spacing: DesignTokens.Spacing.sm) {
            settingsSectionLabel(localization.t("settings.audio.quality"))
            ForEach(AudioQuality.allCases) { quality in
                settingsSelectionRow(title: quality.displayName,
                                     isSelected: vm.quality == quality) { vm.quality = quality }
            }
        }.padding(.horizontal, DesignTokens.Spacing.lg)
    }

    private func normalizationSection(_ vm: AudioSettingsViewModel) -> some View {
        VStack(spacing: DesignTokens.Spacing.sm) {
            settingsSectionLabel(localization.t("settings.audio.processing"))
            GlassCard {
                Toggle(isOn: Binding(get: { vm.volumeNormalization }, set: { vm.volumeNormalization = $0 })) {
                    VStack(alignment: .leading, spacing: DesignTokens.Spacing.xxs) {
                        Text(localization.t("settings.audio.volumeNormalization"))
                            .font(.system(size: DesignTokens.FontSize.md)).foregroundStyle(DesignTokens.Text.primary)
                        Text(localization.t("settings.audio.volumeNormDesc"))
                            .font(.system(size: DesignTokens.FontSize.xs)).foregroundStyle(DesignTokens.Text.muted)
                    }
                }.tint(DesignTokens.Primary.default).padding(DesignTokens.Spacing.md)
            }
        }.padding(.horizontal, DesignTokens.Spacing.lg)
    }

    private func dubbingSection(_ vm: AudioSettingsViewModel) -> some View {
        VStack(spacing: DesignTokens.Spacing.sm) {
            settingsSectionLabel(localization.t("settings.audio.dubbing"))
            GlassCard {
                Toggle(isOn: Binding(get: { vm.preferDubbed }, set: { vm.preferDubbed = $0 })) {
                    Text(localization.t("settings.audio.preferDubbed"))
                        .font(.system(size: DesignTokens.FontSize.md)).foregroundStyle(DesignTokens.Text.primary)
                }.tint(DesignTokens.Primary.default).padding(DesignTokens.Spacing.md)
            }
            if vm.preferDubbed {
                VStack(alignment: .leading, spacing: DesignTokens.Spacing.xs) {
                    Text(localization.t("settings.audio.dubbingLanguage"))
                        .font(.system(size: DesignTokens.FontSize.sm)).foregroundStyle(DesignTokens.Text.secondary)
                    ScrollView(.horizontal, showsIndicators: false) {
                        HStack(spacing: DesignTokens.Spacing.sm) {
                            ForEach(supportedLanguages, id: \.self) { lang in
                                GlassChip(
                                    title: Locale.current.localizedString(forLanguageCode: lang) ?? lang.uppercased(),
                                    isSelected: vm.dubbingLanguage == lang,
                                    onTap: { vm.dubbingLanguage = lang }
                                )
                            }
                        }
                    }
                }
            }
        }.padding(.horizontal, DesignTokens.Spacing.lg)
    }
}
