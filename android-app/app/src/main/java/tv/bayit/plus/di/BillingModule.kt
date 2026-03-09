package tv.bayit.plus.di

import android.content.Context
import dagger.Module
import dagger.Provides
import dagger.hilt.InstallIn
import dagger.hilt.android.qualifiers.ApplicationContext
import dagger.hilt.components.SingletonComponent
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import tv.bayit.plus.BuildConfig
import tv.bayit.plus.core.common.logging.BayitLogger
import tv.bayit.plus.core.data.billing.BillingManager
import tv.bayit.plus.core.data.billing.BillingProductConfig
import tv.bayit.plus.core.data.billing.BillingVerificationService
import javax.inject.Qualifier
import javax.inject.Singleton

@Qualifier
@Retention(AnnotationRetention.BINARY)
annotation class BillingScope

/**
 * Hilt module providing Google Play Billing dependencies.
 *
 * Product IDs come from BuildConfig, which reads from gradle.properties.
 */
@Module
@InstallIn(SingletonComponent::class)
object BillingModule {

    @Provides
    @Singleton
    fun provideBillingProductConfig(): BillingProductConfig =
        BillingProductConfig(
            monthlyProductId = BuildConfig.BILLING_PRODUCT_MONTHLY,
            yearlyProductId = BuildConfig.BILLING_PRODUCT_YEARLY,
        )

    @Provides
    @Singleton
    @BillingScope
    fun provideBillingCoroutineScope(): CoroutineScope =
        CoroutineScope(SupervisorJob() + Dispatchers.IO)

    @Provides
    @Singleton
    fun provideBillingManager(
        @ApplicationContext context: Context,
        config: BillingProductConfig,
        verificationService: BillingVerificationService,
        logger: BayitLogger,
        @BillingScope scope: CoroutineScope,
    ): BillingManager = BillingManager(
        context = context,
        config = config,
        verificationService = verificationService,
        logger = logger,
        scope = scope,
    )
}
