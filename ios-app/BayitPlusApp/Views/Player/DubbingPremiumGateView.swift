import BayitDesignSystem
import SwiftUI

/// Lightweight inline premium gate for live dubbing feature.
/// Displays premium requirement and upgrade button.
struct DubbingPremiumGateView: View {
    let onDismiss: () -> Void

    @Environment(\.dismiss) private var dismiss

    var body: some View {
        VStack(spacing: DesignTokens.Spacing.lg) {
            headerView

            featuresView

            upgradeButton

            dismissButton
        }
        .padding(DesignTokens.Spacing.xl)
        .background(DesignTokens.Glass.bg)
        .cornerRadius(DesignTokens.Radius.lg)
        .shadow(color: .black.opacity(0.3), radius: 20, x: 0, y: 10)
    }

    // MARK: - Header

    private var headerView: some View {
        VStack(spacing: DesignTokens.Spacing.md) {
            Image(systemName: "lock.circle.fill")
                .font(.system(size: 48))
                .foregroundStyle(DesignTokens.Warning.default)

            Text("Premium Required")
                .font(.system(size: DesignTokens.FontSize.xl, weight: .bold))
                .foregroundStyle(DesignTokens.Text.primary)

            Text("Upgrade to Premium to access live dubbing")
                .font(.system(size: DesignTokens.FontSize.md))
                .foregroundStyle(DesignTokens.Text.muted)
                .multilineTextAlignment(.center)
        }
    }

    // MARK: - Features

    private var featuresView: some View {
        VStack(alignment: .leading, spacing: DesignTokens.Spacing.sm) {
            featureRow(icon: "captions.bubble.fill", text: "Real-time dubbing in multiple languages")
            featureRow(icon: "waveform", text: "Professional voice selection")
            featureRow(icon: "bolt.fill", text: "Low-latency audio streaming")
            featureRow(icon: "speaker.wave.2.fill", text: "High-quality audio")
        }
        .padding(DesignTokens.Spacing.md)
        .background(DesignTokens.Background.elevated)
        .cornerRadius(DesignTokens.Radius.md)
    }

    private func featureRow(icon: String, text: String) -> some View {
        HStack(spacing: DesignTokens.Spacing.md) {
            Image(systemName: icon)
                .font(.system(size: 16))
                .foregroundStyle(DesignTokens.Primary.p400)
                .frame(width: 24)

            Text(text)
                .font(.system(size: DesignTokens.FontSize.sm))
                .foregroundStyle(DesignTokens.Text.primary)
        }
    }

    // MARK: - Buttons

    private var upgradeButton: some View {
        GlassButton(
            "Upgrade to Premium",
            variant: .primary,
            size: .large,
            icon: Image(systemName: "crown.fill")
        ) {
            // Navigate to subscription view
            // This would use NavigationCoordinator in production
            dismiss()
        }
        .accessibilityLabel("Upgrade to Premium subscription")
    }

    private var dismissButton: some View {
        Button {
            onDismiss()
        } label: {
            Text("Maybe Later")
                .font(.system(size: DesignTokens.FontSize.sm))
                .foregroundStyle(DesignTokens.Text.muted)
        }
        .accessibilityLabel("Dismiss premium gate")
    }
}
