import BayitDesignSystem
import BayitLocalization
import AVFoundation
import Speech
import SwiftUI

struct InteractiveMissionPlayerView: View {
    @Environment(RepositoryProvider.self) private var repos
    @Environment(LocalizationManager.self) private var localization

    let missionId: String
    let profileId: String
    var onComplete: (() -> Void)?

    @State private var viewModel = InteractiveMissionViewModel()

    var body: some View {
        ZStack {
            DesignTokens.Background.primary
                .ignoresSafeArea()

            if viewModel.playState == .loading {
                LoadingView()
            } else if viewModel.playState == .playing, let player = viewModel.player, let mission = viewModel.mission {
                MissionVideoPlayerView(player: player, currentScene: viewModel.currentScene, totalScenes: mission.scenes.count)
            } else if viewModel.playState == .decision {
                decisionOverlay
            } else if viewModel.playState == .complete {
                completionView
            }

            if let error = viewModel.error {
                ErrorOverlayView(message: error)
            }
        }
        .onAppear {
            loadMission()
            viewModel.setupSpeech()
        }
        .onDisappear {
            viewModel.cleanup()
        }
    }

    private var decisionOverlay: some View {
        Group {
            if let scene = viewModel.currentSceneData {
                DecisionOverlayView(
                    scene: scene,
                    countdown: viewModel.countdown,
                    lastResult: viewModel.lastResult,
                    currentAttempt: viewModel.currentAttempt,
                    isListening: viewModel.isListening,
                    onToggleListening: viewModel.toggleListening
                )
            }
        }
    }

    private var completionView: some View {
        CompletionView(
            finalScore: viewModel.finalScore,
            earnedShekels: viewModel.earnedShekels,
            onComplete: { onComplete?() }
        )
    }

    private func loadMission() {
        viewModel.onTranscript = submitAttempt
        Task {
            do {
                let loaded = try await repos.interactiveMissionRepository.getMission(missionId: missionId)
                await MainActor.run {
                    viewModel.mission = loaded
                    viewModel.setupPlayer(videoUrl: loaded.videoUrl)
                }
            } catch {
                await MainActor.run {
                    viewModel.error = localization.t("mission.load_error")
                }
            }
        }
    }

    private func submitAttempt(transcript: String) {
        Task {
            do {
                let result = try await repos.interactiveMissionRepository.submitAttempt(
                    missionId: missionId,
                    profileId: profileId,
                    sceneNumber: viewModel.currentScene,
                    attempt: viewModel.currentAttempt,
                    userInput: transcript
                )
                await MainActor.run {
                    viewModel.handleSubmitResult(result)
                    if viewModel.playState == .complete {
                        completeTask()
                    }
                }
            } catch {
                await MainActor.run {
                    viewModel.error = localization.t("mission.submit_error")
                }
            }
        }
    }

    private func completeTask() {
        Task {
            do {
                let completion = try await repos.interactiveMissionRepository.completeMission(
                    missionId: missionId,
                    profileId: profileId
                )
                await MainActor.run {
                    viewModel.handleCompletion(completion)
                }
            } catch {
                await MainActor.run {
                    viewModel.error = localization.t("mission.complete_error")
                }
            }
        }
    }
}
