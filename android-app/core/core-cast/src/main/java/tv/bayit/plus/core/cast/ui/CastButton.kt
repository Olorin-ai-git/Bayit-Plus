package tv.bayit.plus.core.cast.ui

import androidx.compose.foundation.layout.size
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import androidx.compose.ui.viewinterop.AndroidView
import androidx.mediarouter.app.MediaRouteButton
import com.google.android.gms.cast.framework.CastButtonFactory

@Composable
fun CastButton(modifier: Modifier = Modifier) {
    AndroidView(
        factory = { context ->
            MediaRouteButton(context).also { button ->
                CastButtonFactory.setUpMediaRouteButton(context, button)
            }
        },
        modifier = modifier.size(48.dp),
    )
}
