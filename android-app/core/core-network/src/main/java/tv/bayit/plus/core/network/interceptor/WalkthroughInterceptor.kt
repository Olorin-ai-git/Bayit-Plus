package tv.bayit.plus.core.network.interceptor

import okhttp3.Interceptor
import okhttp3.Response
import tv.bayit.plus.core.network.WalkthroughTokenProvider
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class WalkthroughInterceptor @Inject constructor(
    private val tokenProvider: WalkthroughTokenProvider,
) : Interceptor {

    override fun intercept(chain: Interceptor.Chain): Response {
        val originalRequest = chain.request()

        val token = tokenProvider.getActiveToken()
        val request = if (token != null) {
            originalRequest.newBuilder()
                .header(WALKTHROUGH_HEADER, token)
                .build()
        } else {
            originalRequest
        }

        return chain.proceed(request)
    }

    companion object {
        const val WALKTHROUGH_HEADER = "X-Walkthrough"
    }
}
