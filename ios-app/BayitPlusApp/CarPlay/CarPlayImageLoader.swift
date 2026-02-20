import BayitCore
import CarPlay
import Foundation
import UIKit

/// Loads and caches artwork images for CarPlay list items.
///
/// Images are resized to CarPlay-appropriate dimensions and cached in memory
/// to avoid redundant network requests during tab navigation.
@MainActor
final class CarPlayImageLoader {

    static let shared = CarPlayImageLoader()

    private let cache = NSCache<NSURL, UIImage>()
    private let logger = BayitLogger(category: "CarPlayImage")
    private let listItemSize = CGSize(width: 40, height: 40)
    private let session: URLSession

    private init() {
        let config = URLSessionConfiguration.default
        config.urlCache = URLCache(
            memoryCapacity: 10 * 1024 * 1024,
            diskCapacity: 0
        )
        self.session = URLSession(configuration: config)
        cache.countLimit = 100
    }

    /// Load an image from a URL, resize it for CarPlay list items, and cache it.
    func loadImage(from url: URL) async -> UIImage? {
        if let cached = cache.object(forKey: url as NSURL) {
            return cached
        }

        do {
            let (data, _) = try await session.data(from: url)
            guard let original = UIImage(data: data) else {
                logger.debug("Failed to decode image", context: ["url": url.lastPathComponent])
                return nil
            }

            let resized = resizeImage(original, to: listItemSize)
            cache.setObject(resized, forKey: url as NSURL)
            return resized
        } catch {
            logger.debug("Failed to load image", context: ["url": url.lastPathComponent])
            return nil
        }
    }

    private func resizeImage(_ image: UIImage, to size: CGSize) -> UIImage {
        let scale: CGFloat = 2.0
        let pixelSize = CGSize(width: size.width * scale, height: size.height * scale)
        let renderer = UIGraphicsImageRenderer(size: pixelSize)
        return renderer.image { _ in
            image.draw(in: CGRect(origin: .zero, size: pixelSize))
        }
    }
}
