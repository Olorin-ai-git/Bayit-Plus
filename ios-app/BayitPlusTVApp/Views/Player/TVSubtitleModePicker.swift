import BayitDesignSystem
import BayitLocalization
import SwiftUI

enum SubtitleMode: String, CaseIterable, Identifiable {
    case standard = "Standard"
    case nikud = "Nikud"
    case shoresh = "Shoresh"
    case heblish = "Heblish"
    case grammarFlip = "Grammar Flip"
    case slangSynthesis = "Slang Synthesis"

    var id: String { rawValue }

    var description: String {
        switch self {
        case .standard: return "Original Hebrew subtitles"
        case .nikud: return "Hebrew with vowel marks (nikud)"
        case .shoresh: return "Root letters highlighted"
        case .heblish: return "Hebrew in English letters"
        case .grammarFlip: return "Hebrew words, English grammar"
        case .slangSynthesis: return "Modern Israeli slang blend"
        }
    }

    var iconName: String {
        switch self {
        case .standard: return "text.alignleft"
        case .nikud: return "character.textbox"
        case .shoresh: return "tree"
        case .heblish: return "textformat.abc"
        case .grammarFlip: return "arrow.left.arrow.right"
        case .slangSynthesis: return "bubble.left.and.bubble.right"
        }
    }
}

struct TVSubtitleModePicker: View {
    @Environment(LocalizationManager.self) private var localization
    @Binding var selectedMode: SubtitleMode
    @FocusState private var focusedMode: SubtitleMode?
    let onDismiss: () -> Void

    var body: some View {
        VStack(spacing: TVDesignTokens.Spacing.xl) {
            Text(localization.t("subtitles.title"))
                .font(.title2)
                .fontWeight(.bold)
                .foregroundStyle(DesignTokens.Colors.Text.primary)

            LazyVGrid(
                columns: [
                    GridItem(.flexible(), spacing: TVDesignTokens.Spacing.lg),
                    GridItem(.flexible(), spacing: TVDesignTokens.Spacing.lg),
                    GridItem(.flexible(), spacing: TVDesignTokens.Spacing.lg),
                ],
                spacing: TVDesignTokens.Spacing.lg
            ) {
                ForEach(SubtitleMode.allCases) { mode in
                    modeCard(mode: mode)
                        .focused($focusedMode, equals: mode)
                }
            }
        }
        .padding(TVDesignTokens.Spacing.xxl)
        .background(.ultraThinMaterial)
        .clipShape(RoundedRectangle(cornerRadius: TVDesignTokens.Radius.xl))
    }

    private func modeCard(mode: SubtitleMode) -> some View {
        let isSelected = selectedMode == mode
        let isFocused = focusedMode == mode

        return Button {
            selectedMode = mode
            onDismiss()
        } label: {
            VStack(spacing: TVDesignTokens.Spacing.sm) {
                Image(systemName: mode.iconName)
                    .font(.title2)
                    .foregroundStyle(
                        isSelected
                            ? DesignTokens.Primary.default
                            : DesignTokens.Colors.Text.secondary
                    )

                Text(mode.rawValue)
                    .font(.callout)
                    .fontWeight(isSelected ? .bold : .regular)
                    .foregroundStyle(DesignTokens.Colors.Text.primary)

                Text(mode.description)
                    .font(.caption2)
                    .foregroundStyle(DesignTokens.Colors.Text.secondary)
                    .multilineTextAlignment(.center)
                    .lineLimit(2)
            }
            .padding(TVDesignTokens.Spacing.lg)
            .frame(maxWidth: .infinity)
            .background(
                isSelected
                    ? DesignTokens.Primary.default.opacity(0.15)
                    : DesignTokens.Colors.Glass.background.opacity(0.6)
            )
            .clipShape(RoundedRectangle(cornerRadius: TVDesignTokens.Radius.xl))
            .overlay(
                RoundedRectangle(cornerRadius: TVDesignTokens.Radius.xl)
                    .stroke(
                        isFocused
                            ? DesignTokens.Primary.default
                            : Color.clear,
                        lineWidth: 3
                    )
            )
            .scaleEffect(isFocused ? 1.05 : 1.0)
            .animation(.easeInOut(duration: 0.15), value: isFocused)
        }
        .buttonStyle(.plain)
    }
}
