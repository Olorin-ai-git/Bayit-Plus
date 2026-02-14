import BayitDesignSystem
import BayitLocalization
import SwiftUI

/// tvOS avatar preferences for customizing style, voice, personality, and animations.
struct TVAvatarPreferencesView: View {

    let viewModel: TVAvatarViewModel

    @Environment(\.dismiss) private var dismiss
    @Environment(LocalizationManager.self) private var localization
    @State private var selectedStyle: String
    @State private var selectedVoice: String
    @State private var selectedPersonality: String
    @State private var animationLevel: Double

    private let styleColumns = [
        GridItem(.flexible(), spacing: TVDesignTokens.Spacing.focusGap),
        GridItem(.flexible(), spacing: TVDesignTokens.Spacing.focusGap),
    ]

    init(viewModel: TVAvatarViewModel) {
        self.viewModel = viewModel
        let prefs = viewModel.preferences
        _selectedStyle = State(initialValue: prefs?.avatarStyle ?? TVAvatarViewModel.availableStyles[0])
        _selectedVoice = State(initialValue: prefs?.voiceId ?? TVAvatarViewModel.availableVoices[0])
        _selectedPersonality = State(initialValue: prefs?.personality ?? TVAvatarViewModel.availablePersonalities[0])
        _animationLevel = State(initialValue: Self.animationDouble(from: prefs?.animationLevel))
    }

    var body: some View {
        ScrollView(.vertical, showsIndicators: false) {
            VStack(spacing: TVDesignTokens.Spacing.xl) {
                Text(localization.t("avatar.preferences"))
                    .font(.system(size: TVDesignTokens.FontSize.xxl, weight: .bold))
                    .foregroundStyle(DesignTokens.Text.primary)

                styleSection
                voiceSection
                personalitySection
                animationSection
                saveButton
            }
            .padding(.horizontal, TVDesignTokens.Spacing.xl)
            .padding(.vertical, TVDesignTokens.Spacing.xxl)
        }
        .background(DesignTokens.Background.primary)
    }

    // MARK: - Style

    private var styleSection: some View {
        VStack(alignment: .leading, spacing: TVDesignTokens.Spacing.md) {
            sectionHeader(title: "Style", icon: "paintbrush")

            LazyVGrid(columns: styleColumns, spacing: TVDesignTokens.Spacing.focusGap) {
                ForEach(TVAvatarViewModel.availableStyles, id: \.self) { style in
                    styleCard(style)
                }
            }
        }
    }

    private func styleCard(_ style: String) -> some View {
        let isSelected = selectedStyle == style
        return Button { selectedStyle = style } label: {
            VStack(spacing: TVDesignTokens.Spacing.md) {
                Image(systemName: styleIcon(for: style))
                    .font(.system(size: TVDesignTokens.FontSize.xxl))
                    .foregroundStyle(isSelected ? DesignTokens.Primary.p300 : DesignTokens.Text.muted)

                Text(style.capitalized)
                    .font(.system(size: TVDesignTokens.FontSize.base, weight: .medium))
                    .foregroundStyle(isSelected ? DesignTokens.Text.primary : DesignTokens.Text.secondary)
            }
            .frame(maxWidth: .infinity)
            .padding(.vertical, TVDesignTokens.Spacing.lg)
            .background(isSelected ? DesignTokens.Glass.purpleLight : DesignTokens.Glass.bgLight)
            .clipShape(RoundedRectangle(cornerRadius: TVDesignTokens.Radius.md))
            .overlay(
                RoundedRectangle(cornerRadius: TVDesignTokens.Radius.md)
                    .stroke(isSelected ? DesignTokens.Primary.default : DesignTokens.Glass.border, lineWidth: isSelected ? 2 : 1)
            )
        }
        .buttonStyle(.plain)
        .tvFocusStyle()
    }

    // MARK: - Voice

    private var voiceSection: some View {
        VStack(alignment: .leading, spacing: TVDesignTokens.Spacing.md) {
            sectionHeader(title: "Voice", icon: "speaker.wave.2")

            ForEach(TVAvatarViewModel.availableVoices, id: \.self) { voice in
                selectionRow(title: voice.capitalized, isSelected: selectedVoice == voice) {
                    selectedVoice = voice
                }
            }
        }
    }

    // MARK: - Personality

    private var personalitySection: some View {
        VStack(alignment: .leading, spacing: TVDesignTokens.Spacing.md) {
            sectionHeader(title: "Personality", icon: "face.smiling")

            ForEach(TVAvatarViewModel.availablePersonalities, id: \.self) { personality in
                selectionRow(
                    title: personality.capitalized,
                    icon: personalityIcon(for: personality),
                    isSelected: selectedPersonality == personality
                ) {
                    selectedPersonality = personality
                }
            }
        }
    }

    // MARK: - Animation Level

    private var animationSection: some View {
        VStack(alignment: .leading, spacing: TVDesignTokens.Spacing.md) {
            sectionHeader(title: "Animation Level", icon: "sparkle")

            VStack(spacing: TVDesignTokens.Spacing.md) {
                HStack(spacing: TVDesignTokens.Spacing.md) {
                    ForEach(animationLevels, id: \.label) { level in
                        Button {
                            animationLevel = level.value
                        } label: {
                            Text(level.label)
                                .font(.system(size: TVDesignTokens.FontSize.sm, weight: .medium))
                                .foregroundStyle(
                                    animationLevel == level.value
                                        ? DesignTokens.Text.primary
                                        : DesignTokens.Text.secondary
                                )
                                .frame(maxWidth: .infinity)
                                .padding(.vertical, TVDesignTokens.Spacing.md)
                                .background(
                                    animationLevel == level.value
                                        ? DesignTokens.Glass.purpleLight
                                        : DesignTokens.Glass.bgLight
                                )
                                .clipShape(RoundedRectangle(cornerRadius: TVDesignTokens.Radius.sm))
                                .overlay(
                                    RoundedRectangle(cornerRadius: TVDesignTokens.Radius.sm)
                                        .stroke(
                                            animationLevel == level.value
                                                ? DesignTokens.Primary.default
                                                : Color.clear,
                                            lineWidth: 2
                                        )
                                )
                        }
                        .buttonStyle(.plain)
                        .tvFocusStyle()
                    }
                }
            }
            .padding(TVDesignTokens.Spacing.lg)
            .background(DesignTokens.Glass.bgLight)
            .clipShape(RoundedRectangle(cornerRadius: TVDesignTokens.Radius.lg))
        }
    }

    // MARK: - Save

    private var saveButton: some View {
        GlassButton("Save Preferences", variant: .primary, size: .medium) {
            viewModel.updatePreferences(
                style: selectedStyle,
                voice: selectedVoice,
                personality: selectedPersonality,
                animationLevel: animationLevelString
            )
            dismiss()
        }
        .tvFocusStyle()
        .padding(.top, TVDesignTokens.Spacing.md)
    }

    // MARK: - Helpers

    private func sectionHeader(title: String, icon: String) -> some View {
        HStack(spacing: TVDesignTokens.Spacing.md) {
            Image(systemName: icon)
                .font(.system(size: TVDesignTokens.FontSize.base))
                .foregroundStyle(DesignTokens.Primary.p400)

            Text(title)
                .font(.system(size: TVDesignTokens.FontSize.xl, weight: .semibold))
                .foregroundStyle(DesignTokens.Text.primary)
        }
    }

    private func selectionRow(title: String, icon: String? = nil, isSelected: Bool, action: @escaping () -> Void) -> some View {
        Button(action: action) {
            HStack(spacing: TVDesignTokens.Spacing.lg) {
                if let icon {
                    Image(systemName: icon)
                        .font(.system(size: TVDesignTokens.FontSize.base))
                        .foregroundStyle(isSelected ? DesignTokens.Primary.p300 : DesignTokens.Text.muted)
                        .frame(width: 40, height: 40)
                }

                Text(title)
                    .font(.system(size: TVDesignTokens.FontSize.base))
                    .foregroundStyle(DesignTokens.Text.primary)

                Spacer()

                Image(systemName: isSelected ? "checkmark.circle.fill" : "circle")
                    .foregroundStyle(isSelected ? DesignTokens.Primary.default : DesignTokens.Text.disabled)
            }
            .padding(TVDesignTokens.Spacing.md)
            .background(DesignTokens.Glass.bgLight)
            .clipShape(RoundedRectangle(cornerRadius: TVDesignTokens.Radius.md))
        }
        .buttonStyle(.plain)
        .tvFocusStyle()
    }

    private var animationLevels: [(label: String, value: Double)] {
        [("Minimal", 0.0), ("Subtle", 0.25), ("Moderate", 0.5), ("Dynamic", 1.0)]
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
