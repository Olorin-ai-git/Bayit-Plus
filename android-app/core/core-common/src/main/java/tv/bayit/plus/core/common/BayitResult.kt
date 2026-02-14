package tv.bayit.plus.core.common

sealed interface BayitResult<out T> {
    data class Success<T>(val data: T) : BayitResult<T>
    data class Error(val exception: Throwable, val message: String? = null) : BayitResult<Nothing>
    data object Loading : BayitResult<Nothing>
}

fun <T> BayitResult<T>.getOrNull(): T? = when (this) {
    is BayitResult.Success -> data
    else -> null
}

fun <T> BayitResult<T>.getOrThrow(): T = when (this) {
    is BayitResult.Success -> data
    is BayitResult.Error -> throw exception
    is BayitResult.Loading -> throw IllegalStateException("Result is still loading")
}

suspend fun <T> runCatchingResult(block: suspend () -> T): BayitResult<T> =
    try {
        BayitResult.Success(block())
    } catch (e: Exception) {
        BayitResult.Error(e, e.message)
    }

fun <T, R> BayitResult<T>.map(transform: (T) -> R): BayitResult<R> = when (this) {
    is BayitResult.Success -> BayitResult.Success(transform(data))
    is BayitResult.Error -> this
    is BayitResult.Loading -> BayitResult.Loading
}
