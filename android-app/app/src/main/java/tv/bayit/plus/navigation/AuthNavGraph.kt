package tv.bayit.plus.navigation

import android.app.Activity
import androidx.activity.compose.ManagedActivityResultLauncher
import androidx.activity.result.ActivityResult
import androidx.compose.runtime.MutableState
import androidx.compose.ui.platform.LocalContext
import androidx.fragment.app.FragmentActivity
import androidx.navigation.NavController
import androidx.navigation.NavGraphBuilder
import androidx.navigation.compose.composable
import androidx.navigation.toRoute
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.launch
import tv.bayit.plus.BuildConfig
import tv.bayit.plus.core.auth.BiometricAuthService
import tv.bayit.plus.core.auth.GoogleSignInHelper
import tv.bayit.plus.core.common.result.BayitError
import tv.bayit.plus.core.common.result.BayitResult
import tv.bayit.plus.feature.auth.login.LoginRoute
import tv.bayit.plus.feature.auth.tvlogin.TVLoginRoute
import tv.bayit.plus.feature.auth.payment.PaymentCancelledRoute
import tv.bayit.plus.feature.auth.payment.PaymentPendingRoute
import tv.bayit.plus.feature.auth.payment.PaymentSuccessRoute
import tv.bayit.plus.feature.auth.forgot.ForgotPasswordRoute
import tv.bayit.plus.feature.auth.register.RegisterRoute
import tv.bayit.plus.feature.auth.splash.SplashRoute
import tv.bayit.plus.feature.auth.subscription.SubscribeRoute
import tv.bayit.plus.feature.auth.subscription.SubscriptionGateRoute
import tv.bayit.plus.feature.profile.add.AddProfileRoute
import tv.bayit.plus.feature.profile.edit.EditProfileRoute
import tv.bayit.plus.feature.profile.selection.ProfileSelectionRoute
import tv.bayit.plus.feature.rewards.beta.BetaCreditsRoute
import android.content.Intent
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import tv.bayit.plus.designsystem.i18n.bayitString

fun NavGraphBuilder.authNavGraph(
    navController: NavController,
    googleSignInHelper: GoogleSignInHelper,
    biometricAuthService: BiometricAuthService,
    pendingGoogleCallback: MutableState<((String) -> Unit)?>,
    legacyGoogleSignInLauncher: ManagedActivityResultLauncher<Intent, ActivityResult>,
    coroutineScope: CoroutineScope,
) {
    composable<Route.Splash> {
        SplashRoute(
            onFinished = {
                if (BuildConfig.DEBUG) {
                    navController.navigate(Route.OnboardingIntro) {
                        popUpTo(Route.Splash) { inclusive = true }
                    }
                } else {
                    navController.navigate(Route.Home) {
                        popUpTo(Route.Splash) { inclusive = true }
                    }
                }
            },
        )
    }
    composable<Route.Login> {
        val context = androidx.compose.ui.platform.LocalContext.current
        val biometricTitle = bayitString("common.appName")
        val biometricSubtitle = bayitString("auth.biometricSignIn")
        LoginRoute(
            onNavigateToHome = {
                navController.navigate(Route.Home) {
                    popUpTo(Route.Login) { inclusive = true }
                }
            },
            onNavigateToRegister = { navController.navigate(Route.Register) },
            onNavigateToForgotPassword = { navController.navigate(Route.ForgotPassword) },
            onRequestGoogleSignIn = { onTokenReceived ->
                coroutineScope.launch {
                    val activity = context as? Activity ?: return@launch
                    val clientId = BuildConfig.GOOGLE_CLIENT_ID
                    when (val result = googleSignInHelper.signIn(activity, clientId)) {
                        is BayitResult.Success -> onTokenReceived(result.data)
                        is BayitResult.Failure -> {
                            val error = result.error
                            if (error is BayitError.Cancelled || error is BayitError.Configuration) {
                                onTokenReceived("")
                            } else {
                                pendingGoogleCallback.value = onTokenReceived
                                legacyGoogleSignInLauncher.launch(
                                    googleSignInHelper.createLegacySignInIntent(activity, clientId)
                                )
                            }
                        }
                    }
                }
            },
            onRequestBiometricSignIn = { onResult ->
                coroutineScope.launch {
                    val activity = context as? FragmentActivity ?: run { onResult(false); return@launch }
                    val result = biometricAuthService.authenticate(
                        activity = activity,
                        title = biometricTitle,
                        subtitle = biometricSubtitle,
                    )
                    onResult(result is BayitResult.Success)
                }
            },
        )
    }
    composable<Route.Register> {
        RegisterRoute(
            onNavigateToProfileSelection = {
                navController.navigate(Route.ProfileSelection) {
                    popUpTo(Route.Register) { inclusive = true }
                }
            },
            onNavigateToLogin = { navController.popBackStack() },
        )
    }
    composable<Route.ForgotPassword> {
        ForgotPasswordRoute(
            onNavigateBack = { navController.popBackStack() },
            onResetSent = { navController.popBackStack() },
        )
    }
    composable<Route.ProfileSelection> {
        ProfileSelectionRoute(
            onNavigateToHome = {
                navController.navigate(Route.Home) {
                    popUpTo(Route.ProfileSelection) { inclusive = true }
                }
            },
            onNavigateToAddProfile = { navController.navigate(Route.AddProfile) },
        )
    }
    composable<Route.AddProfile> {
        AddProfileRoute(
            onNavigateBack = { navController.popBackStack() },
            onProfileCreated = { navController.popBackStack() },
        )
    }
    composable<Route.EditProfile> {
        EditProfileRoute(
            onNavigateBack = { navController.popBackStack() },
            onProfileSaved = { navController.popBackStack() },
        )
    }
    composable<Route.TVLogin> { entry ->
        val route = entry.toRoute<Route.TVLogin>()
        TVLoginRoute(
            sessionId = route.sessionId,
            token = route.token,
            onNavigateToHome = {
                navController.navigate(Route.Home) {
                    popUpTo(0) { inclusive = true }
                }
            },
            onNavigateToLogin = { navController.navigate(Route.Login) },
        )
    }
    composable<Route.Subscribe> {
        SubscribeRoute(
            onSubscriptionComplete = {
                navController.navigate(Route.Home) {
                    popUpTo(Route.Subscribe) { inclusive = true }
                }
            },
            onNavigateBack = { navController.popBackStack() },
        )
    }
    composable<Route.SubscriptionGate> {
        SubscriptionGateRoute(
            onNavigateToSubscribe = { navController.navigate(Route.Subscribe) },
            onNavigateBack = { navController.popBackStack() },
        )
    }
    composable<Route.BetaCredits> {
        BetaCreditsRoute(onNavigateBack = { navController.popBackStack() })
    }
    composable<Route.PaymentSuccess> {
        PaymentSuccessRoute(onNavigateToHome = {
            navController.navigate(Route.Home) {
                popUpTo(Route.PaymentSuccess) { inclusive = true }
            }
        })
    }
    composable<Route.PaymentCancelled> {
        PaymentCancelledRoute(
            onNavigateToSubscribe = { navController.navigate(Route.Subscribe) },
            onNavigateBack = { navController.popBackStack() },
        )
    }
    composable<Route.PaymentPending> {
        PaymentPendingRoute(onNavigateToHome = {
            navController.navigate(Route.Home) {
                popUpTo(Route.PaymentPending) { inclusive = true }
            }
        })
    }
}
