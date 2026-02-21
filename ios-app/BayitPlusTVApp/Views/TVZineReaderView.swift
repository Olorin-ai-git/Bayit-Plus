import BayitDesignSystem
import BayitLocalization
import SwiftUI

/// tvOS Zine Reader with full-screen page viewing and remote navigation.
/// Uses PageTabViewStyle for horizontal page-by-page navigation.
struct TVZineReaderView: View {
    @Environment(LocalizationManager.self) private var localization
    let zineId: String
    let zineTitle: String
    let pageUrls: [String]

    @State private var currentPage = 0
    @State private var showOverlay = true
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        ZStack {
            DesignTokens.Background.primary.ignoresSafeArea()

            if pageUrls.isEmpty {
                emptyState
            } else {
                TabView(selection: $currentPage) {
                    ForEach(Array(pageUrls.enumerated()), id: \.offset) { index, urlString in
                        zinePage(urlString: urlString, pageNumber: index + 1)
                            .tag(index)
                    }
                }
                .tabViewStyle(.page(indexDisplayMode: .never))
                .ignoresSafeArea()
            }

            if showOverlay {
                overlayControls
            }
        }
        .onAppear {
            hideOverlayAfterDelay()
        }
    }

    private func zinePage(urlString: String, pageNumber: Int) -> some View {
        GeometryReader { geometry in
            if let url = URL(string: urlString) {
                CachedAsyncImage(url: url) { phase in
                    switch phase {
                    case let .success(image):
                        image
                            .resizable()
                            .aspectRatio(contentMode: .fit)
                            .frame(width: geometry.size.width, height: geometry.size.height)
                    case .failure:
                        errorPlaceholder(pageNumber: pageNumber)
                    case .empty:
                        loadingPlaceholder
                    @unknown default:
                        loadingPlaceholder
                    }
                }
            } else {
                errorPlaceholder(pageNumber: pageNumber)
            }
        }
        .onTapGesture {
            withAnimation(.easeInOut(duration: 0.3)) {
                showOverlay.toggle()
            }
        }
    }

    private var overlayControls: some View {
        VStack {
            HStack {
                Text(zineTitle)
                    .font(.system(size: TVDesignTokens.FontSize.xl, weight: .bold))
                    .foregroundStyle(DesignTokens.Text.primary)
                    .padding(TVDesignTokens.Spacing.lg)
                    .background(DesignTokens.Glass.bgStrong)
                    .clipShape(RoundedRectangle(cornerRadius: TVDesignTokens.Radius.md))

                Spacer()

                Button {
                    dismiss()
                } label: {
                    Image(systemName: "xmark.circle.fill")
                        .font(.system(size: TVDesignTokens.FontSize.xl))
                        .foregroundStyle(DesignTokens.Text.primary)
                        .padding(TVDesignTokens.Spacing.lg)
                        .background(DesignTokens.Glass.bgStrong)
                        .clipShape(Circle())
                }
                .buttonStyle(.card)
            }
            .padding(TVDesignTokens.Spacing.xl)

            Spacer()

            pageIndicator
                .padding(.bottom, TVDesignTokens.Spacing.xl)
        }
        .transition(.opacity)
    }

    private var pageIndicator: some View {
        HStack(spacing: TVDesignTokens.Spacing.md) {
            Text(localization.t("zine.pageIndicator", ["current": "\(currentPage + 1)", "total": "\(pageUrls.count)"]))
                .font(.system(size: TVDesignTokens.FontSize.lg, weight: .semibold))
                .foregroundStyle(DesignTokens.Text.primary)
                .padding(.horizontal, TVDesignTokens.Spacing.lg)
                .padding(.vertical, TVDesignTokens.Spacing.md)
                .background(DesignTokens.Glass.bgStrong)
                .clipShape(RoundedRectangle(cornerRadius: TVDesignTokens.Radius.md))

            HStack(spacing: TVDesignTokens.Spacing.xs) {
                ForEach(0 ..< pageUrls.count, id: \.self) { index in
                    Circle()
                        .fill(
                            index == currentPage
                                ? DesignTokens.Primary.default
                                : DesignTokens.Glass.border
                        )
                        .frame(width: 12, height: 12)
                }
            }
            .padding(.horizontal, TVDesignTokens.Spacing.lg)
            .padding(.vertical, TVDesignTokens.Spacing.md)
            .background(DesignTokens.Glass.bgStrong)
            .clipShape(RoundedRectangle(cornerRadius: TVDesignTokens.Radius.md))
        }
    }

    private var loadingPlaceholder: some View {
        VStack(spacing: TVDesignTokens.Spacing.lg) {
            ProgressView()
                .tint(DesignTokens.Primary.default)
                .scaleEffect(1.5)
            Text(localization.t("zine.loadingPage"))
                .font(.system(size: TVDesignTokens.FontSize.lg))
                .foregroundStyle(DesignTokens.Text.muted)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .background(DesignTokens.Background.primary)
    }

    private func errorPlaceholder(pageNumber: Int) -> some View {
        VStack(spacing: TVDesignTokens.Spacing.lg) {
            Image(systemName: "exclamationmark.triangle")
                .font(.system(size: TVDesignTokens.FontSize.hero))
                .foregroundStyle(DesignTokens.Warning.default)

            Text(localization.t("zine.failedToLoad", ["page": "\(pageNumber)"]))
                .font(.system(size: TVDesignTokens.FontSize.lg))
                .foregroundStyle(DesignTokens.Text.secondary)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .background(DesignTokens.Background.primary)
    }

    private var emptyState: some View {
        VStack(spacing: TVDesignTokens.Spacing.xl) {
            Image(systemName: "book.closed")
                .font(.system(size: TVDesignTokens.FontSize.hero))
                .foregroundStyle(DesignTokens.Text.muted)

            Text(localization.t("zine.noPagesAvailable"))
                .font(.system(size: TVDesignTokens.FontSize.xxl, weight: .bold))
                .foregroundStyle(DesignTokens.Text.primary)

            Text(localization.t("zine.noPagesDescription"))
                .font(.system(size: TVDesignTokens.FontSize.lg))
                .foregroundStyle(DesignTokens.Text.secondary)
                .multilineTextAlignment(.center)
                .frame(maxWidth: 600)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
    }

    private func hideOverlayAfterDelay() {
        Task {
            try? await Task.sleep(nanoseconds: 3_000_000_000)
            withAnimation(.easeOut(duration: 0.3)) {
                showOverlay = false
            }
        }
    }
}
