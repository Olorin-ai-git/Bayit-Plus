import BayitDesignSystem
import BayitLocalization
import SwiftUI

/// Displays the active watch party with header, participants, chat feed, and input bar.
struct ActivePartySection: View {
    let party: WatchParty
    let participants: [ParticipantState]
    let chatMessages: [PartyChatMessage]
    @Binding var chatText: String
    let onSendChat: (String) -> Void
    let onLeave: () -> Void

    @Environment(\.localizationManager) private var localization

    var body: some View {
        VStack(spacing: 0) {
            partyHeader
            chatContent

            if party.chatEnabled {
                MessageInputBar(
                    text: $chatText,
                    placeholder: localization?.t("watchParty.chatPlaceholder") ?? "Say something...",
                    onSend: onSendChat
                )
            }
        }
    }

    // MARK: - Header

    private var partyHeader: some View {
        HStack {
            VStack(alignment: .leading, spacing: DesignTokens.Spacing.xxs) {
                Text(party.contentTitle ?? party.contentId)
                    .font(.system(size: DesignTokens.FontSize.md, weight: .semibold))
                    .foregroundStyle(DesignTokens.Text.primary)
                    .lineLimit(1)

                Text(localization?.t("watchParty.roomCode", ["code": party.roomCode]) ?? "Room: \(party.roomCode)")
                    .font(.system(size: DesignTokens.FontSize.sm))
                    .foregroundStyle(DesignTokens.Text.muted)
            }
            Spacer()
            GlassButton(
                localization?.t("watchParty.leave") ?? "Leave",
                variant: .secondary,
                size: .small,
                action: onLeave
            )
            .accessibilityLabel("Leave watch party")
        }
        .padding(.horizontal, DesignTokens.Spacing.base)
        .padding(.vertical, DesignTokens.Spacing.sm)
        .background(DesignTokens.Glass.bgStrong)
    }

    // MARK: - Chat Content

    private var chatContent: some View {
        ScrollView {
            VStack(spacing: DesignTokens.Spacing.sm) {
                participantsRow
                chatFeed
            }
            .padding(.horizontal, DesignTokens.Spacing.base)
            .padding(.vertical, DesignTokens.Spacing.sm)
        }
    }

    private var participantsRow: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: DesignTokens.Spacing.sm) {
                ForEach(participants) { participant in
                    VStack(spacing: DesignTokens.Spacing.xxs) {
                        Circle()
                            .fill(DesignTokens.Glass.bgMedium)
                            .frame(width: 36, height: 36)
                            .overlay(
                                Text(String(participant.userName.prefix(1)).uppercased())
                                    .font(.system(size: DesignTokens.FontSize.sm, weight: .semibold))
                                    .foregroundStyle(DesignTokens.Text.secondary)
                            )
                        Text(participant.userName)
                            .font(.system(size: DesignTokens.FontSize.xs))
                            .foregroundStyle(DesignTokens.Text.muted)
                            .lineLimit(1)
                    }
                    .accessibilityLabel("Participant: \(participant.userName)")
                }
            }
        }
    }

    private var chatFeed: some View {
        ForEach(chatMessages) { msg in
            MessageBubble(
                text: msg.message,
                timestamp: msg.timestamp,
                isSent: msg.isSent,
                isRead: true
            )
        }
    }
}
