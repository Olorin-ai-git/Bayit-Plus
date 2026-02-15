package tv.bayit.plus.core.common.result

/**
 * A discriminated union that encapsulates a successful outcome with a value of type [T]
 * or a failure with an error of type [BayitError].
 *
 * This replaces exceptions for expected failures and provides a Railway-Oriented Programming
 * approach for error handling across the Bayit+ Android app.
 */
sealed class BayitResult<out T> {
    data class Success<T>(val data: T) : BayitResult<T>()
    data class Failure(val error: BayitError) : BayitResult<Nothing>()

    val isSuccess: Boolean get() = this is Success
    val isFailure: Boolean get() = this is Failure

    fun getOrNull(): T? = when (this) {
        is Success -> data
        is Failure -> null
    }

    fun getOrThrow(): T = when (this) {
        is Success -> data
        is Failure -> throw error.toException()
    }

    fun getOrElse(defaultValue: @UnsafeVariance T): T = when (this) {
        is Success -> data
        is Failure -> defaultValue
    }

    inline fun <R> map(transform: (T) -> R): BayitResult<R> = when (this) {
        is Success -> Success(transform(data))
        is Failure -> this
    }

    inline fun <R> flatMap(transform: (T) -> BayitResult<R>): BayitResult<R> = when (this) {
        is Success -> transform(data)
        is Failure -> this
    }

    inline fun onSuccess(action: (T) -> Unit): BayitResult<T> {
        if (this is Success) action(data)
        return this
    }

    inline fun onFailure(action: (BayitError) -> Unit): BayitResult<T> {
        if (this is Failure) action(error)
        return this
    }

    companion object {
        fun <T> success(data: T): BayitResult<T> = Success(data)
        fun failure(error: BayitError): BayitResult<Nothing> = Failure(error)

        inline fun <T> runCatching(block: () -> T): BayitResult<T> = try {
            Success(block())
        } catch (e: Exception) {
            Failure(BayitError.Unknown(e.message ?: "Unknown error", e))
        }
    }
}

/**
 * Sealed hierarchy of errors that can occur in Bayit+ operations.
 */
sealed class BayitError {
    abstract val message: String
    abstract val cause: Throwable?

    data class Network(
        override val message: String,
        val statusCode: Int? = null,
        override val cause: Throwable? = null
    ) : BayitError()

    data class Authentication(
        override val message: String,
        override val cause: Throwable? = null
    ) : BayitError()

    data class Authorization(
        override val message: String,
        override val cause: Throwable? = null
    ) : BayitError()

    data class Validation(
        override val message: String,
        val field: String? = null,
        override val cause: Throwable? = null
    ) : BayitError()

    data class NotFound(
        override val message: String,
        val resourceId: String? = null,
        override val cause: Throwable? = null
    ) : BayitError()

    data class RateLimit(
        override val message: String,
        val retryAfterSeconds: Int? = null,
        override val cause: Throwable? = null
    ) : BayitError()

    data class Database(
        override val message: String,
        override val cause: Throwable? = null
    ) : BayitError()

    data class Serialization(
        override val message: String,
        override val cause: Throwable? = null
    ) : BayitError()

    data class Unknown(
        override val message: String,
        override val cause: Throwable? = null
    ) : BayitError()

    fun toException(): BayitException = BayitException(this)
}

class BayitException(val error: BayitError) : Exception(error.message, error.cause)
