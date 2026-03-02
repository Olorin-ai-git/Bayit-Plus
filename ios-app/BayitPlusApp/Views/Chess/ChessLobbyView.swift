import BayitDesignSystem
import BayitLocalization
import SwiftUI

/// Glass-themed chess lobby with hero image, mode selection, time control, and join game.
struct ChessLobbyView: View {
    let vm: ChessViewModel
    @Environment(LocalizationManager.self) private var localization
    @State private var selectedMode: GameMode = .pvp
    @State private var selectedDifficulty: String = "medium"
    @State private var selectedColor: String = "white"
    @State private var selectedTimeControl: Int?

    private enum GameMode { case pvp, bot }

    private let timeControls: [(label: String, value: Int?)] = [
        ("chess.timeControl.unlimited", nil),
        ("chess.timeControl.bullet1", 60),
        ("chess.timeControl.blitz3", 180),
        ("chess.timeControl.blitz5", 300),
        ("chess.timeControl.rapid10", 600),
        ("chess.timeControl.classical30", 1800),
    ]

    var body: some View {
        ScrollView(showsIndicators: false) {
            VStack(spacing: 0) {
                heroSection
                modeSelectionSection.padding(.top, -DesignTokens.Spacing.xxl)
                actionSection
                ChessLobbyJoinView(vm: vm)
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
            if selectedMode == .bot { difficultyPicker }
            colorPicker
            timeControlPicker

            GlassButton(localization.t("chess.createGame"), variant: .primary) {
                let difficulty = selectedMode == .bot ? selectedDifficulty : nil
                let mode = selectedMode == .pvp ? "pvp" : "bot"
                Task {
                    await vm.createGame(
                        color: selectedColor, gameMode: mode,
                        botDifficulty: difficulty, timeControl: selectedTimeControl
                    )
                }
            }
            .disabled(vm.isLoading)
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
                chipButton(label: localization.t("chess.white"), isSelected: selectedColor == "white",
                           accent: DesignTokens.Gradient.ctaStart) { selectedColor = "white" }
                chipButton(label: localization.t("chess.black"), isSelected: selectedColor == "black",
                           accent: DesignTokens.Primary.p500) { selectedColor = "black" }
            }
        }
    }

    private var timeControlPicker: some View {
        VStack(alignment: .leading, spacing: DesignTokens.Spacing.sm) {
            Text(localization.t("chess.timeControl.label"))
                .font(.system(size: DesignTokens.FontSize.sm, weight: .medium))
                .foregroundStyle(DesignTokens.Text.secondary)
            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: DesignTokens.Spacing.sm) {
                    ForEach(timeControls, id: \.label) { tc in
                        chipButton(
                            label: localization.t(tc.label),
                            isSelected: selectedTimeControl == tc.value
                        ) { selectedTimeControl = tc.value }
                    }
                }
            }
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
}
