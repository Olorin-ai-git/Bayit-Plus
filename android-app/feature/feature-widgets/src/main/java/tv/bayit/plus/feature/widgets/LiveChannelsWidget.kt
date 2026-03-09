package tv.bayit.plus.feature.widgets

import android.content.Context
import androidx.compose.runtime.Composable
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.glance.GlanceId
import androidx.glance.GlanceModifier
import androidx.glance.GlanceTheme
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
import androidx.glance.text.FontWeight
import androidx.glance.text.Text
import androidx.glance.text.TextStyle

class LiveChannelsWidget : GlanceAppWidget() {

    override suspend fun provideGlance(context: Context, id: GlanceId) {
        val dataProvider = WidgetDataProvider(kotlinx.serialization.json.Json { ignoreUnknownKeys = true })
        val isLoggedIn = dataProvider.isLoggedIn(context)
        val channels = if (isLoggedIn) dataProvider.getLiveChannels(context) else emptyList()

        provideContent {
            GlanceTheme {
                if (!isLoggedIn) {
                    LiveChannelsSignInPrompt()
                } else if (channels.isNotEmpty()) {
                    LiveChannelsContent(channels)
                } else {
                    EmptyLiveChannels()
                }
            }
        }
    }
}

@Composable
private fun LiveChannelsContent(channels: List<LiveChannelItem>) {
    Column(
        modifier = GlanceModifier
            .fillMaxSize()
            .background(GlanceTheme.colors.surface)
            .padding(12.dp),
    ) {
        Text(
            text = "Live Channels",
            style = TextStyle(
                fontWeight = FontWeight.Bold,
                fontSize = 14.sp,
                color = GlanceTheme.colors.onSurface,
            ),
        )
        Spacer(modifier = GlanceModifier.height(8.dp))
        channels.take(MAX_CHANNELS).forEach { channel ->
            LiveChannelRow(channel)
            Spacer(modifier = GlanceModifier.height(4.dp))
        }
    }
}

@Composable
private fun LiveChannelRow(channel: LiveChannelItem) {
    Row(
        modifier = GlanceModifier
            .fillMaxWidth()
            .padding(vertical = 2.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Column(modifier = GlanceModifier.defaultWeight()) {
            Text(
                text = channel.channelName,
                style = TextStyle(
                    fontSize = 12.sp,
                    fontWeight = FontWeight.Medium,
                    color = GlanceTheme.colors.onSurface,
                ),
                maxLines = 1,
            )
            if (channel.currentProgram != null) {
                Text(
                    text = channel.currentProgram,
                    style = TextStyle(
                        fontSize = 10.sp,
                        color = GlanceTheme.colors.secondary,
                    ),
                    maxLines = 1,
                )
            }
        }
    }
}

@Composable
private fun EmptyLiveChannels() {
    Box(
        modifier = GlanceModifier
            .fillMaxSize()
            .background(GlanceTheme.colors.surface)
            .padding(12.dp),
        contentAlignment = Alignment.Center,
    ) {
        Text(
            text = "No favorite channels set",
            style = TextStyle(
                fontSize = 12.sp,
                color = GlanceTheme.colors.secondary,
            ),
        )
    }
}

@Composable
private fun LiveChannelsSignInPrompt() {
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

private const val MAX_CHANNELS = 4

class LiveChannelsWidgetReceiver : GlanceAppWidgetReceiver() {
    override val glanceAppWidget: GlanceAppWidget = LiveChannelsWidget()
}
