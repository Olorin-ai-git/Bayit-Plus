#if os(tvOS)
import BayitDesignSystem
import BayitLocalization
import SceneKit
import SwiftUI

struct SceneKitViewWrapper: UIViewRepresentable {
    let scene: SCNScene
    let onUpdate: ((SCNView) -> Void)?

    func makeUIView(context: Context) -> SCNView {
        let sceneView = SCNView()
        sceneView.scene = scene
        sceneView.autoenablesDefaultLighting = false
        sceneView.allowsCameraControl = false
        sceneView.backgroundColor = .clear
        onUpdate?(sceneView)
        return sceneView
    }

    func updateUIView(_ uiView: SCNView, context: Context) {}
}

struct TVMagicMirrorGreetingCard: View {
    @Environment(LocalizationManager.self) private var localization

    let greeting: MagicMirrorGreeting

    var body: some View {
        VStack(spacing: TVDesignTokens.Spacing.lg) {
            Text(greeting.greetingTextHe)
                .font(.system(size: TVDesignTokens.FontSize.xxl, weight: .bold))
                .foregroundStyle(TVDesignTokens.Text.primary)
                .multilineTextAlignment(.center)

            Text(greeting.greetingTextEn)
                .font(.system(size: TVDesignTokens.FontSize.base))
                .foregroundStyle(TVDesignTokens.Text.secondary)
                .multilineTextAlignment(.center)
        }
        .padding(TVDesignTokens.Spacing.xl)
        .frame(maxWidth: .infinity)
        .background(TVDesignTokens.Glass.bgLight)
        .clipShape(RoundedRectangle(cornerRadius: TVDesignTokens.Radius.md))
        .overlay(
            RoundedRectangle(cornerRadius: TVDesignTokens.Radius.md)
                .stroke(TVDesignTokens.Glass.border, lineWidth: 1)
        )
    }
}

struct TVMagicMirrorVocabularyCard: View {
    @Environment(LocalizationManager.self) private var localization

    let greeting: MagicMirrorGreeting

    var body: some View {
        VStack(alignment: .leading, spacing: TVDesignTokens.Spacing.lg) {
            Text(localization.t("zehAni.magicMirror.vocabOfDay"))
                .font(.system(size: TVDesignTokens.FontSize.lg, weight: .semibold))
                .foregroundStyle(TVDesignTokens.Text.primary)

            VStack(spacing: TVDesignTokens.Spacing.md) {
                ForEach(greeting.vocabularyWords, id: \.wordHe) { word in
                    HStack {
                        Text(word.wordHe)
                            .font(.system(size: TVDesignTokens.FontSize.md, weight: .medium))
                            .foregroundStyle(TVDesignTokens.Text.primary)

                        Text(word.transliteration)
                            .font(.system(size: TVDesignTokens.FontSize.base))
                            .foregroundStyle(TVDesignTokens.Text.muted)

                        Spacer()

                        Text(word.translation)
                            .font(.system(size: TVDesignTokens.FontSize.base))
                            .foregroundStyle(TVDesignTokens.Text.secondary)
                    }
                    .padding(.vertical, TVDesignTokens.Spacing.sm)
                }
            }
        }
        .padding(TVDesignTokens.Spacing.xl)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(TVDesignTokens.Glass.bgLight)
        .clipShape(RoundedRectangle(cornerRadius: TVDesignTokens.Radius.md))
        .overlay(
            RoundedRectangle(cornerRadius: TVDesignTokens.Radius.md)
                .stroke(TVDesignTokens.Glass.border, lineWidth: 1)
        )
    }
}

struct TVMagicMirrorErrorView: View {
    @Environment(LocalizationManager.self) private var localization

    let message: String
    let onRetry: () -> Void

    var body: some View {
        VStack(spacing: TVDesignTokens.Spacing.lg) {
            Text(message)
                .font(.system(size: TVDesignTokens.FontSize.base))
                .foregroundStyle(DesignTokens.ErrorColor.default)
                .multilineTextAlignment(.center)

            Button {
                onRetry()
            } label: {
                Text(localization.t("common.retry"))
                    .font(.system(size: TVDesignTokens.FontSize.base, weight: .semibold))
                    .padding(.horizontal, TVDesignTokens.Spacing.xl)
                    .padding(.vertical, TVDesignTokens.Spacing.md)
            }
            .buttonStyle(.card)
        }
    }
}

struct TVMagicMirrorRefreshButton: View {
    @Environment(LocalizationManager.self) private var localization

    @FocusState.Binding var isFocused: Bool
    let onRefresh: () -> Void

    var body: some View {
        Button {
            onRefresh()
        } label: {
            HStack(spacing: TVDesignTokens.Spacing.md) {
                Image(systemName: "arrow.clockwise")
                    .font(.system(size: TVDesignTokens.FontSize.base))
                Text(localization.t("zehAni.magicMirror.refresh"))
                    .font(.system(size: TVDesignTokens.FontSize.base, weight: .semibold))
            }
            .foregroundStyle(TVDesignTokens.Text.primary)
            .padding(.horizontal, TVDesignTokens.Spacing.xl)
            .padding(.vertical, TVDesignTokens.Spacing.md)
        }
        .buttonStyle(.card)
        .focused($isFocused)
    }
}
#endif
