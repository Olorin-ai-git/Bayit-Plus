package tv.bayit.plus.feature.onboarding

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ExperimentalLayoutApi
import androidx.compose.foundation.layout.FlowRow
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Switch
import androidx.compose.material3.SwitchDefaults
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.getValue
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import tv.bayit.plus.designsystem.component.GlassButton
import tv.bayit.plus.designsystem.component.GlassCard
import tv.bayit.plus.designsystem.component.GlassChip
import tv.bayit.plus.designsystem.theme.DesignTokens

private val LANGUAGE_CODES = listOf("en", "he", "fr", "es", "it", "bn", "hi", "ja", "ta", "zh")

private val GENRE_KEYS = listOf(
    "drama", "comedy", "action", "documentary", "kids", "thriller",
    "romance", "scifi", "horror", "music", "sports", "news",
)

@OptIn(ExperimentalLayoutApi::class)
@Composable
fun PersonalizationStepComposable(
    onDone: (languages: Set<String>, genres: Set<String>, hasChildren: Boolean) -> Unit,
    modifier: Modifier = Modifier,
) {
    var selectedLanguages by remember { mutableStateOf<Set<String>>(emptySet()) }
    var selectedGenres by remember { mutableStateOf<Set<String>>(emptySet()) }
    var hasChildren by remember { mutableStateOf(false) }

    Column(
        modifier = modifier
            .fillMaxSize()
            .verticalScroll(rememberScrollState())
            .padding(
                horizontal = DesignTokens.Spacing.xl,
                vertical = DesignTokens.Spacing.xxl,
            ),
        verticalArrangement = Arrangement.spacedBy(DesignTokens.Spacing.xl),
    ) {
        HeaderSection()
        LanguageSection(
            selectedLanguages = selectedLanguages,
            onToggle = { lang ->
                selectedLanguages = if (selectedLanguages.contains(lang)) {
                    selectedLanguages - lang
                } else {
                    selectedLanguages + lang
                }
            },
        )
        GenreSection(
            selectedGenres = selectedGenres,
            onToggle = { genre ->
                selectedGenres = if (selectedGenres.contains(genre)) {
                    selectedGenres - genre
                } else {
                    selectedGenres + genre
                }
            },
        )
        ChildrenToggle(
            hasChildren = hasChildren,
            onToggle = { hasChildren = it },
        )

        Spacer(modifier = Modifier.height(DesignTokens.Spacing.md))

        GlassButton(
            text = stringResource(R.string.personalization_done),
            onClick = { onDone(selectedLanguages, selectedGenres, hasChildren) },
            modifier = Modifier.fillMaxWidth(),
        )
    }
}

@Composable
private fun HeaderSection() {
    Column(
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.spacedBy(DesignTokens.Spacing.sm),
        modifier = Modifier.fillMaxWidth(),
    ) {
        Text(
            text = stringResource(R.string.personalization_title),
            style = MaterialTheme.typography.headlineSmall,
            color = DesignTokens.Colors.Text.primary,
            fontWeight = FontWeight.Bold,
            textAlign = TextAlign.Center,
        )
        Text(
            text = stringResource(R.string.personalization_subtitle),
            style = MaterialTheme.typography.bodyLarge,
            color = DesignTokens.Colors.Text.secondary,
            textAlign = TextAlign.Center,
        )
    }
}

@OptIn(ExperimentalLayoutApi::class)
@Composable
private fun LanguageSection(
    selectedLanguages: Set<String>,
    onToggle: (String) -> Unit,
) {
    Column(verticalArrangement = Arrangement.spacedBy(DesignTokens.Spacing.md)) {
        Text(
            text = stringResource(R.string.personalization_languages_label),
            style = MaterialTheme.typography.titleMedium,
            color = DesignTokens.Colors.Text.primary,
            fontWeight = FontWeight.Bold,
        )
        FlowRow(
            horizontalArrangement = Arrangement.spacedBy(DesignTokens.Spacing.sm),
            verticalArrangement = Arrangement.spacedBy(DesignTokens.Spacing.sm),
        ) {
            LANGUAGE_CODES.forEach { code ->
                GlassChip(
                    label = languageLabel(code),
                    isSelected = selectedLanguages.contains(code),
                    onClick = { onToggle(code) },
                )
            }
        }
    }
}

@OptIn(ExperimentalLayoutApi::class)
@Composable
private fun GenreSection(
    selectedGenres: Set<String>,
    onToggle: (String) -> Unit,
) {
    Column(verticalArrangement = Arrangement.spacedBy(DesignTokens.Spacing.md)) {
        Text(
            text = stringResource(R.string.personalization_genres_label),
            style = MaterialTheme.typography.titleMedium,
            color = DesignTokens.Colors.Text.primary,
            fontWeight = FontWeight.Bold,
        )
        FlowRow(
            horizontalArrangement = Arrangement.spacedBy(DesignTokens.Spacing.sm),
            verticalArrangement = Arrangement.spacedBy(DesignTokens.Spacing.sm),
        ) {
            GENRE_KEYS.forEach { genre ->
                GlassChip(
                    label = genreLabel(genre),
                    isSelected = selectedGenres.contains(genre),
                    onClick = { onToggle(genre) },
                )
            }
        }
    }
}

@Composable
private fun ChildrenToggle(hasChildren: Boolean, onToggle: (Boolean) -> Unit) {
    GlassCard(modifier = Modifier.fillMaxWidth()) {
        Row(
            verticalAlignment = Alignment.CenterVertically,
            modifier = Modifier.fillMaxWidth(),
        ) {
            Text(
                text = stringResource(R.string.personalization_children_label),
                style = MaterialTheme.typography.bodyLarge,
                color = DesignTokens.Colors.Text.primary,
                modifier = Modifier.weight(1f),
            )
            Switch(
                checked = hasChildren,
                onCheckedChange = onToggle,
                colors = SwitchDefaults.colors(
                    checkedTrackColor = DesignTokens.Colors.Primary.base,
                ),
            )
        }
    }
}

