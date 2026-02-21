package tv.bayit.plus.feature.voice.chatbot

import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Modifier
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import tv.bayit.plus.designsystem.component.GlassLoadingIndicator
import tv.bayit.plus.designsystem.component.GlassTopBar
import tv.bayit.plus.designsystem.i18n.bayitString

@Composable
fun ChatbotRoute(
    onNavigateBack: () -> Unit,
    modifier: Modifier = Modifier,
    viewModel: ChatbotViewModel = hiltViewModel(),
) {
    val uiState by viewModel.uiState.collectAsStateWithLifecycle()
    val messageInput by viewModel.messageInput.collectAsStateWithLifecycle()
    val isSending by viewModel.isSending.collectAsStateWithLifecycle()
    val isListening by viewModel.isListening.collectAsStateWithLifecycle()
    val isSpeaking by viewModel.isSpeaking.collectAsStateWithLifecycle()

    ChatbotScreen(
        uiState = uiState,
        messageInput = messageInput,
        isSending = isSending,
        isListening = isListening,
        isSpeaking = isSpeaking,
        onMessageInputChanged = viewModel::updateMessageInput,
        onSendMessage = viewModel::sendMessage,
        onToggleVoice = { viewModel.toggleVoiceInput("he") },
        onStopTts = viewModel::stopTts,
        onRetry = viewModel::retry,
        onNavigateBack = onNavigateBack,
        modifier = modifier,
    )
}

@Composable
internal fun ChatbotScreen(
    uiState: ChatbotUiState,
    messageInput: String,
    isSending: Boolean,
    isListening: Boolean,
    isSpeaking: Boolean,
    onMessageInputChanged: (String) -> Unit,
    onSendMessage: () -> Unit,
    onToggleVoice: () -> Unit,
    onStopTts: () -> Unit,
    onRetry: () -> Unit,
    onNavigateBack: () -> Unit,
    modifier: Modifier = Modifier,
) {
    Column(modifier = modifier.fillMaxSize()) {
        GlassTopBar(title = bayitString("aiChat.title"))

        when (uiState) {
            is ChatbotUiState.Loading -> GlassLoadingIndicator(modifier = Modifier.weight(1f))
            is ChatbotUiState.Error -> ChatbotErrorContent(
                message = uiState.message,
                onRetry = onRetry,
                modifier = Modifier.weight(1f),
            )
            is ChatbotUiState.Ready -> ChatMessageList(
                messages = uiState.messages,
                modifier = Modifier.weight(1f),
            )
        }

        ChatInputBar(
            text = messageInput,
            isSending = isSending,
            isListening = isListening,
            isSpeaking = isSpeaking,
            onTextChanged = onMessageInputChanged,
            onSend = onSendMessage,
            onToggleVoice = onToggleVoice,
            onStopTts = onStopTts,
        )
    }
}
