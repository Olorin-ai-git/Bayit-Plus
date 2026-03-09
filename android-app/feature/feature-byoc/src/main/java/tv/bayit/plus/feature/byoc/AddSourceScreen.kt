package tv.bayit.plus.feature.byoc

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import tv.bayit.plus.designsystem.component.GlassButton
import tv.bayit.plus.designsystem.component.GlassCard
import tv.bayit.plus.designsystem.component.GlassLoadingIndicator
import tv.bayit.plus.designsystem.component.GlassTextField
import tv.bayit.plus.designsystem.component.GlassTopBar
import tv.bayit.plus.designsystem.theme.DesignTokens

@Composable
fun AddSourceRoute(
    onNavigateBack: () -> Unit,
    onSuccess: () -> Unit,
    modifier: Modifier = Modifier,
    viewModel: AddSourceViewModel = hiltViewModel(),
) {
    val uiState by viewModel.uiState.collectAsStateWithLifecycle()
    LaunchedEffect(uiState) {
        if (uiState is AddSourceUiState.Success) onSuccess()
    }
    AddSourceScreen(
        uiState = uiState,
        onNavigateBack = onNavigateBack,
        onAddM3U = viewModel::addM3USource,
        onAddXtream = viewModel::addXtreamSource,
        modifier = modifier,
    )
}

@Composable
internal fun AddSourceScreen(
    uiState: AddSourceUiState,
    onNavigateBack: () -> Unit,
    onAddM3U: (String, String) -> Unit,
    onAddXtream: (String, String, String, String) -> Unit,
    modifier: Modifier = Modifier,
) {
    var selectedType by rememberSaveable { mutableStateOf(SourceInputType.M3U) }

    Column(modifier = modifier.fillMaxSize()) {
        GlassTopBar(
            title = "Add Source",
            navigationIcon = {
                IconButton(onClick = onNavigateBack) {
                    Icon(
                        Icons.AutoMirrored.Filled.ArrowBack,
                        contentDescription = "Back",
                        tint = DesignTokens.Colors.Text.primary,
                    )
                }
            },
        )
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(DesignTokens.Spacing.lg)
                .verticalScroll(rememberScrollState()),
        ) {
            TypeSelector(
                selected = selectedType,
                onSelect = { selectedType = it },
            )
            Spacer(modifier = Modifier.height(DesignTokens.Spacing.lg))
            when (selectedType) {
                SourceInputType.M3U -> M3UForm(uiState = uiState, onSubmit = onAddM3U)
                SourceInputType.XTREAM -> XtreamForm(uiState = uiState, onSubmit = onAddXtream)
            }
        }
    }
}

@Composable
private fun TypeSelector(selected: SourceInputType, onSelect: (SourceInputType) -> Unit) {
    Row(
        modifier = Modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.spacedBy(DesignTokens.Spacing.sm),
    ) {
        GlassButton(
            text = "M3U Playlist",
            onClick = { onSelect(SourceInputType.M3U) },
            modifier = Modifier.weight(1f),
        )
        GlassButton(
            text = "Xtream Codes",
            onClick = { onSelect(SourceInputType.XTREAM) },
            modifier = Modifier.weight(1f),
        )
    }
}

@Composable
private fun M3UForm(uiState: AddSourceUiState, onSubmit: (String, String) -> Unit) {
    var name by rememberSaveable { mutableStateOf("") }
    var url by rememberSaveable { mutableStateOf("") }

    GlassCard(modifier = Modifier.fillMaxWidth()) {
        Column(modifier = Modifier.padding(DesignTokens.Spacing.md)) {
            GlassTextField(value = name, onValueChange = { name = it }, label = "Source Name")
            Spacer(modifier = Modifier.height(DesignTokens.Spacing.sm))
            GlassTextField(value = url, onValueChange = { url = it }, label = "M3U URL")
            Spacer(modifier = Modifier.height(DesignTokens.Spacing.md))
            ErrorMessage(uiState)
            if (uiState is AddSourceUiState.Validating) {
                GlassLoadingIndicator()
            } else {
                GlassButton(
                    text = "Add Source",
                    onClick = { onSubmit(name, url) },
                    modifier = Modifier.fillMaxWidth(),
                )
            }
        }
    }
}

@Composable
private fun XtreamForm(
    uiState: AddSourceUiState,
    onSubmit: (String, String, String, String) -> Unit,
) {
    var name by rememberSaveable { mutableStateOf("") }
    var server by rememberSaveable { mutableStateOf("") }
    var username by rememberSaveable { mutableStateOf("") }
    var password by rememberSaveable { mutableStateOf("") }

    GlassCard(modifier = Modifier.fillMaxWidth()) {
        Column(modifier = Modifier.padding(DesignTokens.Spacing.md)) {
            GlassTextField(value = name, onValueChange = { name = it }, label = "Source Name")
            Spacer(modifier = Modifier.height(DesignTokens.Spacing.sm))
            GlassTextField(value = server, onValueChange = { server = it }, label = "Server URL")
            Spacer(modifier = Modifier.height(DesignTokens.Spacing.sm))
            GlassTextField(value = username, onValueChange = { username = it }, label = "Username")
            Spacer(modifier = Modifier.height(DesignTokens.Spacing.sm))
            GlassTextField(value = password, onValueChange = { password = it }, label = "Password")
            Spacer(modifier = Modifier.height(DesignTokens.Spacing.md))
            ErrorMessage(uiState)
            if (uiState is AddSourceUiState.Validating) {
                GlassLoadingIndicator()
            } else {
                GlassButton(
                    text = "Add Source",
                    onClick = { onSubmit(name, server, username, password) },
                    modifier = Modifier.fillMaxWidth(),
                )
            }
        }
    }
}

@Composable
private fun ErrorMessage(uiState: AddSourceUiState) {
    if (uiState is AddSourceUiState.Error) {
        Text(
            text = uiState.message,
            style = MaterialTheme.typography.bodySmall,
            color = DesignTokens.Colors.Semantic.error,
        )
        Spacer(modifier = Modifier.height(DesignTokens.Spacing.sm))
    }
}
