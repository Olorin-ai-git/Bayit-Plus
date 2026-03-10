package tv.bayit.plus.feature.zehani.movieinteractions

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.lazy.grid.GridCells
import androidx.compose.foundation.lazy.grid.items
import androidx.compose.foundation.lazy.grid.LazyVerticalGrid
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import tv.bayit.plus.core.model.zehani.InteractiveCharacter
import tv.bayit.plus.designsystem.component.CachedAsyncImage
import tv.bayit.plus.designsystem.component.GlassButton
import tv.bayit.plus.designsystem.component.GlassCard
import tv.bayit.plus.designsystem.component.GlassLoadingIndicator
import tv.bayit.plus.designsystem.component.GlassTopBar
import tv.bayit.plus.designsystem.theme.DesignTokens
import tv.bayit.plus.designsystem.i18n.bayitString

private const val GRID_COLUMNS = 2
private val CHARACTER_IMAGE_SIZE = 80.dp

@Composable
fun MovieCharactersRoute(
    onNavigateToDialogue: (contentId: String, characterName: String) -> Unit,
    onNavigateBack: () -> Unit,
    modifier: Modifier = Modifier,
    viewModel: MovieCharactersViewModel = hiltViewModel(),
) {
    val uiState by viewModel.uiState.collectAsStateWithLifecycle()

    MovieCharactersScreen(
        uiState = uiState,
        onCharacterSelected = { character ->
            onNavigateToDialogue(viewModel.contentId, character.name)
        },
        onNavigateBack = onNavigateBack,
        onRetry = viewModel::retry,
        modifier = modifier,
    )
}

@Composable
internal fun MovieCharactersScreen(
    uiState: MovieCharactersUiState,
    onCharacterSelected: (InteractiveCharacter) -> Unit,
    onNavigateBack: () -> Unit,
    onRetry: () -> Unit,
    modifier: Modifier = Modifier,
) {
    Column(modifier = modifier.fillMaxSize()) {
        GlassTopBar(title = bayitString("zehAni.characters.title"))
        when (uiState) {
            is MovieCharactersUiState.Loading -> GlassLoadingIndicator()
            is MovieCharactersUiState.Success -> CharactersGrid(
                characters = uiState.characters,
                onCharacterSelected = onCharacterSelected,
            )
            is MovieCharactersUiState.Error -> CharactersError(
                message = uiState.message,
                onRetry = onRetry,
            )
        }
    }
}

@Composable
private fun CharactersGrid(
    characters: List<InteractiveCharacter>,
    onCharacterSelected: (InteractiveCharacter) -> Unit,
) {
    if (characters.isEmpty()) {
        Box(
            modifier = Modifier.fillMaxSize().padding(DesignTokens.Spacing.xxl),
            contentAlignment = Alignment.Center,
        ) {
            Text(
                text = bayitString("zehAni.characters.noCharactersFound"),
                color = DesignTokens.Colors.Text.muted,
                style = MaterialTheme.typography.bodyLarge,
            )
        }
        return
    }

    LazyVerticalGrid(
        columns = GridCells.Fixed(GRID_COLUMNS),
        contentPadding = PaddingValues(DesignTokens.Spacing.base),
        verticalArrangement = Arrangement.spacedBy(DesignTokens.Spacing.md),
        horizontalArrangement = Arrangement.spacedBy(DesignTokens.Spacing.md),
        modifier = Modifier.fillMaxSize(),
    ) {
        items(items = characters, key = { it.name }) { character ->
            CharacterTile(
                character = character,
                onClick = { onCharacterSelected(character) },
            )
        }
    }
}

@Composable
private fun CharacterTile(character: InteractiveCharacter, onClick: () -> Unit) {
    GlassCard(modifier = Modifier.fillMaxWidth().clickable(onClick = onClick)) {
        Column(
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.spacedBy(DesignTokens.Spacing.sm),
        ) {
            CachedAsyncImage(
                url = character.frameUrl,
                contentDescription = character.name,
                modifier = Modifier
                    .size(CHARACTER_IMAGE_SIZE)
                    .clip(CircleShape),
            )
            Text(
                text = character.name,
                style = MaterialTheme.typography.titleSmall,
                color = DesignTokens.Colors.Text.primary,
                fontWeight = FontWeight.SemiBold,
                textAlign = TextAlign.Center,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis,
            )
            character.actorName?.let { actorName ->
                Text(
                    text = actorName,
                    style = MaterialTheme.typography.bodySmall,
                    color = DesignTokens.Colors.Text.secondary,
                    textAlign = TextAlign.Center,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis,
                )
            }
        }
    }
}

@Composable
private fun CharactersError(message: String, onRetry: () -> Unit) {
    Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
        Column(
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.spacedBy(DesignTokens.Spacing.md),
        ) {
            Text(
                text = message,
                style = MaterialTheme.typography.bodyLarge,
                color = DesignTokens.Colors.Semantic.error,
            )
            GlassButton(text = bayitString("common.retry"), onClick = onRetry)
        }
    }
}
