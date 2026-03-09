package tv.bayit.plus.feature.widgets

import android.content.Context
import android.content.Intent
import android.net.Uri
import androidx.compose.runtime.Composable
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.glance.GlanceId
import androidx.glance.GlanceModifier
import androidx.glance.GlanceTheme
import androidx.glance.Image
import androidx.glance.ImageProvider
import androidx.glance.action.ActionParameters
import androidx.glance.action.actionParametersOf
import androidx.glance.action.actionStartActivity
import androidx.glance.action.clickable
import androidx.glance.appwidget.GlanceAppWidget
import androidx.glance.appwidget.GlanceAppWidgetReceiver
import androidx.glance.appwidget.action.actionSendBroadcast
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
import androidx.glance.layout.size
import androidx.glance.layout.width
import androidx.glance.text.FontWeight
import androidx.glance.text.Text
import androidx.glance.text.TextStyle
import androidx.glance.unit.ColorProvider

class NowPlayingWidget : GlanceAppWidget() {

    override suspend fun provideGlance(context: Context, id: GlanceId) {
        val dataProvider = WidgetDataProvider(kotlinx.serialization.json.Json { ignoreUnknownKeys = true })
        val isLoggedIn = dataProvider.isLoggedIn(context)
        val nowPlaying = if (isLoggedIn) dataProvider.getNowPlaying(context) else null

        provideContent {
            GlanceTheme {
                if (!isLoggedIn) {
                    SignInPrompt()
                } else if (nowPlaying != null) {
                    NowPlayingContent(nowPlaying)
                } else {
                    EmptyNowPlaying()
                }
            }
        }
    }
}

@Composable
private fun NowPlayingContent(data: NowPlayingData) {
    val deepLink = Uri.parse("bayitplus://player/${data.contentId}?type=${data.contentType}")
    Row(
        modifier = GlanceModifier
            .fillMaxSize()
            .background(GlanceTheme.colors.surface)
            .padding(12.dp)
            .clickable(actionStartActivity<android.app.Activity>()), // placeholder intent
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Column(modifier = GlanceModifier.defaultWeight()) {
            Text(
                text = data.title,
                style = TextStyle(
                    fontWeight = FontWeight.Bold,
                    fontSize = 14.sp,
                    color = GlanceTheme.colors.onSurface,
                ),
                maxLines = 1,
            )
            Spacer(modifier = GlanceModifier.height(2.dp))
            Text(
                text = data.subtitle,
                style = TextStyle(
                    fontSize = 12.sp,
                    color = GlanceTheme.colors.secondary,
                ),
                maxLines = 1,
            )
            Spacer(modifier = GlanceModifier.height(4.dp))
            val progress = if (data.durationMs > 0) {
                (data.positionMs.toFloat() / data.durationMs).coerceIn(0f, 1f)
            } else 0f
            Text(
                text = "${formatDuration(data.positionMs)} / ${formatDuration(data.durationMs)}",
                style = TextStyle(
                    fontSize = 10.sp,
                    color = GlanceTheme.colors.secondary,
                ),
            )
        }
    }
}

@Composable
private fun EmptyNowPlaying() {
    Box(
        modifier = GlanceModifier
            .fillMaxSize()
            .background(GlanceTheme.colors.surface)
            .padding(12.dp),
        contentAlignment = Alignment.Center,
    ) {
        Text(
            text = "Nothing playing",
            style = TextStyle(
                fontSize = 14.sp,
                color = GlanceTheme.colors.secondary,
            ),
        )
    }
}

@Composable
private fun SignInPrompt() {
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

private fun formatDuration(ms: Long): String {
    val totalSeconds = ms / MILLIS_PER_SECOND
    val minutes = totalSeconds / SECONDS_PER_MINUTE
    val seconds = totalSeconds % SECONDS_PER_MINUTE
    return "%d:%02d".format(minutes, seconds)
}

private const val MILLIS_PER_SECOND = 1000
private const val SECONDS_PER_MINUTE = 60

class NowPlayingWidgetReceiver : GlanceAppWidgetReceiver() {
    override val glanceAppWidget: GlanceAppWidget = NowPlayingWidget()
}
