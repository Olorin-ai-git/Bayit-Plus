import BayitDesignSystem
import SwiftUI
import UIKit

/// Subtitle display settings: font size, background opacity, and position
struct SubtitleSettingsView: View {
    @AppStorage("subtitleFontSize") private var fontSize: Double = 18
    @AppStorage("subtitleBackgroundOpacity") private var backgroundOpacity: Double = 0.6
    @AppStorage("subtitlePosition") private var position: String = "bottom"

    let onDismiss: () -> Void

    private let fontSizeRange: ClosedRange<Double> = 12...32
    private let opacityRange: ClosedRange<Double> = 0...1.0

    var body: some View {
        VStack(alignment: .leading, spacing: DesignTokens.Spacing.lg) {
            // Header
            HStack {
                Text("Subtitle Settings")
                    .font(.system(size: DesignTokens.FontSize.xl, weight: .bold))
                    .foregroundColor(DesignTokens.Text.primary)

                Spacer()

                Button(action: onDismiss) {
                    Image(systemName: "xmark.circle.fill")
                        .font(.system(size: 22))
                        .foregroundColor(DesignTokens.Text.muted)
                }
                .accessibilityLabel("Dismiss subtitle settings")
            }

            // Font Size
            GlassCard {
                VStack(alignment: .leading, spacing: DesignTokens.Spacing.sm) {
                    HStack {
                        Text("Font Size")
                            .font(.system(size: DesignTokens.FontSize.md))
                            .foregroundColor(DesignTokens.Text.primary)
                        Spacer()
                        Text(String(format: "%.0fpt", fontSize))
                            .font(.system(size: DesignTokens.FontSize.sm))
                            .foregroundColor(DesignTokens.Text.muted)
                    }

                    Slider(value: $fontSize, in: fontSizeRange, step: 1)
                        .tint(DesignTokens.Primary.default)
                        .accessibilityLabel("Subtitle font size")
                }
                .padding(DesignTokens.Spacing.md)
            }

            // Background Opacity
            GlassCard {
                VStack(alignment: .leading, spacing: DesignTokens.Spacing.sm) {
                    HStack {
                        Text("Background Opacity")
                            .font(.system(size: DesignTokens.FontSize.md))
                            .foregroundColor(DesignTokens.Text.primary)
                        Spacer()
                        Text(String(format: "%.0f%%", backgroundOpacity * 100))
                            .font(.system(size: DesignTokens.FontSize.sm))
                            .foregroundColor(DesignTokens.Text.muted)
                    }

                    Slider(value: $backgroundOpacity, in: opacityRange, step: 0.05)
                        .tint(DesignTokens.Primary.default)
                        .accessibilityLabel("Subtitle background opacity")
                }
                .padding(DesignTokens.Spacing.md)
            }

            // Position Picker
            GlassCard {
                VStack(alignment: .leading, spacing: DesignTokens.Spacing.sm) {
                    Text("Position")
                        .font(.system(size: DesignTokens.FontSize.md))
                        .foregroundColor(DesignTokens.Text.primary)

                    HStack(spacing: DesignTokens.Spacing.md) {
                        positionOption(label: "Top", value: "top", icon: "arrow.up.to.line")
                        positionOption(label: "Bottom", value: "bottom", icon: "arrow.down.to.line")
                    }
                }
                .padding(DesignTokens.Spacing.md)
            }

            // Preview
            previewSection

            Spacer()
        }
        .padding(.horizontal, DesignTokens.Spacing.lg)
        .padding(.top, DesignTokens.Spacing.lg)
        .background(DesignTokens.Background.primary)
    }

    private func positionOption(label: String, value: String, icon: String) -> some View {
        let isSelected = position == value

        return GlassChip(
            title: label,
            isSelected: isSelected
        ) {
            let generator = UIImpactFeedbackGenerator(style: .light)
            generator.impactOccurred()
            position = value
        }
    }

    private var previewSection: some View {
        GlassCard {
            VStack(spacing: DesignTokens.Spacing.sm) {
                Text("Preview")
                    .font(.system(size: DesignTokens.FontSize.xs))
                    .foregroundColor(DesignTokens.Text.muted)
                    .frame(maxWidth: .infinity, alignment: .leading)

                ZStack(alignment: position == "top" ? .top : .bottom) {
                    RoundedRectangle(cornerRadius: DesignTokens.Radius.sm)
                        .fill(Color.black)
                        .frame(height: 80)

                    Text("Sample subtitle text")
                        .font(.system(size: fontSize))
                        .foregroundColor(.white)
                        .padding(.horizontal, DesignTokens.Spacing.sm)
                        .padding(.vertical, DesignTokens.Spacing.xs)
                        .background(Color.black.opacity(backgroundOpacity))
                        .cornerRadius(DesignTokens.Radius.sm)
                        .padding(DesignTokens.Spacing.xs)
                }
            }
            .padding(DesignTokens.Spacing.md)
        }
    }
}
