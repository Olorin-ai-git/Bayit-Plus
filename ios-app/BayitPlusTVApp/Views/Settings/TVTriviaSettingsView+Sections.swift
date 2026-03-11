import BayitCore
import BayitDesignSystem
import BayitLocalization
import SwiftUI

// MARK: - TVTriviaSettingsView + Sections

extension TVTriviaSettingsView {
    // MARK: - Frequency Section

    var frequencySection: some View {
        VStack(alignment: .leading, spacing: TVDesignTokens.Spacing.md) {
            sectionHeader(icon: "clock", title: localization.t("trivia.settings.frequency"))

            HStack(spacing: TVDesignTokens.Spacing.md) {
                ForEach(TriviaFrequency.allCases, id: \.self) { freq in
                    GlassButton(
                        freq.displayName,
                        variant: frequency == freq ? .primary : .ghost,
                        size: .medium
                    ) {
                        frequency = freq
                        Task { await savePreferences() }
                    }
                    .focused($focusedField, equals: .frequency(freq))
                }
            }
        }
    }

    // MARK: - Categories Section

    var categoriesSection: some View {
        VStack(alignment: .leading, spacing: TVDesignTokens.Spacing.md) {
            sectionHeader(icon: "folder", title: localization.t("trivia.settings.categories"))

            HStack(spacing: TVDesignTokens.Spacing.md) {
                ForEach(TriviaCategory.allCases, id: \.self) { category in
                    let isSelected = selectedCategories.contains(category)
                    let isOnlySelected = isSelected && selectedCategories.count == 1

                    GlassButton(
                        category.displayName,
                        variant: isSelected ? .primary : .ghost,
                        size: .medium
                    ) {
                        if isOnlySelected { return } // Keep at least one category

                        if isSelected {
                            selectedCategories.remove(category)
                        } else {
                            selectedCategories.insert(category)
                        }
                        Task { await savePreferences() }
                    }
                    .focused($focusedField, equals: .category(category))
                    .disabled(isOnlySelected)
                }
            }
            .fixedSize(horizontal: false, vertical: true)
        }
    }

    // MARK: - Duration Section

    var durationSection: some View {
        VStack(alignment: .leading, spacing: TVDesignTokens.Spacing.md) {
            sectionHeader(icon: "timer", title: localization.t("trivia.settings.displayDuration"))

            HStack(spacing: TVDesignTokens.Spacing.md) {
                ForEach([10, 15, 20, 30], id: \.self) { duration in
                    GlassButton(
                        "\(duration)s",
                        variant: displayDuration == duration ? .primary : .ghost,
                        size: .medium
                    ) {
                        displayDuration = duration
                        Task { await savePreferences() }
                    }
                    .focused($focusedField, equals: .duration(duration))
                }
            }
        }
    }

    // MARK: - Languages Section

    var languagesSection: some View {
        VStack(alignment: .leading, spacing: TVDesignTokens.Spacing.md) {
            sectionHeader(icon: "globe", title: localization.t("trivia.settings.languages"))

            Text(localization.t("trivia.selectLanguagesHint"))
                .font(.system(size: TVDesignTokens.FontSize.sm))
                .foregroundStyle(DesignTokens.Text.muted)

            HStack(spacing: TVDesignTokens.Spacing.md) {
                ForEach(["he", "en", "es"], id: \.self) { langCode in
                    let isSelected = selectedLanguages.contains(langCode)
                    let isOnlySelected = isSelected && selectedLanguages.count == 1

                    GlassButton(
                        languageDisplayName(langCode),
                        variant: isSelected ? .primary : .ghost,
                        size: .medium
                    ) {
                        if isOnlySelected { return } // Keep at least one language
                        if selectedLanguages.count >= 3 && !isSelected { return } // Max 3 languages

                        if isSelected {
                            selectedLanguages.remove(langCode)
                        } else {
                            selectedLanguages.insert(langCode)
                        }
                        Task { await savePreferences() }
                    }
                    .focused($focusedField, equals: .language(langCode))
                    .disabled(isOnlySelected || (selectedLanguages.count >= 3 && !isSelected))
                }
            }
        }
    }

    // MARK: - Error Section

    func errorSection(_ message: String) -> some View {
        HStack(spacing: TVDesignTokens.Spacing.md) {
            Image(systemName: "exclamationmark.triangle.fill")
                .font(.system(size: 24))
                .foregroundStyle(DesignTokens.ErrorColor.default)

            Text(message)
                .font(.system(size: TVDesignTokens.FontSize.md))
                .foregroundStyle(DesignTokens.Text.secondary)
        }
        .padding(TVDesignTokens.Spacing.lg)
        .background(DesignTokens.ErrorColor.default.opacity(0.1))
        .cornerRadius(TVDesignTokens.Radius.md)
    }

    // MARK: - Done Button

    var doneButton: some View {
        GlassButton(localization.t("common.done"), variant: .secondary, size: .large) {
            dismiss()
        }
        .focused($focusedField, equals: .done)
        .frame(maxWidth: 400)
    }
}
