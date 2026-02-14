package tv.bayit.plus.designsystem.component

import androidx.compose.foundation.layout.ColumnScope
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.ModalBottomSheet
import androidx.compose.material3.SheetState
import androidx.compose.material3.rememberModalBottomSheetState
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import tv.bayit.plus.designsystem.theme.DesignTokens

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun GlassModal(
    onDismissRequest: () -> Unit,
    modifier: Modifier = Modifier,
    sheetState: SheetState = rememberModalBottomSheetState(),
    content: @Composable ColumnScope.() -> Unit,
) {
    ModalBottomSheet(
        onDismissRequest = onDismissRequest,
        modifier = modifier,
        sheetState = sheetState,
        containerColor = DesignTokens.Colors.Glass.bgStrong,
        contentColor = DesignTokens.Colors.Text.primary,
        shape = RoundedCornerShape(
            topStart = DesignTokens.Radius.xl,
            topEnd = DesignTokens.Radius.xl,
        ),
        scrimColor = DesignTokens.Colors.Background.primary.copy(alpha = 0.5f),
        content = content,
    )
}
