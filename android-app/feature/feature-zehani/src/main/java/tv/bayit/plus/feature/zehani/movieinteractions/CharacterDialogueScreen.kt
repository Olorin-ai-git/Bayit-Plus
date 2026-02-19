package tv.bayit.plus.feature.zehani.movieinteractions

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ExperimentalLayoutApi
import androidx.compose.foundation.layout.FlowRow
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.lazy.rememberLazyListState
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.Send
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import tv.bayit.plus.designsystem.component.GlassButton
import tv.bayit.plus.designsystem.component.GlassCard
import tv.bayit.plus.designsystem.component.GlassLoadingIndicator
import tv.bayit.plus.designsystem.component.GlassTopBar
import tv.bayit.plus.designsystem.theme.DesignTokens

@Composable
fun CharacterDialogueRoute(
    onNavigateBack: () -> Unit,
    modifier: Modifier = Modifier,
    viewModel: CharacterDialogueViewModel = hiltViewModel(),
) {
    val uiState by viewModel.uiState.collectAsStateWithLifecycle()
    val inputText by viewModel.inputText.collectAsStateWithLifecycle()

    CharacterDialogueScreen(
        uiState = uiState,
        inputText = inputText,
        onInputChanged = viewModel::onInputChanged,
        onSendQuestion = viewModel::sendQuestion,
        onQuestionChipTapped = viewModel::sendQuestion,
        onNavigateBack = onNavigateBack,
        onRetry = viewModel::retry,
        modifier = modifier,
    )
}

@Composable
internal fun CharacterDialogueScreen(
    uiState: CharacterDialogueUiState,
    inputText: String,
    onInputChanged: (String) -> Unit,
    onSendQuestion: (String) -> Unit,
    onQuestionChipTapped: (String) -> Unit,
    onNavigateBack: () -> Unit,
    onRetry: () -> Unit,
    modifier: Modifier = Modifier,
) {
    Column(modifier = modifier.fillMaxSize()) {
        GlassTopBar(title = (uiState as? CharacterDialogueUiState.Success)?.characterName ?: "Dialogue")
        when (uiState) {
            is CharacterDialogueUiState.Loading -> GlassLoadingIndicator()
            is CharacterDialogueUiState.Success -> DialogueContent(
                uiState = uiState,
                inputText = inputText,
                onInputChanged = onInputChanged,
                onSendQuestion = onSendQuestion,
                onQuestionChipTapped = onQuestionChipTapped,
            )
            is CharacterDialogueUiState.Error -> DialogueError(
                message = uiState.message,
                onRetry = onRetry,
            )
        }
    }
}

@OptIn(ExperimentalLayoutApi::class)
@Composable
private fun DialogueContent(
    uiState: CharacterDialogueUiState.Success,
    inputText: String,
    onInputChanged: (String) -> Unit,
    onSendQuestion: (String) -> Unit,
    onQuestionChipTapped: (String) -> Unit,
) {
    val listState = rememberLazyListState()
    val messages = uiState.messages

    LaunchedEffect(messages.size) {
        if (messages.isNotEmpty()) {
            listState.animateScrollToItem(messages.size - 1)
        }
    }

    Column(modifier = Modifier.fillMaxSize()) {
        if (uiState.suggestedQuestions.isNotEmpty()) {
            FlowRow(
                modifier = Modifier.fillMaxWidth().padding(DesignTokens.Spacing.sm),
                horizontalArrangement = Arrangement.spacedBy(DesignTokens.Spacing.xs),
                verticalArrangement = Arrangement.spacedBy(DesignTokens.Spacing.xs),
            ) {
                uiState.suggestedQuestions.forEach { question ->
                    GlassButton(
                        text = question,
                        onClick = { onQuestionChipTapped(question) },
                        isPrimary = false,
                    )
                }
            }
        }

        LazyColumn(
            state = listState,
            modifier = Modifier.weight(1f).fillMaxWidth().padding(horizontal = DesignTokens.Spacing.base),
            verticalArrangement = Arrangement.spacedBy(DesignTokens.Spacing.sm),
        ) {
            items(items = messages, key = { it.id }) { message ->
                DialogueMessageCard(message = message)
            }
        }

        QuestionInput(
            text = inputText,
            onTextChanged = onInputChanged,
            onSend = { onSendQuestion(inputText) },
        )
    }
}

@Composable
private fun DialogueMessageCard(message: DialogueMessage) {
    Box(
        modifier = Modifier.fillMaxWidth(),
        contentAlignment = if (message.isUser) Alignment.CenterEnd else Alignment.CenterStart,
    ) {
        GlassCard {
            Column(verticalArrangement = Arrangement.spacedBy(DesignTokens.Spacing.xxs)) {
                Text(message.sender, style = MaterialTheme.typography.labelSmall, color = DesignTokens.Colors.Text.secondary, fontWeight = FontWeight.SemiBold)
                Text(message.text, style = MaterialTheme.typography.bodyMedium, color = DesignTokens.Colors.Text.primary)
            }
        }
    }
}

@Composable
private fun QuestionInput(text: String, onTextChanged: (String) -> Unit, onSend: () -> Unit) {
    Row(
        modifier = Modifier.fillMaxWidth().padding(DesignTokens.Spacing.sm),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(DesignTokens.Spacing.sm),
    ) {
        OutlinedTextField(
            value = text,
            onValueChange = onTextChanged,
            modifier = Modifier.weight(1f),
            placeholder = { Text("Ask a question...") },
            singleLine = true,
        )
        IconButton(onClick = onSend, enabled = text.isNotBlank()) {
            Icon(
                imageVector = Icons.AutoMirrored.Filled.Send,
                contentDescription = "Send question",
                tint = DesignTokens.Colors.Primary.base,
            )
        }
    }
}

@Composable
private fun DialogueError(message: String, onRetry: () -> Unit) {
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
            GlassButton(text = "Retry", onClick = onRetry)
        }
    }
}
