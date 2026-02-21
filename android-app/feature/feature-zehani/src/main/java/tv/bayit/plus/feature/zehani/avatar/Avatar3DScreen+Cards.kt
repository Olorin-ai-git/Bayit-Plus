package tv.bayit.plus.feature.zehani.avatar

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import tv.bayit.plus.core.model.zehani.AvatarMesh
import tv.bayit.plus.designsystem.component.GlassButton
import tv.bayit.plus.designsystem.component.GlassCard
import tv.bayit.plus.designsystem.theme.DesignTokens

@Composable
internal fun MeshInfoCard(mesh: AvatarMesh) {
    GlassCard(modifier = Modifier.fillMaxWidth()) {
        Column(verticalArrangement = Arrangement.spacedBy(DesignTokens.Spacing.xs)) {
            AvatarInfoRow("Vertices", mesh.vertexCount.toString())
            AvatarInfoRow("Bones", mesh.boneCount.toString())
            AvatarInfoRow("Blend Shapes", mesh.blendShapes.size.toString())
            AvatarInfoRow("Has GLB", if (mesh.hasGlb) "Yes" else "No")
        }
    }
}

@Composable
internal fun ControlsCard(
    state: Avatar3DUiState.Success,
    onRotate: (Float, Float) -> Unit,
    onZoom: (Float) -> Unit,
    onToggleAnimation: () -> Unit,
) {
    GlassCard(modifier = Modifier.fillMaxWidth()) {
        Column(verticalArrangement = Arrangement.spacedBy(DesignTokens.Spacing.sm)) {
            Text(
                text = "Controls",
                style = MaterialTheme.typography.titleMedium,
                color = DesignTokens.Colors.Text.primary,
                fontWeight = FontWeight.SemiBold,
            )
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(DesignTokens.Spacing.sm),
            ) {
                GlassButton(
                    text = if (state.isAnimating) "Pause" else "Animate",
                    onClick = onToggleAnimation,
                    modifier = Modifier.weight(1f),
                )
                GlassButton(
                    text = "Reset",
                    onClick = { onRotate(0f, 0f); onZoom(1f) },
                    isPrimary = false,
                    modifier = Modifier.weight(1f),
                )
            }
        }
    }
}

@Composable
internal fun AvatarInfoRow(label: String, value: String) {
    Row(
        modifier = Modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.SpaceBetween,
    ) {
        Text(text = label, color = DesignTokens.Colors.Text.secondary, fontSize = DesignTokens.FontSize.sm)
        Text(text = value, color = DesignTokens.Colors.Text.primary, fontSize = DesignTokens.FontSize.sm, fontWeight = FontWeight.Medium)
    }
}
