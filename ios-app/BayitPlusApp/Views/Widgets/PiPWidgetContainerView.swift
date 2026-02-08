import BayitDesignSystem
import SwiftUI

/// Draggable, resizable floating video widget for Picture-in-Picture mode.
/// Supports drag repositioning, magnification resize, and double-tap fullscreen toggle.
struct PiPWidgetContainerView: View {
    let contentId: String
    let onClose: () -> Void
    let onToggleFullscreen: () -> Void

    @State private var position: CGSize = .zero
    @State private var lastPosition: CGSize = .zero
    @State private var scale: CGFloat = 1.0
    @State private var lastScale: CGFloat = 1.0
    @State private var isFullscreen = false

    private let baseWidth: CGFloat = 200
    private let baseHeight: CGFloat = 120
    private let minScale: CGFloat = 0.6
    private let maxScale: CGFloat = 2.0

    var body: some View {
        ZStack(alignment: .topTrailing) {
            // Video placeholder - actual player integration point
            RoundedRectangle(cornerRadius: DesignTokens.Radius.md)
                .fill(DesignTokens.Glass.bg)
                .frame(
                    width: baseWidth * scale,
                    height: baseHeight * scale
                )
                .overlay(
                    Image(systemName: "play.fill")
                        .font(.system(size: DesignTokens.FontSize.xl))
                        .foregroundStyle(DesignTokens.Text.primary)
                )
                .overlay(
                    RoundedRectangle(cornerRadius: DesignTokens.Radius.md)
                        .stroke(DesignTokens.Glass.border, lineWidth: 1)
                )
                .shadow(
                    color: DesignTokens.Glass.purpleGlow,
                    radius: 8,
                    x: 0,
                    y: 4
                )

            // Close button
            Button {
                HapticFeedbackService.impact(style: .light)
                onClose()
            } label: {
                Image(systemName: "xmark.circle.fill")
                    .font(.system(size: DesignTokens.FontSize.xl))
                    .foregroundStyle(DesignTokens.Text.primary)
                    .background(
                        Circle()
                            .fill(DesignTokens.Glass.bgStrong)
                            .frame(width: 28, height: 28)
                    )
            }
            .offset(x: DesignTokens.Spacing.sm, y: -DesignTokens.Spacing.sm)
        }
        .offset(x: position.width, y: position.height)
        .gesture(dragGesture)
        .gesture(magnificationGesture)
        .onTapGesture(count: 2) {
            HapticFeedbackService.impact(style: .medium)
            isFullscreen.toggle()
            onToggleFullscreen()
        }
        .animation(.spring(duration: 0.3, bounce: 0.15), value: scale)
        .animation(.spring(duration: 0.3, bounce: 0.15), value: isFullscreen)
    }

    // MARK: - Gestures

    private var dragGesture: some Gesture {
        DragGesture()
            .onChanged { value in
                position = CGSize(
                    width: lastPosition.width + value.translation.width,
                    height: lastPosition.height + value.translation.height
                )
            }
            .onEnded { _ in
                lastPosition = position
            }
    }

    private var magnificationGesture: some Gesture {
        MagnificationGesture()
            .onChanged { value in
                let newScale = lastScale * value
                scale = min(max(newScale, minScale), maxScale)
            }
            .onEnded { _ in
                lastScale = scale
            }
    }
}
