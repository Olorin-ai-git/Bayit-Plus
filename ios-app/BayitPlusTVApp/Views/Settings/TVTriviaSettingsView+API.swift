import BayitCore
import BayitDesignSystem
import BayitLocalization
import SwiftUI

// MARK: - TVTriviaSettingsView + API & Types

extension TVTriviaSettingsView {
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
