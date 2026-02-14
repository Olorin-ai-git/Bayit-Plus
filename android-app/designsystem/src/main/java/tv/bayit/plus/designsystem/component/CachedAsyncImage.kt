package tv.bayit.plus.designsystem.component

import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.layout.ContentScale
import coil3.compose.AsyncImage
import coil3.compose.AsyncImagePainter

@Composable
fun CachedAsyncImage(
    url: String?,
    contentDescription: String?,
    modifier: Modifier = Modifier,
    contentScale: ContentScale = ContentScale.Crop,
    placeholder: @Composable (() -> Unit)? = null,
) {
    if (url == null) {
        placeholder?.invoke()
        return
    }

    Box(modifier = modifier) {
        AsyncImage(
            model = url,
            contentDescription = contentDescription,
            modifier = Modifier.fillMaxSize(),
            contentScale = contentScale,
            onState = { state ->
                when (state) {
                    is AsyncImagePainter.State.Loading -> {}
                    is AsyncImagePainter.State.Error -> {}
                    else -> {}
                }
            },
        )
    }
}
