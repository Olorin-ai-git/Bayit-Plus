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
import dagger.hilt.EntryPoint
import dagger.hilt.InstallIn
import dagger.hilt.android.EntryPointAccessors
import dagger.hilt.components.SingletonComponent
import tv.bayit.plus.core.common.i18n.BayitStringProvider

@EntryPoint
@InstallIn(SingletonComponent::class)
interface LiveChannelsWidgetEntryPoint {
    fun bayitStringProvider(): BayitStringProvider
}

class LiveChannelsWidget : GlanceAppWidget() {

    override suspend fun provideGlance(context: Context, id: GlanceId) {
        val dataProvider = WidgetDataProvider(kotlinx.serialization.json.Json { ignoreUnknownKeys = true })
        val entryPoint = EntryPointAccessors.fromApplication(
            context.applicationContext,
            LiveChannelsWidgetEntryPoint::class.java,
        )
        val sp = entryPoint.bayitStringProvider()
        val isLoggedIn = dataProvider.isLoggedIn(context)
        val channels = if (isLoggedIn) dataProvider.getLiveChannels(context) else emptyList()

        provideContent {
            GlanceTheme {
                if (!isLoggedIn) {
                    LiveChannelsSignInPrompt(sp)
                } else if (channels.isNotEmpty()) {
                    LiveChannelsContent(channels, sp)
                } else {
                    EmptyLiveChannels(sp)
                }
            }
        }
    }
}

@Composable
private fun LiveChannelsContent(channels: List<LiveChannelItem>, sp: BayitStringProvider) {
    Column(
        modifier = GlanceModifier
            .fillMaxSize()
            .background(GlanceTheme.colors.surface)
            .padding(12.dp),
    ) {
        Text(
            text = sp.string("widgets.liveChannels"),
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
private fun EmptyLiveChannels(sp: BayitStringProvider) {
    Box(
        modifier = GlanceModifier
            .fillMaxSize()
            .background(GlanceTheme.colors.surface)
            .padding(12.dp),
        contentAlignment = Alignment.Center,
    ) {
        Text(
            text = sp.string("widgets.noFavoriteChannels"),
            style = TextStyle(
                fontSize = 12.sp,
                color = GlanceTheme.colors.secondary,
            ),
        )
    }
}

@Composable
private fun LiveChannelsSignInPrompt(sp: BayitStringProvider) {
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

private const val MAX_CHANNELS = 4

class LiveChannelsWidgetReceiver : GlanceAppWidgetReceiver() {
    override val glanceAppWidget: GlanceAppWidget = LiveChannelsWidget()
}
