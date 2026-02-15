package tv.bayit.plus.core.testing

import tv.bayit.plus.core.common.BayitResult

/**
 * Fake implementation of TriviaRepository for testing.
 */
class FakeTriviaRepository {

    private val questions = mutableListOf<Any>()
    private val userAnswers = mutableMapOf<String, String>()
    private var score: Int = 0

    var shouldReturnError = false
    var errorMessage = "Trivia repository error"

    suspend fun getQuestions(contentId: String): BayitResult<List<Any>> {
        return if (shouldReturnError) {
            BayitResult.Error(Exception(errorMessage))
        } else {
            BayitResult.Success(questions.toList())
        }
    }

    suspend fun submitAnswer(questionId: String, answerId: String): BayitResult<Boolean> {
        return if (shouldReturnError) {
            BayitResult.Error(Exception(errorMessage))
        } else {
            userAnswers[questionId] = answerId
            val isCorrect = answerId == "correct-answer"
            if (isCorrect) score++
            BayitResult.Success(isCorrect)
        }
    }

    suspend fun getScore(): BayitResult<Int> {
        return if (shouldReturnError) {
            BayitResult.Error(Exception(errorMessage))
        } else {
            BayitResult.Success(score)
        }
    }

    fun setQuestions(questionsList: List<Any>) {
        questions.clear()
        questions.addAll(questionsList)
    }

    fun setScore(newScore: Int) {
        score = newScore
    }

    fun clear() {
        questions.clear()
        userAnswers.clear()
        score = 0
        shouldReturnError = false
    }
}
