import BayitCore
import Foundation
import Observation

/// ViewModel for the Trivia/Quiz system - manages quiz loading, answer selection,
/// scoring, and result submission with tracked answer history.
@MainActor
@Observable
final class TriviaViewModel {
    private(set) var quiz: QuizResponse?
    private(set) var currentQuestionIndex = 0
    private(set) var selectedAnswer: Int?
    private(set) var score = 0
    private(set) var isAnswered = false
    private(set) var result: QuizResult?
    private(set) var isLoading = false
    private(set) var error: String?
    private(set) var preferences: TriviaPreferences?

    /// Tracks each answer the user selected per question index.
    private var answerHistory: [Int] = []
    private let repository: any TriviaRepository
    private let logger = BayitLogger(category: "Trivia")
    private let answerAdvanceDelay: Duration = .milliseconds(300)

    var currentQuestion: QuizQuestion? {
        guard let quiz, currentQuestionIndex < quiz.questions.count else { return nil }
        return quiz.questions[currentQuestionIndex]
    }

    var totalQuestions: Int { quiz?.questions.count ?? 0 }
    var isLastQuestion: Bool { currentQuestionIndex >= totalQuestions - 1 }
    var isComplete: Bool { result != nil }

    init(repository: any TriviaRepository) {
        self.repository = repository
    }

    @MainActor
    func loadQuiz(contentId: String, profileId: String?) async {
        isLoading = true
        error = nil

        do {
            quiz = try await repository.fetchQuiz(contentId: contentId, profileId: profileId)
            currentQuestionIndex = 0
            selectedAnswer = nil
            score = 0
            result = nil
            isAnswered = false
            answerHistory = []
            logger.info("Quiz loaded", context: [
                "contentId": contentId,
                "questionCount": String(quiz?.questions.count ?? 0)
            ])
        } catch {
            if let message = error.userFriendlyMessage {
                self.error = message
            }
            logger.error("Failed to load quiz", error: error, context: [
                "contentId": contentId
            ])
        }

        isLoading = false
    }

    @MainActor
    func loadPreferences() async {
        do {
            preferences = try await repository.fetchPreferences()
        } catch {
            logger.error("Failed to load trivia preferences", error: error)
        }
    }

    @MainActor
    func selectAnswer(_ index: Int) {
        guard !isAnswered else { return }
        selectedAnswer = index
        isAnswered = true
        answerHistory.append(index)

        if let question = currentQuestion, index == question.correctIndex {
            score += 1
        }

        Task {
            try? await Task.sleep(for: answerAdvanceDelay)
            if !Task.isCancelled {
                await nextQuestion()
            }
        }
    }

    @MainActor
    func nextQuestion() async {
        if isLastQuestion {
            await submitQuiz()
        } else {
            currentQuestionIndex += 1
            selectedAnswer = nil
            isAnswered = false
        }
    }

    @MainActor
    private func submitQuiz() async {
        guard let quizId = quiz?.quizId else { return }
        isLoading = true

        do {
            let submission = QuizSubmission(quizId: quizId, answers: answerHistory)
            result = try await repository.submitQuiz(submission)
            logger.info("Quiz submitted", context: [
                "quizId": quizId,
                "score": String(result?.score ?? 0),
                "total": String(result?.total ?? 0)
            ])
        } catch {
            if let message = error.userFriendlyMessage {
                self.error = message
            }
            logger.error("Failed to submit quiz", error: error, context: [
                "quizId": quizId
            ])
        }

        isLoading = false
    }
}
