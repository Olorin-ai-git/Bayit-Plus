import BayitDesignSystem
import BayitLocalization
import SwiftUI

/// tvOS audio settings: preferred language, quality picker,
/// volume normalization, dubbed audio preference, dubbing language.
/// Reuses AudioSettingsViewModel from shared ViewModels.
struct TVAudioSettingsView: View {
    @Environment(LocalizationManager.self) private var localization
    @Environment(TVRepositoryProvider.self) private var repos
    @State private var viewModel: AudioSettingsViewModel?

    @FocusState private var focusedField: Field?

    enum Field: Hashable {
        case language(String)
        case quality(AudioQuality)
        case normalization
        case preferDubbed
        case dubbingLanguage(String)
        case save
    }

    private let supportedLanguages = [
        "he", "en", "ar", "ru", "fr", "es", "de", "pt", "zh", "ja",
    ]

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
                        languageSection(vm)
                        qualitySection(vm)
                        processingSection(vm)
                        dubbingSection(vm)
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
                viewModel = AudioSettingsViewModel(
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
        vm: AudioSettingsViewModel
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
            Image(systemName: "speaker.wave.3")
                .font(.system(size: TVDesignTokens.FontSize.hero))
                .foregroundStyle(DesignTokens.Primary.p400)

            Text(localization.t("settings.audio.title"))
                .font(.system(size: TVDesignTokens.FontSize.xxxl, weight: .bold))
                .foregroundStyle(DesignTokens.Text.primary)

            Text(localization.t("settings.audio.description"))
                .font(.system(size: TVDesignTokens.FontSize.base))
                .foregroundStyle(DesignTokens.Text.secondary)
                .multilineTextAlignment(.center)
        }
    }

    // MARK: - Language

    private func languageSection(_ vm: AudioSettingsViewModel) -> some View {
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

    private func qualitySection(_ vm: AudioSettingsViewModel) -> some View {
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

    private func processingSection(_ vm: AudioSettingsViewModel) -> some View {
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

    private func dubbingSection(_ vm: AudioSettingsViewModel) -> some View {
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

    private func saveButton(_ vm: AudioSettingsViewModel) -> some View {
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

    private func sectionLabel(_ text: String) -> some View {
        Text(text)
            .font(.system(size: TVDesignTokens.FontSize.sm, weight: .semibold))
            .foregroundStyle(DesignTokens.Text.muted)
            .textCase(.uppercase)
    }

    private func languageDisplayName(_ code: String) -> String {
        Locale.current.localizedString(forLanguageCode: code)
            ?? code.uppercased()
    }
}
