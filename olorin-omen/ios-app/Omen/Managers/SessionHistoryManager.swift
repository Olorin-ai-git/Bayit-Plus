import Foundation
import Combine

/// Manages session history and recordings
class SessionHistoryManager: ObservableObject {
    // MARK: - Published State
    @Published var sessions: [TranslationSession] = []

    // MARK: - Storage
    private let storageKey = "translationSessions"
    private let maxStoredSessions = 50

    // MARK: - Initialization
    init() {
        loadSessions()
    }

    // MARK: - Session Management
    func createSession() -> TranslationSession {
        let session = TranslationSession(
            id: UUID(),
            startTime: Date(),
            originalLanguage: "English",
            targetLanguage: "Spanish"
        )
        return session
    }

    func saveSession(_ session: TranslationSession) {
        sessions.insert(session, at: 0)

        // Limit stored sessions
        if sessions.count > maxStoredSessions {
            sessions = Array(sessions.prefix(maxStoredSessions))
        }

        persistSessions()
    }

    func deleteSession(_ session: TranslationSession) {
        sessions.removeAll { $0.id == session.id }
        persistSessions()
    }

    func deleteAllSessions() {
        sessions.removeAll()
        persistSessions()
    }

    // MARK: - Persistence
    private func loadSessions() {
        guard let data = UserDefaults.standard.data(forKey: storageKey),
              let decoded = try? JSONDecoder().decode([TranslationSession].self, from: data) else {
            return
        }

        sessions = decoded
    }

    private func persistSessions() {
        guard let encoded = try? JSONEncoder().encode(sessions) else {
            return
        }

        UserDefaults.standard.set(encoded, forKey: storageKey)
    }
}

// MARK: - Translation Session Model
struct TranslationSession: Codable, Identifiable {
    let id: UUID
    let startTime: Date
    var endTime: Date?
    let originalLanguage: String
    let targetLanguage: String
    var transcripts: [TranscriptEntry] = []

    var duration: TimeInterval {
        guard let end = endTime else {
            return Date().timeIntervalSince(startTime)
        }
        return end.timeIntervalSince(startTime)
    }

    var formattedDuration: String {
        let minutes = Int(duration) / 60
        let seconds = Int(duration) % 60
        return String(format: "%d:%02d", minutes, seconds)
    }

    mutating func addTranscript(original: String, translation: String) {
        let entry = TranscriptEntry(
            timestamp: Date(),
            originalText: original,
            translatedText: translation
        )
        transcripts.append(entry)
    }

    mutating func endSession() {
        endTime = Date()
    }
}

// MARK: - Transcript Entry
struct TranscriptEntry: Codable, Identifiable {
    let id: UUID
    let timestamp: Date
    let originalText: String
    let translatedText: String

    init(timestamp: Date, originalText: String, translatedText: String) {
        self.id = UUID()
        self.timestamp = timestamp
        self.originalText = originalText
        self.translatedText = translatedText
    }
}
