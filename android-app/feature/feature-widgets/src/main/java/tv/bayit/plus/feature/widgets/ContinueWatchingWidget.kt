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

class ContinueWatchingWidget : GlanceAppWidget() {

    override suspend fun provideGlance(context: Context, id: GlanceId) {
        val dataProvider = WidgetDataProvider(kotlinx.serialization.json.Json { ignoreUnknownKeys = true })
        val isLoggedIn = dataProvider.isLoggedIn(context)
        val items = if (isLoggedIn) dataProvider.getContinueWatching(context) else emptyList()

        provideContent {
            GlanceTheme {
                if (!isLoggedIn) {
                    ContinueWatchingSignInPrompt()
                } else if (items.isNotEmpty()) {
                    ContinueWatchingContent(items)
                } else {
                    EmptyContinueWatching()
                }
            }
        }
    }
}

@Composable
private fun ContinueWatchingContent(items: List<ContinueWatchingItem>) {
    Column(
        modifier = GlanceModifier
            .fillMaxSize()
            .background(GlanceTheme.colors.surface)
            .padding(12.dp),
    ) {
        Text(
            text = "Continue Watching",
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
private fun EmptyContinueWatching() {
    Box(
        modifier = GlanceModifier
            .fillMaxSize()
            .background(GlanceTheme.colors.surface)
            .padding(12.dp),
        contentAlignment = Alignment.Center,
    ) {
        Text(
            text = "Start watching to see your progress",
            style = TextStyle(
                fontSize = 12.sp,
                color = GlanceTheme.colors.secondary,
            ),
        )
    }
}

@Composable
private fun ContinueWatchingSignInPrompt() {
    Box(
        modifier = GlanceModifier
            .fillMaxSize()
            .background(GlanceTheme.colors.surface)
            .padding(12.dp),
        contentAlignment = Alignment.Center,
    ) {
        Text(
            text = "Sign in to Bayit+",
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
