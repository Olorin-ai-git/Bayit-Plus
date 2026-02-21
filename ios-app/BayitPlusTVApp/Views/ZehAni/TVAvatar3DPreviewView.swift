#if os(tvOS)
    import BayitCore
    import BayitDesignSystem
    import BayitLocalization
    import SwiftUI

    struct TVAvatar3DPreviewView: View {
        @Environment(TVRepositoryProvider.self) private var repos
        @Environment(LocalizationManager.self) private var localization
        let avatarImageUrl: String
        var onClose: (() -> Void)?

        @FocusState private var closeFocused: Bool
        private let logger = BayitLogger(category: "TVAvatarPreview")

        var body: some View {
            ZStack {
                Color.black.ignoresSafeArea()

                VStack(spacing: TVDesignTokens.Spacing.lg) {
                    Text(localization.t("zehAni.avatar3d.title"))
                        .font(.system(size: TVDesignTokens.FontSize.hero, weight: .bold))
                        .foregroundColor(.white)

                    if let url = URL(string: avatarImageUrl) {
                        CachedAsyncImage(url: url) { phase in
                            switch phase {
                            case let .success(image):
                                image
                                    .resizable()
                                    .scaledToFit()
                            case .failure:
                                errorBody
                            default:
                                ProgressView().tint(.white)
                            }
                        }
                        .frame(width: 640, height: 640)
                        .clipShape(RoundedRectangle(cornerRadius: 24))
                    } else {
                        errorBody
                    }

                    Button(localization.t("common.close")) {
                        onClose?()
                    }
                    .buttonStyle(.card)
                    .tvFocusStyle()
                    .focused($closeFocused)
                }
                .padding(TVDesignTokens.Spacing.xl)
            }
            .onExitCommand { onClose?() }
        }

        private var errorBody: some View {
            VStack(spacing: TVDesignTokens.Spacing.lg) {
                Text(localization.t("zehAni.avatar3d.errorTitle"))
                    .font(.system(size: TVDesignTokens.FontSize.lg, weight: .semibold))
                    .foregroundColor(.white)
            }
        }
    }
#endif
