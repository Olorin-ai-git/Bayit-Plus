import BayitDesignSystem
import BayitLocalization
import SwiftUI

struct MovieCharactersView: View {
    @Environment(RepositoryProvider.self) private var repos
    @Environment(NavigationCoordinator.self) private var coordinator
    @Environment(LocalizationManager.self) private var localization

    let profileId: String
    let contentId: String

    @State private var characters: [InteractiveCharacterItem] = []
    @State private var status: String = ""
    @State private var isLoading = true
    @State private var error: String?

    private let columns = [
        GridItem(.flexible(), spacing: DesignTokens.Spacing.md),
        GridItem(.flexible(), spacing: DesignTokens.Spacing.md),
    ]

    var body: some View {
        ZStack {
            DesignTokens.Background.primary.ignoresSafeArea()

            if isLoading {
                ProgressView().tint(.white)
            } else if let error {
                ErrorStateView(message: error) {
                    Task { await loadCharacters() }
                }
            } else if characters.isEmpty {
                emptyState
            } else {
                characterGrid
            }
        }
        .navigationTitle(localization.t("zehAni.movieCharacters.title"))
        .navigationBarTitleDisplayMode(.large)
        .task { await loadCharacters() }
    }

    private var emptyState: some View {
        VStack(spacing: DesignTokens.Spacing.lg) {
            Image(systemName: "person.crop.circle.badge.questionmark")
                .font(.system(size: DesignTokens.FontSize.hero))
                .foregroundStyle(DesignTokens.Text.muted)
            Text(localization.t("zehAni.movieCharacters.empty"))
                .font(.system(size: DesignTokens.FontSize.md))
                .foregroundStyle(DesignTokens.Text.secondary)
        }
    }

    private var characterGrid: some View {
        ScrollView(.vertical, showsIndicators: false) {
            LazyVGrid(columns: columns, spacing: DesignTokens.Spacing.lg) {
                ForEach(characters) { character in
                    characterTile(character)
                }
            }
            .padding(DesignTokens.Spacing.lg)
            .padding(.bottom, 100)
        }
    }

    private func characterTile(_ character: InteractiveCharacterItem) -> some View {
        GlassCard {
            Button {
                coordinator.pushToCurrentTab(
                    .zehAniCharacterDialogue(
                        profileId: profileId,
                        contentId: contentId,
                        characterName: character.name
                    )
                )
            } label: {
                VStack(spacing: DesignTokens.Spacing.sm) {
                    characterAvatar(url: character.frameUrl)
                    characterInfo(character)
                }
                .padding(DesignTokens.Spacing.md)
            }
            .buttonStyle(.plain)
        }
    }

    private func characterAvatar(url: String) -> some View {
        Group {
            if let imageUrl = URL(string: url) {
                AsyncImage(url: imageUrl) { phase in
                    switch phase {
                    case .success(let img):
                        img.resizable().scaledToFill()
                    case .failure:
                        avatarPlaceholder
                    default:
                        ProgressView().tint(.white)
                    }
                }
            } else {
                avatarPlaceholder
            }
        }
        .frame(width: 100, height: 100)
        .clipShape(Circle())
        .overlay(Circle().stroke(DesignTokens.Glass.border, lineWidth: 1))
    }

    private var avatarPlaceholder: some View {
        DesignTokens.Glass.bgMedium
            .overlay {
                Image(systemName: "person.fill")
                    .font(.system(size: DesignTokens.FontSize.xxl))
                    .foregroundStyle(DesignTokens.Text.muted)
            }
    }

    private func characterInfo(_ character: InteractiveCharacterItem) -> some View {
        VStack(spacing: DesignTokens.Spacing.xxs) {
            Text(character.name)
                .font(.system(size: DesignTokens.FontSize.md, weight: .semibold))
                .foregroundStyle(DesignTokens.Text.primary)
                .lineLimit(1)

            if let actorName = character.actorName {
                Text(actorName)
                    .font(.system(size: DesignTokens.FontSize.sm))
                    .foregroundStyle(DesignTokens.Text.secondary)
                    .lineLimit(1)
            }

            Text(character.description)
                .font(.system(size: DesignTokens.FontSize.xs))
                .foregroundStyle(DesignTokens.Text.muted)
                .lineLimit(2)
                .multilineTextAlignment(.center)
        }
    }

    @MainActor
    private func loadCharacters() async {
        isLoading = true
        error = nil
        do {
            let tagStatus = try await repos.movieInteraction.getMovieCharacters(
                contentId: contentId
            )
            characters = tagStatus.characters
            status = tagStatus.status
        } catch {
            self.error = error.localizedDescription
        }
        isLoading = false
    }
}
