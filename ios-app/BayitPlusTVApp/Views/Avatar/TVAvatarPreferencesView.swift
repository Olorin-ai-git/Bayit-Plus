import BayitDesignSystem
import BayitLocalization
import SwiftUI

/// tvOS avatar preferences for customizing style, voice, personality, and animations.
struct TVAvatarPreferencesView: View {
    let viewModel: TVAvatarViewModel

    @Environment(\.dismiss) private var dismiss
    @Environment(LocalizationManager.self) private var localization
    @State var selectedStyle: String
    @State var selectedVoice: String
    @State var selectedPersonality: String
    @State var animationLevel: Double

    let styleColumns = [
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
}
