import BayitCore
import Foundation
import Observation

/// Manages AI companion sidebar state: context, quiz, and vocabulary tabs.
@MainActor
@Observable
final class AICompanionViewModel {
    enum Tab: String, CaseIterable {
        case context = "Context"
        case quiz = "Quiz"
        case vocabulary = "Vocabulary"
    }

    private(set) var selectedTab: Tab = .context
    private(set) var isContextLoading = false
    private(set) var isQuizLoading = false
    private(set) var isVocabularyLoading = false
    private(set) var error: String?

    /// Whether the currently selected tab is loading.
    var isLoading: Bool {
        switch selectedTab {
        case .context: return isContextLoading
        case .quiz: return isQuizLoading
        case .vocabulary: return isVocabularyLoading
        }
    }

    // Context tab
    private(set) var contextText: String?
    private(set) var topics: [CompanionTopic] = []
    private(set) var relatedLinks: [CompanionLink] = []

    // Quiz tab
    private(set) var questions: [QuizQuestion] = []
    private(set) var selectedAnswers: [String: Int] = [:]
    private(set) var showResults = false

    /// Vocabulary tab
    private(set) var words: [VocabularyWord] = []

    private let repository: any ChatRepository
    private let logger = BayitLogger(category: "AICompanionViewModel")

    init(repository: any ChatRepository) {
        self.repository = repository
    }

    func selectTab(_ tab: Tab) {
        selectedTab = tab
    }

    func loadContent(contentId: String) async {
        isContextLoading = true
        error = nil

        do {
            let request = ChatRequest(
                message: "companion_context",
                conversationId: nil,
                context: "companion:\(contentId)",
                language: nil
            )
            let response = try await repository.sendMessage(request)
            contextText = response.response
            logger.info("Companion context loaded", context: ["contentId": contentId])
        } catch {
            self.error = "Failed to load companion content"
            logger.error("Companion load failed", error: error)
        }

        isContextLoading = false
    }

    func loadQuiz(contentId: String) async {
        isQuizLoading = true

        do {
            let request = ChatRequest(
                message: "companion_quiz",
                conversationId: nil,
                context: "companion_quiz:\(contentId)",
                language: nil
            )
            let response = try await repository.sendMessage(request)
            contextText = response.response
            logger.info("Companion quiz loaded", context: ["contentId": contentId])
        } catch {
            logger.error("Quiz load failed", error: error)
        }

        isQuizLoading = false
    }

    func selectAnswer(questionId: String, answerIndex: Int) {
        selectedAnswers[questionId] = answerIndex
    }

    func submitQuiz() {
        showResults = true
    }

    func resetQuiz() {
        selectedAnswers = [:]
        showResults = false
    }

    func loadVocabulary(contentId: String) async {
        isVocabularyLoading = true

        do {
            let request = ChatRequest(
                message: "companion_vocabulary",
                conversationId: nil,
                context: "companion_vocab:\(contentId)",
                language: nil
            )
            let response = try await repository.sendMessage(request)
            contextText = response.response
            logger.info("Companion vocabulary loaded", context: ["contentId": contentId])
        } catch {
            logger.error("Vocabulary load failed", error: error)
        }

        isVocabularyLoading = false
    }
}
