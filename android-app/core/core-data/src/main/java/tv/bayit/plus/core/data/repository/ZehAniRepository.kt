package tv.bayit.plus.core.data.repository

import tv.bayit.plus.core.common.BayitResult

interface ZehAniRepository {
    suspend fun identifyPerson(imageData: ByteArray): BayitResult<Any>
    suspend fun getPersonDetails(personId: String): BayitResult<Any>
    suspend fun getPersonFilmography(personId: String): BayitResult<List<Any>>
    suspend fun identifyFromTimestamp(mediaId: String, timestampMs: Long): BayitResult<List<Any>>
    suspend fun getRecognitionHistory(): BayitResult<List<Any>>
    suspend fun addContact(name: String, photoUri: String?): BayitResult<Unit>
    suspend fun deleteContact(contactId: String): BayitResult<Unit>
    suspend fun getContacts(): BayitResult<List<Any>>
    suspend fun submitFeedback(feedback: String, rating: Int): BayitResult<Unit>
    suspend fun shareIdentification(identificationId: String): BayitResult<Unit>
    suspend fun getIdentificationHistory(): BayitResult<List<Any>>
}
