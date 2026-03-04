import BayitDesignSystem
import SwiftUI

/// Draggable seek bar for audiobook playback with thumb indicator and scrub feedback.
struct AudiobookSeekBar: View {
    let current: TimeInterval
    let total: TimeInterval
    let isLive: Bool
    let savedPercent: Double
    let onSeek: (TimeInterval) -> Void

    @State private var isDragging = false
    @State private var dragFraction: CGFloat = 0

    private let trackHeight: CGFloat = 4
    private let expandedTrackHeight: CGFloat = 6
    private let thumbSize: CGFloat = 16
    private let hitAreaHeight: CGFloat = 44

    private var liveFraction: CGFloat {
        guard isLive, total > 0 else { return CGFloat(savedPercent / 100) }
        return CGFloat(current / total)
    }

    private var displayFraction: CGFloat {
        let f = isDragging ? dragFraction : liveFraction
        return min(max(f, 0), 1)
    }

    var body: some View {
        GeometryReader { geo in
            let width = geo.size.width

            ZStack(alignment: .leading) {
                // Track background
                Capsule()
                    .fill(DesignTokens.Glass.bgMedium)
                    .frame(height: isDragging ? expandedTrackHeight : trackHeight)

                // Filled track
                Capsule()
                    .fill(DesignTokens.Primary.default)
                    .frame(
                        width: width * displayFraction,
                        height: isDragging ? expandedTrackHeight : trackHeight
                    )

                // Thumb
                if isLive {
                    Circle()
                        .fill(DesignTokens.Primary.default)
                        .frame(width: isDragging ? thumbSize * 1.4 : thumbSize)
                        .shadow(color: .black.opacity(0.3), radius: 2, y: 1)
                        .offset(x: thumbOffset(width: width))
                }
            }
            .frame(height: hitAreaHeight)
            .contentShape(Rectangle())
            .gesture(
                DragGesture(minimumDistance: 0)
                    .onChanged { value in
                        guard isLive, total > 0 else { return }
                        if !isDragging {
                            isDragging = true
                            UIImpactFeedbackGenerator(style: .light).impactOccurred()
                        }
                        dragFraction = max(0, min(value.location.x / width, 1))
                    }
                    .onEnded { value in
                        guard isLive, total > 0 else { return }
                        let percent = max(0, min(value.location.x / width, 1))
                        let seekTime = Double(percent) * total
                        isDragging = false
                        onSeek(seekTime)
                    }
            )
            .animation(.easeOut(duration: 0.15), value: isDragging)
        }
        .frame(height: hitAreaHeight)
    }

    private func thumbOffset(width: CGFloat) -> CGFloat {
        let position = width * displayFraction
        let halfThumb = (isDragging ? thumbSize * 1.4 : thumbSize) / 2
        return position - halfThumb
    }
}
