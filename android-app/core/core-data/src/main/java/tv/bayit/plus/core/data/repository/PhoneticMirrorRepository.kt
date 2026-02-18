package tv.bayit.plus.core.data.repository

import tv.bayit.plus.core.common.BayitResult

/**
 * A Hebrew pronunciation practice phrase for V2V voice training.
 */
data class PracticePhrase(
    val phraseHe: String,
    val transliteration: String,
    val translation: String,
)

interface PhoneticMirrorRepository {
    suspend fun getPhoneticGuide(text: String, languageCode: String): BayitResult<Any>
    suspend fun getPronunciationAudio(text: String, languageCode: String): BayitResult<String>
    suspend fun submitPronunciationAttempt(text: String, audioData: ByteArray): BayitResult<Any>
    suspend fun getProgress(): BayitResult<Any>
    suspend fun getLessonPlan(languageCode: String): BayitResult<List<Any>>
    suspend fun fetchPhrases(
        profileId: String,
        difficulty: String,
        count: Int,
    ): BayitResult<List<PracticePhrase>>
}
