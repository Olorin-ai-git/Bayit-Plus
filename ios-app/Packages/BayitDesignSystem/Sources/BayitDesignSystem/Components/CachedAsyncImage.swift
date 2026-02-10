import SwiftUI
import UIKit

/// In-memory image cache shared across all ``CachedAsyncImage`` instances.
/// Uses ``NSCache`` for automatic memory-pressure eviction.
private actor ImageCacheStore {
    static let shared = ImageCacheStore()

    private let cache: NSCache<NSString, UIImage> = {
        let c = NSCache<NSString, UIImage>()
        c.totalCostLimit = 100 * 1024 * 1024 // 100 MB
        c.countLimit = 200
        return c
    }()

    func image(for key: String) -> UIImage? {
        cache.object(forKey: key as NSString)
    }

    func store(_ image: UIImage, for key: String) {
        let cost = image.cgImage.map { $0.bytesPerRow * $0.height } ?? 0
        cache.setObject(image, forKey: key as NSString, cost: cost)
    }
}

/// Drop-in replacement for ``AsyncImage`` that adds an in-memory ``NSCache`` layer.
///
/// When views in ``LazyHStack`` / ``LazyVGrid`` are recycled, SwiftUI's built-in
/// ``AsyncImage`` cancels and restarts downloads. ``CachedAsyncImage`` keeps recently
/// loaded images in a shared ``NSCache`` so recycled views display instantly.
public struct CachedAsyncImage<Placeholder: View>: View {
    private let url: URL?
    private let placeholder: () -> Placeholder

    @State private var loadedImage: UIImage?
    @State private var loadFailed = false
    @State private var loadTask: Task<Void, Never>?

    /// Creates a cached async image view.
    /// - Parameters:
    ///   - url: The remote image URL to load.
    ///   - placeholder: A view builder for the loading / failure state.
    public init(
        url: URL?,
        @ViewBuilder placeholder: @escaping () -> Placeholder
    ) {
        self.url = url
        self.placeholder = placeholder
    }

    public var body: some View {
        Group {
            if let uiImage = loadedImage {
                Image(uiImage: uiImage)
                    .resizable()
                    .aspectRatio(contentMode: .fill)
            } else {
                placeholder()
            }
        }
        .onAppear { startLoad() }
        .onDisappear { cancelLoad() }
    }

    // MARK: - Loading

    private func startLoad() {
        guard loadedImage == nil, let url else { return }
        let key = url.absoluteString

        loadTask = Task {
            // Check cache first
            if let cached = await ImageCacheStore.shared.image(for: key) {
                await MainActor.run { loadedImage = cached }
                return
            }

            // Download
            if let image = await download(url: url) {
                await ImageCacheStore.shared.store(image, for: key)
                await MainActor.run { loadedImage = image }
                return
            }

            // First attempt failed - retry once after a short delay
            try? await Task.sleep(for: .seconds(2))
            guard !Task.isCancelled else { return }

            if let image = await download(url: url) {
                await ImageCacheStore.shared.store(image, for: key)
                await MainActor.run { loadedImage = image }
            } else {
                await MainActor.run { loadFailed = true }
            }
        }
    }

    private func cancelLoad() {
        loadTask?.cancel()
        loadTask = nil
    }

    private func download(url: URL) async -> UIImage? {
        do {
            let (data, response) = try await URLSession.shared.data(from: url)
            guard let httpResponse = response as? HTTPURLResponse,
                  (200...299).contains(httpResponse.statusCode) else {
                return nil
            }
            return UIImage(data: data)
        } catch {
            return nil
        }
    }
}
