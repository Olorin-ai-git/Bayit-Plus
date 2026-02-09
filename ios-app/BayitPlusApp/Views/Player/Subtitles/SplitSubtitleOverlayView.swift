import BayitDesignSystem
import SwiftUI

/// Split screen subtitle overlay that displays two subtitle languages side-by-side.
/// Used for dual-language subtitle display during video playback.
struct SplitSubtitleOverlayView: View {
    let currentTime: Double
    let primaryCues: [SubtitleCue]
    let secondaryCues: [SubtitleCue]
    let primaryLanguage: String
    let secondaryLanguage: String
    let enabled: Bool
    let settings: SubtitleSettings
    let safeAreaBottom: CGFloat

    private var fontSize: CGFloat {
        // Slightly smaller font for split view
        switch settings.fontSize {
        case .small: return 14
        case .medium: return 17
        case .large: return 20
        }
    }

    private var activePrimaryCues: [SubtitleCue] {
        let active = primaryCues.filter { cue in
            currentTime >= (cue.startTime ?? 0) && currentTime <= (cue.endTime ?? 0)
        }
        if !active.isEmpty {
            print("🔵 Primary (\(primaryLanguage)) at \(currentTime)s: \(active.first?.text ?? "") [\(active.first?.startTime ?? 0)-\(active.first?.endTime ?? 0)]")
        }
        return active
    }

    private var activeSecondaryCues: [SubtitleCue] {
        let active = secondaryCues.filter { cue in
            currentTime >= (cue.startTime ?? 0) && currentTime <= (cue.endTime ?? 0)
        }
        if !active.isEmpty {
            print("🟠 Secondary (\(secondaryLanguage)) at \(currentTime)s: \(active.first?.text ?? "") [\(active.first?.startTime ?? 0)-\(active.first?.endTime ?? 0)]")
        }
        return active
    }

    var body: some View {
        if enabled && (!activePrimaryCues.isEmpty || !activeSecondaryCues.isEmpty) {
            VStack {
                Spacer()

                HStack(spacing: DesignTokens.Spacing.sm) {
                    // Left pane (primary language)
                    SubtitlePaneView(
                        cues: activePrimaryCues,
                        language: primaryLanguage,
                        position: .left,
                        settings: settings,
                        fontSize: fontSize
                    )
                    .frame(maxWidth: .infinity)

                    // Divider
                    Rectangle()
                        .fill(Color.white.opacity(0.25))
                        .frame(width: 2, height: 60)
                        .cornerRadius(1)

                    // Right pane (secondary language)
                    SubtitlePaneView(
                        cues: activeSecondaryCues,
                        language: secondaryLanguage,
                        position: .right,
                        settings: settings,
                        fontSize: fontSize
                    )
                    .frame(maxWidth: .infinity)
                }
                .frame(height: 80)
                .padding(.horizontal, DesignTokens.Spacing.lg)
                .padding(.bottom, 120 + safeAreaBottom)
            }
            .frame(maxHeight: .infinity, alignment: .bottom)
            .allowsHitTesting(false)
        }
    }
}
