import BayitCore
import BayitDesignSystem
import SwiftUI

/// Preferences management screen for tvOS.
struct TVPreferencesView: View {
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
            .navigationTitle("Preferences")
            .toolbar {
                ToolbarItem(placement: .navigationBarLeading) {
                    Button("Cancel") {
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
                            Text("Save")
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
            Picker("App Language", selection: $selectedLanguage) {
                Text("English").tag("en")
                Text("Hebrew (עברית)").tag("he")
                Text("Spanish (Español)").tag("es")
                Text("French (Français)").tag("fr")
                Text("Russian (Русский)").tag("ru")
            }

            Picker("Subtitle Language", selection: $selectedSubtitleLanguage) {
                Text("Hebrew (עברית)").tag("he")
                Text("English").tag("en")
                Text("Spanish (Español)").tag("es")
                Text("French (Français)").tag("fr")
                Text("Russian (Русский)").tag("ru")
            }
        } header: {
            sectionHeader("Language & Subtitles")
        } footer: {
            Text("Choose your preferred language for app interface and subtitles")
                .font(.system(size: TVDesignTokens.FontSize.sm))
                .foregroundStyle(DesignTokens.Text.muted)
        }
    }

    // MARK: - Playback Section

    private var playbackSection: some View {
        Section {
            Toggle(isOn: $autoplay) {
                VStack(alignment: .leading, spacing: 4) {
                    Text("Autoplay Next Episode")
                        .font(.system(size: TVDesignTokens.FontSize.lg))

                    Text("Automatically play the next episode when one finishes")
                        .font(.system(size: TVDesignTokens.FontSize.sm))
                        .foregroundStyle(DesignTokens.Text.secondary)
                }
            }

            Picker("Video Quality", selection: $quality) {
                Text("Auto (Recommended)").tag("auto")
                Text("High (1080p)").tag("high")
                Text("Medium (720p)").tag("medium")
                Text("Low (480p)").tag("low")
            }
        } header: {
            sectionHeader("Playback Settings")
        }
    }

    // MARK: - Content Section

    private var contentSection: some View {
        Section {
            Picker("Content Rating", selection: $contentRating) {
                Text("All Ages").tag("g")
                Text("Parental Guidance (PG)").tag("pg")
                Text("PG-13").tag("pg13")
                Text("Mature (R)").tag("r")
                Text("Adults Only").tag("nc17")
            }
        } header: {
            sectionHeader("Content Restrictions")
        } footer: {
            Text("Content above this rating will be filtered from recommendations")
                .font(.system(size: TVDesignTokens.FontSize.sm))
                .foregroundStyle(DesignTokens.Text.muted)
        }
    }

    // MARK: - Notifications Section

    private var notificationSection: some View {
        Section {
            Toggle(isOn: $notifications) {
                VStack(alignment: .leading, spacing: 4) {
                    Text("Push Notifications")
                        .font(.system(size: TVDesignTokens.FontSize.lg))

                    Text("Receive updates about new content and features")
                        .font(.system(size: TVDesignTokens.FontSize.sm))
                        .foregroundStyle(DesignTokens.Text.secondary)
                }
            }
        } header: {
            sectionHeader("Notifications")
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
