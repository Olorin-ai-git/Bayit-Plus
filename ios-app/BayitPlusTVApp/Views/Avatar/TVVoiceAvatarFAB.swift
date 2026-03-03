import BayitDesignSystem
import SwiftUI

/// tvOS floating action button for activating the AI assistant.
struct TVVoiceAvatarFAB: View {
    let onTap: () -> Void

    @State private var bounceOffset: CGFloat = 0

    var body: some View {
        Button(action: onTap) {
            ZStack {
                Circle()
                    .fill(DesignTokens.Glass.bgStrong)
                    .frame(width: 88, height: 88)
                    .overlay(
                        Circle()
                            .stroke(DesignTokens.Primary.p500.opacity(0.4), lineWidth: 2)
                    )
                    .shadow(
                        color: DesignTokens.Primary.p600.opacity(0.3),
                        radius: 16,
                        x: 0,
                        y: 6
                    )

                Image(systemName: "sparkles")
                    .font(.system(size: TVDesignTokens.FontSize.xl))
                    .foregroundStyle(DesignTokens.Primary.p400)
            }
            .offset(y: bounceOffset)
        }
        .tvCardStyle()
        .accessibilityLabel("AI Assistant")
        .accessibilityHint("Activate the AI voice assistant")
        .onAppear {
            withAnimation(
                .easeInOut(duration: 2.0)
                    .repeatForever(autoreverses: true)
            ) {
                bounceOffset = -5
            }
        }
    }
}
