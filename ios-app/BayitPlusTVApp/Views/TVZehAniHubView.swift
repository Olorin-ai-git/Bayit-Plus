#if os(tvOS)
    import BayitDesignSystem
    import BayitLocalization
    import SwiftUI

    // MARK: - Feature Card Model

    enum ZehAniFeatureCard: Identifiable, Hashable, CaseIterable {
        case magicMirror, highlights, movieInteractions
        var id: Self {
            self
        }

        var cardIndex: Int {
            switch self {
            case .magicMirror: return 0
            case .highlights: return 1
            case .movieInteractions: return 2
            }
        }
    }

    // MARK: - Hub View

    struct TVZehAniHubView: View {
        @Environment(LocalizationManager.self) var localization
        @Environment(TVNavigationCoordinator.self) private var coordinator
        @Environment(TVRepositoryProvider.self) private var repos

        @State var profileId: String?
        @State private var isLoading = true
        @State private var error: String?
        @State var navigationTarget: ZehAniFeatureCard?
        @FocusState var focusedCard: ZehAniFeatureCard?

        var body: some View {
            NavigationStack {
                ZStack {
                    TVZehAniBackgroundLayer()
                    TVZehAniAmbientGlowLayer()
                    mainContent
                    TVZehAniStatusBarLayer(localization: localization)
                }
                .ignoresSafeArea()
                .navigationDestination(item: $navigationTarget) { card in
                    cardDestination(card)
                }
            }
            .task { await loadProfile() }
        }

        @ViewBuilder
        private var mainContent: some View {
            if isLoading {
                ProgressView().tint(.white).scaleEffect(1.5)
            } else if let message = error {
                tvZehAniErrorContent(message: message)
            } else {
                tvZehAniHeroLayer
                tvZehAniCarouselLayer
                tvZehAniNavigationUILayer
            }
        }

        @ViewBuilder
        private func cardDestination(_ card: ZehAniFeatureCard) -> some View {
            switch card {
            case .magicMirror:
                if let id = profileId {
                    TVMagicMirrorView(profileId: id)
                        .tvBreadcrumb(
                            localization.t("zehAni.hub.magicMirror"),
                            icon: "sparkles.rectangle.stack"
                        )
                }
            case .highlights:
                if let id = profileId {
                    TVHighlightsView(profileId: id)
                        .tvBreadcrumb(
                            localization.t("zehAni.hub.highlights"),
                            icon: "play.rectangle.on.rectangle"
                        )
                }
            case .movieInteractions:
                TVMovieInteractionsView()
                    .tvBreadcrumb(
                        localization.t("zehAni.hub.movieInteractions"),
                        icon: "bubble.left.and.bubble.right"
                    )
            }
        }

        private func tvZehAniErrorContent(message: String) -> some View {
            VStack(spacing: TVDesignTokens.Spacing.xl) {
                Image(systemName: "exclamationmark.triangle")
                    .font(.system(size: 80))
                    .foregroundStyle(DesignTokens.ErrorColor.default)
                Text(message)
                    .font(.system(size: TVDesignTokens.FontSize.xl))
                    .foregroundStyle(DesignTokens.Text.primary)
                    .multilineTextAlignment(.center)
                Button { Task { await loadProfile() } } label: {
                    Text(localization.t("common.retry"))
                        .padding(.horizontal, TVDesignTokens.Spacing.xl)
                        .padding(.vertical, TVDesignTokens.Spacing.md)
                }
                .tvCardStyle()
            }
        }

        @MainActor
        func loadProfile() async {
            isLoading = true
            error = nil
            do {
                let profile = try await repos.user.fetchProfile()
                profileId = profile.id
                isLoading = false
            } catch {
                self.error = error.localizedDescription
                isLoading = false
            }
        }
    }
#endif
