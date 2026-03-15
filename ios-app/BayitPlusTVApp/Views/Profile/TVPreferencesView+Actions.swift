#if os(tvOS)
    import BayitCore
    import BayitDesignSystem
    import BayitLocalization
    import SwiftUI

    // MARK: - Actions & Glass Row Components

    extension TVPreferencesView {
        func applyLanguage() {
            if let language = Language(rawValue: selectedLanguage) {
                localization.setLanguage(language)
            }
            persistPreferences()
        }

        func persistPreferences() {
            let update = ProfilePreferencesUpdate(
                language: selectedLanguage,
                subtitleLanguage: selectedSubtitleLanguage,
                autoplay: autoplay,
                notifications: notifications,
                contentRating: contentRating,
                quality: quality
            )
            Task { await viewModel.updatePreferences(update) }
        }

        // MARK: - Glass Row

        func prefGlassRow(
            title: String,
            subtitle: String? = nil,
            detail: String? = nil,
            showToggle: Bool = false,
            toggleOn: Bool = false
        ) -> some View {
            HStack(spacing: 16) {
                VStack(alignment: .leading, spacing: 4) {
                    Text(title)
                        .font(.system(size: 28, weight: .medium))
                        .foregroundStyle(DesignTokens.Text.primary)
                        .lineLimit(1)

                    if let subtitle {
                        Text(subtitle)
                            .font(.system(size: 22))
                            .foregroundStyle(DesignTokens.Text.muted)
                            .lineLimit(1)
                    }
                }

                Spacer()

                if let detail {
                    Text(detail)
                        .font(.system(size: 24, weight: .regular))
                        .foregroundStyle(DesignTokens.Text.muted)
                }

                if showToggle {
                    TVSettingsPillToggle(isOn: toggleOn)
                } else {
                    Image(systemName: "chevron.right")
                        .font(.system(size: 18, weight: .semibold))
                        .foregroundStyle(DesignTokens.Text.muted)
                }
            }
            .padding(.horizontal, 36)
            .padding(.vertical, 8)
            .frame(minHeight: subtitle != nil ? 90 : 76)
            .background(prefRowBackground)
            .clipShape(RoundedRectangle(cornerRadius: 16))
            .overlay(prefRowBorder)
        }

        // MARK: - Row Chrome

        private var prefRowBackground: some View {
            ZStack {
                Color.white.opacity(0.06)
                RoundedRectangle(cornerRadius: 16)
                    .fill(.ultraThinMaterial)
                    .environment(\.colorScheme, .dark)
            }
        }

        private var prefRowBorder: some View {
            RoundedRectangle(cornerRadius: 16)
                .strokeBorder(
                    Color.white.opacity(0.12),
                    lineWidth: 1.5
                )
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
#endif
