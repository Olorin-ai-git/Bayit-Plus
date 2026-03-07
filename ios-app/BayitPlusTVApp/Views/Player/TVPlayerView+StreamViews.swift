import BayitDesignSystem
import BayitLocalization
import BayitMedia
import SwiftUI

/// Stream loading, error, pre-buffer overlays, and the no-avatar warning banner.
extension TVPlayerView {
    // MARK: - Stream Loading Views

    var streamLoadingView: some View {
        VStack(spacing: TVDesignTokens.Spacing.xl) {
            ProgressView()
                .tint(DesignTokens.Primary.default)
                .scaleEffect(2.0)
            Text(localization.t("player.loadingStream"))
                .font(.system(size: TVDesignTokens.FontSize.lg))
                .foregroundStyle(DesignTokens.Text.muted)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .background(DesignTokens.Background.primary)
        .ignoresSafeArea()
    }

    var preBufferOverlay: some View {
        VStack(spacing: TVDesignTokens.Spacing.lg) {
            ProgressView(value: mediaPlayer.preBufferProgress)
                .progressViewStyle(.linear)
                .tint(DesignTokens.Primary.default)
                .frame(maxWidth: 400)

            Text(localization.t("player.preparingStream"))
                .font(.system(size: TVDesignTokens.FontSize.md))
                .foregroundStyle(DesignTokens.Text.muted)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .background(Color.black.opacity(0.7))
        .ignoresSafeArea()
    }

    func streamErrorView(_ message: String) -> some View {
        VStack(spacing: TVDesignTokens.Spacing.xl) {
            Image(systemName: "exclamationmark.triangle")
                .font(.system(size: TVDesignTokens.FontSize.hero))
                .foregroundStyle(DesignTokens.Warning.default)

            Text(message)
                .font(.system(size: TVDesignTokens.FontSize.lg))
                .foregroundStyle(DesignTokens.Text.secondary)
                .multilineTextAlignment(.center)
                .frame(maxWidth: 600)

            GlassButton("Retry", variant: .secondary, size: .large) {
                Task { await resolveAndPlay() }
            }
            .frame(maxWidth: 300)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .background(DesignTokens.Background.primary)
        .ignoresSafeArea()
    }

    // MARK: - No Avatar Warning Banner

    var noAvatarWarningBanner: some View {
        VStack {
            HStack(spacing: TVDesignTokens.Spacing.md) {
                Image(systemName: "exclamationmark.triangle.fill")
                    .foregroundStyle(DesignTokens.Warning.default)
                Text(localization.t("settings.interactiveMomentsNoAvatar"))
                    .font(.system(size: TVDesignTokens.FontSize.md))
                    .foregroundStyle(DesignTokens.Text.primary)
            }
            .padding(TVDesignTokens.Spacing.lg)
            .background(DesignTokens.Glass.bgStrong)
            .clipShape(
                RoundedRectangle(cornerRadius: TVDesignTokens.Radius.lg)
            )
            Spacer()
        }
        .padding(.top, TVDesignTokens.Spacing.xxl)
        .transition(.move(edge: .top).combined(with: .opacity))
        .onAppear {
            Task {
                try? await Task.sleep(for: .seconds(5))
                withAnimation { state.showNoAvatarWarning = false }
            }
        }
    }
}
