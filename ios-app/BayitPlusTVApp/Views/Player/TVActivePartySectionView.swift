#if os(tvOS)
    import BayitDesignSystem
    import BayitLocalization
    import SwiftUI

    struct TVActivePartySectionView: View {
        @Environment(LocalizationManager.self) private var localization
        let party: WatchParty
        let participants: [ParticipantState]

        private var visibleParticipants: [ParticipantState] {
            Array(participants.prefix(5))
        }

        private var additionalCount: Int {
            max(0, participants.count - 5)
        }

        var body: some View {
            HStack(spacing: TVDesignTokens.Spacing.md) {
                VStack(alignment: .leading, spacing: TVDesignTokens.Spacing.sm) {
                    Text(party.contentTitle ?? localization.t("watchParty.title"))
                        .font(.system(size: TVDesignTokens.FontSize.base, weight: .semibold))
                        .foregroundColor(DesignTokens.Text.primary)

                    HStack(spacing: TVDesignTokens.Spacing.sm) {
                        Text(localization.t("watchParty.roomCodeDisplay", ["code": party.roomCode]))
                            .font(.system(size: TVDesignTokens.FontSize.sm))
                            .foregroundColor(DesignTokens.Text.secondary)

                        ParticipantCountBadge(count: party.participantCount)
                    }
                }

                Spacer()

                ParticipantAvatarRow(
                    participants: visibleParticipants,
                    additionalCount: additionalCount,
                    party: party
                )
            }
            .padding(TVDesignTokens.Spacing.md)
            .background(
                RoundedRectangle(cornerRadius: TVDesignTokens.Radius.md)
                    .fill(DesignTokens.Glass.bg)
                    .opacity(0.8)
            )
            .overlay(
                RoundedRectangle(cornerRadius: TVDesignTokens.Radius.md)
                    .stroke(DesignTokens.Glass.border, lineWidth: 1)
            )
        }
    }

    private struct ParticipantCountBadge: View {
        @Environment(LocalizationManager.self) private var localization
        let count: Int

        var body: some View {
            HStack(spacing: TVDesignTokens.Spacing.xs) {
                Circle()
                    .fill(DesignTokens.Colors.Semantic.success)
                    .frame(width: 8, height: 8)

                Text(localization.t("watchParty.watching", ["count": "\(count)"]))
                    .font(.system(size: TVDesignTokens.FontSize.sm))
                    .foregroundColor(DesignTokens.Text.secondary)
            }
            .padding(.horizontal, TVDesignTokens.Spacing.sm)
            .padding(.vertical, TVDesignTokens.Spacing.xs)
            .background(
                Capsule()
                    .fill(DesignTokens.Background.elevated)
            )
        }
    }

    private struct ParticipantAvatarRow: View {
        let participants: [ParticipantState]
        let additionalCount: Int
        let party: WatchParty?

        var body: some View {
            HStack(spacing: TVDesignTokens.Spacing.xs) {
                ForEach(participants) { participant in
                    ParticipantAvatar(participant: participant, party: party)
                }

                if additionalCount > 0 {
                    AdditionalCountBadge(count: additionalCount)
                }
            }
        }
    }

    private struct ParticipantAvatar: View {
        let participant: ParticipantState
        let party: WatchParty?

        private var initials: String {
            String(participant.userName.prefix(1).uppercased())
        }

        private var isHost: Bool {
            party?.hostId == participant.userId
        }

        var body: some View {
            ZStack {
                Circle()
                    .fill(DesignTokens.Background.elevated)
                    .frame(width: 40, height: 40)

                Text(initials)
                    .font(.system(size: TVDesignTokens.FontSize.base, weight: .semibold))
                    .foregroundColor(DesignTokens.Text.primary)
            }
            .overlay(
                Circle()
                    .stroke(isHost ? DesignTokens.Colors.Semantic.warning : DesignTokens.Glass.border, lineWidth: 2)
            )
        }
    }

    private struct AdditionalCountBadge: View {
        let count: Int

        var body: some View {
            ZStack {
                Circle()
                    .fill(DesignTokens.Glass.bgLight)
                    .frame(width: 40, height: 40)

                Text("+\(count)")
                    .font(.system(size: TVDesignTokens.FontSize.sm, weight: .semibold))
                    .foregroundColor(DesignTokens.Text.secondary)
            }
            .overlay(
                Circle()
                    .stroke(DesignTokens.Glass.border, lineWidth: 1)
            )
        }
    }

    #Preview {
        TVActivePartySectionView(
            party: WatchParty(
                id: "party1",
                hostId: "user1",
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
                participantCount: 8,
                isActive: true,
                createdAt: Date(),
                startedAt: Date()
            ),
            participants: [
                ParticipantState(userId: "1", userName: "Sarah", isSpeaking: false, isMuted: false, isVideoOn: true, joinedAt: Date()),
                ParticipantState(userId: "2", userName: "David", isSpeaking: false, isMuted: false, isVideoOn: true, joinedAt: Date()),
                ParticipantState(userId: "3", userName: "Rachel", isSpeaking: false, isMuted: true, isVideoOn: false, joinedAt: Date()),
                ParticipantState(userId: "4", userName: "Michael", isSpeaking: false, isMuted: false, isVideoOn: true, joinedAt: Date()),
                ParticipantState(userId: "5", userName: "Leah", isSpeaking: false, isMuted: false, isVideoOn: true, joinedAt: Date()),
                ParticipantState(userId: "6", userName: "Jonathan", isSpeaking: false, isMuted: false, isVideoOn: true, joinedAt: Date()),
                ParticipantState(userId: "7", userName: "Hannah", isSpeaking: false, isMuted: false, isVideoOn: false, joinedAt: Date()),
                ParticipantState(userId: "8", userName: "Eli", isSpeaking: false, isMuted: false, isVideoOn: true, joinedAt: Date()),
            ]
        )
        .frame(width: 800)
        .padding()
        .background(Color.black)
    }
#endif
