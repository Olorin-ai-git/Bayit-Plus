import AVKit
import BayitDesignSystem
import BayitLocalization
import SwiftUI

struct CharacterDialogueView: View {
    @Environment(RepositoryProvider.self) private var repos
    @Environment(LocalizationManager.self) private var localization

    let profileId: String
    let contentId: String
    let characterName: String

    @State private var questions: CharacterQuestionsItem?
    @State private var exchanges: [DialogueExchangeEntry] = []
    @State private var customQuestion = ""
    @State private var sessionId: String?
    @State private var isLoading = true
    @State private var isSending = false
    @State private var error: String?
    @State private var videoPlayer: AVPlayer?

    var body: some View {
        ZStack {
            DesignTokens.Background.primary.ignoresSafeArea()

            if isLoading {
                ProgressView().tint(.white)
            } else if let error {
                ErrorStateView(message: error) {
                    Task { await loadQuestions() }
                }
            } else {
                dialogueContent
            }
        }
        .navigationTitle(characterName)
        .navigationBarTitleDisplayMode(.inline)
        .task { await loadQuestions() }
    }

    private var dialogueContent: some View {
        ScrollView(.vertical, showsIndicators: false) {
            VStack(spacing: DesignTokens.Spacing.lg) {
                characterHeader
                if let videoPlayer { videoSection(player: videoPlayer) }
                conversationList
                if let questions { questionsSection(questions) }
                inputSection
            }
            .padding(DesignTokens.Spacing.lg)
            .padding(.bottom, 100)
        }
    }

    private var characterHeader: some View {
        VStack(spacing: DesignTokens.Spacing.sm) {
            Image(systemName: "person.crop.circle.fill")
                .font(.system(size: 64))
                .foregroundStyle(DesignTokens.Primary.default)
            Text(characterName)
                .font(.system(size: DesignTokens.FontSize.xl, weight: .bold))
                .foregroundStyle(DesignTokens.Text.primary)
        }
    }

    private func videoSection(player: AVPlayer) -> some View {
        VideoPlayer(player: player)
            .frame(height: 200)
            .clipShape(RoundedRectangle(cornerRadius: DesignTokens.Radius.default))
    }

    private var conversationList: some View {
        ForEach(exchanges) { entry in
            GlassCard {
                VStack(alignment: .leading, spacing: DesignTokens.Spacing.xs) {
                    Text(entry.speaker)
                        .font(.system(size: DesignTokens.FontSize.sm, weight: .semibold))
                        .foregroundStyle(
                            entry.isUser
                                ? DesignTokens.Primary.default
                                : DesignTokens.Secondary.default
                        )
                    Text(entry.message)
                        .font(.system(size: DesignTokens.FontSize.md))
                        .foregroundStyle(DesignTokens.Text.primary)
                }
                .padding(DesignTokens.Spacing.md)
                .frame(maxWidth: .infinity, alignment: .leading)
            }
        }
    }

    private func questionsSection(_ questions: CharacterQuestionsItem) -> some View {
        VStack(alignment: .leading, spacing: DesignTokens.Spacing.sm) {
            if !questions.specificQuestions.isEmpty {
                sectionHeader(localization.t("zehAni.dialogue.specificQuestions"))
                ForEach(questions.specificQuestions, id: \.self) { q in
                    questionCard(q)
                }
            }
            if !questions.genericQuestions.isEmpty {
                sectionHeader(localization.t("zehAni.dialogue.genericQuestions"))
                ForEach(questions.genericQuestions, id: \.self) { q in
                    questionCard(q)
                }
            }
        }
    }

    private func sectionHeader(_ text: String) -> some View {
        Text(text).font(.system(size: DesignTokens.FontSize.sm, weight: .semibold))
            .foregroundStyle(DesignTokens.Text.secondary).padding(.top, DesignTokens.Spacing.sm)
    }

    private func questionCard(_ question: String) -> some View {
        GlassCard {
            Button { Task { await sendMessage(question) } } label: {
                Text(question).font(.system(size: DesignTokens.FontSize.md))
                    .foregroundStyle(DesignTokens.Text.primary)
                    .frame(maxWidth: .infinity, alignment: .leading).padding(DesignTokens.Spacing.md)
            }.disabled(isSending)
        }
    }

    private var inputSection: some View {
        HStack(spacing: DesignTokens.Spacing.sm) {
            TextField(localization.t("zehAni.dialogue.placeholder"), text: $customQuestion)
                .textFieldStyle(.roundedBorder)
            GlassButton(localization.t("zehAni.dialogue.send"), variant: .primary, size: .small,
                        icon: Image(systemName: "paperplane.fill"))
            {
                let msg = customQuestion; customQuestion = ""
                Task { await sendMessage(msg) }
            }.disabled(customQuestion.trimmingCharacters(in: .whitespaces).isEmpty || isSending)
        }
    }

    @MainActor
    private func loadQuestions() async {
        isLoading = true
        error = nil
        do {
            questions = try await repos.movieInteraction.getCharacterQuestions(
                contentId: contentId, characterName: characterName
            )
        } catch {
            self.error = error.localizedDescription
        }
        isLoading = false
    }

    @MainActor
    private func sendMessage(_ message: String) async {
        isSending = true
        do {
            if sessionId == nil {
                let session = try await repos.avatarMeshRepository.startFreeInteractionSession(
                    profileId: nil,
                    avatarId: profileId,
                    contentId: contentId, characterName: characterName,
                    currentTimestamp: 0
                )
                sessionId = session.id
            }
            exchanges.append(DialogueExchangeEntry(
                speaker: localization.t("zehAni.dialogue.you"), message: message, isUser: true
            ))
            guard let sid = sessionId else { return }
            let response = try await repos.avatarMeshRepository.sendInteractionMessage(
                sessionId: sid, message: message
            )
            exchanges.append(DialogueExchangeEntry(
                speaker: characterName, message: response.responseText, isUser: false
            ))
            if let videoUrl = URL(string: response.animatedVideoUrl), !response.animatedVideoUrl.isEmpty {
                videoPlayer = AVPlayer(url: videoUrl)
                videoPlayer?.play()
            }
        } catch {
            self.error = error.localizedDescription
        }
        isSending = false
    }
}

struct DialogueExchangeEntry: Identifiable {
    let id = UUID()
    let speaker: String
    let message: String
    let isUser: Bool
}
