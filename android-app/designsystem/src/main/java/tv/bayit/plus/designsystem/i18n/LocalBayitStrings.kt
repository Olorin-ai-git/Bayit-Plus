package tv.bayit.plus.designsystem.i18n

import androidx.compose.runtime.Composable
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.runtime.staticCompositionLocalOf
import tv.bayit.plus.core.common.i18n.BayitStringProvider

/** CompositionLocal for accessing the [BayitStringProvider] in Compose. */
val LocalBayitStrings = staticCompositionLocalOf<BayitStringProvider> {
    error("No BayitStringProvider provided. Wrap your composable tree with ProvideBayitStrings.")
}

/** Shorthand for accessing a localized string in Compose. */
@Composable
fun bayitString(key: String): String = LocalBayitStrings.current.string(key)

/** Shorthand with parameter interpolation ({{param}} syntax). */
@Composable
fun bayitString(key: String, params: Map<String, String>): String =
    LocalBayitStrings.current.string(key, params)

/** Provides [BayitStringProvider] to the Compose tree. */
@Composable
fun ProvideBayitStrings(
    provider: BayitStringProvider,
    content: @Composable () -> Unit,
) {
    CompositionLocalProvider(LocalBayitStrings provides provider) {
        content()
    }
}
