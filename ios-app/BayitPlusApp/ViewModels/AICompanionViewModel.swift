import BayitCore
import Foundation
import Observation

/// Manages AI companion sidebar state: context, quiz, and vocabulary tabs.
@MainActor
@Observable
final class AICompanionViewModel {
    enum Tab: String, CaseIterable {
        case context
        case quiz
        case vocabulary

        var localizationKey: String {
            switch self {
            case .context: return "aiCompanion.context"
            case .quiz: return "aiCompanion.quiz"
            case .vocabulary: return "aiCompanion.vocabulary"
            }
        }
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

    private let companionRepository: any CompanionRepository
    private let talkBackRepository: any TalkBackRepository
    private let logger = BayitLogger(category: "AICompanionViewModel")

    init(companionRepository: any CompanionRepository, talkBackRepository: any TalkBackRepository) {
        self.companionRepository = companionRepository
        self.talkBackRepository = talkBackRepository
    }

    func selectTab(_ tab: Tab) {
        selectedTab = tab
    }

    func loadContent(contentId: String, language: String = "en") async {
        isContextLoading = true
        error = nil

        do {
            let response = try await companionRepository.fetchContext(
                contentId: contentId,
                language: language
            )
            contextText = response.context
            topics = response.topics ?? []
            relatedLinks = response.relatedLinks ?? []
            logger.info("Companion context loaded", context: [
                "contentId": contentId,
                "topicCount": String(topics.count),
                "linkCount": String(relatedLinks.count),
            ])
        } catch {
            self.error = "Failed to load companion content"
            logger.error("Companion load failed", error: error)
        }

        isContextLoading = false
    }

    func loadQuiz(contentId: String, language: String = "en") async {
        isQuizLoading = true
        error = nil

        do {
            let response = try await companionRepository.fetchQuiz(
                contentId: contentId,
                language: language
            )
            questions = response.questions ?? []
            logger.info("Companion quiz loaded", context: [
                "contentId": contentId,
                "questionCount": String(questions.count),
            ])
        } catch {
            self.error = "Failed to load quiz"
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

    func loadVocabulary(profileId: String) async {
        isVocabularyLoading = true

        do {
            let items = try await talkBackRepository.fetchVocabulary(profileId: profileId)
            words = items.map { item in
                VocabularyWord(
                    id: item.word,
                    term: item.word,
                    definition: item.translation,
                    language: "he",
                    pronunciation: item.transliteration
                )
            }
            logger.info("Vocabulary loaded", context: [
                "profileId": profileId,
                "count": String(items.count),
            ])
        } catch {
            logger.error("Vocabulary load failed", error: error)
        }

        isVocabularyLoading = false
    }
}
