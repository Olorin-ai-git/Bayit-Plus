import BayitDesignSystem
import BayitLocalization
import SwiftUI

/// Post-tour personalization step: language, genre, children preferences.
struct PersonalizationStepView: View {
    @Environment(LocalizationManager.self) var localization
    @Binding var selectedLanguages: Set<String>
    @Binding var selectedGenres: Set<String>
    @Binding var hasChildren: Bool
    let onDone: () -> Void

    private let availableLanguages = [
        "en", "he", "fr", "es", "it", "bn", "hi", "ja", "ta", "zh",
    ]

    private let availableGenres = [
        "drama", "comedy", "action", "documentary", "kids",
        "thriller", "romance", "scifi", "horror", "music",
        "sports", "news",
    ]

    var body: some View {
        ScrollView {
            VStack(spacing: DesignTokens.Spacing.xl) {
                headerSection
                languageSection
                genreSection
                childrenSection
                doneButton
            }
            .padding(.horizontal, DesignTokens.Spacing.lg)
            .padding(.vertical, DesignTokens.Spacing.xl)
        }
        .background(DesignTokens.Background.primary)
    }

    private var headerSection: some View {
        VStack(spacing: DesignTokens.Spacing.sm) {
            Text(localization.t("onboarding.tour.personalization.title"))
                .font(DesignTokens.Typography.title2)
                .foregroundStyle(DesignTokens.Colors.textPrimary)

            Text(localization.t("onboarding.tour.personalization.subtitle"))
                .font(DesignTokens.Typography.body)
                .foregroundStyle(DesignTokens.Colors.textSecondary)
                .multilineTextAlignment(.center)
        }
    }

    private var languageSection: some View {
        VStack(alignment: .leading, spacing: DesignTokens.Spacing.md) {
            Text(localization.t("onboarding.tour.personalization.languages"))
                .font(DesignTokens.Typography.headline)
                .foregroundStyle(DesignTokens.Colors.textPrimary)

            FlowLayout(spacing: DesignTokens.Spacing.sm) {
                ForEach(availableLanguages, id: \.self) { lang in
                    chipButton(
                        label: localization.t("languages.\(lang)"),
                        isSelected: selectedLanguages.contains(lang)
                    ) {
                        toggleLanguage(lang)
                    }
                }
            }
        }
    }

    private var genreSection: some View {
        VStack(alignment: .leading, spacing: DesignTokens.Spacing.md) {
            Text(localization.t("onboarding.tour.personalization.genres"))
                .font(DesignTokens.Typography.headline)
                .foregroundStyle(DesignTokens.Colors.textPrimary)

            FlowLayout(spacing: DesignTokens.Spacing.sm) {
                ForEach(availableGenres, id: \.self) { genre in
                    chipButton(
                        label: localization.t("genres.\(genre)"),
                        isSelected: selectedGenres.contains(genre)
                    ) {
                        toggleGenre(genre)
                    }
                }
            }
        }
    }

    private var childrenSection: some View {
        HStack {
            Text(localization.t("onboarding.tour.personalization.hasChildren"))
                .font(DesignTokens.Typography.body)
                .foregroundStyle(DesignTokens.Colors.textPrimary)

            Spacer()

            Toggle("", isOn: $hasChildren)
                .labelsHidden()
                .tint(DesignTokens.Colors.accentPrimary)
        }
        .padding(DesignTokens.Spacing.lg)
        .background(.ultraThinMaterial)
        .clipShape(RoundedRectangle(cornerRadius: DesignTokens.Radius.md))
    }

    private var doneButton: some View {
        GlassButton(
            localization.t("onboarding.tour.personalization.done"),
            variant: .primary,
            size: .large
        ) {
            onDone()
        }
    }

    private func chipButton(
        label: String, isSelected: Bool, action: @escaping () -> Void
    ) -> some View {
        GlassButton(
            label,
            variant: isSelected ? .primary : .ghost,
            size: .small
        ) {
            action()
        }
    }

    private func toggleLanguage(_ lang: String) {
        if selectedLanguages.contains(lang) {
            selectedLanguages.remove(lang)
        } else {
            selectedLanguages.insert(lang)
        }
    }

    private func toggleGenre(_ genre: String) {
        if selectedGenres.contains(genre) {
            selectedGenres.remove(genre)
        } else {
            selectedGenres.insert(genre)
        }
    }
}
