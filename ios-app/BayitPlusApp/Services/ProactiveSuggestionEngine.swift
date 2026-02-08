import BayitCore
import Foundation
import Observation

/// Engine that generates proactive voice suggestions based on time-of-day,
/// user context, and app state.
///
/// Evaluates contextual signals to produce relevant suggestions at appropriate
/// intervals. Enforces a configurable minimum interval between suggestions.
@Observable
final class ProactiveSuggestionEngine {

    // MARK: - Public State

    private(set) var currentSuggestion: ProactiveSuggestion?
    private(set) var isActive = false

    // MARK: - Private

    private let logger = BayitLogger(category: "ProactiveSuggestionEngine")
    private var lastSuggestionDate: Date?
    private var evaluationTask: Task<Void, Never>?
    private let minimumInterval: TimeInterval
    private let calendar = Calendar.current

    // MARK: - Init

    init(minimumInterval: TimeInterval = ProactiveSuggestionEngine.configuredMinimumInterval) {
        self.minimumInterval = minimumInterval
    }

    // MARK: - Configuration

    private static var configuredMinimumInterval: TimeInterval {
        if let value = ProcessInfo.processInfo.environment["PROACTIVE_MIN_INTERVAL_SECONDS"],
           let interval = TimeInterval(value) {
            return interval
        }
        return 300
    }

    // MARK: - Lifecycle

    @MainActor
    func start() {
        guard !isActive else { return }
        isActive = true
        logger.info("Proactive suggestion engine started")
        scheduleEvaluation()
    }

    @MainActor
    func stop() {
        evaluationTask?.cancel()
        evaluationTask = nil
        isActive = false
        currentSuggestion = nil
        logger.info("Proactive suggestion engine stopped")
    }

    @MainActor
    func dismissSuggestion() {
        currentSuggestion = nil
        logger.info("Suggestion dismissed by user")
    }

    @MainActor
    func evaluateNow() {
        guard canShowSuggestion() else { return }
        let suggestion = generateSuggestion()
        if let suggestion {
            currentSuggestion = suggestion
            lastSuggestionDate = Date()
            logger.info("Suggestion generated", context: [
                "type": suggestion.type?.rawValue ?? "unknown",
                "priority": suggestion.priority?.rawValue ?? "unknown"
            ])
        }
    }

    // MARK: - Private

    private func scheduleEvaluation() {
        evaluationTask?.cancel()
        evaluationTask = Task { [weak self] in
            while !Task.isCancelled {
                try? await Task.sleep(nanoseconds: UInt64(60 * 1_000_000_000))
                guard let self, !Task.isCancelled else { break }
                await MainActor.run {
                    self.evaluateNow()
                }
            }
        }
    }

    private func canShowSuggestion() -> Bool {
        guard isActive else { return false }
        if currentSuggestion != nil { return false }
        guard let lastDate = lastSuggestionDate else { return true }
        return Date().timeIntervalSince(lastDate) >= minimumInterval
    }

    private func generateSuggestion() -> ProactiveSuggestion? {
        let hour = calendar.component(.hour, from: Date())
        let weekday = calendar.component(.weekday, from: Date())

        if let timeSuggestion = timeBasedSuggestion(hour: hour, weekday: weekday) {
            return timeSuggestion
        }

        return contextBasedSuggestion()
    }

    private func timeBasedSuggestion(hour: Int, weekday: Int) -> ProactiveSuggestion? {
        let morningStart = 5
        let morningEnd = 9
        let eveningStart = 20
        let eveningEnd = 23
        let shabbatPrepStart = 15
        let shabbatPrepEnd = 18
        let isFriday = weekday == 6

        if hour >= morningStart && hour < morningEnd {
            return ProactiveSuggestion(
                id: UUID().uuidString,
                type: .timeBased,
                message: "Good morning! Ready for your morning content routine?",
                action: SuggestionAction(type: .navigate, payload: ["route": "morningRitual"]),
                priority: .medium,
                timestamp: Date().timeIntervalSince1970
            )
        }

        if isFriday && hour >= shabbatPrepStart && hour < shabbatPrepEnd {
            return ProactiveSuggestion(
                id: UUID().uuidString,
                type: .timeBased,
                message: "Shabbat Shalom! Get ready with curated Shabbat content.",
                action: SuggestionAction(type: .navigate, payload: ["route": "shabbat"]),
                priority: .high,
                timestamp: Date().timeIntervalSince1970
            )
        }

        if hour >= eveningStart && hour < eveningEnd {
            return ProactiveSuggestion(
                id: UUID().uuidString,
                type: .timeBased,
                message: "Wind down with tonight's trending picks.",
                action: SuggestionAction(type: .navigate, payload: ["route": "trending"]),
                priority: .low,
                timestamp: Date().timeIntervalSince1970
            )
        }

        return nil
    }

    private func contextBasedSuggestion() -> ProactiveSuggestion? {
        return ProactiveSuggestion(
            id: UUID().uuidString,
            type: .contextBased,
            message: "Discover something new with AI-powered search.",
            action: SuggestionAction(type: .navigate, payload: ["route": "llm-search"]),
            priority: .low,
            timestamp: Date().timeIntervalSince1970
        )
    }
}
