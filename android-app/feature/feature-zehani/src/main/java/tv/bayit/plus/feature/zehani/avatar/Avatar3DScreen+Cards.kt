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
import tv.bayit.plus.designsystem.i18n.bayitString

@Composable
internal fun MeshInfoCard(mesh: AvatarMesh) {
    GlassCard(modifier = Modifier.fillMaxWidth()) {
        Column(verticalArrangement = Arrangement.spacedBy(DesignTokens.Spacing.xs)) {
            AvatarInfoRow(bayitString("zehAni.avatar3d.vertices"), mesh.vertexCount.toString())
            AvatarInfoRow(bayitString("zehAni.avatar3d.bones"), mesh.boneCount.toString())
            AvatarInfoRow(bayitString("zehAni.avatar3d.blendShapes"), mesh.blendShapes.size.toString())
            AvatarInfoRow(bayitString("zehAni.avatar3d.hasGlb"), if (mesh.hasGlb) bayitString("common.yes") else bayitString("common.no"))
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
                text = bayitString("zehAni.avatar3d.controls"),
                style = MaterialTheme.typography.titleMedium,
                color = DesignTokens.Colors.Text.primary,
                fontWeight = FontWeight.SemiBold,
            )
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(DesignTokens.Spacing.sm),
            ) {
                GlassButton(
                    text = if (state.isAnimating) bayitString("common.pause") else bayitString("zehAni.avatar3d.animate"),
                    onClick = onToggleAnimation,
                    modifier = Modifier.weight(1f),
                )
                GlassButton(
                    text = bayitString("common.reset"),
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
