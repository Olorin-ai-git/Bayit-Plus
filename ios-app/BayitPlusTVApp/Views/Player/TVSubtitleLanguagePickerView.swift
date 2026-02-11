import BayitDesignSystem
import SwiftUI

/// tvOS subtitle language picker with AI mode chips, split display, and OpenSubtitles.
/// Uses focusable card buttons for Siri Remote navigation.
struct TVSubtitleLanguagePickerView: View {
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

    @State private var showAIPickerForHebrew = false

    var body: some View {
        VStack(alignment: .leading, spacing: TVDesignTokens.Spacing.lg) {
            Text("Subtitles")
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

                    #if os(iOS)
                    // OpenSubtitles download (iOS only)
                    if let repo = repository, !contentId.isEmpty {
                        Divider()
                            .background(DesignTokens.Text.muted.opacity(0.3))
                            .padding(.vertical, TVDesignTokens.Spacing.sm)

                        OpenSubtitlesDownloadView(
                            contentId: contentId,
                            repository: repo,
                            onSuccess: { onSubtitlesRefresh?() }
                        )
                    }
                    #endif
                }
            }
        }
        .padding(.horizontal, TVDesignTokens.Spacing.lg)
        .padding(.top, TVDesignTokens.Spacing.lg)
        .background(DesignTokens.Background.primary)
        .onExitCommand { onDismiss() }
        #if os(iOS)
        .fullScreenCover(isPresented: $showAIPickerForHebrew) {
            if let repo = repository {
                AISubtitlesPickerView(
                    contentId: contentId,
                    currentMode: currentHebrewMode,
                    hasHebrew: availableLanguages.contains("he"),
                    hasNikud: hasNikud,
                    hasShoresh: hasShoresh,
                    hasHeblish: hasHeblish,
                    isAdmin: isAdmin,
                    repository: repo,
                    onModeSelect: { mode in
                        onHebrewModeSelect?(mode)
                    },
                    onGenerationComplete: {
                        onSubtitlesRefresh?()
                    }
                )
            }
        }
        #endif
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

                Text("Off")
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
            Text("AI Modes:")
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
        }
        .padding(.vertical, TVDesignTokens.Spacing.sm)
    }

    private func hebrewModeChip(_ mode: SubtitleHebrewMode) -> some View {
        let isSelected = mode == currentHebrewMode
        let isAvailable = hebrewModeAvailable(mode)
        let isAI = mode != .standard

        return Button {
            if isAvailable {
                onHebrewModeSelect?(mode)
                onDismiss()
            } else if isAI && isAdmin {
                showAIPickerForHebrew = true
            }
        } label: {
            HStack(spacing: TVDesignTokens.Spacing.xs) {
                if isAI {
                    Image(systemName: isAvailable ? "sparkles" : "lock.fill")
                        .font(.system(size: 14))
                        .foregroundStyle(
                            isSelected ? .white : DesignTokens.Primary.p400
                        )
                }
                Text(mode.displayName)
                    .font(.system(
                        size: TVDesignTokens.FontSize.sm, weight: .semibold
                    ))
                    .foregroundStyle(
                        isSelected ? .white :
                            (isAvailable ? .white : .gray)
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
            Text("AI Modes:")
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
        }
        .padding(.vertical, TVDesignTokens.Spacing.sm)
    }

    private func englishModeChip(_ mode: SubtitleEnglishMode) -> some View {
        let isSelected = mode == currentEnglishMode
        let isAvailable = englishModeAvailable(mode)
        let isAI = mode != .standard

        return Button {
            if isAvailable {
                onEnglishModeSelect?(mode)
                onDismiss()
            }
        } label: {
            HStack(spacing: TVDesignTokens.Spacing.xs) {
                if isAI {
                    Image(systemName: isAvailable ? "sparkles" : "lock.fill")
                        .font(.system(size: 14))
                        .foregroundStyle(
                            isSelected ? .white : DesignTokens.Primary.p400
                        )
                }
                Text(mode.displayName)
                    .font(.system(
                        size: TVDesignTokens.FontSize.sm, weight: .semibold
                    ))
                    .foregroundStyle(
                        isSelected ? .white :
                            (isAvailable ? .white : .gray)
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
                        Text("Split Display")
                            .font(.system(
                                size: TVDesignTokens.FontSize.md,
                                weight: .medium
                            ))
                            .foregroundStyle(DesignTokens.Text.primary)

                        Text("Two languages side by side")
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
}
