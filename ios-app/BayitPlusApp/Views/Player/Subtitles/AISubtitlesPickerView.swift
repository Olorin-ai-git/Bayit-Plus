import BayitDesignSystem
import BayitLocalization
import SwiftUI

/// Modal for selecting Hebrew AI subtitle display modes and triggering generation.
/// Supports regular, nikud, shoresh, and heblish modes with AI generation for admins.
struct AISubtitlesPickerView: View {
    @Environment(\.dismiss) var dismiss
    @Environment(LocalizationManager.self) var localization

    let contentId: String
    let currentMode: SubtitleHebrewMode
    let hasHebrew: Bool
    let hasNikud: Bool
    let hasShoresh: Bool
    let hasHeblish: Bool
    let isAdmin: Bool
    let repository: SubtitleRepository
    let onModeSelect: (SubtitleHebrewMode) -> Void
    let onGenerationComplete: () -> Void

    @State var showFirstTimeHint = false
    @State var generatingMode: GeneratableHebrewMode?
    @State var generationError: String?
    @State var jobProgress: Int = 0
    @State var currentJobId: String?
    @State var isCancelling = false
    @State var pollingTask: Task<Void, Never>?

    let hebrewModeOptions: [HebrewModeOption] = [
        HebrewModeOption(
            mode: .standard,
            iconName: "gear",
            title: "Regular Hebrew",
            description: "Standard Hebrew text without vowel marks",
            example: "\u{05D4}\u{05D9}\u{05DC}\u{05D3}\u{05D9}\u{05DD} \u{05D4}\u{05D5}\u{05DC}\u{05DB}\u{05D9}\u{05DD} \u{05DC}\u{05D1}\u{05D9}\u{05EA} \u{05D4}\u{05E1}\u{05E4}\u{05E8}",
            isAI: false
        ),
        HebrewModeOption(
            mode: .nikud,
            iconName: "textformat",
            title: "Nikud (Vowel Marks)",
            description: "Vowel marks added for easier reading",
            example: "\u{05D4}\u{05B7}\u{05D9}\u{05B0}\u{05DC}\u{05B8}\u{05D3}\u{05B4}\u{05D9}\u{05DD} \u{05D4}\u{05D5}\u{05B9}\u{05DC}\u{05B0}\u{05DB}\u{05B4}\u{05D9}\u{05DD} \u{05DC}\u{05B0}\u{05D1}\u{05B5}\u{05D9}\u{05EA} \u{05D4}\u{05B7}\u{05E1}\u{05BC}\u{05B5}\u{05E4}\u{05B6}\u{05E8}",
            isAI: true
        ),
        HebrewModeOption(
            mode: .shoresh,
            iconName: "book",
            title: "Shoresh (Root Words)",
            description: "Root letters highlighted for language learning",
            example: "\u{05D4}\u{05D9}\u{27E8}\u{05DC}\u{27E9}\u{05D3}\u{05D9}\u{05DD} \u{05D4}\u{05D5}\u{27E8}\u{05DC}\u{27E9}\u{05DB}\u{05D9}\u{05DD} \u{05DC}\u{05D1}\u{05D9}\u{05EA} \u{05D4}\u{05E1}\u{05E4}\u{05E8}",
            isAI: true
        ),
        HebrewModeOption(
            mode: .heblish,
            iconName: "globe",
            title: "Heblish (English Mix)",
            description: "Hebrew with English words mixed in",
            example: "\u{05D0}\u{05E0}\u{05D9} going \u{05DC}\u{05E9}\u{05D7}\u{05E7} basketball \u{05E2}\u{05DD} \u{05D7}\u{05D1}\u{05E8}\u{05D9}\u{05DD}",
            isAI: true
        ),
    ]

    var body: some View {
        ScrollView {
            VStack(spacing: DesignTokens.Spacing.md) {
                HStack {
                    Text(localization.t("subtitles.hebrewDisplayMode"))
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

                if showFirstTimeHint {
                    firstTimeHintBanner
                }

                if let error = generationError {
                    errorBanner(error)
                }

                if !hasHebrew {
                    noHebrewWarning
                }

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
}
