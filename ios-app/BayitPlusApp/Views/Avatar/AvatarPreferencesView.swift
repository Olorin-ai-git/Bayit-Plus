import BayitDesignSystem
import BayitLocalization
import SwiftUI
import UIKit

/// Preferences view for customizing the AI avatar appearance and behavior.
///
/// Allows selection of avatar style, voice type, personality, and animation level.
struct AvatarPreferencesView: View {

    @Environment(NavigationCoordinator.self) private var coordinator
    @Environment(LocalizationManager.self) private var localization
    @State private var selectedStyle: String
    @State private var selectedVoice: String
    @State private var selectedPersonality: String
    @State private var animationLevel: Double

    private let viewModel: AvatarViewModel

    init(viewModel: AvatarViewModel) {
        self.viewModel = viewModel
        let prefs = viewModel.preferences
        _selectedStyle = State(initialValue: prefs?.avatarStyle ?? AvatarViewModel.availableStyles[0])
        _selectedVoice = State(initialValue: prefs?.voiceId ?? AvatarViewModel.availableVoices[0])
        _selectedPersonality = State(initialValue: prefs?.personality ?? AvatarViewModel.availablePersonalities[0])
        _animationLevel = State(initialValue: Self.animationDouble(from: prefs?.animationLevel))
    }

    var body: some View {
        ZStack {
            DesignTokens.Background.primary.ignoresSafeArea()

            ScrollView {
                VStack(spacing: DesignTokens.Spacing.xl) {
                    styleSection
                    voiceSection
                    personalitySection
                    animationSection
                    saveButton
                }
                .padding(.horizontal, DesignTokens.Spacing.base)
                .padding(.vertical, DesignTokens.Spacing.xl)
            }
        }
        .navigationTitle("Avatar Preferences")
        .navigationBarTitleDisplayMode(.large)
    }

    // MARK: - Style Selection

    private var styleSection: some View {
        VStack(alignment: .leading, spacing: DesignTokens.Spacing.md) {
            sectionHeader(title: "Style", icon: "paintbrush")

            LazyVGrid(
                columns: [GridItem(.flexible()), GridItem(.flexible())],
                spacing: DesignTokens.Spacing.md
            ) {
                ForEach(AvatarViewModel.availableStyles, id: \.self) { style in
                    styleCard(style)
                }
            }
        }
    }

    private func styleCard(_ style: String) -> some View {
        let isSelected = selectedStyle == style
        return Button {
            selectedStyle = style
            let generator = UIImpactFeedbackGenerator(style: .light)
            generator.impactOccurred()
        } label: {
            VStack(spacing: DesignTokens.Spacing.sm) {
                Image(systemName: styleIcon(for: style))
                    .font(.system(size: 28))
                    .foregroundStyle(isSelected ? DesignTokens.Primary.p300 : DesignTokens.Text.muted)

                Text(style.capitalized)
                    .font(.system(size: DesignTokens.FontSize.sm, weight: .medium))
                    .foregroundStyle(isSelected ? DesignTokens.Text.primary : DesignTokens.Text.secondary)
            }
            .frame(maxWidth: .infinity)
            .padding(.vertical, DesignTokens.Spacing.base)
            .background(isSelected ? DesignTokens.Glass.purpleLight : DesignTokens.Glass.bgLight)
            .clipShape(RoundedRectangle(cornerRadius: DesignTokens.Radius.md))
            .overlay(
                RoundedRectangle(cornerRadius: DesignTokens.Radius.md)
                    .stroke(
                        isSelected ? DesignTokens.Primary.default : DesignTokens.Glass.border,
                        lineWidth: isSelected ? 2 : 1
                    )
            )
        }
    }

    // MARK: - Voice Selection

    private var voiceSection: some View {
        VStack(alignment: .leading, spacing: DesignTokens.Spacing.md) {
            sectionHeader(title: "Voice", icon: "speaker.wave.2")

            ForEach(AvatarViewModel.availableVoices, id: \.self) { voice in
                voiceRow(voice)
            }
        }
    }

    private func voiceRow(_ voice: String) -> some View {
        let isSelected = selectedVoice == voice
        return Button {
            selectedVoice = voice
            let generator = UIImpactFeedbackGenerator(style: .light)
            generator.impactOccurred()
        } label: {
            HStack(spacing: DesignTokens.Spacing.md) {
                Text(voice.capitalized)
                    .font(.system(size: DesignTokens.FontSize.base))
                    .foregroundStyle(DesignTokens.Text.primary)

                Spacer()

                Image(systemName: isSelected ? "checkmark.circle.fill" : "circle")
                    .foregroundStyle(isSelected ? DesignTokens.Primary.default : DesignTokens.Text.disabled)
            }
            .glassCard(radius: DesignTokens.Radius.md, padding: DesignTokens.Spacing.md)
        }
    }

    // MARK: - Personality Selection

    private var personalitySection: some View {
        VStack(alignment: .leading, spacing: DesignTokens.Spacing.md) {
            sectionHeader(title: "Personality", icon: "face.smiling")

            ForEach(AvatarViewModel.availablePersonalities, id: \.self) { personality in
                personalityRow(personality)
            }
        }
    }

    private func personalityRow(_ personality: String) -> some View {
        let isSelected = selectedPersonality == personality
        return Button {
            selectedPersonality = personality
            let generator = UIImpactFeedbackGenerator(style: .light)
            generator.impactOccurred()
        } label: {
            HStack(spacing: DesignTokens.Spacing.md) {
                Image(systemName: personalityIcon(for: personality))
                    .font(.system(size: 20))
                    .foregroundStyle(isSelected ? DesignTokens.Primary.p300 : DesignTokens.Text.muted)
                    .frame(width: 32, height: 32)

                Text(personality.capitalized)
                    .font(.system(size: DesignTokens.FontSize.base))
                    .foregroundStyle(DesignTokens.Text.primary)

                Spacer()

                Image(systemName: isSelected ? "checkmark.circle.fill" : "circle")
                    .foregroundStyle(isSelected ? DesignTokens.Primary.default : DesignTokens.Text.disabled)
            }
            .glassCard(radius: DesignTokens.Radius.md, padding: DesignTokens.Spacing.md)
        }
    }

    // MARK: - Animation Level

    private var animationSection: some View {
        VStack(alignment: .leading, spacing: DesignTokens.Spacing.md) {
            sectionHeader(title: "Animation Level", icon: "sparkle")

            VStack(spacing: DesignTokens.Spacing.sm) {
                Slider(value: $animationLevel, in: 0.0 ... 1.0, step: 0.25)
                    .tint(DesignTokens.Primary.default)

                HStack {
                    Text(localization.t("avatar.subtle"))
                        .font(.system(size: DesignTokens.FontSize.xs))
                        .foregroundStyle(DesignTokens.Text.disabled)
                    Spacer()
                    Text(localization.t("avatar.dynamic"))
                        .font(.system(size: DesignTokens.FontSize.xs))
                        .foregroundStyle(DesignTokens.Text.disabled)
                }
            }
            .glassCard(radius: DesignTokens.Radius.lg, padding: DesignTokens.Spacing.base)
        }
    }

    // MARK: - Save

    private var saveButton: some View {
        GlassButton("Save Preferences", variant: .primary) {
            viewModel.updatePreferences(
                style: selectedStyle,
                voice: selectedVoice,
                personality: selectedPersonality,
                animationLevel: animationLevelString
            )
            coordinator.pop()
        }
        .padding(.top, DesignTokens.Spacing.md)
    }

    // MARK: - Helpers

    private func sectionHeader(title: String, icon: String) -> some View {
        HStack(spacing: DesignTokens.Spacing.sm) {
            Image(systemName: icon)
                .font(.system(size: 16))
                .foregroundStyle(DesignTokens.Primary.p400)

            Text(title)
                .font(.system(size: DesignTokens.FontSize.lg, weight: .semibold))
                .foregroundStyle(DesignTokens.Text.primary)
        }
    }

    private func styleIcon(for style: String) -> String {
        switch style {
        case "orb": return "circle.circle"
        case "wave": return "waveform"
        case "geometric": return "hexagon"
        case "crystal": return "diamond"
        default: return "circle"
        }
    }

    private func personalityIcon(for personality: String) -> String {
        switch personality {
        case "friendly": return "face.smiling"
        case "professional": return "briefcase"
        case "playful": return "sparkles"
        case "wise": return "book"
        default: return "person"
        }
    }

    private var animationLevelString: String {
        if animationLevel < 0.25 { return "minimal" }
        if animationLevel < 0.5 { return "subtle" }
        if animationLevel < 0.75 { return "moderate" }
        return "dynamic"
    }

    private static func animationDouble(from level: String?) -> Double {
        switch level {
        case "minimal": return 0.0
        case "subtle": return 0.25
        case "moderate": return 0.5
        case "dynamic": return 1.0
        default: return 0.5
        }
    }
}
