import BayitDesignSystem
import BayitLocalization
import SwiftUI

struct ZineReaderView: View {
    @Environment(RepositoryProvider.self) private var repos
    @Environment(LocalizationManager.self) private var localization
    @State private var viewModel: MissionsViewModel?
    @State private var currentPageIndex = 0
    @State private var showArchive = false

    var body: some View {
        VStack(spacing: 0) {
            if let vm = viewModel {
                if let error = vm.errorMessage, vm.currentZine == nil {
                    ErrorStateView(message: error) {
                        Task { await vm.fetchZines() }
                    }
                } else if let zine = vm.currentZine {
                    zineContent(zine, vm: vm)
                } else {
                    emptyState
                }
            }
        }
        .background(DesignTokens.Background.primary)
        .task {
            if viewModel == nil {
                viewModel = MissionsViewModel(repository: repos.missions)
            }
            await viewModel?.fetchZines()
        }
        .sheet(isPresented: $showArchive) {
            ZineArchiveSheet(
                archive: viewModel?.zineArchive ?? [],
                onDismiss: { showArchive = false }
            )
        }
    }

    private func zineContent(_ zine: WeeklyZine, vm: MissionsViewModel) -> some View {
        VStack(spacing: DesignTokens.Spacing.md) {
            headerBar(zine)

            if zine.pages.isEmpty {
                emptyPagesState
            } else {
                pageViewer(zine, vm: vm)
                pageIndicator(zine)
                navigationControls(zine)
            }
        }
        .padding(.vertical, DesignTokens.Spacing.md)
    }

    private func headerBar(_ zine: WeeklyZine) -> some View {
        HStack {
            VStack(alignment: .leading, spacing: DesignTokens.Spacing.xs) {
                Text(zine.title)
                    .font(.system(size: DesignTokens.FontSize.lg, weight: .bold))
                    .foregroundStyle(DesignTokens.Text.primary)

                Text(zine.weekStartDate)
                    .font(.system(size: DesignTokens.FontSize.xs))
                    .foregroundStyle(DesignTokens.Text.muted)
            }

            Spacer()

            GlassButton(
                localization.t("zine.archive"),
                variant: .outline,
                size: .small,
                icon: Image(systemName: "archivebox")
            ) {
                showArchive = true
            }
        }
        .padding(.horizontal, DesignTokens.Spacing.lg)
    }

    private func pageViewer(_ zine: WeeklyZine, vm: MissionsViewModel) -> some View {
        TabView(selection: $currentPageIndex) {
            ForEach(Array(zine.pages.enumerated()), id: \.element.id) { index, page in
                pageCard(page)
                    .tag(index)
            }
        }
        .tabViewStyle(.page(indexDisplayMode: .never))
        .frame(maxHeight: .infinity)
        .onChange(of: currentPageIndex) { _, newValue in
            if newValue == zine.pages.count - 1, !zine.isViewed {
                Task { await vm.markZineViewed(id: zine.id) }
            }
        }
    }

    private func pageCard(_ page: ZinePage) -> some View {
        VStack(spacing: DesignTokens.Spacing.md) {
            AsyncImage(url: URL(string: page.imageUrl)) { phase in
                switch phase {
                case .success(let image):
                    image.resizable().aspectRatio(contentMode: .fit)
                default:
                    RoundedRectangle(cornerRadius: DesignTokens.Radius.lg)
                        .fill(DesignTokens.Glass.bg)
                        .overlay {
                            ProgressView().tint(DesignTokens.Text.muted)
                        }
                }
            }
            .clipShape(RoundedRectangle(cornerRadius: DesignTokens.Radius.lg))
            .padding(.horizontal, DesignTokens.Spacing.lg)

            if let caption = page.caption, !caption.isEmpty {
                Text(caption)
                    .font(.system(size: DesignTokens.FontSize.sm))
                    .foregroundStyle(DesignTokens.Text.secondary)
                    .multilineTextAlignment(.center)
                    .padding(.horizontal, DesignTokens.Spacing.xl)
            }
        }
    }

    private func pageIndicator(_ zine: WeeklyZine) -> some View {
        HStack(spacing: DesignTokens.Spacing.xs) {
            ForEach(0..<zine.pages.count, id: \.self) { index in
                Circle()
                    .fill(
                        index == currentPageIndex
                            ? DesignTokens.Primary.p400
                            : DesignTokens.Text.muted.opacity(0.4)
                    )
                    .frame(width: 8, height: 8)
            }
        }
    }

    private func navigationControls(_ zine: WeeklyZine) -> some View {
        HStack(spacing: DesignTokens.Spacing.lg) {
            GlassButton(
                localization.t("common.previous"),
                variant: .outline,
                size: .small,
                icon: Image(systemName: "chevron.left")
            ) {
                withAnimation { currentPageIndex = max(0, currentPageIndex - 1) }
            }
            .disabled(currentPageIndex == 0)

            Text("\(currentPageIndex + 1) / \(zine.pages.count)")
                .font(.system(size: DesignTokens.FontSize.sm, weight: .medium))
                .foregroundStyle(DesignTokens.Text.secondary)

            GlassButton(
                localization.t("common.next"),
                variant: .outline,
                size: .small,
                icon: Image(systemName: "chevron.right")
            ) {
                withAnimation {
                    currentPageIndex = min(zine.pages.count - 1, currentPageIndex + 1)
                }
            }
            .disabled(currentPageIndex >= zine.pages.count - 1)
        }
        .padding(.horizontal, DesignTokens.Spacing.lg)
    }

    private var emptyState: some View {
        GlassCard {
            VStack(spacing: DesignTokens.Spacing.md) {
                Image(systemName: "book.closed")
                    .font(.system(size: 40))
                    .foregroundStyle(DesignTokens.Text.muted)

                Text(localization.t("zine.noCurrentZine"))
                    .font(.system(size: DesignTokens.FontSize.md))
                    .foregroundStyle(DesignTokens.Text.secondary)
            }
            .padding(.vertical, DesignTokens.Spacing.xxl)
        }
        .padding(DesignTokens.Spacing.lg)
    }

    private var emptyPagesState: some View {
        VStack(spacing: DesignTokens.Spacing.md) {
            Image(systemName: "doc.text")
                .font(.system(size: 32))
                .foregroundStyle(DesignTokens.Text.muted)
            Text(localization.t("zine.emptyPages"))
                .font(.system(size: DesignTokens.FontSize.sm))
                .foregroundStyle(DesignTokens.Text.secondary)
        }
        .frame(maxHeight: .infinity)
    }

}
