import BayitCore
import Foundation

/// Probes a random sample of stream URLs to check health.
/// All probing happens client-side; stream URLs never leave the device.
public actor BYOCHealthSampler {
    private let logger = BayitLogger(category: "BYOCHealthSampler")
    private let session: URLSession
    private let sampleSize: Int
    private let probeTimeout: TimeInterval

    public init(
        sampleSize: Int = 50,
        probeTimeout: TimeInterval = 5,
        session: URLSession? = nil
    ) {
        self.sampleSize = sampleSize
        self.probeTimeout = probeTimeout
        let config = URLSessionConfiguration.ephemeral
        config.timeoutIntervalForRequest = probeTimeout
        self.session = session ?? URLSession(configuration: config)
    }

    /// Probe a sample of channels and return health results.
    public func probe(channels: [BYOCChannel]) async -> HealthSampleResult {
        guard !channels.isEmpty else {
            return HealthSampleResult()
        }
        let indices = selectSample(count: channels.count)
        var alive = 0
        var deadIndices: [Int] = []

        await withTaskGroup(of: (Int, Bool).self) { group in
            for idx in indices {
                let url = channels[idx].streamURL
                group.addTask { [self] in
                    let isAlive = await self.probeURL(url)
                    return (idx, isAlive)
                }
            }
            for await (idx, isAlive) in group {
                if isAlive {
                    alive += 1
                } else {
                    deadIndices.append(idx)
                }
            }
        }

        let result = HealthSampleResult(
            tested: indices.count,
            alive: alive,
            deadIndices: deadIndices
        )
        logger.info(
            "Health sample complete",
            context: [
                "tested": "\(result.tested)",
                "alive": "\(result.alive)",
            ]
        )
        return result
    }

    private func probeURL(_ url: URL) async -> Bool {
        var request = URLRequest(url: url)
        request.httpMethod = "HEAD"
        request.timeoutInterval = probeTimeout

        do {
            let (_, response) = try await session.data(for: request)
            guard let http = response as? HTTPURLResponse else {
                return false
            }
            return (200 ... 399).contains(http.statusCode)
        } catch {
            return false
        }
    }

    private func selectSample(count: Int) -> [Int] {
        let size = min(sampleSize, count)
        var indices = Array(0 ..< count)
        indices.shuffle()
        return Array(indices.prefix(size))
    }
}
