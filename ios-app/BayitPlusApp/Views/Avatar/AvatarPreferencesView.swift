import BayitDesignSystem
import BayitLocalization
import SwiftUI
import UIKit

/// Preferences view for customizing the AI avatar appearance and behavior.
///
/// Allows selection of avatar style, voice type, personality, and animation level.
struct AvatarPreferencesView: View {
    @Environment(NavigationCoordinator.self) private var coordinator
    @Environment(LocalizationManager.self) var localization
    @State var selectedStyle: String
    @State var selectedVoice: String
    @State var selectedPersonality: String
    @State var animationLevel: Double

    let viewModel: AvatarViewModel

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
            sectionHeader(title: localization.t("avatar.style"), icon: "paintbrush")

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

    // MARK: - Save

    private var saveButton: some View {
        GlassButton(localization.t("common.savePreferences"), variant: .primary) {
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
}
