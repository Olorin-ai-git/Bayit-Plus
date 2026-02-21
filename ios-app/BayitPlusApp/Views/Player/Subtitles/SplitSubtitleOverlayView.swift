import BayitDesignSystem
import SwiftUI

/// Layout mode for split subtitles.
enum SplitSubtitleLayout: String, CaseIterable {
    case stacked // Primary on top, secondary below
    case sideBySide // Left and right columns

    var label: String {
        switch self {
        case .stacked: return "Stacked"
        case .sideBySide: return "Side by Side"
        }
    }

    var icon: String {
        switch self {
        case .stacked: return "text.line.first.and.arrowtriangle.forward"
        case .sideBySide: return "rectangle.split.2x1"
        }
    }
}

/// Split screen subtitle overlay supporting two layout modes.
/// - STACKED: Primary on top, secondary below
/// - SIDE_BY_SIDE: Left and right columns
struct SplitSubtitleOverlayView: View {
    let currentTime: Double
    let primaryCues: [SubtitleCue]
    let secondaryCues: [SubtitleCue]
    let primaryLanguage: String
    let secondaryLanguage: String
    let enabled: Bool
    let settings: SubtitleSettings
    let safeAreaBottom: CGFloat
    var layout: SplitSubtitleLayout = .stacked

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
            currentTime >= (cue.startTime ?? 0) && currentTime <= (cue.endTime ?? 0)
        }
    }

    private var activeSecondaryCues: [SubtitleCue] {
        secondaryCues.filter { cue in
            currentTime >= (cue.startTime ?? 0) && currentTime <= (cue.endTime ?? 0)
        }
    }

    var body: some View {
        if enabled && (!activePrimaryCues.isEmpty || !activeSecondaryCues.isEmpty) {
            VStack {
                Spacer()

                Group {
                    switch layout {
                    case .stacked:
                        stackedLayout
                    case .sideBySide:
                        sideBySideLayout
                    }
                }
                .padding(.horizontal, DesignTokens.Spacing.lg)
                .padding(.bottom, 120 + safeAreaBottom)
            }
            .frame(maxHeight: .infinity, alignment: .bottom)
            .allowsHitTesting(false)
        }
    }

    // MARK: - Stacked Layout

    private var stackedLayout: some View {
        VStack(spacing: DesignTokens.Spacing.xs) {
            // Primary subtitle on top
            SubtitlePaneView(
                cues: activePrimaryCues,
                language: primaryLanguage,
                position: .left,
                settings: settings,
                fontSize: fontSize
            )

            // Secondary subtitle below
            SubtitlePaneView(
                cues: activeSecondaryCues,
                language: secondaryLanguage,
                position: .right,
                settings: settings,
                fontSize: fontSize
            )
        }
    }

    // MARK: - Side by Side Layout

    private var sideBySideLayout: some View {
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
    }
}
