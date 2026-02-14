import BayitCore
import BayitDesignSystem
import BayitLocalization
import SwiftUI

/// Preferences management screen for tvOS.
struct TVPreferencesView: View {
    @Environment(LocalizationManager.self) private var localization

    let preferences: ProfilePreferences?
    let viewModel: ProfileViewModel
    let onDismiss: () -> Void

    @State private var selectedLanguage: String
    @State private var selectedSubtitleLanguage: String
    @State private var autoplay: Bool
    @State private var notifications: Bool
    @State private var contentRating: String
    @State private var quality: String
    @State private var isSaving = false
    @State private var hasChanges = false

    init(preferences: ProfilePreferences?, viewModel: ProfileViewModel, onDismiss: @escaping () -> Void) {
        self.preferences = preferences
        self.viewModel = viewModel
        self.onDismiss = onDismiss

        _selectedLanguage = State(initialValue: preferences?.language ?? "en")
        _selectedSubtitleLanguage = State(initialValue: preferences?.subtitleLanguage ?? "he")
        _autoplay = State(initialValue: preferences?.autoplay ?? true)
        _notifications = State(initialValue: preferences?.notifications ?? true)
        _contentRating = State(initialValue: preferences?.contentRating ?? "pg13")
        _quality = State(initialValue: preferences?.quality ?? "auto")
    }

    var body: some View {
        NavigationStack {
            List {
                languageSection
                playbackSection
                contentSection
                notificationSection
            }
            .listStyle(.grouped)
            .navigationTitle(localization.t("profiles.preferences"))
            .toolbar {
                ToolbarItem(placement: .navigationBarLeading) {
                    Button(localization.t("common.cancel")) {
                        onDismiss()
                    }
                }

                ToolbarItem(placement: .navigationBarTrailing) {
                    Button {
                        Task { await save() }
                    } label: {
                        if isSaving {
                            ProgressView()
                        } else {
                            Text(localization.t("common.save"))
                                .bold()
                        }
                    }
                    .disabled(!hasChanges || isSaving)
                }
            }
        }
        .background(DesignTokens.Background.primary)
        .onExitCommand { onDismiss() }
        .onChange(of: selectedLanguage) { trackChanges() }
        .onChange(of: selectedSubtitleLanguage) { trackChanges() }
        .onChange(of: autoplay) { trackChanges() }
        .onChange(of: notifications) { trackChanges() }
        .onChange(of: contentRating) { trackChanges() }
        .onChange(of: quality) { trackChanges() }
    }

    // MARK: - Language Section

    private var languageSection: some View {
        Section {
            Picker(localization.t("settings.appLanguage"), selection: $selectedLanguage) {
                Text(localization.t("languages.english")).tag("en")
                Text(localization.t("languages.hebrew")).tag("he")
                Text(localization.t("languages.spanish")).tag("es")
                Text(localization.t("languages.french")).tag("fr")
                Text(localization.t("languages.russian")).tag("ru")
            }

            Picker(localization.t("settings.subtitleLanguage"), selection: $selectedSubtitleLanguage) {
                Text(localization.t("languages.hebrew")).tag("he")
                Text(localization.t("languages.english")).tag("en")
                Text(localization.t("languages.spanish")).tag("es")
                Text(localization.t("languages.french")).tag("fr")
                Text(localization.t("languages.russian")).tag("ru")
            }
        } header: {
            sectionHeader(localization.t("settings.languageSubtitles"))
        } footer: {
            Text(localization.t("settings.languageDescription"))
                .font(.system(size: TVDesignTokens.FontSize.sm))
                .foregroundStyle(DesignTokens.Text.muted)
        }
    }

    // MARK: - Playback Section

    private var playbackSection: some View {
        Section {
            Toggle(isOn: $autoplay) {
                VStack(alignment: .leading, spacing: 4) {
                    Text(localization.t("settings.autoplayNextEpisode"))
                        .font(.system(size: TVDesignTokens.FontSize.lg))

                    Text(localization.t("settings.autoplayDescription"))
                        .font(.system(size: TVDesignTokens.FontSize.sm))
                        .foregroundStyle(DesignTokens.Text.secondary)
                }
            }

            Picker(localization.t("settings.videoQuality"), selection: $quality) {
                Text(localization.t("settings.qualityAuto")).tag("auto")
                Text(localization.t("settings.qualityHigh")).tag("high")
                Text(localization.t("settings.qualityMedium")).tag("medium")
                Text(localization.t("settings.qualityLow")).tag("low")
            }
        } header: {
            sectionHeader(localization.t("settings.playbackSettings"))
        }
    }

    // MARK: - Content Section

    private var contentSection: some View {
        Section {
            Picker(localization.t("settings.contentRating"), selection: $contentRating) {
                Text(localization.t("settings.ratingAllAges")).tag("g")
                Text(localization.t("settings.ratingPG")).tag("pg")
                Text(localization.t("settings.ratingPG13")).tag("pg13")
                Text(localization.t("settings.ratingMature")).tag("r")
                Text(localization.t("settings.ratingAdultsOnly")).tag("nc17")
            }
        } header: {
            sectionHeader(localization.t("settings.contentRestrictions"))
        } footer: {
            Text(localization.t("settings.contentRatingDescription"))
                .font(.system(size: TVDesignTokens.FontSize.sm))
                .foregroundStyle(DesignTokens.Text.muted)
        }
    }

    // MARK: - Notifications Section

    private var notificationSection: some View {
        Section {
            Toggle(isOn: $notifications) {
                VStack(alignment: .leading, spacing: 4) {
                    Text(localization.t("settings.pushNotifications"))
                        .font(.system(size: TVDesignTokens.FontSize.lg))

                    Text(localization.t("settings.notificationsDescription"))
                        .font(.system(size: TVDesignTokens.FontSize.sm))
                        .foregroundStyle(DesignTokens.Text.secondary)
                }
            }
        } header: {
            sectionHeader(localization.t("settings.notifications"))
        }
    }

    // MARK: - Helpers

    private func sectionHeader(_ title: String) -> some View {
        Text(title)
            .font(.system(size: TVDesignTokens.FontSize.xl, weight: .bold))
            .foregroundStyle(DesignTokens.Text.primary)
            .textCase(nil)
    }

    private func trackChanges() {
        hasChanges = selectedLanguage != (preferences?.language ?? "en")
            || selectedSubtitleLanguage != (preferences?.subtitleLanguage ?? "he")
            || autoplay != (preferences?.autoplay ?? true)
            || notifications != (preferences?.notifications ?? true)
            || contentRating != (preferences?.contentRating ?? "pg13")
            || quality != (preferences?.quality ?? "auto")
    }

    private func save() async {
        isSaving = true

        let update = ProfilePreferencesUpdate(
            language: selectedLanguage,
            subtitleLanguage: selectedSubtitleLanguage,
            autoplay: autoplay,
            notifications: notifications,
            contentRating: contentRating,
            quality: quality
        )

        await viewModel.updatePreferences(update)
        isSaving = false

        if viewModel.error == nil {
            hasChanges = false
            onDismiss()
        }
    }
}
