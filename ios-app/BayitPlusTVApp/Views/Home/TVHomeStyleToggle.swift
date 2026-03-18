#if os(tvOS)
    import BayitDesignSystem
    import BayitLocalization
    import SwiftUI

    /// Toggle button for switching between Cinematic and Classic home layouts.
    /// Placed in the top-right of the home screen.
    struct TVHomeStyleToggle: View {
        let isCinematic: Bool
        let onToggle: () -> Void

        @Environment(LocalizationManager.self) private var localization
        @FocusState private var isFocused: Bool
        @State private var sparkleRotation: Double = 0

        var body: some View {
            Button(action: onToggle) {
                HStack(spacing: TVDesignTokens.Spacing.sm) {
                    Image(systemName: isCinematic ? "rectangle.stack" : "sparkles.tv")
                        .font(.system(size: TVDesignTokens.FontSize.sm, weight: .medium))
                        .rotationEffect(.degrees(isFocused ? sparkleRotation : 0))
                        .scaleEffect(isFocused ? 1.15 : 1.0)

                    Text(targetLabel)
                        .font(.system(
                            size: TVDesignTokens.FontSize.sm,
                            weight: isFocused ? .semibold : .medium
                        ))
                        .lineLimit(1)
                }
                .foregroundStyle(
                    isFocused
                        ? .white
                        : DesignTokens.Text.secondary
                )
                .padding(.horizontal, TVDesignTokens.Spacing.lg)
                .padding(.vertical, TVDesignTokens.Spacing.sm)
                .background(buttonBackground)
                .clipShape(Capsule())
                .overlay(focusRing)
                .shadow(
                    color: isFocused
                        ? DesignTokens.Glass.purpleGlow
                        : .clear,
                    radius: isFocused ? 16 : 0, y: 4
                )
            }
            .buttonStyle(.plain)
            .focused($isFocused)
            .scaleEffect(isFocused ? 1.1 : 1.0)
            .animation(.spring(duration: 0.3, bounce: 0.2), value: isFocused)
            .onChange(of: isFocused) { _, focused in
                if focused { startSparkleAnimation() }
            }
        }

        private var targetLabel: String {
            isCinematic
                ? localization.t("dock.classic")
                : localization.t("dock.cinematic")
        }

        private var buttonBackground: some View {
            ZStack {
                Color.black.opacity(isFocused ? 0.85 : 0.6)
                if isFocused {
                    DesignTokens.Primary.default.opacity(0.15)
                } else {
                    DesignTokens.Glass.bgStrong
                }
            }
        }

        private var focusRing: some View {
            Capsule()
                .stroke(
                    isFocused
                        ? DesignTokens.Primary.default.opacity(0.8)
                        : DesignTokens.Glass.border,
                    lineWidth: isFocused ? 2.5 : 1
                )
        }

        private func startSparkleAnimation() {
            sparkleRotation = 0
            withAnimation(
                .easeInOut(duration: 0.6)
                    .repeatForever(autoreverses: true)
            ) {
                sparkleRotation = 15
            }
        }
    }
#endif
