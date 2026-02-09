import SwiftUI

/// Glass-styled progress bar with buffered indicator and interactive seeking.
///
/// Used within GlassPlayerControls for media timeline display.
/// Supports drag gesture for seeking with haptic feedback.
public struct GlassProgressBar: View {

    let progress: Double
    let buffered: Double
    let onSeek: ((Double) -> Void)?
    let onSeekEnd: ((Double) -> Void)?

    @State private var isDragging = false
    @State private var barWidth: CGFloat = 0

    private let trackHeight: CGFloat = 4
    private let expandedHeight: CGFloat = 8
    private let thumbSize: CGFloat = 16

    public init(
        progress: Double,
        buffered: Double = 0,
        onSeek: ((Double) -> Void)? = nil,
        onSeekEnd: ((Double) -> Void)? = nil
    ) {
        self.progress = progress
        self.buffered = buffered
        self.onSeek = onSeek
        self.onSeekEnd = onSeekEnd
    }

    public var body: some View {
        GeometryReader { geometry in
            let width = geometry.size.width

            ZStack(alignment: .leading) {
                // Track background
                Capsule()
                    .fill(DesignTokens.Glass.bgMedium)
                    .frame(height: isDragging ? expandedHeight : trackHeight)

                // Buffered indicator
                Capsule()
                    .fill(DesignTokens.Glass.bgStrong)
                    .frame(
                        width: max(0, width * CGFloat(clamp(buffered))),
                        height: isDragging ? expandedHeight : trackHeight
                    )

                // Progress fill
                Capsule()
                    .fill(DesignTokens.Primary.default)
                    .frame(
                        width: max(0, width * CGFloat(clamp(progress))),
                        height: isDragging ? expandedHeight : trackHeight
                    )

                // Thumb
                if isDragging || onSeek != nil {
                    Circle()
                        .fill(.white)
                        .frame(width: thumbSize, height: thumbSize)
                        .shadow(color: .black.opacity(0.3), radius: 2)
                        .offset(x: max(0, width * CGFloat(clamp(progress)) - thumbSize / 2))
                        .opacity(isDragging ? 1 : 0)
                }
            }
            .frame(height: thumbSize)
            .contentShape(Rectangle())
            #if !os(tvOS)
            .gesture(seekGesture(width: width))
            #endif
            .onAppear { barWidth = width }
            .onChange(of: geometry.size.width) { _, newWidth in
                barWidth = newWidth
            }
        }
        .frame(height: thumbSize)
        .animation(.easeInOut(duration: 0.15), value: isDragging)
    }

    #if !os(tvOS)
    private func seekGesture(width: CGFloat) -> some Gesture {
        DragGesture(minimumDistance: 0)
            .onChanged { value in
                guard width > 0, onSeek != nil else { return }
                isDragging = true
                let fraction = clamp(Double(value.location.x / width))
                onSeek?(fraction)
            }
            .onEnded { value in
                guard width > 0, onSeekEnd != nil else { return }
                isDragging = false
                let fraction = clamp(Double(value.location.x / width))
                onSeekEnd?(fraction)
            }
    }
    #endif

    private func clamp(_ value: Double) -> Double {
        min(max(value, 0), 1)
    }
}
