import BayitDesignSystem
import BayitLocalization
import SceneKit
import SwiftUI

struct MagicMirrorGreetingCard: View {
    let greeting: MagicMirrorGreeting

    var body: some View {
        GlassCard {
            VStack(spacing: DesignTokens.Spacing.sm) {
                Text(greeting.greetingTextHe)
                    .font(.system(size: DesignTokens.FontSize.xxl, weight: .bold))
                    .foregroundStyle(DesignTokens.Text.primary)
                    .multilineTextAlignment(.center)
                Text(greeting.greetingTextEn)
                    .font(.system(size: DesignTokens.FontSize.md))
                    .foregroundStyle(DesignTokens.Text.secondary)
                    .multilineTextAlignment(.center)
            }
        }
    }
}

struct MagicMirrorVocabCard: View {
    @Environment(LocalizationManager.self) private var localization
    let vocabulary: String

    var body: some View {
        GlassCard {
            VStack(alignment: .leading, spacing: DesignTokens.Spacing.sm) {
                Text(localization.t("zehAni.magicMirror.vocabOfDay"))
                    .font(.system(size: DesignTokens.FontSize.md, weight: .semibold))
                    .foregroundStyle(DesignTokens.Text.secondary)
                Text(vocabulary)
                    .font(.system(size: DesignTokens.FontSize.lg, weight: .medium))
                    .foregroundStyle(DesignTokens.Text.primary)
            }
        }
    }
}

struct MagicMirrorNoAvatarPrompt: View {
    @Environment(LocalizationManager.self) private var localization
    let onCreateTapped: () -> Void

    var body: some View {
        VStack(spacing: DesignTokens.Spacing.xl) {
            Spacer()
            Image(systemName: "wand.and.stars")
                .font(.system(size: 56))
                .foregroundStyle(DesignTokens.Primary.p400)
            Text(localization.t("zehAni.magicMirror.noAvatar"))
                .font(.system(size: DesignTokens.FontSize.xl, weight: .bold))
                .foregroundStyle(DesignTokens.Text.primary)
                .multilineTextAlignment(.center)
            Text(localization.t("zehAni.magicMirror.noAvatarDesc"))
                .font(.system(size: DesignTokens.FontSize.sm))
                .foregroundStyle(DesignTokens.Text.muted)
                .multilineTextAlignment(.center)
                .padding(.horizontal, DesignTokens.Spacing.xl)
            GlassButton(localization.t("zehAni.magicMirror.createAvatar"), variant: .primary) {
                onCreateTapped()
            }
            Spacer()
        }
    }
}

struct MagicMirrorNoCreditsPrompt: View {
    @Environment(LocalizationManager.self) private var localization

    var body: some View {
        VStack(spacing: DesignTokens.Spacing.xl) {
            Spacer()
            Image(systemName: "creditcard.trianglebadge.exclamationmark")
                .font(.system(size: 56))
                .foregroundStyle(DesignTokens.Warning.default)
            Text(localization.t("zehAni.magicMirror.noCreditsTitle"))
                .font(.system(size: DesignTokens.FontSize.xl, weight: .bold))
                .foregroundStyle(DesignTokens.Text.primary)
                .multilineTextAlignment(.center)
            Text(localization.t("zehAni.magicMirror.noCreditsDesc"))
                .font(.system(size: DesignTokens.FontSize.sm))
                .foregroundStyle(DesignTokens.Text.muted)
                .multilineTextAlignment(.center)
                .padding(.horizontal, DesignTokens.Spacing.xl)
            Spacer()
        }
    }
}

enum MagicMirrorSceneBuilder {
    static func createScene() -> SCNScene {
        let scene = SCNScene()

        let cameraNode = SCNNode()
        cameraNode.camera = SCNCamera()
        cameraNode.position = SCNVector3(x: 0, y: 0, z: 60)
        scene.rootNode.addChildNode(cameraNode)

        let lightNode = SCNNode()
        lightNode.light = SCNLight()
        lightNode.light?.type = .omni
        lightNode.position = SCNVector3(x: 0, y: 20, z: 60)
        scene.rootNode.addChildNode(lightNode)

        return scene
    }
}
