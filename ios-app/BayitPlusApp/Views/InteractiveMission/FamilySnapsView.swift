import BayitDesignSystem
import BayitLocalization
import SwiftUI

struct FamilySnapsView: View {
    @Environment(RepositoryProvider.self) private var repos
    @Environment(LocalizationManager.self) private var localization

    let avatarId: String
    let profileId: String
    var onGenerateSnap: (() -> Void)?

    @State private var snaps: [FamilySnap] = []
    @State private var selectedSnap: FamilySnap?
    @State private var isLoading = false
    @State private var error: String?
    @State private var showShareSheet = false

    private let columns = [
        GridItem(.flexible(), spacing: DesignTokens.Spacing.sm),
        GridItem(.flexible(), spacing: DesignTokens.Spacing.sm)
    ]

    var body: some View {
        ScrollView(.vertical, showsIndicators: false) {
            VStack(spacing: DesignTokens.Spacing.lg) {
                headerView

                if isLoading {
                    loadingView
                } else if let error = error {
                    errorView(message: error)
                } else if snaps.isEmpty {
                    emptyStateView
                } else {
                    snapsGrid
                }

                if let selected = selectedSnap {
                    snapDetailCard(selected)
                }
            }
            .padding(DesignTokens.Spacing.md)
        }
        .background(DesignTokens.Background.primary)
        .onAppear {
            loadSnaps()
        }
        .sheet(isPresented: $showShareSheet) {
            if let snap = selectedSnap, let url = URL(string: snap.imageUrl) {
                ShareSheet(items: [url])
            }
        }
    }

    private var headerView: some View {
        GlassCard {
            HStack {
                VStack(alignment: .leading, spacing: DesignTokens.Spacing.xs) {
                    Text(localization.t("snaps.title"))
                        .font(.system(size: DesignTokens.FontSize.xl, weight: .bold))
                        .foregroundColor(DesignTokens.Text.primary)

                    Text(localization.t("snaps.subtitle"))
                        .font(.system(size: DesignTokens.FontSize.sm))
                        .foregroundColor(DesignTokens.Text.secondary)
                }

                Spacer()

                GlassButton(localization.t("snaps.generate"), variant: .primary, size: .medium) {
                    onGenerateSnap?()
                }
            }
            .padding(DesignTokens.Spacing.md)
        }
    }

    private var snapsGrid: some View {
        LazyVGrid(columns: columns, spacing: DesignTokens.Spacing.md) {
            ForEach(snaps, id: \.id) { snap in
                SnapGridItem(snap: snap, onTap: { selectedSnap = snap })
            }
        }
    }

    private func snapDetailCard(_ snap: FamilySnap) -> some View {
        SnapDetailCard(
            snap: snap,
            onDismiss: { selectedSnap = nil },
            onShare: { showShareSheet = true },
            onDownload: { downloadSnap(snap) }
        )
    }

    private var emptyStateView: some View {
        EmptySnapsView(onGenerate: { onGenerateSnap?() })
    }

    private var loadingView: some View {
        VStack(spacing: DesignTokens.Spacing.md) {
            ProgressView()
                .tint(DesignTokens.Primary.default)
            Text(localization.t("snaps.loading"))
                .font(.system(size: DesignTokens.FontSize.base))
                .foregroundColor(DesignTokens.Text.secondary)
        }
        .padding(DesignTokens.Spacing.xl)
    }

    private func errorView(message: String) -> some View {
        GlassCard {
            VStack(spacing: DesignTokens.Spacing.sm) {
                Image(systemName: "exclamationmark.triangle")
                    .font(.system(size: 32))
                    .foregroundColor(DesignTokens.ErrorColor.default)

                Text(message)
                    .font(.system(size: DesignTokens.FontSize.base))
                    .foregroundColor(DesignTokens.ErrorColor.default)
                    .multilineTextAlignment(.center)

                GlassButton(localization.t("snaps.retry"), variant: .secondary, size: .medium) {
                    loadSnaps()
                }
                .padding(.top, DesignTokens.Spacing.sm)
            }
            .padding(DesignTokens.Spacing.md)
        }
    }

    private func loadSnaps() {
        isLoading = true
        error = nil
        Task {
            do {
                let loaded = try await repos.familySnapRepository.getSnaps(profileId: profileId, avatarId: avatarId)
                await MainActor.run {
                    snaps = loaded
                    isLoading = false
                }
            } catch {
                await MainActor.run {
                    self.error = localization.t("snaps.load_error")
                    isLoading = false
                }
            }
        }
    }

    private func downloadSnap(_ snap: FamilySnap) {
        Task {
            do {
                guard let url = URL(string: snap.imageUrl) else { return }
                let (data, _) = try await URLSession.shared.data(from: url)
                guard let image = UIImage(data: data) else { return }
                UIImageWriteToSavedPhotosAlbum(image, nil, nil, nil)
                await MainActor.run {
                    self.error = nil
                }
            } catch {
                await MainActor.run {
                    self.error = localization.t("snaps.download_error")
                }
            }
        }
    }
}
