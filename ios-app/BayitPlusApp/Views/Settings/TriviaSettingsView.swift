import BayitDesignSystem
import SwiftUI

/// User preferences for live trivia fact display during playback.
struct TriviaSettingsView: View {
    @Binding var isEnabled: Bool
    @Binding var selectedLanguage: String
    @Binding var selectedCategories: Set<String>
    @Binding var displayDuration: Int
    @Binding var frequency: TriviaFrequency

    let availableLanguages: [String]
    let availableCategories: [String]
    let onDismiss: () -> Void

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: DesignTokens.Spacing.lg) {
                header
                enableToggle
                languageSection
                categorySection
                displayDurationSection
                frequencySection
            }
            .padding(DesignTokens.Spacing.lg)
        }
        .background(DesignTokens.Background.primary)
    }

    // MARK: - Sections

    private var header: some View {
        HStack {
            Text(String(localized: "trivia.settings.title"))
                .font(.system(size: DesignTokens.FontSize.xl, weight: .bold))
                .foregroundStyle(DesignTokens.Text.primary)

            Spacer()

            Button(action: onDismiss) {
                Image(systemName: "xmark.circle.fill")
                    .font(.system(size: DesignTokens.FontSize.lg))
                    .foregroundStyle(DesignTokens.Text.muted)
            }
        }
    }

    private var enableToggle: some View {
        GlassCard(radius: DesignTokens.Radius.md, padding: DesignTokens.Spacing.md) {
            Toggle(isOn: $isEnabled) {
                VStack(alignment: .leading, spacing: DesignTokens.Spacing.xxs) {
                    Text(String(localized: "trivia.settings.enableTrivia"))
                        .font(.system(size: DesignTokens.FontSize.base, weight: .medium))
                        .foregroundStyle(DesignTokens.Text.primary)

                    Text(String(localized: "trivia.settings.enableDescription"))
                        .font(.system(size: DesignTokens.FontSize.xs))
                        .foregroundStyle(DesignTokens.Text.secondary)
                }
            }
            .tint(DesignTokens.Primary.p400)
        }
    }

    private var languageSection: some View {
        VStack(alignment: .leading, spacing: DesignTokens.Spacing.sm) {
            Text(String(localized: "trivia.settings.language"))
                .font(.system(size: DesignTokens.FontSize.sm, weight: .bold))
                .foregroundStyle(DesignTokens.Text.secondary)

            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: DesignTokens.Spacing.sm) {
                    ForEach(availableLanguages, id: \.self) { lang in
                        GlassChip(
                            title: lang.uppercased(),
                            isSelected: lang == selectedLanguage,
                            onTap: { selectedLanguage = lang }
                        )
                    }
                }
            }
        }
    }

    private var categorySection: some View {
        VStack(alignment: .leading, spacing: DesignTokens.Spacing.sm) {
            Text(String(localized: "trivia.settings.categories"))
                .font(.system(size: DesignTokens.FontSize.sm, weight: .bold))
                .foregroundStyle(DesignTokens.Text.secondary)

            FlowLayout(spacing: DesignTokens.Spacing.sm) {
                ForEach(availableCategories, id: \.self) { category in
                    GlassChip(
                        title: category,
                        isSelected: selectedCategories.contains(category),
                        onTap: {
                            if selectedCategories.contains(category) {
                                selectedCategories.remove(category)
                            } else {
                                selectedCategories.insert(category)
                            }
                        }
                    )
                }
            }
        }
    }

    private var displayDurationSection: some View {
        VStack(alignment: .leading, spacing: DesignTokens.Spacing.sm) {
            HStack {
                Text(String(localized: "trivia.settings.displayDuration"))
                    .font(.system(size: DesignTokens.FontSize.sm, weight: .bold))
                    .foregroundStyle(DesignTokens.Text.secondary)

                Spacer()

                Text(String(localized: "trivia.settings.seconds \(displayDuration)"))
                    .font(.system(size: DesignTokens.FontSize.xs))
                    .foregroundStyle(DesignTokens.Text.muted)
                    .monospacedDigit()
            }

            Slider(
                value: Binding(
                    get: { Double(displayDuration) },
                    set: { displayDuration = Int($0) }
                ),
                in: 5 ... 30,
                step: 5
            )
            .tint(DesignTokens.Primary.p400)
        }
    }

    private var frequencySection: some View {
        VStack(alignment: .leading, spacing: DesignTokens.Spacing.sm) {
            Text(String(localized: "trivia.settings.frequency"))
                .font(.system(size: DesignTokens.FontSize.sm, weight: .bold))
                .foregroundStyle(DesignTokens.Text.secondary)

            ForEach(TriviaFrequency.allCases) { freq in
                Button {
                    frequency = freq
                } label: {
                    HStack {
                        Text(freq.label)
                            .font(.system(size: DesignTokens.FontSize.base))
                            .foregroundStyle(DesignTokens.Text.primary)

                        Spacer()

                        if frequency == freq {
                            Image(systemName: "checkmark")
                                .foregroundStyle(DesignTokens.Primary.p400)
                        }
                    }
                    .padding(DesignTokens.Spacing.sm)
                    .glassCard(radius: DesignTokens.Radius.sm, padding: 0)
                }
                .buttonStyle(.plain)
            }
        }
    }
}

/// Trivia display frequency options.
enum TriviaFrequency: String, CaseIterable, Identifiable {
    case low
    case medium
    case high

    var id: String { rawValue }

    var label: String {
        switch self {
        case .low: return String(localized: "trivia.frequency.low")
        case .medium: return String(localized: "trivia.frequency.medium")
        case .high: return String(localized: "trivia.frequency.high")
        }
    }

    var intervalSeconds: TimeInterval {
        switch self {
        case .low: return 600
        case .medium: return 300
        case .high: return 120
        }
    }
}

