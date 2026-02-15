package tv.bayit.plus.core.testing

import tv.bayit.plus.core.common.BayitResult
import tv.bayit.plus.core.model.TriviaQuestion
import tv.bayit.plus.core.model.TriviaAnswer
import tv.bayit.plus.core.model.TriviaSession

/**
 * Fake implementation of TriviaRepository for testing.
 */
class FakeTriviaRepository {

    private val questions = mutableListOf<TriviaQuestion>()
    private val sessions = mutableMapOf<String, TriviaSession>()
    private val userAnswers = mutableMapOf<String, TriviaAnswer>()
    private var score: Int = 0

    var shouldReturnError = false
    var errorMessage = "Trivia repository error"

    suspend fun getQuestions(contentId: String): BayitResult<List<TriviaQuestion>> {
        return if (shouldReturnError) {
            BayitResult.Error(Exception(errorMessage))
        } else {
            BayitResult.Success(questions.toList())
        }
    }

    suspend fun getSession(contentId: String): BayitResult<TriviaSession> {
        return if (shouldReturnError) {
            BayitResult.Error(Exception(errorMessage))
        } else {
            val session = sessions[contentId] ?: TriviaSession(
                id = "session-${System.currentTimeMillis()}",
                contentId = contentId,
                questions = questions,
                score = score,
                totalQuestions = questions.size
            )
            BayitResult.Success(session)
        }
    }

    suspend fun submitAnswer(questionId: String, selectedIndex: Int): BayitResult<TriviaAnswer> {
        return if (shouldReturnError) {
            BayitResult.Error(Exception(errorMessage))
        } else {
            val question = questions.find { it.id == questionId }
            val isCorrect = question?.correctIndex == selectedIndex
            if (isCorrect) score++

            val answer = TriviaAnswer(
                questionId = questionId,
                selectedIndex = selectedIndex,
                isCorrect = isCorrect,
                timeTaken = null
            )
            userAnswers[questionId] = answer
            BayitResult.Success(answer)
        }
    }

    suspend fun getScore(): BayitResult<Int> {
        return if (shouldReturnError) {
            BayitResult.Error(Exception(errorMessage))
        } else {
            BayitResult.Success(score)
        }
    }

    fun setQuestions(questionsList: List<TriviaQuestion>) {
        questions.clear()
        questions.addAll(questionsList)
    }

    fun setSession(contentId: String, session: TriviaSession) {
        sessions[contentId] = session
    }

    fun setScore(newScore: Int) {
        score = newScore
    }

    fun clear() {
        questions.clear()
        sessions.clear()
        userAnswers.clear()
        score = 0
        shouldReturnError = false
    }
}
