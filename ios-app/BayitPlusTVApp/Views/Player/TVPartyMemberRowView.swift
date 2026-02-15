#if os(tvOS)
import SwiftUI
import BayitDesignSystem
import BayitLocalization

struct TVPartyMemberRowView: View {
    let participant: ParticipantState
    let party: WatchParty?

    private var initials: String {
        String(participant.userName.prefix(1).uppercased())
    }

    private var isHost: Bool {
        party?.hostId == participant.userId
    }

    private var statusColor: Color {
        !participant.isMuted ? DesignTokens.Colors.Semantic.success : DesignTokens.Text.muted
    }

    private var statusText: String {
        if participant.isSpeaking {
            return "Speaking"
        } else if participant.isMuted {
            return "Muted"
        } else {
            return "Ready"
        }
    }

    var body: some View {
        HStack(spacing: TVDesignTokens.Spacing.md) {
            ParticipantAvatarCircle(
                initials: initials,
                isHost: isHost
            )

            VStack(alignment: .leading, spacing: TVDesignTokens.Spacing.xs) {
                HStack(spacing: TVDesignTokens.Spacing.sm) {
                    Text(participant.userName)
                        .font(.system(size: TVDesignTokens.FontSize.base, weight: .semibold))
                        .foregroundColor(DesignTokens.Text.primary)

                    if isHost {
                        HostBadge()
                    }
                }

                HStack(spacing: TVDesignTokens.Spacing.xs) {
                    StatusIndicator(color: statusColor)

                    Text(statusText)
                        .font(.system(size: TVDesignTokens.FontSize.sm))
                        .foregroundColor(DesignTokens.Text.secondary)
                }
            }

            Spacer()

            if isHost {
                HostCrownIcon()
            }
        }
        .padding(TVDesignTokens.Spacing.md)
        .background(
            RoundedRectangle(cornerRadius: TVDesignTokens.Radius.sm)
                .fill(DesignTokens.Background.elevated)
        )
        .overlay(
            RoundedRectangle(cornerRadius: TVDesignTokens.Radius.sm)
                .stroke(isHost ? DesignTokens.Colors.Semantic.warning.opacity(0.3) : DesignTokens.Glass.border, lineWidth: 1)
        )
    }
}

private struct ParticipantAvatarCircle: View {
    let initials: String
    let isHost: Bool

    var body: some View {
        ZStack {
            Circle()
                .fill(isHost ? DesignTokens.Colors.Semantic.warning.opacity(0.2) : DesignTokens.Glass.bgLight)
                .frame(width: 60, height: 60)

            Text(initials)
                .font(.system(size: TVDesignTokens.FontSize.xxl, weight: .bold))
                .foregroundColor(isHost ? DesignTokens.Colors.Semantic.warning : DesignTokens.Text.primary)
        }
        .overlay(
            Circle()
                .stroke(isHost ? DesignTokens.Colors.Semantic.warning : DesignTokens.Glass.border, lineWidth: 2)
        )
    }
}

private struct StatusIndicator: View {
    let color: Color

    var body: some View {
        Circle()
            .fill(color)
            .frame(width: 10, height: 10)
    }
}

private struct HostBadge: View {
    var body: some View {
        Text("HOST")
            .font(.system(size: TVDesignTokens.FontSize.sm, weight: .bold))
            .foregroundColor(DesignTokens.Colors.Semantic.warning)
            .padding(.horizontal, TVDesignTokens.Spacing.sm)
            .padding(.vertical, TVDesignTokens.Spacing.xs)
            .background(
                Capsule()
                    .fill(DesignTokens.Colors.Semantic.warning.opacity(0.2))
            )
            .overlay(
                Capsule()
                    .stroke(DesignTokens.Colors.Semantic.warning, lineWidth: 1)
            )
    }
}

private struct HostCrownIcon: View {
    var body: some View {
        Image(systemName: "crown.fill")
            .font(.system(size: TVDesignTokens.FontSize.xxl))
            .foregroundColor(DesignTokens.Colors.Semantic.warning)
    }
}

#Preview {
    let sampleParty = WatchParty(
        id: "party1",
        hostId: "1",
        hostName: "Sarah Cohen",
        contentId: "content1",
        contentType: "episode",
        contentTitle: "Shtisel Season 3",
        roomCode: "ABC123",
        isPrivate: false,
        maxParticipants: 10,
        audioEnabled: true,
        chatEnabled: true,
        syncPlayback: true,
        participants: [],
        participantCount: 3,
        isActive: true,
        createdAt: Date(),
        startedAt: Date()
    )

    VStack(spacing: TVDesignTokens.Spacing.md) {
        TVPartyMemberRowView(
            participant: ParticipantState(
                userId: "1",
                userName: "Sarah Cohen",
                isSpeaking: false,
                isMuted: false,
                isVideoOn: true,
                joinedAt: Date()
            ),
            party: sampleParty
        )

        TVPartyMemberRowView(
            participant: ParticipantState(
                userId: "2",
                userName: "David Levi",
                isSpeaking: false,
                isMuted: false,
                isVideoOn: true,
                joinedAt: Date()
            ),
            party: sampleParty
        )

        TVPartyMemberRowView(
            participant: ParticipantState(
                userId: "3",
                userName: "Rachel Goldstein",
                isSpeaking: false,
                isMuted: true,
                isVideoOn: false,
                joinedAt: Date()
            ),
            party: sampleParty
        )
    }
    .padding()
    .background(Color.black)
}
#endif
