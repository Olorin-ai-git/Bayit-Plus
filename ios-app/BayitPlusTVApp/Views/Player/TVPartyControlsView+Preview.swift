#if os(tvOS)
    import SwiftUI

    #Preview {
        @Previewable @State var mockViewModel = PreviewWatchPartyViewModel()

        return TVPartyControlsView(
            viewModel: mockViewModel,
            onSync: {}
        )
        .frame(width: 1200)
        .padding()
        .background(Color.black)
    }

    @Observable
    class PreviewWatchPartyViewModel: WatchPartyViewModelProtocol {
        var activeParty: WatchParty?
        var participants: [ParticipantState] = []
        var chatMessages: [PartyChatMessage] = []
        var isConnected = true

        init() {
            activeParty = WatchParty(
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
                participantCount: 5,
                isActive: true,
                createdAt: Date(),
                startedAt: Date()
            )
        }

        func leaveParty() async {
            isConnected = false
            activeParty = nil
            participants = []
            chatMessages = []
        }

        func sendChat(_: String) async {}

        func syncPlayback(position _: Double, isPlaying _: Bool) async {}
    }
#endif
