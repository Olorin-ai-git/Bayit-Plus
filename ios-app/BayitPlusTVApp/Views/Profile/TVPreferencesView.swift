import BayitCore
import BayitDesignSystem
import BayitLocalization
import SwiftUI

/// Preferences management screen for tvOS.
/// Changes apply immediately — no Save button needed.
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
        VStack(spacing: 0) {
            TVProfileSheetHeader(
                title: localization.t("profiles.preferences"),
                onDismiss: onDismiss
            ) {
                EmptyView()
            }

            ScrollView {
                VStack(spacing: TVDesignTokens.Spacing.xl) {
                    languageSection
                    playbackSection
                    contentSection
                    notificationSection
                }
                .padding(.horizontal, TVDesignTokens.Spacing.xxl)
                .padding(.vertical, TVDesignTokens.Spacing.lg)
            }
        }
        .background(DesignTokens.Background.primary)
        .onExitCommand { onDismiss() }
        .onChange(of: selectedLanguage) { applyLanguage() }
        .onChange(of: selectedSubtitleLanguage) { persistPreferences() }
        .onChange(of: autoplay) { persistPreferences() }
        .onChange(of: notifications) { persistPreferences() }
        .onChange(of: contentRating) { persistPreferences() }
        .onChange(of: quality) { persistPreferences() }
    }

    // MARK: - Language Section

    var languageSection: some View {
        VStack(alignment: .leading, spacing: TVDesignTokens.Spacing.md) {
            sectionHeader(localization.t("settings.languageSubtitles"))

            VStack(spacing: TVDesignTokens.Spacing.xs) {
                pickerRow(
                    icon: "globe",
                    title: localization.t("settings.appLanguage"),
                    selection: $selectedLanguage,
                    options: languageOptions
                )

                pickerRow(
                    icon: "captions.bubble",
                    title: localization.t("settings.subtitleLanguage"),
                    selection: $selectedSubtitleLanguage,
                    options: languageOptions
                )
            }

            Text(localization.t("settings.languageDescription"))
                .font(.system(size: TVDesignTokens.FontSize.sm))
                .foregroundStyle(DesignTokens.Text.muted)
                .padding(.leading, TVDesignTokens.Spacing.sm)
        }
    }

    // MARK: - Playback Section

    var playbackSection: some View {
        VStack(alignment: .leading, spacing: TVDesignTokens.Spacing.md) {
            sectionHeader(localization.t("settings.playbackSettings"))

            VStack(spacing: TVDesignTokens.Spacing.xs) {
                toggleRow(
                    icon: "play.circle.fill",
                    title: localization.t("settings.autoplayNextEpisode"),
                    subtitle: localization.t("settings.autoplayDescription"),
                    isOn: $autoplay,
                    color: DesignTokens.Primary.p400
                )

                pickerRow(
                    icon: "film.stack",
                    title: localization.t("settings.videoQuality"),
                    selection: $quality,
                    options: qualityOptions
                )
            }
        }
    }

    // MARK: - Content Section

    var contentSection: some View {
        VStack(alignment: .leading, spacing: TVDesignTokens.Spacing.md) {
            sectionHeader(localization.t("settings.contentRestrictions"))

            VStack(spacing: TVDesignTokens.Spacing.xs) {
                pickerRow(
                    icon: "eye.trianglebadge.exclamationmark",
                    title: localization.t("settings.contentRating"),
                    selection: $contentRating,
                    options: ratingOptions
                )
            }

            Text(localization.t("settings.contentRatingDescription"))
                .font(.system(size: TVDesignTokens.FontSize.sm))
                .foregroundStyle(DesignTokens.Text.muted)
                .padding(.leading, TVDesignTokens.Spacing.sm)
        }
    }

    // MARK: - Notifications Section

    var notificationSection: some View {
        VStack(alignment: .leading, spacing: TVDesignTokens.Spacing.md) {
            sectionHeader(localization.t("settings.notifications"))

            VStack(spacing: TVDesignTokens.Spacing.xs) {
                toggleRow(
                    icon: "bell.fill",
                    title: localization.t("settings.pushNotifications"),
                    subtitle: localization.t("settings.notificationsDescription"),
                    isOn: $notifications,
                    color: DesignTokens.Warning.default
                )
            }
        }
    }

    // MARK: - Data

    var languageOptions: [(String, String)] {
        Language.allCases.map { ($0.rawValue, $0.displayName) }
    }

    var qualityOptions: [(String, String)] {
        [
            ("auto", localization.t("settings.qualityAuto")),
            ("high", localization.t("settings.qualityHigh")),
            ("medium", localization.t("settings.qualityMedium")),
            ("low", localization.t("settings.qualityLow")),
        ]
    }

    var ratingOptions: [(String, String)] {
        [
            ("g", localization.t("settings.ratingAllAges")),
            ("pg", localization.t("settings.ratingPG")),
            ("pg13", localization.t("settings.ratingPG13")),
            ("r", localization.t("settings.ratingMature")),
            ("nc17", localization.t("settings.ratingAdultsOnly")),
        ]
    }
}
