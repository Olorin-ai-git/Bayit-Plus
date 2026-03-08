import Foundation

// MARK: - Thread-Safe VAD State

private final class VADState: @unchecked Sendable {
    private let lock = NSLock()
    private var _wordCount: Int = 0
    private var _threshold: TimeInterval

    init(defaultThreshold: TimeInterval) {
        _threshold = defaultThreshold
    }

    var wordCount: Int {
        lock.lock()
        defer { lock.unlock() }
        return _wordCount
    }

    var threshold: TimeInterval {
        lock.lock()
        defer { lock.unlock() }
        return _threshold
    }

    func update(wordCount: Int, threshold: TimeInterval) {
        lock.lock()
        defer { lock.unlock() }
        _wordCount = wordCount
        _threshold = threshold
    }

    func reset(to threshold: TimeInterval) {
        lock.lock()
        defer { lock.unlock() }
        _wordCount = 0
        _threshold = threshold
    }
}

// MARK: - Adaptive VAD Controller

/// Adjusts voice activity detection silence threshold based on utterance length.
///
/// Short utterances (<3 words) commit after a shorter silence (1.0s),
/// medium utterances (3-8 words) use moderate silence (2.0s),
/// and long utterances (>8 words) use the full threshold (3.5s).
public final class AdaptiveVADController: Sendable {
    private let shortThreshold: TimeInterval
    private let mediumThreshold: TimeInterval
    private let longThreshold: TimeInterval

    private let shortWordLimit: Int
    private let mediumWordLimit: Int

    private let state: VADState

    public init(
        shortThreshold: TimeInterval = 1.0,
        mediumThreshold: TimeInterval = 2.0,
        longThreshold: TimeInterval = 3.5,
        shortWordLimit: Int = 3,
        mediumWordLimit: Int = 8
    ) {
        self.shortThreshold = shortThreshold
        self.mediumThreshold = mediumThreshold
        self.longThreshold = longThreshold
        self.shortWordLimit = shortWordLimit
        self.mediumWordLimit = mediumWordLimit
        state = VADState(defaultThreshold: shortThreshold)
    }

    /// Current silence threshold based on most recent word count.
    public var currentThreshold: TimeInterval {
        state.threshold
    }

    /// Update with latest partial transcript from STT.
    /// Recalculates threshold based on word count.
    public func updateTranscript(_ partial: String) {
        let words = partial
            .split(whereSeparator: { $0.isWhitespace })
        let count = words.count
        let resolved = resolveThreshold(for: count)
        state.update(wordCount: count, threshold: resolved)
    }

    /// Check whether enough silence has passed to commit the transcript.
    public func shouldCommit(silenceDuration: TimeInterval) -> Bool {
        silenceDuration >= state.threshold
    }

    /// Reset state for a new voice interaction.
    public func reset() {
        state.reset(to: shortThreshold)
    }

    // MARK: - Private

    private func resolveThreshold(for wordCount: Int) -> TimeInterval {
        if wordCount < shortWordLimit {
            return shortThreshold
        } else if wordCount < mediumWordLimit {
            return mediumThreshold
        } else {
            return longThreshold
        }
    }
}
