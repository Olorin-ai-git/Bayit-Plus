#if os(tvOS)
import SwiftUI
import BayitDesignSystem

struct TVQuizAnswerButton: View {
    let text: String
    let index: Int
    let isSelected: Bool
    let isCorrect: Bool
    let isRevealed: Bool
    let onTap: () -> Void

    @FocusState private var isFocused: Bool

    private var buttonState: AnswerState {
        if isRevealed {
            if isSelected && isCorrect {
                return .selectedCorrect
            } else if isSelected && !isCorrect {
                return .selectedIncorrect
            } else if isCorrect {
                return .revealedCorrect
            } else {
                return .default
            }
        } else {
            return .default
        }
    }

    var body: some View {
        Button {
            onTap()
        } label: {
            HStack(spacing: TVDesignTokens.Spacing.sm) {
                if isRevealed {
                    stateIcon
                }

                Text(text)
                    .font(.system(size: TVDesignTokens.FontSize.md, weight: .medium))
                    .foregroundStyle(textColor)
                    .multilineTextAlignment(.leading)
                    .lineLimit(3)
                    .frame(maxWidth: .infinity, alignment: .leading)
            }
            .padding(.horizontal, TVDesignTokens.Spacing.md)
            .padding(.vertical, TVDesignTokens.Spacing.lg)
            .frame(maxWidth: .infinity, minHeight: 120)
            .background {
                RoundedRectangle(cornerRadius: TVDesignTokens.Radius.md)
                    .fill(backgroundColor)
                    .overlay {
                        RoundedRectangle(cornerRadius: TVDesignTokens.Radius.md)
                            .stroke(borderColor, lineWidth: borderWidth)
                    }
            }
        }
        .buttonStyle(.card)
        .tvFocusStyle()
        .disabled(isRevealed)
    }

    @ViewBuilder
    private var stateIcon: some View {
        switch buttonState {
        case .selectedCorrect, .revealedCorrect:
            Image(systemName: "checkmark.circle.fill")
                .font(.system(size: TVDesignTokens.FontSize.lg))
                .foregroundStyle(.green)
        case .selectedIncorrect:
            Image(systemName: "xmark.circle.fill")
                .font(.system(size: TVDesignTokens.FontSize.lg))
                .foregroundStyle(.red)
        case .default:
            EmptyView()
        }
    }

    private var backgroundColor: Color {
        switch buttonState {
        case .selectedCorrect:
            return Color.green.opacity(0.15)
        case .selectedIncorrect:
            return Color.red.opacity(0.15)
        case .revealedCorrect:
            return DesignTokens.Glass.bg
        case .default:
            return DesignTokens.Glass.bg
        }
    }

    private var borderColor: Color {
        switch buttonState {
        case .selectedCorrect, .revealedCorrect:
            return Color.green
        case .selectedIncorrect:
            return Color.red
        case .default:
            return DesignTokens.Glass.border
        }
    }

    private var borderWidth: CGFloat {
        switch buttonState {
        case .selectedCorrect, .selectedIncorrect, .revealedCorrect:
            return 3
        case .default:
            return 1
        }
    }

    private var textColor: Color {
        switch buttonState {
        case .selectedCorrect:
            return .green
        case .selectedIncorrect:
            return .red
        case .revealedCorrect, .default:
            return DesignTokens.Text.primary
        }
    }
}

private enum AnswerState {
    case `default`
    case selectedCorrect
    case selectedIncorrect
    case revealedCorrect
}
#endif
