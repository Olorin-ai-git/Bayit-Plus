import BayitDesignSystem
import BayitLocalization
import SwiftUI

/// Join section extracted from ChessLobbyView for the 200-line limit.
struct ChessLobbyJoinView: View {
    let vm: ChessViewModel
    @Environment(LocalizationManager.self) private var localization

    var body: some View {
        VStack(spacing: DesignTokens.Spacing.md) {
            divider
            GlassButton(localization.t("chess.joinGame"), variant: .secondary) {
                vm.showingJoinSheet = true
            }

            if vm.showingJoinSheet {
                joinCodeEntry
            }
        }
        .padding(.horizontal, DesignTokens.Spacing.base)
        .padding(.top, DesignTokens.Spacing.lg)
    }

    private var divider: some View {
        HStack(spacing: DesignTokens.Spacing.md) {
            Rectangle().fill(DesignTokens.Glass.border).frame(height: 1)
            Text("or").font(.system(size: DesignTokens.FontSize.xs))
                .foregroundStyle(DesignTokens.Text.muted)
            Rectangle().fill(DesignTokens.Glass.border).frame(height: 1)
        }
    }

    private var joinCodeEntry: some View {
        GlassCard {
            VStack(spacing: DesignTokens.Spacing.md) {
                Text(localization.t("chess.enterGameCode"))
                    .font(.system(size: DesignTokens.FontSize.sm))
                    .foregroundStyle(DesignTokens.Text.secondary)
                HStack(spacing: DesignTokens.Spacing.sm) {
                    GlassTextField("XXXXXX", text: Binding(
                        get: { vm.joinCode },
                        set: { vm.joinCode = $0.uppercased() }
                    ))
                    GlassButton(localization.t("chess.join"), variant: .primary) {
                        Task { await vm.joinGame(code: vm.joinCode) }
                    }
                    .disabled(vm.joinCode.count != 6)
                }
            }
        }
    }
}
