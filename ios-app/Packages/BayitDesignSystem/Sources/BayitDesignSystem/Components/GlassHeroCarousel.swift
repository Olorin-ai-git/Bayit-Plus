#if os(tvOS)
    import SwiftUI

    /// Full-width hero banner carousel for tvOS home screen.
    /// Uses crossfade transitions for smooth page changes (including wrap-around).
    /// Child views provide their own focusable buttons; page navigation via
    /// focusable indicator dots or auto-advance timer.
    public struct GlassHeroCarousel<Item: Identifiable, ItemView: View>: View {
        let items: [Item]
        let autoAdvanceInterval: TimeInterval
        let itemBuilder: (Item) -> ItemView

        @State private var currentIndex = 0
        @State private var autoAdvanceTask: Task<Void, Never>?
        @FocusState private var focusedDotIndex: Int?

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
                    ZStack {
                        ForEach(Array(items.enumerated()), id: \.element.id) { index, item in
                            if index == currentIndex {
                                itemBuilder(item)
                                    .frame(width: geo.size.width, height: geo.size.height)
                                    .transition(.opacity)
                            }
                        }
                    }
                }
                .frame(height: TVDesignTokens.MinSize.heroHeight)
                .clipped()
                .animation(.easeInOut(duration: 0.6), value: currentIndex)

                pageIndicator
            }
            .onAppear { startAutoAdvance() }
            .onDisappear { stopAutoAdvance() }
        }

        // MARK: - Page Indicator

        private var pageIndicator: some View {
            HStack(spacing: TVDesignTokens.Spacing.sm) {
                ForEach(items.indices, id: \.self) { index in
                    Button {
                        selectPage(index)
                    } label: {
                        Circle()
                            .fill(
                                index == currentIndex
                                    ? DesignTokens.Colors.Primary.light
                                    : DesignTokens.Text.muted
                            )
                            .frame(
                                width: dotSize(for: index),
                                height: dotSize(for: index)
                            )
                            .animation(.easeInOut(duration: 0.2), value: currentIndex)
                            .animation(.easeInOut(duration: 0.15), value: focusedDotIndex)
                    }
                    .buttonStyle(.plain)
                    .focused($focusedDotIndex, equals: index)
                }
            }
            .onChange(of: focusedDotIndex) { _, newIndex in
                if let newIndex {
                    selectPage(newIndex)
                }
            }
        }

        private func dotSize(for index: Int) -> CGFloat {
            if index == focusedDotIndex { return 14 }
            if index == currentIndex { return 10 }
            return 6
        }

        private func selectPage(_ index: Int) {
            pauseAutoAdvance()
            guard index != currentIndex, index >= 0, index < items.count else { return }
            withAnimation(.easeInOut(duration: 0.6)) {
                currentIndex = index
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
