#if os(tvOS)
    import BayitDesignSystem
    import BayitLocalization
    import SwiftUI

    protocol WatchPartyViewModelProtocol: AnyObject, Observable {
        var activeParty: WatchParty? { get set }
        var participants: [ParticipantState] { get set }
        var chatMessages: [PartyChatMessage] { get set }
        var isConnected: Bool { get set }

        func leaveParty() async
        func sendChat(_ message: String) async
        func syncPlayback(position: Double, isPlaying: Bool) async
    }

    struct TVPartyControlsView<ViewModel: WatchPartyViewModelProtocol>: View {
        @Bindable var viewModel: ViewModel
        let onSync: () -> Void

        @State private var showingRoomCode = false
        @State private var isLeavingParty = false

        var body: some View {
            HStack(spacing: TVDesignTokens.Spacing.lg) {
                SyncButton(
                    isConnected: viewModel.isConnected,
                    action: onSync
                )

                InviteButton(
                    roomCode: viewModel.activeParty?.roomCode ?? "",
                    showingRoomCode: $showingRoomCode
                )

                Spacer()

                LeavePartyButton(
                    isLeavingParty: $isLeavingParty,
                    action: {
                        Task {
                            await viewModel.leaveParty()
                        }
                    }
                )
            }
            .padding(TVDesignTokens.Spacing.md)
            .background(
                RoundedRectangle(cornerRadius: TVDesignTokens.Radius.md)
                    .fill(DesignTokens.Glass.bg)
                    .opacity(0.9)
            )
            .overlay(
                RoundedRectangle(cornerRadius: TVDesignTokens.Radius.md)
                    .stroke(DesignTokens.Glass.border, lineWidth: 1)
            )
            .alert(isPresented: $showingRoomCode) {
                Alert(
                    title: Text("Room Code"),
                    message: Text(viewModel.activeParty?.roomCode ?? ""),
                    dismissButton: .default(Text("OK"))
                )
            }
        }
    }

    private struct SyncButton: View {
        let isConnected: Bool
        let action: () -> Void

        @FocusState private var isFocused: Bool

        var body: some View {
            Button(action: action) {
                HStack(spacing: TVDesignTokens.Spacing.sm) {
                    Image(systemName: "arrow.triangle.2.circlepath")
                        .font(.system(size: TVDesignTokens.FontSize.base, weight: .semibold))

                    Text("Sync Playback")
                        .font(.system(size: TVDesignTokens.FontSize.base, weight: .semibold))
                }
                .foregroundColor(isConnected ? DesignTokens.Text.primary : DesignTokens.Text.muted)
                .padding(.horizontal, TVDesignTokens.Spacing.md)
                .padding(.vertical, TVDesignTokens.Spacing.sm)
                .background(
                    RoundedRectangle(cornerRadius: TVDesignTokens.Radius.sm)
                        .fill(isConnected ? DesignTokens.Colors.Semantic.info.opacity(0.2) : DesignTokens.Glass.bgLight)
                )
                .overlay(
                    RoundedRectangle(cornerRadius: TVDesignTokens.Radius.sm)
                        .stroke(isConnected ? DesignTokens.Colors.Semantic.info : DesignTokens.Glass.border, lineWidth: 2)
                )
            }
            .tvCardStyle()
            .disabled(!isConnected)
            .focused($isFocused)
        }
    }

    private struct InviteButton: View {
        let roomCode: String
        @Binding var showingRoomCode: Bool

        @FocusState private var isFocused: Bool

        var body: some View {
            Button(action: { showingRoomCode = true }) {
                HStack(spacing: TVDesignTokens.Spacing.sm) {
                    Image(systemName: "person.badge.plus")
                        .font(.system(size: TVDesignTokens.FontSize.base, weight: .semibold))

                    Text("Invite")
                        .font(.system(size: TVDesignTokens.FontSize.base, weight: .semibold))
                }
                .foregroundColor(DesignTokens.Text.primary)
                .padding(.horizontal, TVDesignTokens.Spacing.md)
                .padding(.vertical, TVDesignTokens.Spacing.sm)
                .background(
                    RoundedRectangle(cornerRadius: TVDesignTokens.Radius.sm)
                        .fill(DesignTokens.Colors.Semantic.success.opacity(0.2))
                )
                .overlay(
                    RoundedRectangle(cornerRadius: TVDesignTokens.Radius.sm)
                        .stroke(DesignTokens.Colors.Semantic.success, lineWidth: 2)
                )
            }
            .tvCardStyle()
            .focused($isFocused)
        }
    }

    private struct LeavePartyButton: View {
        @Binding var isLeavingParty: Bool
        let action: () -> Void

        @FocusState private var isFocused: Bool

        var body: some View {
            Button(action: {
                isLeavingParty = true
                action()
            }) {
                HStack(spacing: TVDesignTokens.Spacing.sm) {
                    Image(systemName: "rectangle.portrait.and.arrow.right")
                        .font(.system(size: TVDesignTokens.FontSize.base, weight: .semibold))

                    Text("Leave Party")
                        .font(.system(size: TVDesignTokens.FontSize.base, weight: .semibold))
                }
                .foregroundColor(DesignTokens.ErrorColor.default)
                .padding(.horizontal, TVDesignTokens.Spacing.md)
                .padding(.vertical, TVDesignTokens.Spacing.sm)
                .background(
                    RoundedRectangle(cornerRadius: TVDesignTokens.Radius.sm)
                        .fill(DesignTokens.ErrorColor.default.opacity(0.2))
                )
                .overlay(
                    RoundedRectangle(cornerRadius: TVDesignTokens.Radius.sm)
                        .stroke(DesignTokens.ErrorColor.default, lineWidth: 2)
                )
            }
            .tvCardStyle()
            .disabled(isLeavingParty)
            .focused($isFocused)
        }
    }

#endif
