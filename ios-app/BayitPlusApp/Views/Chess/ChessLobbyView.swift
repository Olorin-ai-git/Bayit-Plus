import BayitDesignSystem
import BayitLocalization
import SwiftUI

/// Glass-themed chess lobby with hero image, mode selection, and join game.
struct ChessLobbyView: View {
    let vm: ChessViewModel
    @Environment(LocalizationManager.self) private var localization
    @State private var selectedMode: GameMode = .pvp
    @State private var selectedDifficulty: String = "medium"
    @State private var selectedColor: String = "white"

    private enum GameMode { case pvp, bot }

    var body: some View {
        ScrollView(showsIndicators: false) {
            VStack(spacing: 0) {
                heroSection
                modeSelectionSection
                    .padding(.top, -DesignTokens.Spacing.xxl)
                actionSection
                joinSection
            }
            .padding(.bottom, 120)
        }
    }

    // MARK: - Hero

    private var heroSection: some View {
        ZStack(alignment: .bottomLeading) {
            Image("chess-splash")
                .resizable()
                .scaledToFill()
                .frame(height: 200)
                .clipped()
                .overlay(
                    LinearGradient(
                        colors: [.clear, DesignTokens.Background.primary],
                        startPoint: .top, endPoint: .bottom
                    )
                )

            VStack(alignment: .leading, spacing: DesignTokens.Spacing.xs) {
                Text(localization.t("chess.title"))
                    .font(.system(size: DesignTokens.FontSize.display, weight: .bold))
                    .foregroundStyle(DesignTokens.Text.primary)
                Text(localization.t("chess.subtitle"))
                    .font(.system(size: DesignTokens.FontSize.base))
                    .foregroundStyle(DesignTokens.Text.secondary)
            }
            .padding(.horizontal, DesignTokens.Spacing.base)
            .padding(.bottom, DesignTokens.Spacing.xxxl)
        }
    }

    // MARK: - Mode Selection

    private var modeSelectionSection: some View {
        HStack(spacing: DesignTokens.Spacing.md) {
            modeCard(
                title: localization.t("chess.playVsFriend"),
                icon: "person.2.fill",
                isSelected: selectedMode == .pvp
            ) { selectedMode = .pvp }

            modeCard(
                title: localization.t("chess.playVsBot"),
                icon: "cpu",
                isSelected: selectedMode == .bot
            ) { selectedMode = .bot }
        }
        .padding(.horizontal, DesignTokens.Spacing.base)
    }

    private func modeCard(
        title: String, icon: String, isSelected: Bool, action: @escaping () -> Void
    ) -> some View {
        Button(action: action) {
            VStack(spacing: DesignTokens.Spacing.sm) {
                Image(systemName: icon)
                    .font(.system(size: DesignTokens.FontSize.xxl))
                    .foregroundStyle(isSelected ? DesignTokens.Gradient.ctaStart : DesignTokens.Text.muted)
                Text(title)
                    .font(.system(size: DesignTokens.FontSize.sm, weight: .semibold))
                    .foregroundStyle(isSelected ? DesignTokens.Text.primary : DesignTokens.Text.muted)
            }
            .frame(maxWidth: .infinity)
            .padding(.vertical, DesignTokens.Spacing.lg)
            .background(isSelected ? DesignTokens.Glass.purpleStrong : DesignTokens.Glass.bg)
            .clipShape(RoundedRectangle(cornerRadius: DesignTokens.Radius.lg))
            .overlay(
                RoundedRectangle(cornerRadius: DesignTokens.Radius.lg)
                    .stroke(isSelected ? DesignTokens.Glass.borderFocus : DesignTokens.Glass.borderLight, lineWidth: 1)
            )
        }
        .buttonStyle(.plain)
        .accessibilityLabel(title)
    }

    // MARK: - Action Section

    private var actionSection: some View {
        VStack(spacing: DesignTokens.Spacing.md) {
            if selectedMode == .bot {
                difficultyPicker
            }
            colorPicker

            GlassButton(localization.t("chess.createGame"), variant: .primary) {
                let difficulty = selectedMode == .bot ? selectedDifficulty : nil
                let mode = selectedMode == .pvp ? "pvp" : "bot"
                Task { await vm.createGame(color: selectedColor, gameMode: mode, botDifficulty: difficulty) }
            }
        }
        .padding(.horizontal, DesignTokens.Spacing.base)
        .padding(.top, DesignTokens.Spacing.lg)
    }

    private var difficultyPicker: some View {
        VStack(alignment: .leading, spacing: DesignTokens.Spacing.sm) {
            Text(localization.t("chess.difficulty"))
                .font(.system(size: DesignTokens.FontSize.sm, weight: .medium))
                .foregroundStyle(DesignTokens.Text.secondary)

            HStack(spacing: DesignTokens.Spacing.sm) {
                ForEach(["easy", "medium", "hard"], id: \.self) { level in
                    chipButton(
                        label: localization.t("chess.\(level)"),
                        isSelected: selectedDifficulty == level
                    ) { selectedDifficulty = level }
                }
            }
        }
    }

    private var colorPicker: some View {
        VStack(alignment: .leading, spacing: DesignTokens.Spacing.sm) {
            Text(localization.t("chess.chooseColor"))
                .font(.system(size: DesignTokens.FontSize.sm, weight: .medium))
                .foregroundStyle(DesignTokens.Text.secondary)

            HStack(spacing: DesignTokens.Spacing.sm) {
                colorChip(label: localization.t("chess.white"), value: "white", accent: DesignTokens.Gradient.ctaStart)
                colorChip(label: localization.t("chess.black"), value: "black", accent: DesignTokens.Primary.p500)
            }
        }
    }

    private func colorChip(label: String, value: String, accent: Color) -> some View {
        chipButton(label: label, isSelected: selectedColor == value, accent: accent) {
            selectedColor = value
        }
    }

    private func chipButton(
        label: String, isSelected: Bool, accent: Color = DesignTokens.Gradient.ctaStart,
        action: @escaping () -> Void
    ) -> some View {
        Button(action: action) {
            Text(label)
                .font(.system(size: DesignTokens.FontSize.sm, weight: .medium))
                .foregroundStyle(isSelected ? DesignTokens.Text.primary : DesignTokens.Text.muted)
                .padding(.horizontal, DesignTokens.Spacing.base)
                .padding(.vertical, DesignTokens.Spacing.sm)
                .background(isSelected ? accent.opacity(0.3) : DesignTokens.Glass.bgLight)
                .clipShape(Capsule())
                .overlay(Capsule().stroke(isSelected ? accent.opacity(0.6) : Color.clear, lineWidth: 1))
        }
        .buttonStyle(.plain)
    }

    // MARK: - Join Section

    private var joinSection: some View {
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
