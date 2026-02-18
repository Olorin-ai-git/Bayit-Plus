import BayitDesignSystem
import SwiftUI

/// tvOS-optimized trivia settings with focus-based navigation for Siri Remote.
struct TVTriviaSettingsView: View {
    @Binding var isEnabled: Bool
    @Binding var selectedLanguage: String
    @Binding var displayDuration: Int
    @Binding var frequency: TriviaFrequency

    let availableLanguages: [String]
    let onDismiss: () -> Void

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: TVDesignTokens.Spacing.xl) {
                Text(String(localized: "trivia.settings.title"))
                    .font(.system(size: TVDesignTokens.FontSize.lg, weight: .bold))
                    .foregroundStyle(DesignTokens.Text.primary)

                enableSection
                languageSection
                durationSection
                frequencySection

                GlassButton(
                    String(localized: "common.done"),
                    style: .primary,
                    action: onDismiss
                )
            }
            .padding(TVDesignTokens.Spacing.xl)
        }
        .frame(maxWidth: 800)
    }

    // MARK: - Sections

    private var enableSection: some View {
        Button {
            isEnabled.toggle()
        } label: {
            GlassCard(radius: DesignTokens.Radius.lg) {
                HStack {
                    VStack(alignment: .leading, spacing: DesignTokens.Spacing.xxs) {
                        Text(String(localized: "trivia.settings.enableTrivia"))
                            .font(.system(size: TVDesignTokens.FontSize.base, weight: .medium))
                            .foregroundStyle(DesignTokens.Text.primary)

                        Text(String(localized: "trivia.settings.enableDescription"))
                            .font(.system(size: TVDesignTokens.FontSize.sm))
                            .foregroundStyle(DesignTokens.Text.secondary)
                    }

                    Spacer()

                    Image(systemName: isEnabled ? "checkmark.circle.fill" : "circle")
                        .font(.system(size: TVDesignTokens.FontSize.md))
                        .foregroundStyle(
                            isEnabled ? DesignTokens.Primary.light : DesignTokens.Text.muted
                        )
                }
            }
        }
        .buttonStyle(.plain)
    }

    private var languageSection: some View {
        VStack(alignment: .leading, spacing: TVDesignTokens.Spacing.md) {
            Text(String(localized: "trivia.settings.language"))
                .font(.system(size: TVDesignTokens.FontSize.base, weight: .bold))
                .foregroundStyle(DesignTokens.Text.secondary)

            HStack(spacing: TVDesignTokens.Spacing.md) {
                ForEach(availableLanguages, id: \.self) { lang in
                    Button {
                        selectedLanguage = lang
                    } label: {
                        Text(lang.uppercased())
                            .font(.system(size: TVDesignTokens.FontSize.base, weight: .semibold))
                            .foregroundStyle(
                                lang == selectedLanguage
                                    ? DesignTokens.Primary.light : DesignTokens.Text.primary
                            )
                            .padding(.horizontal, TVDesignTokens.Spacing.lg)
                            .padding(.vertical, TVDesignTokens.Spacing.sm)
                            .glassCard(radius: DesignTokens.Radius.md, padding: 0)
                    }
                    .buttonStyle(.plain)
                }
            }
        }
    }

    private var durationSection: some View {
        VStack(alignment: .leading, spacing: TVDesignTokens.Spacing.md) {
            Text(String(localized: "trivia.settings.displayDuration"))
                .font(.system(size: TVDesignTokens.FontSize.base, weight: .bold))
                .foregroundStyle(DesignTokens.Text.secondary)

            HStack(spacing: TVDesignTokens.Spacing.md) {
                ForEach([5, 10, 15, 20, 30], id: \.self) { duration in
                    Button {
                        displayDuration = duration
                    } label: {
                        Text(String(localized: "trivia.settings.seconds \(duration)"))
                            .font(.system(size: TVDesignTokens.FontSize.base))
                            .foregroundStyle(
                                duration == displayDuration
                                    ? DesignTokens.Primary.light : DesignTokens.Text.primary
                            )
                            .padding(.horizontal, TVDesignTokens.Spacing.lg)
                            .padding(.vertical, TVDesignTokens.Spacing.sm)
                            .glassCard(radius: DesignTokens.Radius.md, padding: 0)
                    }
                    .buttonStyle(.plain)
                }
            }
        }
    }

    private var frequencySection: some View {
        VStack(alignment: .leading, spacing: TVDesignTokens.Spacing.md) {
            Text(String(localized: "trivia.settings.frequency"))
                .font(.system(size: TVDesignTokens.FontSize.base, weight: .bold))
                .foregroundStyle(DesignTokens.Text.secondary)

            ForEach(TriviaFrequency.allCases) { freq in
                Button {
                    frequency = freq
                } label: {
                    HStack {
                        Text(freq.label)
                            .font(.system(size: TVDesignTokens.FontSize.base))
                            .foregroundStyle(DesignTokens.Text.primary)

                        Spacer()

                        if frequency == freq {
                            Image(systemName: "checkmark")
                                .foregroundStyle(DesignTokens.Primary.light)
                        }
                    }
                    .padding(TVDesignTokens.Spacing.md)
                    .glassCard(radius: DesignTokens.Radius.md, padding: 0)
                }
                .buttonStyle(.plain)
            }
        }
    }
}
