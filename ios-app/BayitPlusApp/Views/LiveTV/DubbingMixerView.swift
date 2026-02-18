import BayitDesignSystem
import SwiftUI

/// Dual slider controls for adjusting the balance between original and dubbed audio volume.
struct DubbingMixerView: View {
    @Binding var originalVolume: Float
    @Binding var dubbedVolume: Float
    let latencyMs: Int?

    var body: some View {
        GlassCard(radius: DesignTokens.Radius.md, padding: DesignTokens.Spacing.md) {
            VStack(alignment: .leading, spacing: DesignTokens.Spacing.md) {
                Text(String(localized: "dubbing.mixer.title"))
                    .font(.system(size: DesignTokens.FontSize.base, weight: .bold))
                    .foregroundStyle(DesignTokens.Text.primary)

                VolumeRow(
                    label: String(localized: "dubbing.mixer.originalAudio"),
                    iconName: "speaker.wave.2",
                    value: $originalVolume
                )

                VolumeRow(
                    label: String(localized: "dubbing.mixer.dubbedAudio"),
                    iconName: "waveform",
                    value: $dubbedVolume
                )

                if let latencyMs {
                    HStack {
                        Spacer()
                        Text(String(localized: "dubbing.mixer.latency \(latencyMs)"))
                            .font(.system(size: DesignTokens.FontSize.xs))
                            .foregroundStyle(DesignTokens.Text.tertiary)
                    }
                }
            }
        }
    }
}

private struct VolumeRow: View {
    let label: String
    let iconName: String
    @Binding var value: Float

    var body: some View {
        VStack(spacing: DesignTokens.Spacing.xs) {
            HStack {
                Image(systemName: iconName)
                    .font(.system(size: DesignTokens.FontSize.sm))
                    .foregroundStyle(DesignTokens.Text.secondary)

                Text(label)
                    .font(.system(size: DesignTokens.FontSize.sm))
                    .foregroundStyle(DesignTokens.Text.secondary)

                Spacer()

                Text("\(Int(value * 100))%")
                    .font(.system(size: DesignTokens.FontSize.xs))
                    .foregroundStyle(DesignTokens.Text.tertiary)
                    .monospacedDigit()
            }

            Slider(value: $value, in: 0 ... 1, step: 0.05)
                .tint(DesignTokens.Primary.light)
                .accessibilityLabel(label)
                .accessibilityValue("\(Int(value * 100)) percent")
        }
    }
}
