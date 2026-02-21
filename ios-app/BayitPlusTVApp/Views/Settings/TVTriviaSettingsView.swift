import BayitCore
import BayitDesignSystem
import BayitLocalization
import SwiftUI

/// tvOS Trivia Settings View - Full parity with web app
/// Manages trivia preferences: enable/disable, frequency, categories, duration, languages
struct TVTriviaSettingsView: View {
    @Environment(LocalizationManager.self) var localization
    @Environment(\.dismiss) var dismiss
    @Environment(TVRepositoryProvider.self) var repos

    @State var isLoading = false
    @State var error: String?

    // Preferences
    @State var isEnabled = true
    @State var frequency: TriviaFrequency = .normal
    @State var selectedCategories: Set<TriviaCategory> = [.cast, .production, .historical, .cultural, .fun]
    @State var displayDuration: Int = 15
    @State var selectedLanguages: Set<String> = ["he", "en"]

    @FocusState var focusedField: Field?

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

    var headerSection: some View {
        VStack(spacing: TVDesignTokens.Spacing.lg) {
            HStack(spacing: TVDesignTokens.Spacing.md) {
                Image(systemName: "lightbulb.fill")
                    .font(.system(size: 32))
                    .foregroundStyle(DesignTokens.Warning.default)

                Text(localization.t("trivia.settings.title"))
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
}
