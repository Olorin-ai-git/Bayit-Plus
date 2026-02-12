import BayitDesignSystem
import SwiftUI

/// Animated character view that presents Talk Back questions.
/// Displays character name, avatar with speaking pulse, and question bubble.
struct TalkBackCharacterView: View {

    let characterName: String
    let questionText: String
    let isSpeaking: Bool

    @State private var pulseScale: CGFloat = 1.0

    var body: some View {
        VStack(alignment: .leading, spacing: DesignTokens.Spacing.md) {
            characterHeader
            questionBubble
        }
    }

    private var characterHeader: some View {
        HStack(spacing: DesignTokens.Spacing.md) {
            avatarCircle

            Text(characterName)
                .font(.system(size: DesignTokens.FontSize.md, weight: .bold))
                .foregroundStyle(DesignTokens.Primary.p400)
        }
    }

    private var avatarCircle: some View {
        ZStack {
            Circle()
                .fill(DesignTokens.Primary.default.opacity(0.3))
                .frame(width: 44, height: 44)

            Text(String(characterName.prefix(1)))
                .font(.system(size: DesignTokens.FontSize.lg, weight: .bold))
                .foregroundStyle(DesignTokens.Primary.p400)
        }
        .scaleEffect(pulseScale)
        .onAppear { startPulseIfSpeaking() }
        .onChange(of: isSpeaking) { _, speaking in
            if speaking { startPulseIfSpeaking() } else { pulseScale = 1.0 }
        }
        .animation(
            isSpeaking
                ? .easeInOut(duration: 0.6).repeatForever(autoreverses: true)
                : .default,
            value: pulseScale
        )
        .accessibilityLabel(characterName)
    }

    private var questionBubble: some View {
        Text(questionText)
            .font(.system(size: DesignTokens.FontSize.md, weight: .medium))
            .foregroundStyle(DesignTokens.Text.primary)
            .multilineTextAlignment(.leading)
            .environment(\.layoutDirection, .rightToLeft)
            .padding(DesignTokens.Spacing.md)
            .frame(maxWidth: .infinity, alignment: .leading)
            .background(DesignTokens.Primary.default.opacity(0.12))
            .clipShape(RoundedRectangle(cornerRadius: DesignTokens.Radius.md))
            .overlay(
                RoundedRectangle(cornerRadius: DesignTokens.Radius.md)
                    .stroke(DesignTokens.Primary.default.opacity(0.2), lineWidth: 1)
            )
    }

    private func startPulseIfSpeaking() {
        if isSpeaking {
            pulseScale = 1.12
        }
    }
}
