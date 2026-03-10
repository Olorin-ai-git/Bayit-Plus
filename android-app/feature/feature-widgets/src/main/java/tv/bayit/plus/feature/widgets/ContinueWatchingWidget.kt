package tv.bayit.plus.feature.widgets

import android.content.Context
import android.net.Uri
import androidx.compose.runtime.Composable
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.glance.GlanceId
import androidx.glance.GlanceModifier
import androidx.glance.GlanceTheme
import androidx.glance.action.actionStartActivity
import androidx.glance.action.clickable
import androidx.glance.appwidget.GlanceAppWidget
import androidx.glance.appwidget.GlanceAppWidgetReceiver
import androidx.glance.appwidget.provideContent
import androidx.glance.background
import androidx.glance.layout.Alignment
import androidx.glance.layout.Box
import androidx.glance.layout.Column
import androidx.glance.layout.Row
import androidx.glance.layout.Spacer
import androidx.glance.layout.fillMaxSize
import androidx.glance.layout.fillMaxWidth
import androidx.glance.layout.height
import androidx.glance.layout.padding
import androidx.glance.layout.width
import androidx.glance.text.FontWeight
import androidx.glance.text.Text
import androidx.glance.text.TextStyle
import dagger.hilt.EntryPoint
import dagger.hilt.InstallIn
import dagger.hilt.android.EntryPointAccessors
import dagger.hilt.components.SingletonComponent
import tv.bayit.plus.core.common.i18n.BayitStringProvider

@EntryPoint
@InstallIn(SingletonComponent::class)
interface ContinueWatchingWidgetEntryPoint {
    fun bayitStringProvider(): BayitStringProvider
}

class ContinueWatchingWidget : GlanceAppWidget() {

    override suspend fun provideGlance(context: Context, id: GlanceId) {
        val dataProvider = WidgetDataProvider(kotlinx.serialization.json.Json { ignoreUnknownKeys = true })
        val entryPoint = EntryPointAccessors.fromApplication(
            context.applicationContext,
            ContinueWatchingWidgetEntryPoint::class.java,
        )
        val sp = entryPoint.bayitStringProvider()
        val isLoggedIn = dataProvider.isLoggedIn(context)
        val items = if (isLoggedIn) dataProvider.getContinueWatching(context) else emptyList()

        provideContent {
            GlanceTheme {
                if (!isLoggedIn) {
                    ContinueWatchingSignInPrompt(sp)
                } else if (items.isNotEmpty()) {
                    ContinueWatchingContent(items, sp)
                } else {
                    EmptyContinueWatching(sp)
                }
            }
        }
    }
}

@Composable
private fun ContinueWatchingContent(items: List<ContinueWatchingItem>, sp: BayitStringProvider) {
    Column(
        modifier = GlanceModifier
            .fillMaxSize()
            .background(GlanceTheme.colors.surface)
            .padding(12.dp),
    ) {
        Text(
            text = sp.string("home.continueWatching"),
            style = TextStyle(
                fontWeight = FontWeight.Bold,
                fontSize = 14.sp,
                color = GlanceTheme.colors.onSurface,
            ),
        )
        Spacer(modifier = GlanceModifier.height(8.dp))
        items.take(MAX_ITEMS).forEach { item ->
            ContinueWatchingRow(item)
            Spacer(modifier = GlanceModifier.height(4.dp))
        }
    }
}

@Composable
private fun ContinueWatchingRow(item: ContinueWatchingItem) {
    Row(
        modifier = GlanceModifier
            .fillMaxWidth()
            .padding(vertical = 2.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Column(modifier = GlanceModifier.defaultWeight()) {
            Text(
                text = item.title,
                style = TextStyle(
                    fontSize = 12.sp,
                    color = GlanceTheme.colors.onSurface,
                ),
                maxLines = 1,
            )
            Text(
                text = "${(item.progressPercent * PERCENT_MULTIPLIER).toInt()}%",
                style = TextStyle(
                    fontSize = 10.sp,
                    color = GlanceTheme.colors.secondary,
                ),
            )
        }
    }
}

@Composable
private fun EmptyContinueWatching(sp: BayitStringProvider) {
    Box(
        modifier = GlanceModifier
            .fillMaxSize()
            .background(GlanceTheme.colors.surface)
            .padding(12.dp),
        contentAlignment = Alignment.Center,
    ) {
        Text(
            text = sp.string("widgets.startWatching"),
            style = TextStyle(
                fontSize = 12.sp,
                color = GlanceTheme.colors.secondary,
            ),
        )
    }
}

@Composable
private fun ContinueWatchingSignInPrompt(sp: BayitStringProvider) {
    Box(
        modifier = GlanceModifier
            .fillMaxSize()
            .background(GlanceTheme.colors.surface)
            .padding(12.dp),
        contentAlignment = Alignment.Center,
    ) {
        Text(
            text = sp.string("widgets.signInToBayit"),
            style = TextStyle(
                fontSize = 14.sp,
                color = GlanceTheme.colors.primary,
            ),
        )
    }
}

private const val MAX_ITEMS = 4
private const val PERCENT_MULTIPLIER = 100

class ContinueWatchingWidgetReceiver : GlanceAppWidgetReceiver() {
    override val glanceAppWidget: GlanceAppWidget = ContinueWatchingWidget()
}
