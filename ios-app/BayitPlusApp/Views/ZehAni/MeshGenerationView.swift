import BayitDesignSystem
import BayitLocalization
import SwiftUI

struct MeshGenerationView: View {
    @Environment(RepositoryProvider.self) private var repositories
    @Environment(LocalizationManager.self) private var localization
    @Environment(\.dismiss) private var dismiss

    let avatarId: String
    let profileId: String

    @State private var creationState: CreationState = .idle
    @State private var avatarStatus: CreatifyAvatarStatus?
    @State private var error: String?
    @State private var pollingTask: Task<Void, Never>?
    @State private var showPreview = false

    enum CreationState {
        case idle
        case creating
        case ready
        case failed
    }

    var body: some View {
        NavigationStack {
            ZStack {
                DesignTokens.Background.primary.ignoresSafeArea()

                VStack(spacing: DesignTokens.Spacing.xxl) {
                    statusSection
                    actionSection
                }
                .padding(DesignTokens.Spacing.xl)
            }
            .navigationTitle(localization.t("zehAni.mesh.title"))
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    Button(localization.t("common.close")) {
                        pollingTask?.cancel()
                        dismiss()
                    }
                }
            }
            .onAppear {
                startPolling()
            }
            .onDisappear {
                pollingTask?.cancel()
            }
            .sheet(isPresented: $showPreview) {
                if let imageUrl = avatarStatus?.avatarImageUrl {
                    Avatar3DPreviewView(avatarImageUrl: imageUrl)
                }
            }
        }
    }

    private var statusSection: some View {
        VStack(spacing: DesignTokens.Spacing.base) {
            if creationState == .creating {
                ProgressView()
                    .progressViewStyle(.circular)
                    .scaleEffect(1.5)
                    .tint(.white)
            }

            Text(statusText)
                .foregroundStyle(DesignTokens.Text.primary)
                .font(.system(size: DesignTokens.FontSize.lg, weight: .medium))
                .multilineTextAlignment(.center)

            if creationState == .ready,
               let imageUrl = avatarStatus?.avatarImageUrl,
               let url = URL(string: imageUrl)
            {
                CachedAsyncImage(url: url) { phase in
                    if case let .success(image) = phase {
                        image.resizable().scaledToFit()
                    } else {
                        ProgressView()
                    }
                }
                .frame(width: 200, height: 200)
                .clipShape(RoundedRectangle(cornerRadius: DesignTokens.Radius.md))
            }

            if let error = error {
                Text(error)
                    .foregroundStyle(DesignTokens.ErrorColor.default)
                    .font(.system(size: DesignTokens.FontSize.sm))
            }
        }
    }

    private var actionSection: some View {
        VStack(spacing: DesignTokens.Spacing.md) {
            if creationState == .ready {
                GlassButton(
                    localization.t("zehAni.mesh.viewPreview"),
                    variant: .primary, size: .large
                ) {
                    showPreview = true
                }
            }

            if creationState == .failed {
                GlassButton(
                    localization.t("common.retry"),
                    variant: .secondary, size: .large
                ) {
                    retry()
                }
            }
        }
    }

    private var statusText: String {
        switch creationState {
        case .idle:
            return localization.t("zehAni.mesh.statusIdle")
        case .creating:
            return localization.t("zehAni.mesh.statusGenerating")
        case .ready:
            return localization.t("zehAni.mesh.statusReady")
        case .failed:
            return localization.t("zehAni.mesh.statusFailed")
        }
    }

    private func startPolling() {
        pollingTask = Task {
            while !Task.isCancelled {
                await fetchStatus()
                if creationState == .ready || creationState == .failed {
                    break
                }
                try? await Task.sleep(nanoseconds: 3_000_000_000)
            }
        }
    }

    private func fetchStatus() async {
        do {
            let status = try await repositories.avatarMeshRepository.fetchAvatarStatus(avatarId: avatarId)
            await MainActor.run {
                avatarStatus = status
                updateState(from: status)
            }
        } catch {
            await MainActor.run {
                self.error = error.localizedDescription
                creationState = .failed
            }
        }
    }

    private func updateState(from status: CreatifyAvatarStatus) {
        switch status.status.lowercased() {
        case "not_started", "creating":
            creationState = .creating
        case "ready":
            creationState = .ready
        case "failed":
            creationState = .failed
            error = status.errorMessage
        default:
            creationState = .idle
        }
    }

    private func retry() {
        error = nil
        creationState = .idle
        startPolling()
    }
}
