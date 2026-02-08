import BayitDesignSystem
import SwiftUI

/// Floating action button with animated wizard hat for voice assistant
struct VoiceAvatarFAB: View {
    let onTap: () -> Void

    @State private var bounceOffset: CGFloat = 0
    @State private var scale: CGFloat = 1.0

    var body: some View {
        Button(action: handleTap) {
            ZStack {
                // Background circle with glow
                Circle()
                    .fill(Color(red: 13/255, green: 13/255, blue: 26/255).opacity(0.9))
                    .frame(width: 64, height: 64)
                    .overlay(
                        Circle()
                            .stroke(DesignTokens.Primary.p500.opacity(0.4), lineWidth: 2)
                    )
                    .shadow(
                        color: DesignTokens.Primary.p600.opacity(0.3),
                        radius: 12,
                        x: 0,
                        y: 4
                    )

                // Wizard hat icon
                if let hatImage = UIImage(named: "wizard-hat") {
                    Image(uiImage: hatImage)
                        .resizable()
                        .aspectRatio(contentMode: .fit)
                        .frame(width: 40, height: 40)
                } else {
                    // Fallback to SF Symbol
                    Image(systemName: "sparkles")
                        .font(.system(size: 28))
                        .foregroundColor(DesignTokens.Primary.p400)
                }
            }
            .scaleEffect(scale)
            .offset(y: bounceOffset)
        }
        .buttonStyle(.plain)
        .accessibilityLabel("Voice Assistant")
        .accessibilityHint("Activate voice assistant with wizard")
        .onAppear {
            startBounceAnimation()
        }
    }

    private func handleTap() {
        // Scale animation on tap
        withAnimation(.spring(duration: 0.2, bounce: 0.3)) {
            scale = 0.9
        }

        // Haptic feedback
        let generator = UIImpactFeedbackGenerator(style: .medium)
        generator.impactOccurred()

        // Restore scale and execute action
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.1) {
            withAnimation(.spring(duration: 0.2, bounce: 0.3)) {
                scale = 1.0
            }
            onTap()
        }
    }

    private func startBounceAnimation() {
        withAnimation(
            .easeInOut(duration: 2.0)
            .repeatForever(autoreverses: true)
        ) {
            bounceOffset = -5
        }
    }
}
