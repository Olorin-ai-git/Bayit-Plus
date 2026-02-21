import BayitDesignSystem
import BayitLocalization
import SwiftUI

// MARK: - AISubtitlesPickerView Logic and Settings Extensions

extension AISubtitlesPickerView {
    func isModeAvailable(_ mode: SubtitleHebrewMode) -> Bool {
        switch mode {
        case .standard: return true
        case .nikud: return hasNikud
        case .shoresh: return hasShoresh
        case .heblish: return hasHeblish
        }
    }

    func checkFirstTimeHint() {
        let key = "hebrew_mode_first_time_seen"
        if !UserDefaults.standard.bool(forKey: key) {
            showFirstTimeHint = true
            UserDefaults.standard.set(true, forKey: key)
        }
    }

    func checkActiveJobs() {
        Task {
            do {
                guard let repo = repository as? APISubtitleRepository else { return }
                let activeJobs = try await repo.getActiveJobs(contentId: contentId)

                if let job = activeJobs.nikudJob {
                    await handleActiveJob(job: job, mode: .nikud)
                    return
                }

                if let job = activeJobs.shoreshJob {
                    await handleActiveJob(job: job, mode: .shoresh)
                    return
                }

                if let job = activeJobs.heblishJob {
                    await handleActiveJob(job: job, mode: .heblish)
                    return
                }
            } catch {
                // Ignore errors checking active jobs
            }
        }
    }

    func handleActiveJob(job: AIGenerationJobResponse, mode: GeneratableHebrewMode) async {
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

    func handleGenerateMode(_ mode: GeneratableHebrewMode) async {
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
            case .heblish:
                result = try await repo.generateHeblish(contentId: contentId, language: "he", force: false)
            }

            if result.status == .completed {
                generatingMode = nil
                onGenerationComplete()
                return
            }

            if let jobId = result.jobId {
                currentJobId = jobId
                startPolling(jobId: jobId, mode: mode)
            }
        } catch {
            generationError = "Failed to start \(mode.rawValue) generation: \(error.localizedDescription)"
            generatingMode = nil
        }
    }

    func startPolling(jobId: String, mode: GeneratableHebrewMode) {
        pollingTask?.cancel()
        pollingTask = Task {
            while !Task.isCancelled {
                try? await Task.sleep(nanoseconds: 2_000_000_000)

                do {
                    guard let repo = repository as? APISubtitleRepository else { break }
                    let status = try await repo.getJobStatus(jobId: jobId)

                    await MainActor.run {
                        jobProgress = status.progress
                    }

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

    func handleCancelJob() async {
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
