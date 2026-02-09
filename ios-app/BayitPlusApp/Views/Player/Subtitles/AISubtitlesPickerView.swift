import BayitDesignSystem
import SwiftUI

/// Modal for selecting Hebrew AI subtitle display modes and triggering generation.
/// Supports regular, nikud, shoresh, and engrew modes with AI generation for admins.
struct AISubtitlesPickerView: View {
    @Environment(\.dismiss) private var dismiss

    let contentId: String
    let currentMode: HebrewMode
    let hasHebrew: Bool
    let hasNikud: Bool
    let hasShoresh: Bool
    let hasEngrew: Bool
    let isAdmin: Bool
    let repository: SubtitleRepository
    let onModeSelect: (HebrewMode) -> Void
    let onGenerationComplete: () -> Void

    @State private var showFirstTimeHint = false
    @State private var generatingMode: GeneratableHebrewMode?
    @State private var generationError: String?
    @State private var jobProgress: Int = 0
    @State private var currentJobId: String?
    @State private var isCancelling = false
    @State private var pollingTask: Task<Void, Never>?

    private let hebrewModeOptions: [HebrewModeOption] = [
        HebrewModeOption(
            mode: .regular,
            iconName: "gear",
            title: "Regular Hebrew",
            description: "Standard Hebrew text without vowel marks",
            example: "הילדים הולכים לבית הספר",
            isAI: false
        ),
        HebrewModeOption(
            mode: .nikud,
            iconName: "textformat",
            title: "Nikud (Vowel Marks)",
            description: "Vowel marks added for easier reading",
            example: "הַיְלָדִים הוֹלְכִים לְבֵית הַסֵּפֶר",
            isAI: true
        ),
        HebrewModeOption(
            mode: .shoresh,
            iconName: "book",
            title: "Shoresh (Root Words)",
            description: "Root letters highlighted for language learning",
            example: "הי⟨ל⟩דים הו⟨ל⟩כים לבית הספר",
            isAI: true
        ),
        HebrewModeOption(
            mode: .engrew,
            iconName: "globe",
            title: "Engrew (English Mix)",
            description: "Modern slang with English words transliterated",
            example: "אני הולך לסרף (Surf) על הווייבס (Waves)",
            isAI: true
        ),
    ]

    var body: some View {
        ScrollView {
            VStack(spacing: DesignTokens.Spacing.md) {
                // Header
                HStack {
                    Text("Hebrew Display Mode")
                        .font(.system(size: 20, weight: .bold))
                        .foregroundColor(.white)

                    Spacer()

                    Button {
                        dismiss()
                    } label: {
                        Image(systemName: "xmark")
                            .font(.system(size: 18))
                            .foregroundColor(.gray)
                            .frame(width: 44, height: 44)
                    }
                }
                .padding(.horizontal, DesignTokens.Spacing.lg)
                .padding(.top, DesignTokens.Spacing.lg)

                // First-time hint
                if showFirstTimeHint {
                    firstTimeHintBanner
                }

                // Generation error
                if let error = generationError {
                    errorBanner(error)
                }

                // No Hebrew warning
                if !hasHebrew {
                    noHebrewWarning
                }

                // Mode options
                VStack(spacing: DesignTokens.Spacing.sm) {
                    ForEach(hebrewModeOptions, id: \.mode) { option in
                        modeOptionRow(option)
                    }
                }
                .padding(.horizontal, DesignTokens.Spacing.md)
            }
            .padding(.bottom, DesignTokens.Spacing.lg)
        }
        .background(Color.black.opacity(0.95))
        .onAppear {
            checkFirstTimeHint()
            checkActiveJobs()
        }
        .onDisappear {
            pollingTask?.cancel()
        }
    }

    private func modeOptionRow(_ option: HebrewModeOption) -> some View {
        let isAvailable = isModeAvailable(option.mode)
        let isSelected = option.mode == currentMode
        let canShowGenerateButton = !isAvailable && option.mode != .regular && isAdmin && hasHebrew

        return Button {
            if isAvailable {
                onModeSelect(option.mode)
                dismiss()
            }
        } label: {
            VStack(alignment: .leading, spacing: DesignTokens.Spacing.sm) {
                HStack(spacing: DesignTokens.Spacing.md) {
                    // Icon
                    Image(systemName: option.iconName)
                        .font(.system(size: 24))
                        .foregroundColor(isAvailable ? .white : .gray)
                        .frame(width: 40)

                    // Title and description
                    VStack(alignment: .leading, spacing: 4) {
                        Text(option.title)
                            .font(.system(size: 16, weight: .semibold))
                            .foregroundColor(isAvailable ? .white : .gray)

                        Text(option.description)
                            .font(.system(size: 13))
                            .foregroundColor(isAvailable ? DesignTokens.Text.muted : .gray)
                            .multilineTextAlignment(.leading)
                    }

                    Spacer()

                    // Status indicator
                    if isSelected {
                        ZStack {
                            Circle()
                                .fill(option.isAI ? Color.purple : DesignTokens.Primary.p500)
                                .frame(width: 24, height: 24)

                            Image(systemName: option.isAI ? "sparkles" : "checkmark")
                                .font(.system(size: 12, weight: .bold))
                                .foregroundColor(.white)
                        }
                    }
                }

                // Example text
                Text(option.example)
                    .font(.system(size: 14, design: .monospaced))
                    .foregroundColor(.gray)
                    .environment(\.layoutDirection, .rightToLeft)
                    .frame(maxWidth: .infinity, alignment: .trailing)
                    .padding(.leading, 52)

                // Generate button or status
                if !isAvailable && option.mode != .regular {
                    if let generatableMode = option.mode.asGeneratable,
                       generatingMode == generatableMode {
                        generationProgressView
                    } else if canShowGenerateButton, let generatableMode = option.mode.asGeneratable {
                        generateButton(for: generatableMode)
                    } else if !isAdmin {
                        unavailableBadge
                    }
                }
            }
            .padding(DesignTokens.Spacing.md)
            .background(
                RoundedRectangle(cornerRadius: DesignTokens.Radius.lg)
                    .fill(isSelected ? Color.purple.opacity(0.2) : Color.white.opacity(0.05))
                    .overlay(
                        RoundedRectangle(cornerRadius: DesignTokens.Radius.lg)
                            .stroke(isSelected ? Color.purple : Color.clear, lineWidth: 2)
                    )
            )
        }
        .buttonStyle(.plain)
        .disabled(!isAvailable && !canShowGenerateButton)
    }

    private func generateButton(for mode: GeneratableHebrewMode) -> some View {
        Button {
            Task {
                await handleGenerateMode(mode)
            }
        } label: {
            Text("Generate")
                .font(.system(size: 14, weight: .bold))
                .foregroundColor(.white)
                .padding(.horizontal, DesignTokens.Spacing.md)
                .padding(.vertical, DesignTokens.Spacing.sm)
                .background(
                    RoundedRectangle(cornerRadius: DesignTokens.Radius.lg)
                        .fill(Color.purple.opacity(0.8))
                )
        }
        .buttonStyle(.plain)
    }

    private var generationProgressView: some View {
        HStack(spacing: DesignTokens.Spacing.sm) {
            // Progress indicator
            HStack(spacing: DesignTokens.Spacing.xs) {
                ProgressView()
                    .progressViewStyle(.circular)
                    .tint(.white)
                    .scaleEffect(0.8)

                Text(jobProgress > 0 ? "\(jobProgress)%" : "Generating...")
                    .font(.system(size: 14, weight: .semibold))
                    .foregroundColor(.white)
            }
            .padding(.horizontal, DesignTokens.Spacing.md)
            .padding(.vertical, DesignTokens.Spacing.sm)
            .background(
                RoundedRectangle(cornerRadius: DesignTokens.Radius.lg)
                    .fill(Color.purple.opacity(0.7))
            )

            // Cancel button
            Button {
                Task {
                    await handleCancelJob()
                }
            } label: {
                Text(isCancelling ? "..." : "Cancel")
                    .font(.system(size: 14, weight: .semibold))
                    .foregroundColor(.white)
                    .padding(.horizontal, DesignTokens.Spacing.md)
                    .padding(.vertical, DesignTokens.Spacing.sm)
                    .background(
                        RoundedRectangle(cornerRadius: DesignTokens.Radius.lg)
                            .fill(Color.red.opacity(0.8))
                    )
            }
            .buttonStyle(.plain)
            .disabled(isCancelling)
        }
    }

    private var unavailableBadge: some View {
        Text("Unavailable")
            .font(.system(size: 12, weight: .semibold))
            .foregroundColor(.red.opacity(0.9))
            .padding(.horizontal, DesignTokens.Spacing.sm)
            .padding(.vertical, 4)
            .background(
                RoundedRectangle(cornerRadius: 6)
                    .fill(Color.red.opacity(0.2))
            )
    }

    private var firstTimeHintBanner: some View {
        HStack(spacing: DesignTokens.Spacing.sm) {
            Image(systemName: "info.circle")
                .foregroundColor(.blue)

            Text("Choose how you want Hebrew subtitles displayed. Nikud adds vowel marks for easier reading, while Shoresh shows root words for language learning.")
                .font(.system(size: 13))
                .foregroundColor(.blue.opacity(0.9))
                .multilineTextAlignment(.leading)

            Button {
                showFirstTimeHint = false
            } label: {
                Image(systemName: "xmark")
                    .foregroundColor(.blue)
            }
        }
        .padding(DesignTokens.Spacing.md)
        .background(
            RoundedRectangle(cornerRadius: DesignTokens.Radius.lg)
                .fill(Color.blue.opacity(0.1))
                .overlay(
                    RoundedRectangle(cornerRadius: DesignTokens.Radius.lg)
                        .stroke(Color.blue.opacity(0.3), lineWidth: 1)
                )
        )
        .padding(.horizontal, DesignTokens.Spacing.lg)
    }

    private func errorBanner(_ error: String) -> some View {
        HStack(spacing: DesignTokens.Spacing.sm) {
            Image(systemName: "exclamationmark.triangle")
                .foregroundColor(.red)

            Text(error)
                .font(.system(size: 13))
                .foregroundColor(.red.opacity(0.9))
                .multilineTextAlignment(.leading)

            Button {
                generationError = nil
            } label: {
                Image(systemName: "xmark")
                    .foregroundColor(.red)
            }
        }
        .padding(DesignTokens.Spacing.md)
        .background(
            RoundedRectangle(cornerRadius: DesignTokens.Radius.lg)
                .fill(Color.red.opacity(0.1))
                .overlay(
                    RoundedRectangle(cornerRadius: DesignTokens.Radius.lg)
                        .stroke(Color.red.opacity(0.3), lineWidth: 1)
                )
        )
        .padding(.horizontal, DesignTokens.Spacing.lg)
    }

    private var noHebrewWarning: some View {
        HStack(spacing: DesignTokens.Spacing.sm) {
            Image(systemName: "exclamationmark.triangle")
                .foregroundColor(.orange)

            VStack(alignment: .leading, spacing: 4) {
                Text("No Hebrew Subtitles")
                    .font(.system(size: 14, weight: .medium))
                    .foregroundColor(.orange)

                Text("Upload Hebrew subtitles first to enable AI features like Nikud and Shoresh.")
                    .font(.system(size: 12))
                    .foregroundColor(.orange.opacity(0.7))
            }
        }
        .padding(DesignTokens.Spacing.md)
        .background(
            RoundedRectangle(cornerRadius: DesignTokens.Radius.lg)
                .fill(Color.orange.opacity(0.1))
                .overlay(
                    RoundedRectangle(cornerRadius: DesignTokens.Radius.lg)
                        .stroke(Color.orange.opacity(0.3), lineWidth: 1)
                )
        )
        .padding(.horizontal, DesignTokens.Spacing.lg)
    }

    // MARK: - Helper Methods

    private func isModeAvailable(_ mode: HebrewMode) -> Bool {
        switch mode {
        case .regular: return true
        case .nikud: return hasNikud
        case .shoresh: return hasShoresh
        case .engrew: return hasEngrew
        }
    }

    private func checkFirstTimeHint() {
        // Check UserDefaults for first time flag
        let key = "hebrew_mode_first_time_seen"
        if !UserDefaults.standard.bool(forKey: key) {
            showFirstTimeHint = true
            UserDefaults.standard.set(true, forKey: key)
        }
    }

    private func checkActiveJobs() {
        Task {
            do {
                guard let repo = repository as? APISubtitleRepository else { return }
                let activeJobs = try await repo.getActiveJobs(contentId: contentId)

                // Check for nikud job
                if let job = activeJobs.nikudJob {
                    await handleActiveJob(job: job, mode: .nikud)
                    return
                }

                // Check for shoresh job
                if let job = activeJobs.shoreshJob {
                    await handleActiveJob(job: job, mode: .shoresh)
                    return
                }

                // Check for engrew job
                if let job = activeJobs.engrewJob {
                    await handleActiveJob(job: job, mode: .engrew)
                    return
                }
            } catch {
                // Ignore errors checking active jobs
            }
        }
    }

    private func handleActiveJob(job: AIGenerationJobResponse, mode: GeneratableHebrewMode) async {
        switch job.status {
        case .failed:
            generationError = job.errorMessage ?? "\(mode.rawValue) generation failed"
            generatingMode = nil
            currentJobId = nil
        case .completed:
            generatingMode = nil
            currentJobId = nil
        case .pending, .processing:
            generatingMode = mode
            jobProgress = job.progress
            currentJobId = job.jobId
            if let jobId = job.jobId {
                startPolling(jobId: jobId, mode: mode)
            }
        case .cancelled:
            generatingMode = nil
            currentJobId = nil
        }
    }

    private func handleGenerateMode(_ mode: GeneratableHebrewMode) async {
        guard !contentId.isEmpty else {
            generationError = "Content ID is missing"
            return
        }

        guard let repo = repository as? APISubtitleRepository else {
            generationError = "Repository not available"
            return
        }

        generatingMode = mode
        generationError = nil
        jobProgress = 0

        do {
            let result: AIGenerationJobResponse

            switch mode {
            case .nikud:
                result = try await repo.generateNikud(contentId: contentId, language: "he", force: false)
            case .shoresh:
                result = try await repo.generateShoresh(contentId: contentId, language: "he", force: false)
            case .engrew:
                result = try await repo.generateEngrew(contentId: contentId, language: "he", force: false)
            }

            // Check if already completed
            if result.status == .completed {
                generatingMode = nil
                onGenerationComplete()
                return
            }

            // Start polling if we have a job ID
            if let jobId = result.jobId {
                currentJobId = jobId
                startPolling(jobId: jobId, mode: mode)
            }
        } catch {
            generationError = "Failed to start \(mode.rawValue) generation: \(error.localizedDescription)"
            generatingMode = nil
        }
    }

    private func startPolling(jobId: String, mode: GeneratableHebrewMode) {
        pollingTask?.cancel()
        pollingTask = Task {
            while !Task.isCancelled {
                try? await Task.sleep(nanoseconds: 2_000_000_000) // Poll every 2 seconds

                do {
                    guard let repo = repository as? APISubtitleRepository else { break }
                    let status = try await repo.getJobStatus(jobId: jobId)

                    await MainActor.run {
                        jobProgress = status.progress
                    }

                    // Stop polling on terminal states
                    if status.status == .completed {
                        await MainActor.run {
                            generatingMode = nil
                            jobProgress = 0
                            currentJobId = nil
                        }
                        onGenerationComplete()
                        break
                    } else if status.status == .failed {
                        await MainActor.run {
                            generationError = status.errorMessage ?? "\(mode.rawValue) generation failed"
                            generatingMode = nil
                            currentJobId = nil
                        }
                        break
                    } else if status.status == .cancelled {
                        await MainActor.run {
                            generatingMode = nil
                            currentJobId = nil
                        }
                        break
                    }
                } catch {
                    // On error, stop polling
                    await MainActor.run {
                        generationError = "Failed to check job status"
                        generatingMode = nil
                        currentJobId = nil
                    }
                    break
                }
            }
        }
    }

    private func handleCancelJob() async {
        guard let jobId = currentJobId, !isCancelling else { return }
        guard let repo = repository as? APISubtitleRepository else { return }

        isCancelling = true
        pollingTask?.cancel()

        do {
            _ = try await repo.cancelJob(jobId: jobId)
            generatingMode = nil
            jobProgress = 0
            currentJobId = nil
        } catch {
            generationError = "Failed to cancel job: \(error.localizedDescription)"
        }

        isCancelling = false
    }
}

// MARK: - Supporting Types

enum HebrewMode: String, CaseIterable {
    case regular
    case nikud
    case shoresh
    case engrew

    var asGeneratable: GeneratableHebrewMode? {
        switch self {
        case .nikud: return .nikud
        case .shoresh: return .shoresh
        case .engrew: return .engrew
        case .regular: return nil
        }
    }
}

enum GeneratableHebrewMode: String {
    case nikud
    case shoresh
    case engrew
}

struct HebrewModeOption {
    let mode: HebrewMode
    let iconName: String
    let title: String
    let description: String
    let example: String
    let isAI: Bool
}
