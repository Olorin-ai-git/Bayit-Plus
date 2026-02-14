import BayitDesignSystem
import BayitLocalization
import SwiftUI

struct MeshGenerationView: View {
    @Environment(RepositoryProvider.self) private var repositories
    @Environment(LocalizationManager.self) private var localization
    @Environment(\.dismiss) private var dismiss

    let avatarId: String
    let profileId: String

    @State private var meshState: MeshState = .idle
    @State private var meshStatus: AvatarMeshStatus?
    @State private var error: String?
    @State private var pollingTask: Task<Void, Never>?
    @State private var showPreview = false

    enum MeshState {
        case idle
        case generating
        case rigging
        case ready
        case failed
    }

    var body: some View {
        NavigationStack {
            ZStack {
                DesignTokens.Background.primary.ignoresSafeArea()

                VStack(spacing: 32) {
                    statusSection
                    actionSection
                }
                .padding(24)
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
                Avatar3DPreviewView(avatarId: avatarId)
            }
        }
    }

    private var statusSection: some View {
        VStack(spacing: 16) {
            if meshState == .generating || meshState == .rigging {
                ProgressView()
                    .progressViewStyle(.circular)
                    .scaleEffect(1.5)
                    .tint(.white)
            }

            Text(statusText)
                .foregroundColor(.white)
                .font(.system(size: 18, weight: .medium))
                .multilineTextAlignment(.center)

            if meshState == .ready, let thumbnailPath = meshStatus?.thumbnailGcsPath {
                AsyncImage(url: URL(string: thumbnailPath)) { image in
                    image.resizable().scaledToFit()
                } placeholder: {
                    ProgressView()
                }
                .frame(width: 200, height: 200)
                .clipShape(RoundedRectangle(cornerRadius: 12))
            }

            if let error = error {
                Text(error)
                    .foregroundColor(DesignTokens.ErrorColor.default)
                    .font(.system(size: 14))
            }
        }
    }

    private var actionSection: some View {
        VStack(spacing: 12) {
            if meshState == .ready {
                Button {
                    showPreview = true
                } label: {
                    Text(localization.t("zehAni.mesh.viewPreview"))
                        .frame(maxWidth: .infinity)
                }
                .buttonStyle(.borderedProminent)
            }

            if meshState == .failed {
                Button {
                    retry()
                } label: {
                    Text(localization.t("common.retry"))
                        .frame(maxWidth: .infinity)
                }
                .buttonStyle(.bordered)
            }
        }
    }

    private var statusText: String {
        switch meshState {
        case .idle:
            return localization.t("zehAni.mesh.statusIdle")
        case .generating:
            return localization.t("zehAni.mesh.statusGenerating")
        case .rigging:
            return localization.t("zehAni.mesh.statusRigging")
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
                if meshState == .ready || meshState == .failed {
                    break
                }
                try? await Task.sleep(nanoseconds: 3_000_000_000)
            }
        }
    }

    private func fetchStatus() async {
        do {
            let status = try await repositories.avatarMeshRepository.fetchMeshStatus(avatarId: avatarId)
            await MainActor.run {
                meshStatus = status
                updateState(from: status)
            }
        } catch {
            await MainActor.run {
                self.error = error.localizedDescription
                meshState = .failed
            }
        }
    }

    private func updateState(from status: AvatarMeshStatus) {
        switch status.status.lowercased() {
        case "pending", "generating":
            meshState = .generating
        case "rigging":
            meshState = .rigging
        case "ready", "completed":
            meshState = .ready
        case "failed", "error":
            meshState = .failed
            error = status.errorMessage
        default:
            meshState = .idle
        }
    }

    private func retry() {
        error = nil
        meshState = .idle
        startPolling()
    }
}
