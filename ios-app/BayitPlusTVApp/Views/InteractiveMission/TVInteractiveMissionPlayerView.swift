#if os(tvOS)
import AVKit
import BayitCore
import BayitDesignSystem
import Speech
import SwiftUI

/// tvOS interactive mission player: HLS video with speech-gated Hebrew decisions, focus buttons, voice input, scoring.
struct TVInteractiveMissionPlayerView: View {
    @Environment(TVRepositoryProvider.self) private var repos
    @Environment(LocalizationManager.self) private var localization
    let missionId: String
    let profileId: String
    var onComplete: (() -> Void)?
    @State private var mission: InteractiveMission?
    @State private var phase: Phase = .loading
    @State private var scene: Int = 1
    @State private var countdown: Int = 0
    @State private var listening = false
    @State private var lastResult: AttemptResult?
    @State private var player: AVPlayer?
    @State private var recognizer: SFSpeechRecognizer?
    @State private var recTask: SFSpeechRecognitionTask?
    @State private var engine: AVAudioEngine?
    @State private var attempt = 1
    @State private var shekels = 0
    @State private var score = 0.0
    private let logger = BayitLogger(category: "TVInteractiveMission")
    private var maxAttempts: Int { activeScene?.decision?.maxAttempts ?? 3 }
    private enum Phase { case loading, playing, decision, complete }

    var body: some View {
        ZStack {
            Color.black.ignoresSafeArea()
            switch phase {
            case .loading: loadingBody
            case .playing: playerBody
            case .decision: decisionBody
            case .complete: completeBody
            }
            if phase == .playing || phase == .decision { progressBar }
        }
        .task { await load() }
        .onAppear { setupSpeech() }
        .onDisappear { cleanup() }
        .onExitCommand { cleanup(); onComplete?() }
        .onPlayPauseCommand { player?.rate == 0 ? player?.play() : player?.pause() }
    }

    private var loadingBody: some View {
        VStack(spacing: TVDesignTokens.Spacing.xl) {
            ProgressView().tint(DesignTokens.Primary.default).scaleEffect(2.0)
            Text(localization.t("interactiveMission.preparing"))
                .font(.system(size: TVDesignTokens.FontSize.lg)).foregroundStyle(DesignTokens.Text.muted)
        }.frame(maxWidth: .infinity, maxHeight: .infinity)
    }

    @ViewBuilder private var playerBody: some View {
        if let p = player { TVVideoPlayerRepresentable(player: p).ignoresSafeArea() }
    }

    private var decisionBody: some View {
        ZStack {
            if let p = player { TVVideoPlayerRepresentable(player: p).ignoresSafeArea().opacity(0.3) }
            if let sc = activeScene, let dec = sc.decision { decisionPanel(dec) }
        }
    }

    private func decisionPanel(_ dec: MissionDecision) -> some View {
        VStack(spacing: TVDesignTokens.Spacing.xl) {
            Text(dec.promptText)
                .font(.system(size: TVDesignTokens.FontSize.xxl, weight: .bold))
                .foregroundStyle(DesignTokens.Primary.p400)
                .multilineTextAlignment(.center).environment(\.layoutDirection, .rightToLeft)
            if !dec.promptTransliteration.isEmpty {
                Text(dec.promptTransliteration).font(.system(size: TVDesignTokens.FontSize.lg))
                    .foregroundStyle(DesignTokens.Text.secondary).italic()
            }
            if countdown > 0 {
                Text("\(countdown)").font(.system(size: TVDesignTokens.FontSize.hero, weight: .bold).monospacedDigit())
                    .foregroundStyle(countdown <= 5 ? DesignTokens.Warning.default : DesignTokens.Text.primary)
            }
            if let r = lastResult, !r.success {
                HStack(spacing: TVDesignTokens.Spacing.sm) {
                    Image(systemName: "xmark.circle.fill").foregroundStyle(DesignTokens.ErrorColor.default)
                    Text(localization.t("interactiveMission.attemptOf", ["current": "\(attempt - 1)", "max": "\(maxAttempts)"]))
                        .font(.system(size: TVDesignTokens.FontSize.base)).foregroundStyle(DesignTokens.ErrorColor.default)
                }
            }
            ForEach(dec.expectedResponses.indices, id: \.self) { idx in
                Button { submit(dec.expectedResponses[idx]) } label: {
                    Text(dec.expectedResponses[idx])
                        .font(.system(size: TVDesignTokens.FontSize.lg, weight: .medium))
                        .foregroundStyle(DesignTokens.Text.primary).environment(\.layoutDirection, .rightToLeft)
                        .frame(maxWidth: .infinity).padding(TVDesignTokens.Spacing.lg)
                        .frame(minHeight: TVDesignTokens.MinSize.focusableHeight)
                }.buttonStyle(.card).tvFocusStyle().disabled(attempt > maxAttempts)
            }
            GlassButton(listening ? localization.t("interactiveMission.listening") : localization.t("interactiveMission.speakHebrew"),
                         variant: listening ? .secondary : .primary, size: .large) { toggleVoice() }
                .tvFocusStyle().disabled(countdown > 0 || attempt > maxAttempts)
        }
        .padding(TVDesignTokens.Spacing.xxxxl).frame(maxWidth: 900)
        .background(DesignTokens.Glass.bgStrong)
        .clipShape(RoundedRectangle(cornerRadius: TVDesignTokens.Radius.xl))
        .shadow(color: DesignTokens.Glass.purpleGlow, radius: 16)
    }

    private var completeBody: some View {
        VStack(spacing: TVDesignTokens.Spacing.xxl) {
            Image(systemName: "trophy.fill").font(.system(size: TVDesignTokens.FontSize.hero))
                .foregroundStyle(DesignTokens.Warning.default)
            Text(localization.t("interactiveMission.complete")).font(.system(size: TVDesignTokens.FontSize.xxxl, weight: .bold))
                .foregroundStyle(DesignTokens.Text.primary)
            Text(String(format: "%.1f%%", score)).font(.system(size: 80, weight: .bold).monospacedDigit())
                .foregroundStyle(DesignTokens.Primary.default)
            HStack(spacing: TVDesignTokens.Spacing.sm) {
                Image(systemName: "shekel.sign.circle.fill").font(.system(size: TVDesignTokens.FontSize.xxl))
                    .foregroundStyle(DesignTokens.Warning.default)
                Text(localization.t("interactiveMission.shekelsEarned", ["amount": "\(shekels)"])).font(.system(size: TVDesignTokens.FontSize.xl, weight: .semibold))
                    .foregroundStyle(DesignTokens.Text.primary)
            }
            GlassButton(localization.t("interactiveMission.continue"), variant: .primary, size: .large) { onComplete?() }.tvFocusStyle()
        }.frame(maxWidth: .infinity, maxHeight: .infinity)
    }

    private var progressBar: some View {
        VStack { Spacer(); GeometryReader { geo in ZStack(alignment: .leading) {
            RoundedRectangle(cornerRadius: 3).fill(Color.white.opacity(0.2)).frame(height: 6)
            RoundedRectangle(cornerRadius: 3).fill(DesignTokens.Primary.p400)
                .frame(width: geo.size.width * progressFrac, height: 6)
        }}.frame(height: 6).padding(.horizontal, TVDesignTokens.Spacing.xxl)
            .padding(.bottom, TVDesignTokens.Spacing.lg) }
    }
    private var progressFrac: CGFloat {
        guard let m = mission, m.totalScenes > 0 else { return 0 }
        return min(CGFloat(scene) / CGFloat(m.totalScenes), 1.0)
    }
    private var activeScene: InteractiveMission.Scene? {
        mission?.scenes.first { $0.sceneNumber == scene }
    }
    private func load() async {
        do {
            let m = try await repos.missions.fetchInteractiveMission(missionId: missionId)
            mission = m
            guard let url = URL(string: m.videoUrl) else { return }
            player = AVPlayer(url: url); phase = .playing; player?.play()
            logger.info("Loaded", context: ["id": missionId, "scenes": "\(m.totalScenes)"])
        } catch { logger.error("Load failed", error: error) }
    }
    private func submit(_ text: String) {
        Task {
            do {
                let r = try await repos.missions.submitMissionAttempt(
                    missionId: missionId, profileId: profileId,
                    sceneNumber: scene, attempt: attempt, userInput: text)
                lastResult = r
                if r.success { advance() } else { attempt += 1; if attempt > maxAttempts { advance() } }
                logger.info("Submitted", context: ["scene": "\(scene)", "ok": "\(r.success)"])
            } catch { logger.error("Submit failed", error: error) }
        }
    }
    private func advance() {
        guard let m = mission else { return }
        if scene < m.totalScenes {
            scene += 1; attempt = 1; lastResult = nil; countdown = 0; phase = .playing; player?.play()
        } else { finish() }
    }
    private func finish() {
        Task {
            do {
                let r = try await repos.missions.completeMissionSession(missionId: missionId, profileId: profileId)
                shekels = r.earnedShekels; score = r.finalScore; phase = .complete
                logger.info("Complete", context: ["shekels": "\(shekels)"])
            } catch { logger.error("Complete failed", error: error) }
        }
    }
    private func setupSpeech() {
        recognizer = SFSpeechRecognizer(locale: Locale(identifier: "he-IL"))
        engine = AVAudioEngine(); SFSpeechRecognizer.requestAuthorization { _ in }
    }
    private func toggleVoice() { listening ? stopVoice() : startVoice() }
    private func startVoice() {
        guard let rec = recognizer, let eng = engine, rec.isAvailable else { return }
        let req = SFSpeechAudioBufferRecognitionRequest(); let node = eng.inputNode
        recTask = rec.recognitionTask(with: req) { res, _ in
            if let r = res, r.isFinal { submit(r.bestTranscription.formattedString) }
        }
        node.installTap(onBus: 0, bufferSize: 1024, format: node.outputFormat(forBus: 0)) { b, _ in req.append(b) }
        eng.prepare(); try? eng.start(); listening = true
    }
    private func stopVoice() {
        engine?.stop(); engine?.inputNode.removeTap(onBus: 0); recTask?.cancel(); listening = false
    }
    private func cleanup() {
        player?.pause(); player = nil; stopVoice(); engine = nil; recognizer = nil
    }
}
#endif
