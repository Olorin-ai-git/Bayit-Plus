#if os(tvOS)
import SwiftUI

/// Full-width hero banner carousel for tvOS home screen.
/// Uses manual offset-based paging for full-bleed rendering without TabView safe area insets.
public struct GlassHeroCarousel<Item: Identifiable, ItemView: View>: View {
    let items: [Item]
    let autoAdvanceInterval: TimeInterval
    let itemBuilder: (Item) -> ItemView

    @State private var currentIndex = 0
    @State private var autoAdvanceTask: Task<Void, Never>?

    public init(
        items: [Item],
        autoAdvanceInterval: TimeInterval = 6,
        @ViewBuilder itemBuilder: @escaping (Item) -> ItemView
    ) {
        self.items = items
        self.autoAdvanceInterval = autoAdvanceInterval
        self.itemBuilder = itemBuilder
    }

    public var body: some View {
        VStack(spacing: TVDesignTokens.Spacing.md) {
            GeometryReader { geo in
                let width = geo.size.width
                HStack(spacing: 0) {
                    ForEach(Array(items.enumerated()), id: \.element.id) { _, item in
                        itemBuilder(item)
                            .frame(width: width, height: geo.size.height)
                    }
                }
                .offset(x: -CGFloat(currentIndex) * width)
                .animation(.easeInOut(duration: 0.5), value: currentIndex)
            }
            .frame(height: TVDesignTokens.MinSize.heroHeight)
            .clipped()

            pageIndicator
        }
        .focusable(true)
        .onMoveCommand { direction in
            switch direction {
            case .left:
                if currentIndex > 0 {
                    currentIndex -= 1
                    restartAutoAdvance()
                }
            case .right:
                if currentIndex < items.count - 1 {
                    currentIndex += 1
                    restartAutoAdvance()
                }
            default:
                break
            }
        }
        .onAppear { startAutoAdvance() }
        .onDisappear { stopAutoAdvance() }
    }

    private var pageIndicator: some View {
        HStack(spacing: TVDesignTokens.Spacing.xs) {
            ForEach(items.indices, id: \.self) { index in
                Circle()
                    .fill(
                        index == currentIndex
                            ? DesignTokens.Colors.Primary.light
                            : DesignTokens.Text.muted
                    )
                    .frame(
                        width: index == currentIndex ? 10 : 6,
                        height: index == currentIndex ? 10 : 6
                    )
                    .animation(.easeInOut(duration: 0.2), value: currentIndex)
            }
        }
    }

    // MARK: - Auto-Advance

    private func startAutoAdvance() {
        guard items.count > 1 else { return }
        autoAdvanceTask = Task {
            while !Task.isCancelled {
                try? await Task.sleep(for: .seconds(autoAdvanceInterval))
                guard !Task.isCancelled else { break }
                await MainActor.run {
                    withAnimation(.easeInOut(duration: 0.5)) {
                        currentIndex = (currentIndex + 1) % items.count
                    }
                }
            }
        }
    }

    private func stopAutoAdvance() {
        autoAdvanceTask?.cancel()
        autoAdvanceTask = nil
    }

    private func restartAutoAdvance() {
        stopAutoAdvance()
        startAutoAdvance()
    }
}
#endif
