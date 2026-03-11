import BayitDesignSystem
import BayitLocalization
import SwiftUI
import UIKit

// MARK: - Avatar Preferences Sections

extension AvatarPreferencesView {
    // MARK: - Voice Selection

    var voiceSection: some View {
        VStack(alignment: .leading, spacing: DesignTokens.Spacing.md) {
            sectionHeader(title: localization.t("avatar.voice"), icon: "speaker.wave.2")

            ForEach(AvatarViewModel.availableVoices, id: \.self) { voice in
                voiceRow(voice)
            }
        }
    }

    func voiceRow(_ voice: String) -> some View {
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

    var personalitySection: some View {
        VStack(alignment: .leading, spacing: DesignTokens.Spacing.md) {
            sectionHeader(title: localization.t("avatar.personality"), icon: "face.smiling")

            ForEach(AvatarViewModel.availablePersonalities, id: \.self) { personality in
                personalityRow(personality)
            }
        }
    }

    func personalityRow(_ personality: String) -> some View {
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

    var animationSection: some View {
        VStack(alignment: .leading, spacing: DesignTokens.Spacing.md) {
            sectionHeader(title: localization.t("avatar.animationLevel"), icon: "sparkle")

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

    // MARK: - Helpers

    func personalityIcon(for personality: String) -> String {
        switch personality {
        case "friendly": return "face.smiling"
        case "professional": return "briefcase"
        case "playful": return "sparkles"
        case "wise": return "book"
        default: return "person"
        }
    }

    func sectionHeader(title: String, icon: String) -> some View {
        HStack(spacing: DesignTokens.Spacing.sm) {
            Image(systemName: icon)
                .font(.system(size: 16))
                .foregroundStyle(DesignTokens.Primary.p400)

            Text(title)
                .font(.system(size: DesignTokens.FontSize.lg, weight: .semibold))
                .foregroundStyle(DesignTokens.Text.primary)
        }
    }

    func styleIcon(for style: String) -> String {
        switch style {
        case "orb": return "circle.circle"
        case "wave": return "waveform"
        case "geometric": return "hexagon"
        case "crystal": return "diamond"
        default: return "circle"
        }
    }

    var animationLevelString: String {
        if animationLevel < 0.25 { return "minimal" }
        if animationLevel < 0.5 { return "subtle" }
        if animationLevel < 0.75 { return "moderate" }
        return "dynamic"
    }

    static func animationDouble(from level: String?) -> Double {
        switch level {
        case "minimal": return 0.0
        case "subtle": return 0.25
        case "moderate": return 0.5
        case "dynamic": return 1.0
        default: return 0.5
        }
    }
}
