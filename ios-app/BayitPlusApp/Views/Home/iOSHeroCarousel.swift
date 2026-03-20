import SwiftUI

/// Swipe-based hero carousel for iOS with auto-advance and page indicators.
/// Uses TabView with page style for native swipe paging.
struct iOSHeroCarousel<Item: Identifiable, ItemView: View>: View {
    let items: [Item]
    let autoAdvanceInterval: TimeInterval
    @Binding var currentIndex: Int
    @ViewBuilder let itemBuilder: (Item, Bool) -> ItemView

    @State private var autoAdvanceTask: Task<Void, Never>?
    @State private var userInteracted = false

    init(
        items: [Item],
        autoAdvanceInterval: TimeInterval = 8,
        currentIndex: Binding<Int>,
        @ViewBuilder itemBuilder: @escaping (Item, Bool) -> ItemView
    ) {
        self.items = items
        self.autoAdvanceInterval = autoAdvanceInterval
        _currentIndex = currentIndex
        self.itemBuilder = itemBuilder
    }

    var body: some View {
        TabView(selection: $currentIndex) {
            ForEach(Array(items.enumerated()), id: \.element.id) { index, item in
                itemBuilder(item, index == currentIndex)
                    .tag(index)
            }
        }
        .tabViewStyle(.page(indexDisplayMode: .never))
        .onAppear { startAutoAdvance() }
        .onDisappear { stopAutoAdvance() }
        .onChange(of: currentIndex) { _, _ in
            handleUserInteraction()
        }
        .onChange(of: items.count) { _, newCount in
            if newCount > 0 { restartAutoAdvance() }
        }
    }

    private func startAutoAdvance() {
        guard items.count > 1 else { return }
        autoAdvanceTask?.cancel()
        autoAdvanceTask = Task { @MainActor in
            while !Task.isCancelled {
                try? await Task.sleep(for: .seconds(autoAdvanceInterval))
                guard !Task.isCancelled else { break }
                withAnimation(.easeInOut(duration: 0.6)) {
                    currentIndex = (currentIndex + 1) % items.count
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

    private func handleUserInteraction() {
        guard !userInteracted else { return }
        userInteracted = true
        stopAutoAdvance()
        Task { @MainActor in
            try? await Task.sleep(for: .seconds(12))
            userInteracted = false
            startAutoAdvance()
        }
    }
}
