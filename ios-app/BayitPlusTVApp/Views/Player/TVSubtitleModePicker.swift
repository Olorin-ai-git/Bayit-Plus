import BayitDesignSystem
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
    @Binding var selectedMode: SubtitleMode
    @FocusState private var focusedMode: SubtitleMode?
    let onDismiss: () -> Void

    var body: some View {
        VStack(spacing: TVDesignTokens.Spacing.xl) {
            Text("Subtitle Mode")
                .font(.title2)
                .fontWeight(.bold)
                .foregroundStyle(TVDesignTokens.Colors.textPrimary)

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
        .clipShape(RoundedRectangle(cornerRadius: TVDesignTokens.CornerRadius.xxl))
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
                            ? TVDesignTokens.Colors.primaryAccent
                            : TVDesignTokens.Colors.textSecondary
                    )

                Text(mode.rawValue)
                    .font(.callout)
                    .fontWeight(isSelected ? .bold : .regular)
                    .foregroundStyle(TVDesignTokens.Colors.textPrimary)

                Text(mode.description)
                    .font(.caption2)
                    .foregroundStyle(TVDesignTokens.Colors.textSecondary)
                    .multilineTextAlignment(.center)
                    .lineLimit(2)
            }
            .padding(TVDesignTokens.Spacing.lg)
            .frame(maxWidth: .infinity)
            .background(
                isSelected
                    ? TVDesignTokens.Colors.primaryAccent.opacity(0.15)
                    : TVDesignTokens.Colors.surface.opacity(0.6)
            )
            .clipShape(RoundedRectangle(cornerRadius: TVDesignTokens.CornerRadius.xl))
            .overlay(
                RoundedRectangle(cornerRadius: TVDesignTokens.CornerRadius.xl)
                    .stroke(
                        isFocused
                            ? TVDesignTokens.Colors.primaryAccent
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
