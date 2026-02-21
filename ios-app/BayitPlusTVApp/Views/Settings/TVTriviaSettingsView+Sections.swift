import BayitCore
import BayitDesignSystem
import BayitLocalization
import SwiftUI

// MARK: - TVTriviaSettingsView + Sections

extension TVTriviaSettingsView {
    // MARK: - Frequency Section

    var frequencySection: some View {
        VStack(alignment: .leading, spacing: TVDesignTokens.Spacing.md) {
            sectionHeader(icon: "clock", title: "Frequency")

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
            sectionHeader(icon: "folder", title: "Categories")

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
            sectionHeader(icon: "timer", title: "Display Duration")

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
            sectionHeader(icon: "globe", title: "Languages")

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
        GlassButton("Done", variant: .secondary, size: .large) {
            dismiss()
        }
        .focused($focusedField, equals: .done)
        .frame(maxWidth: 400)
    }

    // MARK: - Helpers

    func sectionHeader(icon: String, title: String) -> some View {
        HStack(spacing: TVDesignTokens.Spacing.sm) {
            Image(systemName: icon)
                .font(.system(size: 20))
                .foregroundStyle(DesignTokens.Text.muted)

            Text(title)
                .font(.system(size: TVDesignTokens.FontSize.lg, weight: .semibold))
                .foregroundStyle(DesignTokens.Text.primary)
        }
    }

    func languageDisplayName(_ code: String) -> String {
        switch code {
        case "he": return "\u{05E2}\u{05D1}\u{05E8}\u{05D9}\u{05EA}"
        case "en": return "English"
        case "es": return "Espa\u{00F1}ol"
        default: return code
        }
    }

    // MARK: - API

    @MainActor
    func loadPreferences() async {
        isLoading = true
        error = nil

        do {
            let prefs = try await repos.trivia.fetchPreferences()

            isEnabled = prefs.autoPlay ?? true

            if let freq = prefs.frequency {
                frequency = TriviaFrequency(rawValue: freq) ?? .normal
            }

            if let categories = prefs.categories {
                selectedCategories = Set(categories.compactMap { TriviaCategory(rawValue: $0) })
            }

            if let languages = prefs.languages {
                selectedLanguages = Set(languages)
            }

        } catch {
            self.error = "Failed to load preferences: \(error.localizedDescription)"
        }

        isLoading = false
    }

    @MainActor
    func savePreferences() async {
        guard !isLoading else { return }

        let update = TriviaPreferencesUpdate(
            autoPlay: isEnabled,
            frequency: frequency.rawValue,
            categories: Array(selectedCategories.map(\.rawValue)),
            languages: Array(selectedLanguages)
        )

        do {
            _ = try await repos.trivia.updatePreferences(update)
            error = nil
        } catch {
            self.error = "Failed to save preferences: \(error.localizedDescription)"
        }
    }
}

// MARK: - Trivia Types

enum TriviaFrequency: String, CaseIterable, Sendable {
    case rare
    case normal
    case frequent

    var displayName: String {
        switch self {
        case .rare: return "Rare"
        case .normal: return "Normal"
        case .frequent: return "Frequent"
        }
    }
}

enum TriviaCategory: String, CaseIterable, Sendable {
    case cast
    case production
    case historical
    case cultural
    case fun

    var displayName: String {
        switch self {
        case .cast: return "Cast"
        case .production: return "Production"
        case .historical: return "Historical"
        case .cultural: return "Cultural"
        case .fun: return "Fun Facts"
        }
    }
}
