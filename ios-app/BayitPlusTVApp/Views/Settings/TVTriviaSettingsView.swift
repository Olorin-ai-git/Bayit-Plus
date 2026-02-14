import BayitCore
import BayitDesignSystem
import BayitLocalization
import SwiftUI

/// tvOS Trivia Settings View - Full parity with web app
/// Manages trivia preferences: enable/disable, frequency, categories, duration, languages
struct TVTriviaSettingsView: View {
    @Environment(LocalizationManager.self) private var localization
    @Environment(\.dismiss) private var dismiss
    @Environment(TVRepositoryProvider.self) private var repos

    @State private var isLoading = false
    @State private var error: String?

    // Preferences
    @State private var isEnabled = true
    @State private var frequency: TriviaFrequency = .normal
    @State private var selectedCategories: Set<TriviaCategory> = [.cast, .production, .historical, .cultural, .fun]
    @State private var displayDuration: Int = 15
    @State private var selectedLanguages: Set<String> = ["he", "en"]

    @FocusState private var focusedField: Field?

    enum Field: Hashable {
        case enable
        case frequency(TriviaFrequency)
        case category(TriviaCategory)
        case duration(Int)
        case language(String)
        case done
    }

    var body: some View {
        ZStack {
            DesignTokens.Background.primary
                .ignoresSafeArea()

            ScrollView {
                VStack(spacing: TVDesignTokens.Spacing.xl) {
                    headerSection

                    if isEnabled {
                        frequencySection
                        categoriesSection
                        durationSection
                        languagesSection
                    }

                    if let error {
                        errorSection(error)
                    }

                    doneButton
                }
                .padding(TVDesignTokens.Spacing.xxl)
            }
        }
        .task {
            await loadPreferences()
        }
    }

    // MARK: - Header Section

    private var headerSection: some View {
        VStack(spacing: TVDesignTokens.Spacing.lg) {
            HStack(spacing: TVDesignTokens.Spacing.md) {
                Image(systemName: "lightbulb.fill")
                    .font(.system(size: 32))
                    .foregroundStyle(DesignTokens.Warning.default)

                Text("Trivia Settings")
                    .font(.system(size: TVDesignTokens.FontSize.xl, weight: .bold))
                    .foregroundStyle(DesignTokens.Text.primary)
            }

            // Enable/Disable Toggle
            GlassButton(
                isEnabled ? "Trivia Enabled" : "Trivia Disabled",
                variant: isEnabled ? .primary : .ghost,
                size: .large
            ) {
                isEnabled.toggle()
                Task { await savePreferences() }
            }
            .focused($focusedField, equals: .enable)
            .frame(maxWidth: 400)
        }
    }

    // MARK: - Frequency Section

    private var frequencySection: some View {
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

    private var categoriesSection: some View {
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

    private var durationSection: some View {
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

    private var languagesSection: some View {
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

    private func errorSection(_ message: String) -> some View {
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

    private var doneButton: some View {
        GlassButton("Done", variant: .secondary, size: .large) {
            dismiss()
        }
        .focused($focusedField, equals: .done)
        .frame(maxWidth: 400)
    }

    // MARK: - Helpers

    private func sectionHeader(icon: String, title: String) -> some View {
        HStack(spacing: TVDesignTokens.Spacing.sm) {
            Image(systemName: icon)
                .font(.system(size: 20))
                .foregroundStyle(DesignTokens.Text.muted)

            Text(title)
                .font(.system(size: TVDesignTokens.FontSize.lg, weight: .semibold))
                .foregroundStyle(DesignTokens.Text.primary)
        }
    }

    private func languageDisplayName(_ code: String) -> String {
        switch code {
        case "he": return "עברית"
        case "en": return "English"
        case "es": return "Español"
        default: return code
        }
    }

    // MARK: - API

    @MainActor
    private func loadPreferences() async {
        isLoading = true
        error = nil

        do {
            let prefs = try await repos.trivia.fetchPreferences()

            // Map from API response
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
    private func savePreferences() async {
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
