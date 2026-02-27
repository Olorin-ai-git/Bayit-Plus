import SwiftUI

#if canImport(UIKit)
    import UIKit

    private typealias PlatformImage = UIImage
#elseif canImport(AppKit)
    import AppKit

    private typealias PlatformImage = NSImage
#endif

/// In-memory image cache shared across all ``CachedAsyncImage`` instances.
/// Uses ``NSCache`` for automatic memory-pressure eviction.
private actor ImageCacheStore {
    static let shared = ImageCacheStore()

    private let cache: NSCache<NSString, AnyObject> = {
        let c = NSCache<NSString, AnyObject>()
        c.totalCostLimit = 100 * 1024 * 1024 // 100 MB
        c.countLimit = 200
        return c
    }()

    func image(for key: String) -> PlatformImage? {
        cache.object(forKey: key as NSString) as? PlatformImage
    }

    func store(_ image: PlatformImage, for key: String) {
        #if canImport(UIKit)
            let cost = image.cgImage.map { $0.bytesPerRow * $0.height } ?? 0
        #elseif canImport(AppKit)
            let rep = image.representations.first
            let cost = rep.map { $0.pixelsWide * $0.pixelsHigh * 4 } ?? 0
        #endif
        cache.setObject(image, forKey: key as NSString, cost: cost)
    }
}

/// Drop-in replacement for ``AsyncImage`` that adds an in-memory ``NSCache`` layer.
///
/// When views in ``LazyHStack`` / ``LazyVGrid`` are recycled, SwiftUI's built-in
/// ``AsyncImage`` cancels and restarts downloads. ``CachedAsyncImage`` keeps recently
/// loaded images in a shared ``NSCache`` so recycled views display instantly.
/// Loading phase for ``CachedAsyncImage``, mirroring ``AsyncImagePhase``.
public enum CachedAsyncImagePhase {
    case empty
    case success(Image)
    case failure(Error)
}

public struct CachedAsyncImage<Placeholder: View>: View {
    private let url: URL?
    private let placeholder: () -> Placeholder
    private let phaseContent: ((CachedAsyncImagePhase) -> AnyView)?

    @State private var loadedImage: PlatformImage?
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
        phaseContent = nil
    }

    public var body: some View {
        Group {
            if let phaseContent {
                if let image = loadedImage {
                    phaseContent(.success(Self.swiftUIImage(from: image)))
                } else if loadFailed {
                    phaseContent(.failure(URLError(.badServerResponse)))
                } else {
                    phaseContent(.empty)
                }
            } else {
                if let image = loadedImage {
                    Self.swiftUIImage(from: image)
                        .resizable()
                        .aspectRatio(contentMode: .fill)
                } else {
                    placeholder()
                }
            }
        }
        .onAppear { startLoad() }
        .onDisappear { cancelLoad() }
    }

    private static func swiftUIImage(from image: PlatformImage) -> Image {
        #if canImport(UIKit)
            return Image(uiImage: image)
        #elseif canImport(AppKit)
            return Image(nsImage: image)
        #endif
    }

    // MARK: - Loading

    private func startLoad() {
        guard loadedImage == nil, let url else { return }
        let key = url.absoluteString

        loadTask = Task {
            if let cached = await ImageCacheStore.shared.image(for: key) {
                await MainActor.run { loadedImage = cached }
                return
            }

            if let image = await download(url: url) {
                await ImageCacheStore.shared.store(image, for: key)
                await MainActor.run { loadedImage = image }
                return
            }

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

    private func download(url: URL) async -> PlatformImage? {
        do {
            let (data, response) = try await URLSession.shared.data(from: url)
            guard let httpResponse = response as? HTTPURLResponse,
                  (200 ... 299).contains(httpResponse.statusCode)
            else {
                return nil
            }
            return PlatformImage(data: data)
        } catch {
            return nil
        }
    }
}

// MARK: - Phase-based initializer (AsyncImage-compatible API)

public extension CachedAsyncImage where Placeholder == EmptyView {
    /// Creates a cached async image view using an AsyncImage-style phase closure.
    /// - Parameters:
    ///   - url: The remote image URL to load.
    ///   - content: A closure receiving a ``CachedAsyncImagePhase`` value.
    init<Content: View>(
        url: URL?,
        @ViewBuilder content: @escaping (CachedAsyncImagePhase) -> Content
    ) {
        self.url = url
        placeholder = { EmptyView() }
        phaseContent = { phase in AnyView(content(phase)) }
    }
}
