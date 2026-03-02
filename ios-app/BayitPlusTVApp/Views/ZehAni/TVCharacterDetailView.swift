#if os(tvOS)
    import BayitCore
    import BayitDesignSystem
    import BayitLocalization
    import SwiftUI

    /// Character detail screen for tvOS with multi-select question flow.
    /// Users select questions, see quota status, confirm to trigger generation.
    struct TVCharacterDetailView: View {
        let character: InteractiveCharacterItem
        let movie: InteractableMovieItem
        @Environment(TVRepositoryProvider.self) var repos
        @Environment(LocalizationManager.self) var localization
        @State private var selectedQuestions: Set<String> = []
        @State private var interactionStatus: InteractionStatusResponse?
        @State private var isSubmitting = false
        @State private var submissionComplete = false
        private let logger = BayitLogger(category: "TVCharacterDetail")

        private var usedCount: Int {
            interactionStatus?.interactionCount ?? movie.interactionCount
        }

        private var maxCount: Int {
            interactionStatus?.maxInteractions ?? movie.maxInteractions
        }

        private var remaining: Int {
            max(maxCount - usedCount, 0)
        }

        private var canConfirm: Bool {
            !selectedQuestions.isEmpty
                && selectedQuestions.count <= remaining
                && !isSubmitting
        }

        var body: some View {
            ZStack {
                DesignTokens.Background.primary.ignoresSafeArea()
                ScrollView(.vertical, showsIndicators: false) {
                    LazyVStack(alignment: .leading, spacing: TVDesignTokens.Spacing.xl) {
                        characterHeader
                        Divider().overlay(DesignTokens.Glass.border)
                        descriptionSection
                        quotaBar
                        if !character.suggestedQuestions.isEmpty {
                            questionsSection
                        }
                        if submissionComplete { generationStatusSection }
                        confirmBar
                        Spacer()
                    }
                    .padding(TVDesignTokens.Spacing.xxl)
                }
                .focusSection()
            }
            .task { await loadStatus() }
        }
    }

    // MARK: - Header & Description

    extension TVCharacterDetailView {
        private var characterHeader: some View {
            HStack(spacing: TVDesignTokens.Spacing.xl) {
                avatarImage
                VStack(alignment: .leading, spacing: TVDesignTokens.Spacing.sm) {
                    Text(character.name)
                        .font(.system(size: TVDesignTokens.FontSize.xxl, weight: .bold))
                        .foregroundStyle(DesignTokens.Text.primary)
                    if let actor = character.actorName {
                        Text(actor)
                            .font(.system(size: TVDesignTokens.FontSize.lg))
                            .foregroundStyle(DesignTokens.Text.secondary)
                    }
                    Text(movie.title)
                        .font(.system(size: TVDesignTokens.FontSize.base))
                        .foregroundStyle(DesignTokens.Text.muted)
                }
                Spacer()
            }
        }

        private var avatarImage: some View {
            Group {
                if let url = URL(string: character.frameUrl) {
                    CachedAsyncImage(url: url) { phase in
                        switch phase {
                        case let .success(image):
                            image.resizable().scaledToFill()
                        default:
                            avatarPlaceholder
                        }
                    }
                } else {
                    avatarPlaceholder
                }
            }
            .frame(width: 160, height: 160)
            .clipShape(Circle())
            .overlay(Circle().stroke(DesignTokens.Glass.border, lineWidth: 1))
        }

        private var avatarPlaceholder: some View {
            ZStack {
                DesignTokens.Glass.bgStrong
                Image(systemName: "person.fill")
                    .font(.system(size: TVDesignTokens.FontSize.xxxl))
                    .foregroundStyle(DesignTokens.Text.muted)
            }
        }

        private var descriptionSection: some View {
            GlassCard(radius: TVDesignTokens.Radius.lg, padding: TVDesignTokens.Spacing.lg) {
                Text(character.description)
                    .font(.system(size: TVDesignTokens.FontSize.lg))
                    .foregroundStyle(DesignTokens.Text.primary)
                    .lineLimit(nil)
            }
        }
    }

    // MARK: - Quota Bar

    extension TVCharacterDetailView {
        private var quotaBar: some View {
            HStack(spacing: TVDesignTokens.Spacing.md) {
                Image(systemName: "chart.bar.fill")
                    .foregroundStyle(DesignTokens.Primary.default)
                Text(localization.t("zehAni.movieInteractions.quotaLabel"))
                    .font(.system(size: TVDesignTokens.FontSize.base, weight: .semibold))
                    .foregroundStyle(DesignTokens.Text.primary)

                let projected = usedCount + selectedQuestions.count
                quotaProgressBar(projected: projected)

                Text("\(projected) / \(maxCount)")
                    .font(.system(size: TVDesignTokens.FontSize.base, weight: .bold))
                    .foregroundStyle(quotaColor(projected: projected))
            }
            .padding(TVDesignTokens.Spacing.md)
            .background(DesignTokens.Glass.bg)
            .clipShape(RoundedRectangle(cornerRadius: TVDesignTokens.Radius.md))
        }

        private func quotaProgressBar(projected: Int) -> some View {
            GeometryReader { geo in
                ZStack(alignment: .leading) {
                    RoundedRectangle(cornerRadius: TVDesignTokens.Radius.sm)
                        .fill(DesignTokens.Glass.bgStrong)
                    RoundedRectangle(cornerRadius: TVDesignTokens.Radius.sm)
                        .fill(quotaColor(projected: projected))
                        .frame(width: geo.size.width * quotaFraction(projected: projected))
                }
            }
            .frame(height: 8)
            .frame(maxWidth: 200)
        }

        private func quotaFraction(projected: Int) -> CGFloat {
            guard maxCount > 0 else { return 0 }
            return min(CGFloat(projected) / CGFloat(maxCount), 1.0)
        }

        private func quotaColor(projected: Int) -> Color {
            if projected >= maxCount { return DesignTokens.ErrorColor.default }
            if projected >= maxCount - 2 { return DesignTokens.Warning.default }
            return DesignTokens.Success.default
        }
    }

    // MARK: - Question Selection

    extension TVCharacterDetailView {
        private var questionsSection: some View {
            VStack(alignment: .leading, spacing: TVDesignTokens.Spacing.md) {
                Text(localization.t("zehAni.movieInteractions.questionsSection"))
                    .font(.system(size: TVDesignTokens.FontSize.xl, weight: .bold))
                    .foregroundStyle(DesignTokens.Text.primary)
                ForEach(
                    Array(character.suggestedQuestions.prefix(5).enumerated()),
                    id: \.offset
                ) { _, question in
                    questionRow(question)
                }
            }
        }

        private func questionRow(_ question: String) -> some View {
            let isSelected = selectedQuestions.contains(question)
            let wouldExceed = !isSelected && selectedQuestions.count >= remaining
            let isAlreadyGenerated = interactionStatus?.moments.contains {
                $0.interactionPrompt == question
            } ?? false

            return Button {
                guard !isAlreadyGenerated else { return }
                if isSelected {
                    selectedQuestions.remove(question)
                } else if !wouldExceed {
                    selectedQuestions.insert(question)
                }
            } label: {
                HStack(spacing: TVDesignTokens.Spacing.md) {
                    Image(systemName: statusIcon(
                        isSelected: isSelected,
                        isGenerated: isAlreadyGenerated
                    ))
                    .font(.system(size: TVDesignTokens.FontSize.base))
                    .foregroundStyle(statusColor(
                        isSelected: isSelected,
                        isGenerated: isAlreadyGenerated,
                        wouldExceed: wouldExceed
                    ))

                    Text(question)
                        .font(.system(size: TVDesignTokens.FontSize.base))
                        .foregroundStyle(
                            wouldExceed && !isAlreadyGenerated
                                ? DesignTokens.Text.muted
                                : DesignTokens.Text.primary
                        )
                        .multilineTextAlignment(.leading)
                    Spacer()

                    if isAlreadyGenerated {
                        momentStatusBadge(for: question)
                    }
                }
                .padding(TVDesignTokens.Spacing.md)
                .background(
                    isSelected
                        ? DesignTokens.Primary.default.opacity(0.15)
                        : DesignTokens.Glass.bgLight
                )
                .clipShape(RoundedRectangle(cornerRadius: TVDesignTokens.Radius.md))
                .overlay(
                    RoundedRectangle(cornerRadius: TVDesignTokens.Radius.md)
                        .stroke(
                            isSelected
                                ? DesignTokens.Primary.default
                                : Color.clear,
                            lineWidth: 2
                        )
                )
            }
            .tvCardStyle()
            .disabled(isAlreadyGenerated)
        }

        private func statusIcon(isSelected: Bool, isGenerated: Bool) -> String {
            if isGenerated { return "checkmark.circle.fill" }
            return isSelected ? "checkmark.square.fill" : "square"
        }

        private func statusColor(
            isSelected: Bool, isGenerated: Bool, wouldExceed: Bool
        ) -> Color {
            if isGenerated { return DesignTokens.Success.default }
            if isSelected { return DesignTokens.Primary.default }
            if wouldExceed { return DesignTokens.Text.muted }
            return DesignTokens.Text.secondary
        }

        private func momentStatusBadge(for question: String) -> some View {
            let moment = interactionStatus?.moments.first {
                $0.interactionPrompt == question
            }
            let badgeText: String = {
                switch moment?.status {
                case "complete": return localization.t("common.done")
                case "generating_video": return localization.t("common.generating")
                case "generating_audio": return localization.t("common.generating")
                default: return localization.t("common.queued")
                }
            }()
            let badgeColor: Color = {
                switch moment?.status {
                case "complete": return DesignTokens.Success.default
                case "generating_video", "generating_audio":
                    return DesignTokens.Warning.default
                default: return DesignTokens.Text.muted
                }
            }()
            return Text(badgeText)
                .font(.system(size: TVDesignTokens.FontSize.xs, weight: .semibold))
                .foregroundStyle(badgeColor)
                .padding(.horizontal, TVDesignTokens.Spacing.sm)
                .padding(.vertical, TVDesignTokens.Spacing.xs)
                .background(DesignTokens.Glass.bgStrong)
                .clipShape(RoundedRectangle(cornerRadius: TVDesignTokens.Radius.sm))
        }
    }

    // MARK: - Generation Status

    extension TVCharacterDetailView {
        private var generationStatusSection: some View {
            VStack(alignment: .leading, spacing: TVDesignTokens.Spacing.md) {
                HStack(spacing: TVDesignTokens.Spacing.sm) {
                    Image(systemName: "wand.and.stars")
                        .foregroundStyle(DesignTokens.Primary.default)
                    Text(localization.t("zehAni.movieInteractions.generationTitle"))
                        .font(.system(size: TVDesignTokens.FontSize.lg, weight: .bold))
                        .foregroundStyle(DesignTokens.Text.primary)
                }
                if let status = interactionStatus {
                    ForEach(status.moments) { moment in
                        HStack(spacing: TVDesignTokens.Spacing.sm) {
                            generationIcon(for: moment.status)
                            Text(moment.interactionPrompt)
                                .font(.system(size: TVDesignTokens.FontSize.sm))
                                .foregroundStyle(DesignTokens.Text.primary)
                                .lineLimit(1)
                            Spacer()
                            Text(moment.status)
                                .font(.system(
                                    size: TVDesignTokens.FontSize.xs,
                                    weight: .medium
                                ))
                                .foregroundStyle(DesignTokens.Text.secondary)
                        }
                    }
                }
            }
            .padding(TVDesignTokens.Spacing.md)
            .background(DesignTokens.Glass.bg)
            .clipShape(RoundedRectangle(cornerRadius: TVDesignTokens.Radius.md))
        }

        private func generationIcon(for status: String) -> some View {
            Group {
                switch status {
                case "complete":
                    Image(systemName: "checkmark.circle.fill")
                        .foregroundStyle(DesignTokens.Success.default)
                case "generating_video", "generating_audio":
                    ProgressView()
                        .tint(DesignTokens.Warning.default)
                        .scaleEffect(0.7)
                default:
                    Image(systemName: "clock")
                        .foregroundStyle(DesignTokens.Text.muted)
                }
            }
            .font(.system(size: TVDesignTokens.FontSize.sm))
        }
    }

    // MARK: - Confirm Bar & Actions

    extension TVCharacterDetailView {
        private var confirmBar: some View {
            HStack(spacing: TVDesignTokens.Spacing.lg) {
                if !selectedQuestions.isEmpty {
                    Text(
                        String(
                            format: localization.t("zehAni.movieInteractions.selectedCount"),
                            selectedQuestions.count
                        )
                    )
                    .font(.system(size: TVDesignTokens.FontSize.base))
                    .foregroundStyle(DesignTokens.Text.secondary)
                }
                Spacer()
                if isSubmitting {
                    ProgressView()
                        .tint(DesignTokens.Primary.default)
                } else {
                    GlassButton(
                        localization.t("zehAni.movieInteractions.confirmButton"),
                        variant: .primary,
                        size: .large
                    ) {
                        Task { await submitSelection() }
                    }
                    .disabled(!canConfirm)
                    .opacity(canConfirm ? 1.0 : 0.5)
                }
            }
        }

        private func submitSelection() async {
            isSubmitting = true
            do {
                _ = try await repos.movieInteraction.selectInteractions(
                    contentId: movie.contentId,
                    characterName: character.name,
                    questions: Array(selectedQuestions)
                )
                selectedQuestions.removeAll()
                submissionComplete = true
                await loadStatus()
            } catch {
                logger.error(
                    "Failed to submit interactions: \(error.localizedDescription)"
                )
            }
            isSubmitting = false
        }

        private func loadStatus() async {
            do {
                interactionStatus = try await repos.movieInteraction.getInteractionStatus(
                    contentId: movie.contentId
                )
            } catch {
                // Non-fatal: quota bar will use movie defaults
            }
        }
    }
#endif
