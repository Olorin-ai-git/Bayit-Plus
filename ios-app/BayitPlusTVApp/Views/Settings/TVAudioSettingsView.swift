import BayitDesignSystem
import BayitLocalization
import SwiftUI

/// tvOS audio settings: preferred language, quality picker,
/// volume normalization, dubbed audio preference, dubbing language.
/// Reuses AudioSettingsViewModel from shared ViewModels.
struct TVAudioSettingsView: View {
    @Environment(LocalizationManager.self) var localization
    @Environment(TVRepositoryProvider.self) var repos
    @State var viewModel: AudioSettingsViewModel?

    @FocusState var focusedField: Field?

    enum Field: Hashable {
        case language(String)
        case quality(AudioQuality)
        case normalization
        case preferDubbed
        case dubbingLanguage(String)
        case save
    }

    let supportedLanguages = [
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

    var headerSection: some View {
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
}
