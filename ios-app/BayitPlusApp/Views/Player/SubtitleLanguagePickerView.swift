import BayitDesignSystem
import BayitLocalization
import SwiftUI

/// Sheet view listing available subtitle languages where each AI-generated
/// variation (Heblish, Engrew, etc.) is an independent selectable row.
struct SubtitleLanguagePickerView: View {
    let availableLanguages: [String]
    let aiLanguages: Set<String>
    let selectedLanguage: String?
    let contentId: String
    let repository: any SubtitleRepository
    let onSelect: (String?) -> Void
    let onRefresh: () -> Void
    var onDismiss: (() -> Void)?
    var onSplitTap: (() -> Void)?
    var isSplitEnabled: Bool = false

    // Mode selection parameters
    var currentHebrewMode: SubtitleHebrewMode = .standard
    var currentEnglishMode: SubtitleEnglishMode = .standard
    var hasNikud: Bool = false
    var hasShoresh: Bool = false
    var hasHeblish: Bool = false
    var hasEngrew: Bool = false
    var isAdmin: Bool = false
    var onHebrewModeSelect: ((SubtitleHebrewMode) -> Void)?
    var onEnglishModeSelect: ((SubtitleEnglishMode) -> Void)?

    @State private var selectedModeForGeneration: ModeSelectionItem?

    @Environment(\.dismiss) private var dismiss
    @Environment(LocalizationManager.self) private var localization

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
        NavigationStack {
            ScrollView {
                VStack(spacing: DesignTokens.Spacing.sm) {
                    offRow

                    ForEach(pickerItems) { item in
                        languageRow(item)
                    }

                    if let onSplitTap, availableLanguages.count >= 2 {
                        splitRow(onSplitTap: onSplitTap)
                    }

                    Divider()
                        .background(DesignTokens.Text.muted.opacity(0.3))
                        .padding(.vertical, DesignTokens.Spacing.md)

                    OpenSubtitlesDownloadView(
                        contentId: contentId,
                        repository: repository,
                        onSuccess: { onRefresh() }
                    )
                }
                .padding(DesignTokens.Spacing.lg)
            }
            .background(DesignTokens.Background.primary)
            .navigationTitle(localization.t("player.subtitles"))
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    Button {
                        dismissPicker()
                    } label: {
                        Image(systemName: "xmark.circle.fill")
                            .foregroundStyle(DesignTokens.Text.secondary)
                            .frame(width: 44, height: 44)
                    }
                    .accessibilityLabel(localization.t("player.subtitles"))
                }
            }
        }
        .environment(\.layoutDirection, localization.layoutDirection)
        .presentationDetents([.medium, .large])
        .presentationDragIndicator(.visible)
        .sheet(item: $selectedModeForGeneration) { selection in
            if selection.language == "he",
               let mode = selection.mode as? SubtitleHebrewMode {
                AISubtitlesPickerView(
                    contentId: contentId,
                    currentMode: mode,
                    hasHebrew: true,
                    hasNikud: hasNikud,
                    hasShoresh: hasShoresh,
                    hasHeblish: hasHeblish,
                    isAdmin: isAdmin,
                    repository: repository,
                    onModeSelect: { selectedMode in
                        onHebrewModeSelect?(selectedMode)
                        selectedModeForGeneration = nil
                        dismiss()
                    },
                    onGenerationComplete: {
                        onRefresh()
                        selectedModeForGeneration = nil
                    }
                )
            }
        }
    }

    // MARK: - Off Row

    private var offRow: some View {
        Button {
            onSelect(nil)
            dismissPicker()
        } label: {
            HStack(spacing: DesignTokens.Spacing.md) {
                Image(systemName: "slash.circle")
                    .font(.system(size: 24))
                    .foregroundStyle(DesignTokens.Text.secondary)

                Text(localization.t("player.subtitlesOff"))
                    .font(.system(
                        size: DesignTokens.FontSize.md, weight: .medium
                    ))
                    .foregroundStyle(DesignTokens.Text.primary)

                Spacer()

                if selectedLanguage == nil {
                    Image(systemName: "checkmark.circle.fill")
                        .foregroundStyle(DesignTokens.Primary.p400)
                }
            }
            .padding(DesignTokens.Spacing.md)
            .background(rowBackground(isSelected: selectedLanguage == nil))
            .clipShape(RoundedRectangle(cornerRadius: DesignTokens.Radius.md))
        }
        .buttonStyle(.plain)
        .accessibilityLabel(localization.t("player.subtitlesOff"))
        .accessibilityValue(selectedLanguage == nil ? "Selected" : "")
    }

    // MARK: - Language Row

    private func languageRow(_ item: PickerItem) -> some View {
        let isSelected = isItemSelected(item)
        let isAvailable = isItemAvailable(item)

        return Button {
            handleItemTap(item, isAvailable: isAvailable)
        } label: {
            HStack(spacing: DesignTokens.Spacing.md) {
                Text(item.languageInfo.emojiFlag)
                    .font(.system(size: 24))

                Text(item.languageInfo.badge)
                    .font(.system(
                        size: DesignTokens.FontSize.sm, weight: .bold
                    ))
                    .foregroundStyle(.white)
                    .frame(width: 32, height: 24)
                    .background(DesignTokens.Primary.p700)
                    .clipShape(RoundedRectangle(
                        cornerRadius: DesignTokens.Radius.sm
                    ))

                VStack(alignment: .leading, spacing: 2) {
                    HStack(spacing: DesignTokens.Spacing.xs) {
                        Text(item.displayLabel)
                            .font(.system(
                                size: DesignTokens.FontSize.md,
                                weight: .medium
                            ))
                            .foregroundStyle(DesignTokens.Text.primary)

                        if item.isAI {
                            Image(
                                systemName: isAvailable
                                    ? "sparkles" : "lock.fill"
                            )
                            .font(.system(size: 12))
                            .foregroundStyle(DesignTokens.Primary.p400)
                        }
                    }

                    Text(item.secondaryLabel)
                        .font(.system(size: DesignTokens.FontSize.sm))
                        .foregroundStyle(DesignTokens.Text.muted)
                }

                Spacer()

                if isSelected {
                    Image(systemName: "checkmark.circle.fill")
                        .foregroundStyle(DesignTokens.Primary.p400)
                }
            }
            .padding(DesignTokens.Spacing.md)
            .background(rowBackground(isSelected: isSelected))
            .clipShape(RoundedRectangle(cornerRadius: DesignTokens.Radius.md))
        }
        .buttonStyle(.plain)
        .accessibilityElement(children: .combine)
        .accessibilityLabel(
            "\(item.displayLabel) subtitles\(item.isAI ? ", AI generated" : "")"
        )
        .accessibilityValue(isSelected ? "Selected" : "")
    }

    private func handleItemTap(_ item: PickerItem, isAvailable: Bool) {
        if item.isAI && !isAvailable {
            if let hm = item.hebrewMode, hm != .standard {
                selectedModeForGeneration = ModeSelectionItem(
                    language: "he", mode: hm
                )
            } else if item.englishMode == .engrew {
                onEnglishModeSelect?(.standard)
                dismissPicker()
            }
            return
        }

        onSelect(item.languageInfo.code)
        if let hm = item.hebrewMode { onHebrewModeSelect?(hm) }
        if let em = item.englishMode { onEnglishModeSelect?(em) }
        dismissPicker()
    }

    // MARK: - Split Row

    private func splitRow(onSplitTap: @escaping () -> Void) -> some View {
        Group {
            Divider()
                .background(DesignTokens.Text.muted.opacity(0.3))
                .padding(.vertical, DesignTokens.Spacing.sm)

            Button {
                onSplitTap()
            } label: {
                HStack(spacing: DesignTokens.Spacing.md) {
                    Image(
                        systemName: "text.line.first.and.arrowtriangle.forward"
                    )
                    .font(.system(size: 22))
                    .foregroundStyle(DesignTokens.Primary.p400)

                    VStack(alignment: .leading, spacing: 2) {
                        Text(localization.t("subtitles.splitDisplay"))
                            .font(.system(
                                size: DesignTokens.FontSize.md,
                                weight: .medium
                            ))
                            .foregroundStyle(DesignTokens.Text.primary)

                        Text(localization.t(
                            "subtitles.splitDisplayDescription"
                        ))
                        .font(.system(size: DesignTokens.FontSize.sm))
                        .foregroundStyle(DesignTokens.Text.muted)
                    }

                    Spacer()

                    if isSplitEnabled {
                        Image(systemName: "checkmark.circle.fill")
                            .foregroundStyle(DesignTokens.Primary.p400)
                    }

                    Image(systemName: "chevron.right")
                        .font(.system(size: 14))
                        .foregroundStyle(DesignTokens.Text.muted)
                }
                .padding(DesignTokens.Spacing.md)
                .background(rowBackground(isSelected: isSplitEnabled))
                .clipShape(RoundedRectangle(
                    cornerRadius: DesignTokens.Radius.md
                ))
            }
            .buttonStyle(.plain)
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
                        languageInfo: info,
                        hebrewMode: mode,
                        englishMode: nil
                    ))
                }
            case "en":
                for mode in SubtitleEnglishMode.allCases {
                    items.append(PickerItem(
                        languageInfo: info,
                        hebrewMode: nil,
                        englishMode: mode
                    ))
                }
            default:
                items.append(PickerItem(
                    languageInfo: info,
                    hebrewMode: nil,
                    englishMode: nil
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
        if let hm = item.hebrewMode {
            return hebrewModeAvailable(hm)
        }
        if let em = item.englishMode {
            return englishModeAvailable(em)
        }
        return true
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

    private func dismissPicker() {
        if let onDismiss {
            onDismiss()
        } else {
            dismiss()
        }
    }

    private func rowBackground(isSelected: Bool) -> some View {
        ZStack {
            if isSelected {
                DesignTokens.Primary.p900.opacity(0.3)
            } else {
                DesignTokens.Glass.bg
            }
            VisualEffectBlur(style: .systemUltraThinMaterialDark)
        }
    }
}

// MARK: - Supporting Types

/// Represents a mode selection for AI subtitle generation modal
struct ModeSelectionItem: Identifiable {
    let id = UUID()
    let language: String
    let mode: Any  // SubtitleHebrewMode or SubtitleEnglishMode
}
