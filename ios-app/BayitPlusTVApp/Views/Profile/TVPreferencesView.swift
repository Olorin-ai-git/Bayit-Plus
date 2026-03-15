#if os(tvOS)
    import BayitCore
    import BayitDesignSystem
    import BayitLocalization
    import SwiftUI

    struct TVPreferencesView: View {
        @Environment(LocalizationManager.self) var localization

        let preferences: ProfilePreferences?
        let viewModel: ProfileViewModel
        let onDismiss: () -> Void

        @State var selectedLanguage: String
        @State var selectedSubtitleLanguage: String
        @State var autoplay: Bool
        @State var notifications: Bool
        @State var contentRating: String
        @State var quality: String

        init(
            preferences: ProfilePreferences?,
            viewModel: ProfileViewModel,
            onDismiss: @escaping () -> Void
        ) {
            self.preferences = preferences
            self.viewModel = viewModel
            self.onDismiss = onDismiss
            _selectedLanguage = State(
                initialValue: preferences?.language ?? "en"
            )
            _selectedSubtitleLanguage = State(
                initialValue: preferences?.subtitleLanguage ?? "he"
            )
            _autoplay = State(
                initialValue: preferences?.autoplay ?? true
            )
            _notifications = State(
                initialValue: preferences?.notifications ?? true
            )
            _contentRating = State(
                initialValue: preferences?.contentRating ?? "pg13"
            )
            _quality = State(
                initialValue: preferences?.quality ?? "auto"
            )
        }

        var body: some View {
            VStack(spacing: 0) {
                TVProfileSheetHeader(
                    title: localization.t("settings.preferences"),
                    onDismiss: onDismiss
                ) {
                    EmptyView()
                }

                NavigationStack {
                    ScrollView(.vertical, showsIndicators: false) {
                        VStack(spacing: 20) {
                            languageRow
                            notificationsRow
                            audioRow
                            accessibilityRow
                            subtitlesRow
                            autoplayRow
                            triviaRow
                            interactiveMomentsRow
                        }
                        .padding(.horizontal, 80)
                        .padding(.vertical, 40)
                    }
                }
            }
            .background(preferencesBackground)
            .onExitCommand { onDismiss() }
            .onChange(of: selectedLanguage) { applyLanguage() }
            .onChange(of: selectedSubtitleLanguage) {
                persistPreferences()
            }
            .onChange(of: autoplay) { persistPreferences() }
            .onChange(of: notifications) { persistPreferences() }
            .onChange(of: contentRating) { persistPreferences() }
            .onChange(of: quality) { persistPreferences() }
        }

        // MARK: - Background

        private var preferencesBackground: some View {
            ZStack {
                DesignTokens.Background.primary
                RadialGradient(
                    colors: [
                        DesignTokens.Primary.p600.opacity(0.18),
                        Color.clear,
                    ],
                    center: .center,
                    startRadius: 100,
                    endRadius: 700
                )
                RadialGradient(
                    colors: [
                        Color(red: 0.2, green: 0.6, blue: 0.7)
                            .opacity(0.1),
                        Color.clear,
                    ],
                    center: UnitPoint(x: 0.7, y: 0.4),
                    startRadius: 50,
                    endRadius: 500
                )
            }
        }

        // MARK: - Rows

        private var languageRow: some View {
            NavigationLink {
                TVLanguageSettingsView()
            } label: {
                prefGlassRow(
                    title: localization.t("settings.language"),
                    detail: languageDisplayName(selectedLanguage)
                )
            }
            .tvCardStyle()
        }

        private var notificationsRow: some View {
            Button { notifications.toggle() } label: {
                prefGlassRow(
                    title: localization.t(
                        "settings.notificationSettings.title"
                    ),
                    detail: notifications
                        ? localization.t("common.on")
                        : localization.t("common.off"),
                    showToggle: true,
                    toggleOn: notifications
                )
            }
            .tvCardStyle()
        }

        private var audioRow: some View {
            NavigationLink {
                TVAudioSettingsView()
            } label: {
                prefGlassRow(
                    title: localization.t("settings.audio.title"),
                    subtitle: localization.t(
                        "settings.audio.description"
                    ),
                    detail: languageDisplayName(selectedLanguage)
                )
            }
            .tvCardStyle()
        }

        private var accessibilityRow: some View {
            NavigationLink {
                TVAccessibilitySettingsView()
            } label: {
                prefGlassRow(
                    title: localization.t(
                        "settings.accessibility.title"
                    ),
                    detail: localization.t("common.off")
                )
            }
            .tvCardStyle()
        }

        private var subtitlesRow: some View {
            Button {
                selectedSubtitleLanguage = selectedSubtitleLanguage
                    == "off" ? "he" : "off"
            } label: {
                prefGlassRow(
                    title: localization.t("settings.subtitles"),
                    showToggle: true,
                    toggleOn: selectedSubtitleLanguage != "off"
                )
            }
            .tvCardStyle()
        }

        private var autoplayRow: some View {
            Button { autoplay.toggle() } label: {
                prefGlassRow(
                    title: localization.t("settings.autoplay"),
                    showToggle: true,
                    toggleOn: autoplay
                )
            }
            .tvCardStyle()
        }

        private var triviaRow: some View {
            NavigationLink {
                TVTriviaSettingsView()
            } label: {
                prefGlassRow(
                    title: localization.t("trivia.settings.title"),
                    subtitle: localization.t(
                        "settings.audio.description"
                    ),
                    detail: localization.t("common.on")
                )
            }
            .tvCardStyle()
        }

        private var interactiveMomentsRow: some View {
            Button { /* managed by settings VM */ } label: {
                prefGlassRow(
                    title: localization.t(
                        "settings.interactiveMoments"
                    ),
                    subtitle: localization.t(
                        "settings.interactiveMomentsDesc"
                    ),
                    showToggle: true,
                    toggleOn: true
                )
            }
            .tvCardStyle()
        }

        // MARK: - Helpers

        private func languageDisplayName(
            _ code: String
        ) -> String {
            Language(rawValue: code)?.displayName
                ?? localization.currentLanguage.displayName
        }
    }
#endif
