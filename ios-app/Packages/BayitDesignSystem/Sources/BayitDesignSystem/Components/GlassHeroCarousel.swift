#if os(tvOS)
    import SwiftUI

    /// Full-width hero banner carousel for tvOS home screen.
    /// Uses crossfade transitions for smooth page changes (including wrap-around).
    /// Child views provide their own focusable buttons; page navigation via
    /// auto-advance timer. Dots are display-only indicators (standard tvOS pattern).
    public struct GlassHeroCarousel<Item: Identifiable, ItemView: View>: View {
        let items: [Item]
        let autoAdvanceInterval: TimeInterval
        let showPageIndicator: Bool
        let itemBuilder: (Item, Bool) -> ItemView

        @State private var currentIndex = 0
        @State private var autoAdvanceTask: Task<Void, Never>?

        public init(
            items: [Item],
            autoAdvanceInterval: TimeInterval = 6,
            showPageIndicator: Bool = true,
            @ViewBuilder itemBuilder: @escaping (Item, Bool) -> ItemView
        ) {
            self.items = items
            self.autoAdvanceInterval = autoAdvanceInterval
            self.showPageIndicator = showPageIndicator
            self.itemBuilder = itemBuilder
        }

        public var body: some View {
            ZStack(alignment: .bottom) {
                GeometryReader { geo in
                    ZStack {
                        ForEach(Array(items.enumerated()), id: \.element.id) { index, item in
                            if index == currentIndex {
                                itemBuilder(item, index == currentIndex)
                                    .frame(width: geo.size.width, height: geo.size.height)
                                    .transition(.opacity)
                            }
                        }
                    }
                }
                .frame(height: TVDesignTokens.MinSize.heroHeight)
                .clipped()
                .animation(.easeInOut(duration: 0.6), value: currentIndex)

                if showPageIndicator {
                    pageIndicator
                        .padding(.bottom, TVDesignTokens.Spacing.md)
                }
            }
            .onAppear { startAutoAdvance() }
            .onDisappear { stopAutoAdvance() }
            .onChange(of: items.count) { oldCount, newCount in
                if oldCount <= 1, newCount > 1 {
                    stopAutoAdvance()
                    startAutoAdvance()
                }
                if currentIndex >= newCount, newCount > 0 {
                    currentIndex = 0
                }
            }
        }

        // MARK: - Page Indicator (display-only, not focusable)

        private var pageIndicator: some View {
            HStack(spacing: TVDesignTokens.Spacing.sm) {
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
            .allowsHitTesting(false)
        }

        // MARK: - Auto-Advance

        private func startAutoAdvance() {
            guard items.count > 1 else { return }
            autoAdvanceTask = Task {
                while !Task.isCancelled {
                    try? await Task.sleep(for: .seconds(autoAdvanceInterval))
                    guard !Task.isCancelled else { break }
                    await MainActor.run {
                        withAnimation(.easeInOut(duration: 0.6)) {
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

        private func pauseAutoAdvance() {
            stopAutoAdvance()
            let resumeDelay = autoAdvanceInterval * 2
            autoAdvanceTask = Task {
                try? await Task.sleep(for: .seconds(resumeDelay))
                guard !Task.isCancelled else { return }
                await MainActor.run { startAutoAdvance() }
            }
        }
    }
#endif
