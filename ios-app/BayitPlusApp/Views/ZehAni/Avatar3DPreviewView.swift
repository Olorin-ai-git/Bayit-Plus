import BayitDesignSystem
import BayitLocalization
import SwiftUI

struct Avatar3DPreviewView: View {
    @Environment(RepositoryProvider.self) private var repositories
    @Environment(LocalizationManager.self) private var localization
    @Environment(\.dismiss) private var dismiss

    let avatarImageUrl: String

    var body: some View {
        NavigationStack {
            ZStack {
                DesignTokens.Background.primary.ignoresSafeArea()

                if let url = URL(string: avatarImageUrl) {
                    CachedAsyncImage(url: url) { phase in
                        switch phase {
                        case let .success(image):
                            image
                                .resizable()
                                .scaledToFit()
                                .edgesIgnoringSafeArea(.all)
                        case .failure:
                            errorView
                        default:
                            loadingView
                        }
                    }
                } else {
                    errorView
                }
            }
            .navigationTitle(localization.t("zehAni.preview.title"))
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    Button(localization.t("common.close")) {
                        dismiss()
                    }
                }
            }
        }
    }

    private var loadingView: some View {
        VStack(spacing: DesignTokens.Spacing.base) {
            ProgressView()
                .progressViewStyle(.circular)
                .scaleEffect(1.5)
                .tint(.white)
            Text(localization.t("zehAni.preview.loading"))
                .foregroundStyle(DesignTokens.Text.muted)
                .font(.system(size: DesignTokens.FontSize.sm))
        }
    }

    private var errorView: some View {
        VStack(spacing: DesignTokens.Spacing.base) {
            Text(localization.t("zehAni.preview.error"))
                .foregroundStyle(DesignTokens.ErrorColor.default)
                .font(.system(size: DesignTokens.FontSize.base))
        }
        .padding(DesignTokens.Spacing.xl)
    }
}
