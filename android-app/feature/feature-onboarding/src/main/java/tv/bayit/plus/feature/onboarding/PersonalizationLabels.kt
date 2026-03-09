package tv.bayit.plus.feature.onboarding

import androidx.compose.runtime.Composable
import androidx.compose.ui.res.stringResource

@Composable
internal fun languageLabel(code: String): String = when (code) {
    "en" -> stringResource(R.string.personalization_lang_en)
    "he" -> stringResource(R.string.personalization_lang_he)
    "fr" -> stringResource(R.string.personalization_lang_fr)
    "es" -> stringResource(R.string.personalization_lang_es)
    "it" -> stringResource(R.string.personalization_lang_it)
    "bn" -> stringResource(R.string.personalization_lang_bn)
    "hi" -> stringResource(R.string.personalization_lang_hi)
    "ja" -> stringResource(R.string.personalization_lang_ja)
    "ta" -> stringResource(R.string.personalization_lang_ta)
    "zh" -> stringResource(R.string.personalization_lang_zh)
    else -> code
}

@Composable
internal fun genreLabel(genre: String): String = when (genre) {
    "drama" -> stringResource(R.string.personalization_genre_drama)
    "comedy" -> stringResource(R.string.personalization_genre_comedy)
    "action" -> stringResource(R.string.personalization_genre_action)
    "documentary" -> stringResource(R.string.personalization_genre_documentary)
    "kids" -> stringResource(R.string.personalization_genre_kids)
    "thriller" -> stringResource(R.string.personalization_genre_thriller)
    "romance" -> stringResource(R.string.personalization_genre_romance)
    "scifi" -> stringResource(R.string.personalization_genre_scifi)
    "horror" -> stringResource(R.string.personalization_genre_horror)
    "music" -> stringResource(R.string.personalization_genre_music)
    "sports" -> stringResource(R.string.personalization_genre_sports)
    "news" -> stringResource(R.string.personalization_genre_news)
    else -> genre
}
