import BayitDesignSystem
import BayitLocalization
import SwiftUI

/// Search results section for the tvOS Friends screen.
/// Displays matching users with "Add" button for non-friends.
struct TVFriendSearchResultsSection: View {
    @Environment(LocalizationManager.self) private var localization

    let results: [UserSearchResult]
    let onSendRequest: (String) async -> Void

    var body: some View {
        VStack(alignment: .leading, spacing: TVDesignTokens.Spacing.lg) {
            Text(localization.t("friends.searchResults", ["count": "\(results.count)"]))
                .font(.system(size: TVDesignTokens.FontSize.xl, weight: .bold))
                .foregroundStyle(DesignTokens.Text.primary)
                .padding(.leading, TVDesignTokens.Spacing.xl)

            LazyVStack(spacing: TVDesignTokens.Spacing.md) {
                ForEach(results) { result in
                    searchResultCard(result)
                }
            }
            .padding(.horizontal, TVDesignTokens.Spacing.xl)
        }
    }

    private func searchResultCard(_ result: UserSearchResult) -> some View {
        Button {} label: {
            HStack(spacing: TVDesignTokens.Spacing.lg) {
                TVUserAvatarRow(name: result.name, avatarURL: result.avatar, isOnline: nil)
                Spacer()
                if !result.isFriend && !result.hasPendingRequest {
                    GlassButton("Add", variant: .primary, size: .medium) {
                        Task { await onSendRequest(result.id) }
                    }
                    .tvFocusStyle()
                } else if result.hasPendingRequest {
                    Text(localization.t("friends.pending"))
                        .font(.system(size: TVDesignTokens.FontSize.base))
                        .foregroundStyle(DesignTokens.Text.muted)
                }
            }
            .padding(TVDesignTokens.Spacing.lg)
            .background(DesignTokens.Glass.bg)
            .clipShape(RoundedRectangle(cornerRadius: TVDesignTokens.Radius.default))
        }
        .buttonStyle(.card)
        .tvFocusStyle()
    }
}
