import BayitDesignSystem
import BayitLocalization
import SwiftUI

/// Player overlay for Bilingual Bridge dubbing controls.
/// Shows ratio gauge, vocabulary count, toggle, and level badge
/// in a compact non-intrusive layout during playback.
struct BilingualDubbingOverlayView: View {
    @Environment(LocalizationManager.self) private var localization
    @Bindable var viewModel: BilingualDubbingViewModel
    let contentId: String
    let profileId: String

    var body: some View {
        VStack {
            Spacer()
            if viewModel.proficiency != nil {
                overlayContent
                    .padding(.horizontal, DesignTokens.Spacing.lg)
                    .padding(.bottom, DesignTokens.Spacing.xxxl)
                    .transition(.opacity.combined(with: .move(edge: .bottom)))
            }
        }
        .animation(.easeInOut(duration: 0.3), value: viewModel.isActive)
        .task {
            await viewModel.fetchProficiency(profileId: profileId)
        }
    }

    // MARK: - Overlay Content

    private var overlayContent: some View {
        GlassCard(radius: DesignTokens.Radius.lg, padding: DesignTokens.Spacing.md) {
            HStack(spacing: DesignTokens.Spacing.md) {
                toggleButton
                levelBadge
                ratioBar
                vocabularyCount
            }
        }
    }

    // MARK: - Toggle

    private var toggleButton: some View {
        Button {
            Task {
                if viewModel.isActive {
                    await viewModel.endSession()
                } else {
                    await viewModel.startSession(
                        contentId: contentId,
                        profileId: profileId
                    )
                }
            }
        } label: {
            Image(systemName: viewModel.isActive
                  ? "textformat.abc.dottedunderline"
                  : "textformat.abc")
                .font(.system(size: DesignTokens.FontSize.md, weight: .semibold))
                .foregroundStyle(viewModel.isActive
                    ? DesignTokens.Primary.default
                    : DesignTokens.Text.secondary)
                .frame(
                    width: DesignTokens.Spacing.xxxl,
                    height: DesignTokens.Spacing.xxxl
                )
                .background(
                    viewModel.isActive
                        ? DesignTokens.Primary.default.opacity(0.2)
                        : DesignTokens.Glass.bgLight
                )
                .clipShape(Circle())
        }
        .accessibilityLabel("Bilingual Bridge")
        .accessibilityValue(viewModel.isActive ? "Active" : "Inactive")
        .accessibilityHint("Double tap to toggle bilingual dubbing")
    }

    // MARK: - Level Badge

    @ViewBuilder
    private var levelBadge: some View {
        if let proficiency = viewModel.proficiency {
            GlassBadge(
                text: proficiency.level,
                variant: badgeVariant(for: proficiency.level)
            )
            .accessibilityLabel("Level: \(proficiency.level)")
        }
    }

    // MARK: - Ratio Bar

    private var ratioBar: some View {
        LanguageRatioView(
            hebrewRatio: viewModel.activeSession?.actualHebrewRatio
                ?? viewModel.proficiency?.hebrewRatio ?? 0,
            compact: true
        )
        .frame(maxWidth: 120)
    }

    // MARK: - Vocabulary Count

    @ViewBuilder
    private var vocabularyCount: some View {
        if let proficiency = viewModel.proficiency {
            VStack(spacing: DesignTokens.Spacing.xxs) {
                Text("\(proficiency.totalWordsLearned)")
                    .font(.system(size: DesignTokens.FontSize.md, weight: .bold))
                    .foregroundStyle(DesignTokens.Text.primary)
                Text(localization.t("bilingual.words"))
                    .font(.system(size: DesignTokens.FontSize.xs))
                    .foregroundStyle(DesignTokens.Text.muted)
            }
            .accessibilityElement(children: .combine)
            .accessibilityLabel("\(proficiency.totalWordsLearned) words learned")
        }
    }

    // MARK: - Helpers

    private func badgeVariant(for level: String) -> GlassBadge.Variant {
        switch level {
        case "beginner": return .primary
        case "elementary": return .info
        case "intermediate": return .warning
        case "advanced": return .success
        default: return .primary
        }
    }
}
