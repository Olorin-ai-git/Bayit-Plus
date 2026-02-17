import BayitDesignSystem
import BayitLocalization
import SwiftUI

/// tvOS subtitle language picker with AI mode chips, split display, and OpenSubtitles.
/// Uses focusable card buttons for Siri Remote navigation.
struct TVSubtitleLanguagePickerView: View {
    @Environment(LocalizationManager.self) private var localization
    let availableLanguages: [String]
    let selectedLanguage: String?
    let isSplitEnabled: Bool
    let onSelect: (String?) -> Void
    let onSplitTap: () -> Void
    let onDismiss: () -> Void

    // AI mode support
    var contentId: String = ""
    var repository: (any SubtitleRepository)?
    var currentHebrewMode: SubtitleHebrewMode = .standard
    var currentEnglishMode: SubtitleEnglishMode = .standard
    var hasNikud: Bool = false
    var hasShoresh: Bool = false
    var hasHeblish: Bool = false
    var hasEngrew: Bool = false
    var isAdmin: Bool = false
    var onHebrewModeSelect: ((SubtitleHebrewMode) -> Void)?
    var onEnglishModeSelect: ((SubtitleEnglishMode) -> Void)?
    var onSubtitlesRefresh: (() -> Void)?

    @State private var generatingMode: String?
    @State private var jobProgress: Int = 0
    @State private var currentJobId: String?
    @State private var generationError: String?
    @State private var pollingTask: Task<Void, Never>?
    @State private var isCancelling = false

    var body: some View {
        VStack(alignment: .leading, spacing: TVDesignTokens.Spacing.lg) {
            Text(localization.t("subtitles.title"))
                .font(.system(size: TVDesignTokens.FontSize.xl, weight: .bold))
                .foregroundColor(DesignTokens.Text.primary)

            ScrollView(.vertical, showsIndicators: false) {
                VStack(spacing: TVDesignTokens.Spacing.md) {
                    offButton

                    ForEach(languageRows, id: \.code) { info in
                        VStack(spacing: 0) {
                            languageButton(info: info)

                            // AI mode chips for selected Hebrew
                            if selectedLanguage == info.code && info.code == "he" {
                                hebrewModeChips
                            }

                            // AI mode chips for selected English
                            if selectedLanguage == info.code && info.code == "en" {
                                englishModeChips
                            }
                        }
                    }

                    // Split display
                    if availableLanguages.count >= 2 {
                        splitButton
                    }

                    // OpenSubtitles download
                    if let repo = repository, !contentId.isEmpty {
                        Divider()
                            .background(DesignTokens.Text.muted.opacity(0.3))
                            .padding(.vertical, TVDesignTokens.Spacing.sm)

                        TVOpenSubtitlesDownloadView(
                            contentId: contentId,
                            repository: repo,
                            onSuccess: { onSubtitlesRefresh?() }
                        )
                    }
                }
            }
        }
        .padding(.horizontal, TVDesignTokens.Spacing.lg)
        .padding(.top, TVDesignTokens.Spacing.lg)
        .background(DesignTokens.Background.primary)
        .onExitCommand { onDismiss() }
        .onAppear { checkActiveJobs() }
        .onDisappear { pollingTask?.cancel() }
    }

    // MARK: - Off Button

    private var offButton: some View {
        Button {
            onSelect(nil)
            onDismiss()
        } label: {
            HStack(spacing: TVDesignTokens.Spacing.md) {
                Image(systemName: "slash.circle")
                    .font(.system(size: 28))
                    .foregroundStyle(DesignTokens.Text.secondary)

                Text(localization.t("subtitles.off"))
                    .font(.system(
                        size: TVDesignTokens.FontSize.md, weight: .medium
                    ))
                    .foregroundStyle(DesignTokens.Text.primary)

                Spacer()

                if selectedLanguage == nil {
                    Image(systemName: "checkmark.circle.fill")
                        .font(.system(size: 24))
                        .foregroundStyle(DesignTokens.Primary.p400)
                }
            }
            .frame(minHeight: TVDesignTokens.MinSize.focusableHeight)
            .padding(.horizontal, TVDesignTokens.Spacing.lg)
        }
        .buttonStyle(.card)
    }

    // MARK: - Language Button

    private func languageButton(info: SubtitleLanguageInfo) -> some View {
        let isSelected = selectedLanguage == info.code
        let hasAI = info.code == "he" || info.code == "en"

        return Button {
            onSelect(info.code)
            // Stay open for Hebrew/English so user can see mode chips
            if !hasAI || isSelected {
                onDismiss()
            }
        } label: {
            HStack(spacing: TVDesignTokens.Spacing.md) {
                Text(info.emojiFlag)
                    .font(.system(size: 28))

                VStack(alignment: .leading, spacing: 2) {
                    HStack(spacing: TVDesignTokens.Spacing.xs) {
                        Text(info.nativeName)
                            .font(.system(
                                size: TVDesignTokens.FontSize.md,
                                weight: .medium
                            ))
                            .foregroundStyle(DesignTokens.Text.primary)

                        if hasAI {
                            Image(systemName: "sparkles")
                                .font(.system(size: 14))
                                .foregroundStyle(DesignTokens.Primary.p400)
                        }

                        if isSelected, let modeText = activeModeName(for: info.code) {
                            Text("(\(modeText))")
                                .font(.system(
                                    size: TVDesignTokens.FontSize.sm,
                                    weight: .medium
                                ))
                                .foregroundStyle(DesignTokens.Primary.p400)
                        }
                    }

                    Text(info.name)
                        .font(.system(size: TVDesignTokens.FontSize.sm))
                        .foregroundStyle(DesignTokens.Text.muted)
                }

                Spacer()

                if isSelected {
                    Image(systemName: "checkmark.circle.fill")
                        .font(.system(size: 24))
                        .foregroundStyle(DesignTokens.Primary.p400)
                }
            }
            .frame(minHeight: TVDesignTokens.MinSize.focusableHeight)
            .padding(.horizontal, TVDesignTokens.Spacing.lg)
        }
        .buttonStyle(.card)
    }

    // MARK: - Hebrew Mode Chips

    private var hebrewModeChips: some View {
        VStack(alignment: .leading, spacing: TVDesignTokens.Spacing.sm) {
            Text(localization.t("subtitles.aiModes"))
                .font(.system(
                    size: TVDesignTokens.FontSize.sm, weight: .medium
                ))
                .foregroundStyle(DesignTokens.Primary.p400)
                .padding(.leading, TVDesignTokens.Spacing.lg)

            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: TVDesignTokens.Spacing.focusGap) {
                    ForEach(SubtitleHebrewMode.allCases, id: \.self) { mode in
                        hebrewModeChip(mode)
                    }
                }
                .padding(.horizontal, TVDesignTokens.Spacing.lg)
            }

            generationErrorView
        }
        .padding(.vertical, TVDesignTokens.Spacing.sm)
    }

    private func hebrewModeChip(_ mode: SubtitleHebrewMode) -> some View {
        let isSelected = mode == currentHebrewMode
        let isAvailable = hebrewModeAvailable(mode)
        let isAI = mode != .standard
        let isGenerating = isAI && generatingMode == mode.rawValue

        return Button {
            if isAvailable {
                onHebrewModeSelect?(mode)
                onDismiss()
            } else if isGenerating {
                Task { await handleCancelJob() }
            } else if isAI {
                Task { await triggerHebrewGeneration(mode: mode) }
            }
        } label: {
            HStack(spacing: TVDesignTokens.Spacing.xs) {
                if isAI {
                    if isGenerating {
                        ProgressView()
                            .progressViewStyle(.circular)
                            .tint(DesignTokens.Primary.p400)
                            .scaleEffect(0.6)
                    } else {
                        Image(
                            systemName: isAvailable
                                ? "sparkles" : "lock.fill"
                        )
                        .font(.system(size: 14))
                        .foregroundStyle(
                            isSelected
                                ? .white : DesignTokens.Primary.p400
                        )
                    }
                }
                Text(
                    isGenerating
                        ? "\(mode.displayName) \(jobProgress)%"
                        : mode.displayName
                )
                .font(.system(
                    size: TVDesignTokens.FontSize.sm, weight: .semibold
                ))
                .foregroundStyle(
                    isSelected ? .white :
                        (isAvailable || isGenerating ? .white : .gray)
                )
            }
            .frame(minHeight: TVDesignTokens.MinSize.focusableHeight)
            .padding(.horizontal, TVDesignTokens.Spacing.lg)
        }
        .buttonStyle(.card)
    }

    // MARK: - English Mode Chips

    private var englishModeChips: some View {
        VStack(alignment: .leading, spacing: TVDesignTokens.Spacing.sm) {
            Text(localization.t("subtitles.aiModes"))
                .font(.system(
                    size: TVDesignTokens.FontSize.sm, weight: .medium
                ))
                .foregroundStyle(DesignTokens.Primary.p400)
                .padding(.leading, TVDesignTokens.Spacing.lg)

            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: TVDesignTokens.Spacing.focusGap) {
                    ForEach(SubtitleEnglishMode.allCases, id: \.self) { mode in
                        englishModeChip(mode)
                    }
                }
                .padding(.horizontal, TVDesignTokens.Spacing.lg)
            }

            generationErrorView
        }
        .padding(.vertical, TVDesignTokens.Spacing.sm)
    }

    private func englishModeChip(_ mode: SubtitleEnglishMode) -> some View {
        let isSelected = mode == currentEnglishMode
        let isAvailable = englishModeAvailable(mode)
        let isAI = mode != .standard
        let isGenerating = isAI && generatingMode == mode.rawValue

        return Button {
            if isAvailable {
                onEnglishModeSelect?(mode)
                onDismiss()
            } else if isGenerating {
                Task { await handleCancelJob() }
            } else if isAI {
                Task { await triggerEngrewGeneration() }
            }
        } label: {
            HStack(spacing: TVDesignTokens.Spacing.xs) {
                if isAI {
                    if isGenerating {
                        ProgressView()
                            .progressViewStyle(.circular)
                            .tint(DesignTokens.Primary.p400)
                            .scaleEffect(0.6)
                    } else {
                        Image(
                            systemName: isAvailable
                                ? "sparkles" : "lock.fill"
                        )
                        .font(.system(size: 14))
                        .foregroundStyle(
                            isSelected
                                ? .white : DesignTokens.Primary.p400
                        )
                    }
                }
                Text(
                    isGenerating
                        ? "\(mode.displayName) \(jobProgress)%"
                        : mode.displayName
                )
                .font(.system(
                    size: TVDesignTokens.FontSize.sm, weight: .semibold
                ))
                .foregroundStyle(
                    isSelected ? .white :
                        (isAvailable || isGenerating ? .white : .gray)
                )
            }
            .frame(minHeight: TVDesignTokens.MinSize.focusableHeight)
            .padding(.horizontal, TVDesignTokens.Spacing.lg)
        }
        .buttonStyle(.card)
    }

    // MARK: - Split Button

    private var splitButton: some View {
        Group {
            Divider()
                .background(DesignTokens.Text.muted.opacity(0.3))
                .padding(.vertical, TVDesignTokens.Spacing.sm)

            Button {
                onSplitTap()
            } label: {
                HStack(spacing: TVDesignTokens.Spacing.md) {
                    Image(
                        systemName: "text.line.first.and.arrowtriangle.forward"
                    )
                    .font(.system(size: 28))
                    .foregroundStyle(DesignTokens.Primary.p400)

                    VStack(alignment: .leading, spacing: 4) {
                        Text(localization.t("subtitles.splitDisplay"))
                            .font(.system(
                                size: TVDesignTokens.FontSize.md,
                                weight: .medium
                            ))
                            .foregroundStyle(DesignTokens.Text.primary)

                        Text(localization.t("subtitles.twoLanguagesSideBySide"))
                            .font(.system(size: TVDesignTokens.FontSize.sm))
                            .foregroundStyle(DesignTokens.Text.muted)
                    }

                    Spacer()

                    if isSplitEnabled {
                        Image(systemName: "checkmark.circle.fill")
                            .font(.system(size: 24))
                            .foregroundStyle(DesignTokens.Primary.p400)
                    }
                }
                .frame(minHeight: TVDesignTokens.MinSize.focusableHeight)
                .padding(.horizontal, TVDesignTokens.Spacing.lg)
            }
            .buttonStyle(.card)
        }
    }

    // MARK: - Error View

    @ViewBuilder
    private var generationErrorView: some View {
        if let error = generationError {
            HStack(spacing: TVDesignTokens.Spacing.xs) {
                Image(systemName: "exclamationmark.triangle")
                    .font(.system(size: 14))
                    .foregroundStyle(.red)

                Text(error)
                    .font(.system(size: TVDesignTokens.FontSize.sm))
                    .foregroundStyle(.red.opacity(0.9))
            }
            .padding(.leading, TVDesignTokens.Spacing.lg)
        }
    }

    // MARK: - Helpers

    private var languageRows: [SubtitleLanguageInfo] {
        availableLanguages.compactMap { SubtitleLanguages.info(for: $0) }
    }

    private func hebrewModeAvailable(_ mode: SubtitleHebrewMode) -> Bool {
        switch mode {
        case .standard: return true
        case .nikud: return hasNikud
        case .shoresh: return hasShoresh
        case .heblish: return hasHeblish
        }
    }

    private func englishModeAvailable(_ mode: SubtitleEnglishMode) -> Bool {
        switch mode {
        case .standard: return true
        case .engrew: return hasEngrew
        }
    }

    private func activeModeName(for code: String) -> String? {
        switch code {
        case "he" where currentHebrewMode != .standard:
            return currentHebrewMode.displayName
        case "en" where currentEnglishMode != .standard:
            return currentEnglishMode.displayName
        default:
            return nil
        }
    }

    // MARK: - AI Generation

    private func triggerHebrewGeneration(mode: SubtitleHebrewMode) async {
        guard !contentId.isEmpty,
              let repo = repository as? APISubtitleRepository
        else { return }

        generatingMode = mode.rawValue
        generationError = nil
        jobProgress = 0

        do {
            let result: AIGenerationJobResponse
            switch mode {
            case .nikud:
                result = try await repo.generateNikud(contentId: contentId)
            case .shoresh:
                result = try await repo.generateShoresh(contentId: contentId)
            case .heblish:
                result = try await repo.generateHeblish(contentId: contentId)
            case .standard:
                return
            }

            if result.status == .completed {
                generatingMode = nil
                onSubtitlesRefresh?()
                return
            }
            if let jobId = result.jobId {
                currentJobId = jobId
                startPolling(jobId: jobId, modeKey: mode.rawValue)
            }
        } catch {
            generationError = "Failed to start \(mode.displayName) generation"
            generatingMode = nil
        }
    }

    private func triggerEngrewGeneration() async {
        guard !contentId.isEmpty,
              let repo = repository as? APISubtitleRepository
        else { return }

        generatingMode = SubtitleEnglishMode.engrew.rawValue
        generationError = nil
        jobProgress = 0

        do {
            let result = try await repo.generateEngrew(contentId: contentId)

            if result.status == .completed {
                generatingMode = nil
                onSubtitlesRefresh?()
                return
            }
            if let jobId = result.jobId {
                currentJobId = jobId
                startPolling(
                    jobId: jobId,
                    modeKey: SubtitleEnglishMode.engrew.rawValue
                )
            }
        } catch {
            generationError = "Failed to start Engrew generation"
            generatingMode = nil
        }
    }

    private func startPolling(jobId: String, modeKey: String) {
        pollingTask?.cancel()
        pollingTask = Task {
            while !Task.isCancelled {
                try? await Task.sleep(nanoseconds: 2_000_000_000)
                guard !Task.isCancelled else { break }

                do {
                    guard let repo = repository as? APISubtitleRepository
                    else { break }
                    let status = try await repo.getJobStatus(jobId: jobId)
                    jobProgress = status.progress

                    switch status.status {
                    case .completed:
                        generatingMode = nil
                        currentJobId = nil
                        jobProgress = 0
                        onSubtitlesRefresh?()
                        return
                    case .failed:
                        generationError =
                            status.errorMessage ?? "\(modeKey) generation failed"
                        generatingMode = nil
                        currentJobId = nil
                        return
                    case .cancelled:
                        generatingMode = nil
                        currentJobId = nil
                        return
                    case .pending, .processing:
                        continue
                    }
                } catch {
                    generationError = "Lost connection to generation job"
                    generatingMode = nil
                    currentJobId = nil
                    return
                }
            }
        }
    }

    private func handleCancelJob() async {
        guard let jobId = currentJobId, !isCancelling,
              let repo = repository as? APISubtitleRepository
        else { return }

        isCancelling = true
        pollingTask?.cancel()

        do {
            _ = try await repo.cancelJob(jobId: jobId)
            generatingMode = nil
            jobProgress = 0
            currentJobId = nil
        } catch {
            generationError = "Failed to cancel job"
        }
        isCancelling = false
    }

    private func checkActiveJobs() {
        guard !contentId.isEmpty,
              let repo = repository as? APISubtitleRepository
        else { return }

        Task {
            do {
                let active = try await repo.getActiveJobs(
                    contentId: contentId
                )
                if let job = active.nikudJob,
                   job.status == .pending || job.status == .processing {
                    resumeActiveJob(job, modeKey: "nikud")
                } else if let job = active.shoreshJob,
                          job.status == .pending || job.status == .processing {
                    resumeActiveJob(job, modeKey: "shoresh")
                } else if let job = active.heblishJob,
                          job.status == .pending || job.status == .processing {
                    resumeActiveJob(job, modeKey: "heblish")
                } else if let job = active.engrewJob,
                          job.status == .pending || job.status == .processing {
                    resumeActiveJob(job, modeKey: "engrew")
                }
            } catch {
                // Non-critical: active job check is supplementary
            }
        }
    }

    private func resumeActiveJob(
        _ job: AIGenerationJobResponse, modeKey: String
    ) {
        generatingMode = modeKey
        jobProgress = job.progress
        currentJobId = job.jobId
        if let jobId = job.jobId {
            startPolling(jobId: jobId, modeKey: modeKey)
        }
    }
}
