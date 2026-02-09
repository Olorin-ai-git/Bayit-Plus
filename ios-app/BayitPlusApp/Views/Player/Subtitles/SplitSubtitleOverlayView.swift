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
        primaryCues.filter { cue in
            currentTime >= cue.start_time && currentTime <= cue.end_time
        }
    }

    private var activeSecondaryCues: [SubtitleCue] {
        secondaryCues.filter { cue in
            currentTime >= cue.start_time && currentTime <= cue.end_time
        }
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
                        .frame(width: 2)
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
                .padding(.horizontal, UIScreen.main.bounds.width * 0.1)
                .padding(.bottom, safeAreaBottom + (settings.position == .bottom ? 96 : 0))
                .padding(.top, settings.position == .top ? 32 : 0)
            }
            .allowsHitTesting(false)
        }
    }
}
