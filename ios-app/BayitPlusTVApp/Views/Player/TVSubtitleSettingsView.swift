import BayitDesignSystem
import SwiftUI

/// tvOS subtitle display settings: font size, background opacity, and position.
/// Adapted for Siri Remote navigation with +/- buttons replacing sliders.
/// Dismiss via Menu button on the Siri Remote (no X button).
struct TVSubtitleSettingsView: View {
    @Environment(\.dismiss) private var dismiss
    @AppStorage("subtitleFontSize") private var fontSize: Double = 18
    @AppStorage("subtitleBackgroundOpacity") private var backgroundOpacity: Double = 0.6
    @AppStorage("subtitlePosition") private var position: String = "bottom"

    private let fontSizeRange: ClosedRange<Double> = 12...32
    private let opacityRange: ClosedRange<Double> = 0...1.0
    private let opacityStep: Double = 0.05

    var body: some View {
        VStack(alignment: .leading, spacing: TVDesignTokens.Spacing.lg) {
            Text("Subtitle Settings")
                .font(.system(size: TVDesignTokens.FontSize.xl, weight: .bold))
                .foregroundColor(DesignTokens.Text.primary)

            fontSizeCard
            backgroundOpacityCard
            positionCard
            previewSection

            Spacer()
        }
        .padding(.horizontal, TVDesignTokens.Spacing.lg)
        .padding(.top, TVDesignTokens.Spacing.lg)
        .background(DesignTokens.Background.primary)
        .onExitCommand { dismiss() }
    }

    // MARK: - Font Size

    private var fontSizeCard: some View {
        GlassCard {
            VStack(alignment: .leading, spacing: TVDesignTokens.Spacing.sm) {
                Text("Font Size")
                    .font(.system(size: TVDesignTokens.FontSize.md))
                    .foregroundColor(DesignTokens.Text.primary)

                HStack(spacing: TVDesignTokens.Spacing.md) {
                    GlassButton("-", variant: .secondary, size: .small) {
                        fontSize = max(fontSizeRange.lowerBound, fontSize - 1)
                    }
                    .accessibilityLabel("Decrease font size")

                    Text(String(format: "%.0fpt", fontSize))
                        .font(.system(size: TVDesignTokens.FontSize.lg, weight: .semibold))
                        .foregroundColor(DesignTokens.Text.primary)
                        .frame(minWidth: TVDesignTokens.MinSize.focusableWidth)

                    GlassButton("+", variant: .secondary, size: .small) {
                        fontSize = min(fontSizeRange.upperBound, fontSize + 1)
                    }
                    .accessibilityLabel("Increase font size")

                    Spacer()
                }
            }
            .padding(TVDesignTokens.Spacing.md)
        }
    }

    // MARK: - Background Opacity

    private var backgroundOpacityCard: some View {
        GlassCard {
            VStack(alignment: .leading, spacing: TVDesignTokens.Spacing.sm) {
                Text("Background Opacity")
                    .font(.system(size: TVDesignTokens.FontSize.md))
                    .foregroundColor(DesignTokens.Text.primary)

                HStack(spacing: TVDesignTokens.Spacing.md) {
                    GlassButton("-", variant: .secondary, size: .small) {
                        backgroundOpacity = max(opacityRange.lowerBound, backgroundOpacity - opacityStep)
                    }
                    .accessibilityLabel("Decrease background opacity")

                    Text(String(format: "%.0f%%", backgroundOpacity * 100))
                        .font(.system(size: TVDesignTokens.FontSize.lg, weight: .semibold))
                        .foregroundColor(DesignTokens.Text.primary)
                        .frame(minWidth: TVDesignTokens.MinSize.focusableWidth)

                    GlassButton("+", variant: .secondary, size: .small) {
                        backgroundOpacity = min(opacityRange.upperBound, backgroundOpacity + opacityStep)
                    }
                    .accessibilityLabel("Increase background opacity")

                    Spacer()
                }
            }
            .padding(TVDesignTokens.Spacing.md)
        }
    }

    // MARK: - Position Picker

    private var positionCard: some View {
        GlassCard {
            VStack(alignment: .leading, spacing: TVDesignTokens.Spacing.sm) {
                Text("Position")
                    .font(.system(size: TVDesignTokens.FontSize.md))
                    .foregroundColor(DesignTokens.Text.primary)

                HStack(spacing: TVDesignTokens.Spacing.focusGap) {
                    GlassChip(title: "Top", isSelected: position == "top") {
                        position = "top"
                    }
                    .accessibilityLabel("Position subtitles at top")

                    GlassChip(title: "Bottom", isSelected: position == "bottom") {
                        position = "bottom"
                    }
                    .accessibilityLabel("Position subtitles at bottom")
                }
            }
            .padding(TVDesignTokens.Spacing.md)
        }
    }

    // MARK: - Preview

    private var previewSection: some View {
        GlassCard {
            VStack(spacing: TVDesignTokens.Spacing.sm) {
                Text("Preview")
                    .font(.system(size: TVDesignTokens.FontSize.sm))
                    .foregroundColor(DesignTokens.Text.muted)
                    .frame(maxWidth: .infinity, alignment: .leading)

                ZStack(alignment: position == "top" ? .top : .bottom) {
                    RoundedRectangle(cornerRadius: TVDesignTokens.Radius.md)
                        .fill(Color.black)
                        .frame(height: 160)

                    Text("Sample subtitle text")
                        .font(.system(size: fontSize))
                        .foregroundColor(.white)
                        .padding(.horizontal, TVDesignTokens.Spacing.sm)
                        .padding(.vertical, TVDesignTokens.Spacing.xs)
                        .background(Color.black.opacity(backgroundOpacity))
                        .cornerRadius(TVDesignTokens.Radius.sm)
                        .padding(TVDesignTokens.Spacing.xs)
                }
            }
            .padding(TVDesignTokens.Spacing.md)
        }
    }
}
