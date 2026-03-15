#if os(tvOS)
    import BayitCore
    import BayitDesignSystem
    import BayitLocalization
    import SwiftUI

    // MARK: - Preferences Category

    private enum PreferencesCategory: String, CaseIterable {
        case language
        case playback
        case notifications
        case audioSubtitles
        case accessibility

        var icon: String {
            switch self {
            case .language: return "globe"
            case .playback: return "play.rectangle"
            case .notifications: return "bell"
            case .audioSubtitles: return "speaker.wave.2"
            case .accessibility: return "accessibility"
            }
        }

        func title(_ localization: LocalizationManager) -> String {
            switch self {
            case .language: return localization.t("settings.language")
            case .playback: return localization.t("settings.playback.title")
            case .notifications: return localization.t("settings.notificationSettings.title")
            case .audioSubtitles: return localization.t("settings.audio.title")
            case .accessibility: return localization.t("settings.accessibility.title")
            }
        }
    }

    // MARK: - TVPreferencesView

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
        @State private var selectedCategory: PreferencesCategory = .language

        init(
            preferences: ProfilePreferences?,
            viewModel: ProfileViewModel,
            onDismiss: @escaping () -> Void
        ) {
            self.preferences = preferences
            self.viewModel = viewModel
            self.onDismiss = onDismiss
            _selectedLanguage = State(initialValue: preferences?.language ?? "en")
            _selectedSubtitleLanguage = State(
                initialValue: preferences?.subtitleLanguage ?? "he"
            )
            _autoplay = State(initialValue: preferences?.autoplay ?? true)
            _notifications = State(initialValue: preferences?.notifications ?? true)
            _contentRating = State(initialValue: preferences?.contentRating ?? "pg13")
            _quality = State(initialValue: preferences?.quality ?? "auto")
        }

        var body: some View {
            HStack(spacing: 0) {
                sidebar
                contentPanel
            }
            .background(DesignTokens.Background.primary.ignoresSafeArea())
            .onExitCommand { onDismiss() }
            .onChange(of: selectedLanguage) { applyLanguage() }
            .onChange(of: selectedSubtitleLanguage) { persistPreferences() }
            .onChange(of: autoplay) { persistPreferences() }
            .onChange(of: notifications) { persistPreferences() }
            .onChange(of: contentRating) { persistPreferences() }
            .onChange(of: quality) { persistPreferences() }
        }

        // MARK: - Sidebar

        private var sidebar: some View {
            VStack(alignment: .leading, spacing: 0) {
                Text(localization.t("settings.preferences").uppercased())
                    .font(.system(size: 11, weight: .bold))
                    .foregroundStyle(DesignTokens.Text.muted)
                    .kerning(1.4)
                    .padding(.horizontal, 24)
                    .padding(.top, 48)
                    .padding(.bottom, 20)

                ForEach(PreferencesCategory.allCases, id: \.rawValue) { category in
                    sidebarRow(category)
                }

                Spacer()
            }
            .frame(width: 300)
            .background(sidebarBackground)
        }

        private func sidebarRow(_ category: PreferencesCategory) -> some View {
            let isSelected = selectedCategory == category
            return Button { selectedCategory = category } label: {
                HStack(spacing: 14) {
                    Image(systemName: category.icon)
                        .font(.system(size: 18, weight: .medium))
                        .foregroundStyle(
                            isSelected
                                ? DesignTokens.Primary.p300
                                : DesignTokens.Text.secondary
                        )
                        .frame(width: 24)

                    Text(category.title(localization))
                        .font(.system(
                            size: TVDesignTokens.FontSize.base,
                            weight: isSelected ? .semibold : .regular
                        ))
                        .foregroundStyle(
                            isSelected
                                ? DesignTokens.Text.primary
                                : DesignTokens.Text.secondary
                        )

                    Spacer()
                }
                .padding(.horizontal, 20)
                .padding(.vertical, 14)
                .background(
                    isSelected
                        ? DesignTokens.Primary.p600.opacity(0.3)
                        : Color.clear
                )
                .clipShape(RoundedRectangle(cornerRadius: 10))
                .padding(.horizontal, 8)
            }
            .buttonStyle(.plain)
            .tvCardStyle()
        }

        private var sidebarBackground: some View {
            ZStack {
                Color(red: 0.06, green: 0.04, blue: 0.14)
                Rectangle().fill(.ultraThinMaterial).environment(\.colorScheme, .dark)
                DesignTokens.Primary.p900.opacity(0.1)
            }
        }

        // MARK: - Content Panel

        private var contentPanel: some View {
            Group {
                switch selectedCategory {
                case .language:
                    languagePanel
                case .playback:
                    playbackPanel
                case .notifications:
                    TVNotificationSettingsView()
                case .audioSubtitles:
                    TVAudioSettingsView()
                case .accessibility:
                    TVAccessibilitySettingsView()
                }
            }
            .frame(maxWidth: .infinity, maxHeight: .infinity)
        }

        // MARK: - Language Panel

        private var languagePanel: some View {
            VStack(alignment: .leading, spacing: 0) {
                ScrollView(.vertical, showsIndicators: false) {
                    LazyVStack(spacing: 6) {
                        ForEach(Language.allCases, id: \.rawValue) { language in
                            languageRow(language)
                        }
                    }
                    .padding(.horizontal, 48)
                    .padding(.vertical, 32)
                }

                Text(localization.t("settings.languageDescription"))
                    .font(.system(size: TVDesignTokens.FontSize.sm))
                    .foregroundStyle(DesignTokens.Text.muted)
                    .padding(.horizontal, 48)
                    .padding(.bottom, 32)
            }
        }

        private func languageRow(_ language: Language) -> some View {
            let isSelected = localization.currentLanguage == language
            return Button {
                withAnimation(.easeInOut(duration: 0.15)) {
                    selectedLanguage = language.rawValue
                }
            } label: {
                HStack {
                    Text(language.displayName)
                        .font(.system(
                            size: TVDesignTokens.FontSize.lg,
                            weight: isSelected ? .semibold : .regular
                        ))
                        .foregroundStyle(
                            isSelected
                                ? DesignTokens.Text.primary
                                : DesignTokens.Text.secondary
                        )

                    Spacer()

                    if isSelected {
                        Image(systemName: "checkmark")
                            .font(.system(size: 16, weight: .semibold))
                            .foregroundStyle(DesignTokens.Primary.p400)
                    }
                }
                .padding(.horizontal, 20)
                .padding(.vertical, 16)
                .background(
                    isSelected
                        ? DesignTokens.Primary.p600.opacity(0.2)
                        : Color.white.opacity(0.04)
                )
                .clipShape(RoundedRectangle(cornerRadius: 10))
                .overlay(
                    RoundedRectangle(cornerRadius: 10)
                        .strokeBorder(
                            isSelected
                                ? DesignTokens.Primary.p400.opacity(0.4)
                                : Color.clear,
                            lineWidth: 1
                        )
                )
            }
            .buttonStyle(.plain)
            .tvCardStyle()
        }

        // MARK: - Playback Panel

        private var playbackPanel: some View {
            ScrollView(.vertical, showsIndicators: false) {
                VStack(spacing: 12) {
                    autoplayRow
                    qualityRow
                    ratingRow
                }
                .padding(.horizontal, 48)
                .padding(.vertical, 32)
            }
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

        private var qualityRow: some View {
            Menu {
                ForEach(qualityOptions, id: \.0) { key, label in
                    Button(label) { quality = key }
                }
            } label: {
                prefGlassRow(
                    title: localization.t("settings.quality"),
                    detail: qualityOptions.first { $0.0 == quality }?.1 ?? quality
                )
            }
            .tvCardStyle()
        }

        private var ratingRow: some View {
            Menu {
                ForEach(ratingOptions, id: \.0) { key, label in
                    Button(label) { contentRating = key }
                }
            } label: {
                prefGlassRow(
                    title: localization.t("settings.contentRating"),
                    detail: ratingOptions.first { $0.0 == contentRating }?.1 ?? contentRating
                )
            }
            .tvCardStyle()
        }
    }
#endif
