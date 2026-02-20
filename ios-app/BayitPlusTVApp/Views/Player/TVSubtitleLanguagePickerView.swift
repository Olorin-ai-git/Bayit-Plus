import BayitDesignSystem
import BayitLocalization
import SwiftUI

/// tvOS subtitle language picker where each AI-generated variation
/// (Heblish, Engrew, etc.) is an independent selectable row.
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

    // MARK: - Picker Item

    private struct PickerItem: Identifiable {
        let languageInfo: SubtitleLanguageInfo
        let hebrewMode: SubtitleHebrewMode?
        let englishMode: SubtitleEnglishMode?

        var id: String {
            var key = languageInfo.code
            if let hm = hebrewMode { key += "_\(hm.rawValue)" }
            if let em = englishMode { key += "_\(em.rawValue)" }
            return key
        }

        var isAI: Bool {
            if let hm = hebrewMode, hm != .standard { return true }
            if let em = englishMode, em != .standard { return true }
            return false
        }

        var displayLabel: String {
            if let hm = hebrewMode, hm != .standard {
                return "\(languageInfo.nativeName) (\(hm.displayName))"
            }
            if let em = englishMode, em != .standard {
                return "\(languageInfo.nativeName) (\(em.displayName))"
            }
            return languageInfo.nativeName
        }

        var secondaryLabel: String {
            if let hm = hebrewMode, hm != .standard {
                return hm.description
            }
            if let em = englishMode, em != .standard {
                return em.description
            }
            return languageInfo.name
        }
    }

    var body: some View {
        VStack(alignment: .leading, spacing: TVDesignTokens.Spacing.lg) {
            Text(localization.t("subtitles.title"))
                .font(.system(size: TVDesignTokens.FontSize.xl, weight: .bold))
                .foregroundColor(DesignTokens.Text.primary)

            ScrollView(.vertical, showsIndicators: false) {
                VStack(spacing: TVDesignTokens.Spacing.md) {
                    offButton

                    ForEach(pickerItems) { item in
                        languageButton(item: item)
                    }

                    generationErrorView

                    if availableLanguages.count >= 2 {
                        splitButton
                    }

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

    private func languageButton(item: PickerItem) -> some View {
        let isSelected = isItemSelected(item)
        let isAvailable = isItemAvailable(item)
        let isGenerating = isItemGenerating(item)

        return Button {
            handleItemTap(
                item, isAvailable: isAvailable, isGenerating: isGenerating
            )
        } label: {
            HStack(spacing: TVDesignTokens.Spacing.md) {
                Text(item.languageInfo.emojiFlag)
                    .font(.system(size: 28))

                VStack(alignment: .leading, spacing: 2) {
                    HStack(spacing: TVDesignTokens.Spacing.xs) {
                        Text(item.displayLabel)
                            .font(.system(
                                size: TVDesignTokens.FontSize.md,
                                weight: .medium
                            ))
                            .foregroundStyle(DesignTokens.Text.primary)

                        if item.isAI {
                            if isGenerating {
                                ProgressView()
                                    .progressViewStyle(.circular)
                                    .tint(DesignTokens.Primary.p400)
                                    .scaleEffect(0.6)

                                Text("\(jobProgress)%")
                                    .font(.system(
                                        size: TVDesignTokens.FontSize.sm
                                    ))
                                    .foregroundStyle(
                                        DesignTokens.Primary.p400
                                    )
                            } else {
                                Image(
                                    systemName: isAvailable
                                        ? "sparkles" : "lock.fill"
                                )
                                .font(.system(size: 14))
                                .foregroundStyle(DesignTokens.Primary.p400)
                            }
                        }
                    }

                    Text(item.secondaryLabel)
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

    private func handleItemTap(
        _ item: PickerItem, isAvailable: Bool, isGenerating: Bool
    ) {
        if item.isAI && isGenerating {
            Task { await handleCancelJob() }
            return
        }

        if item.isAI && !isAvailable {
            if let hm = item.hebrewMode, hm != .standard {
                Task { await triggerHebrewGeneration(mode: hm) }
            } else if item.englishMode == .engrew {
                Task { await triggerEngrewGeneration() }
            }
            return
        }

        onSelect(item.languageInfo.code)
        if let hm = item.hebrewMode { onHebrewModeSelect?(hm) }
        if let em = item.englishMode { onEnglishModeSelect?(em) }
        onDismiss()
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

    private var pickerItems: [PickerItem] {
        var items: [PickerItem] = []
        for code in availableLanguages {
            guard let info = SubtitleLanguages.info(for: code) else { continue }
            switch code {
            case "he":
                for mode in SubtitleHebrewMode.allCases {
                    items.append(PickerItem(
                        languageInfo: info, hebrewMode: mode, englishMode: nil
                    ))
                }
            case "en":
                for mode in SubtitleEnglishMode.allCases {
                    items.append(PickerItem(
                        languageInfo: info, hebrewMode: nil, englishMode: mode
                    ))
                }
            default:
                items.append(PickerItem(
                    languageInfo: info, hebrewMode: nil, englishMode: nil
                ))
            }
        }
        return items
    }

    private func isItemSelected(_ item: PickerItem) -> Bool {
        guard selectedLanguage == item.languageInfo.code else { return false }
        if let hm = item.hebrewMode { return currentHebrewMode == hm }
        if let em = item.englishMode { return currentEnglishMode == em }
        return true
    }

    private func isItemAvailable(_ item: PickerItem) -> Bool {
        if isAdmin { return true }
        if let hm = item.hebrewMode { return hebrewModeAvailable(hm) }
        if let em = item.englishMode { return englishModeAvailable(em) }
        return true
    }

    private func isItemGenerating(_ item: PickerItem) -> Bool {
        if let hm = item.hebrewMode, hm != .standard {
            return generatingMode == hm.rawValue
        }
        if let em = item.englishMode, em != .standard {
            return generatingMode == em.rawValue
        }
        return false
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
