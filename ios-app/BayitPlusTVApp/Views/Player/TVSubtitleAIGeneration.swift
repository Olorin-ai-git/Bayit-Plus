import Foundation
import SwiftUI

// MARK: - AI Generation Logic

extension TVSubtitleLanguagePickerView {
    func triggerHebrewGeneration(mode: SubtitleHebrewMode) async {
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
                startGenerationPolling(jobId: jobId, modeKey: mode.rawValue)
            }
        } catch {
            generationError = "Failed to start \(mode.displayName) generation"
            generatingMode = nil
        }
    }

    func triggerEnglishGeneration(mode: SubtitleEnglishMode) async {
        guard !contentId.isEmpty,
              let repo = repository as? APISubtitleRepository
        else { return }

        generatingMode = mode.rawValue
        generationError = nil
        jobProgress = 0

        do {
            let result: AIGenerationJobResponse
            switch mode {
            case .engrew:
                result = try await repo.generateEngrew(contentId: contentId)
            case .grammarFlip:
                result = try await repo.generateGrammarFlip(contentId: contentId)
            case .slangSynthesis:
                result = try await repo.generateSlangSynthesis(contentId: contentId)
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
                startGenerationPolling(jobId: jobId, modeKey: mode.rawValue)
            }
        } catch {
            generationError = "Failed to start \(mode.displayName) generation"
            generatingMode = nil
        }
    }

    func triggerEngrewGeneration() async {
        await triggerEnglishGeneration(mode: .engrew)
    }

    func startGenerationPolling(jobId: String, modeKey: String) {
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

    func handleCancelJob() async {
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

    func checkActiveJobs() {
        guard !contentId.isEmpty,
              let repo = repository as? APISubtitleRepository
        else { return }

        Task {
            do {
                let active = try await repo.getActiveJobs(
                    contentId: contentId
                )
                let jobChecks: [(AIGenerationJobResponse?, String)] = [
                    (active.nikudJob, "nikud"),
                    (active.shoreshJob, "shoresh"),
                    (active.heblishJob, "heblish"),
                    (active.engrewJob, "engrew"),
                    (active.grammarFlipJob, "grammarFlip"),
                    (active.slangSynthesisJob, "slangSynthesis"),
                ]
                for (job, key) in jobChecks {
                    if let job, job.status == .pending || job.status == .processing {
                        resumeActiveJob(job, modeKey: key)
                        break
                    }
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
            startGenerationPolling(jobId: jobId, modeKey: modeKey)
        }
    }
}
