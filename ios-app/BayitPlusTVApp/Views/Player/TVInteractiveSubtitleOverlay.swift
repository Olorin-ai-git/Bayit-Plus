import BayitDesignSystem
import SwiftUI

struct SubtitleWord: Identifiable {
    let id = UUID()
    let text: String
    let isHebrew: Bool
    let hasCulturalRef: Bool
}

struct TVTranslationResult {
    let word: String
    let translation: String
    let transliteration: String
    let example: String
}

@Observable
final class TVInteractiveSubtitleViewModel {
    var words: [SubtitleWord] = []
    var selectedWord: SubtitleWord?
    var translationResult: TVTranslationResult?
    var isLoading: Bool = false

    func parseSubtitleLine(_ text: String) {
        words = text.split(separator: " ").map { word in
            let str = String(word)
            let isHebrew = str.unicodeScalars.contains { $0.value >= 0x0590 && $0.value <= 0x05FF }
            return SubtitleWord(text: str, isHebrew: isHebrew, hasCulturalRef: false)
        }
    }

    func selectWord(_ word: SubtitleWord) async {
        selectedWord = word
        isLoading = true
        do {
            let result: TVTranslationResult = try await APIClient.shared.post(
                "/subtitles/translate-word",
                body: ["word": word.text]
            )
            translationResult = result
        } catch {
            translationResult = nil
        }
        isLoading = false
    }

    func dismiss() {
        selectedWord = nil
        translationResult = nil
    }
}

struct TVInteractiveSubtitleOverlay: View {
    @State private var viewModel = TVInteractiveSubtitleViewModel()
    @FocusState private var focusedWordId: UUID?
    let subtitleText: String

    var body: some View {
        VStack(spacing: TVDesignTokens.Spacing.lg) {
            if viewModel.translationResult != nil || viewModel.isLoading {
                translationCard
            }
            wordRow
        }
        .padding(.horizontal, TVDesignTokens.Spacing.xl)
        .padding(.bottom, TVDesignTokens.Spacing.lg)
        .onChange(of: subtitleText) { _, newValue in
            viewModel.parseSubtitleLine(newValue)
            viewModel.dismiss()
        }
    }

    private var wordRow: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: TVDesignTokens.Spacing.sm) {
                ForEach(viewModel.words) { word in
                    Button {
                        Task { await viewModel.selectWord(word) }
                    } label: {
                        Text(word.text)
                            .font(.title3)
                            .fontWeight(word.isHebrew ? .bold : .regular)
                            .foregroundStyle(
                                word.isHebrew
                                    ? TVDesignTokens.Colors.primaryAccent
                                    : TVDesignTokens.Colors.textPrimary
                            )
                            .padding(.horizontal, TVDesignTokens.Spacing.md)
                            .padding(.vertical, TVDesignTokens.Spacing.sm)
                    }
                    .buttonStyle(.card)
                    .focused($focusedWordId, equals: word.id)
                }
            }
        }
    }

    private var translationCard: some View {
        VStack(alignment: .center, spacing: TVDesignTokens.Spacing.sm) {
            if viewModel.isLoading {
                ProgressView().tint(.white)
            } else if let result = viewModel.translationResult {
                Text(result.word)
                    .font(.title2)
                    .fontWeight(.bold)
                    .foregroundStyle(TVDesignTokens.Colors.textPrimary)
                Text(result.transliteration)
                    .font(.callout)
                    .foregroundStyle(TVDesignTokens.Colors.primaryAccent)
                    .italic()
                Text(result.translation)
                    .font(.body)
                    .foregroundStyle(TVDesignTokens.Colors.textSecondary)
                if !result.example.isEmpty {
                    Text(result.example)
                        .font(.caption)
                        .foregroundStyle(TVDesignTokens.Colors.textSecondary)
                        .multilineTextAlignment(.center)
                }
            }
        }
        .padding(TVDesignTokens.Spacing.lg)
        .frame(maxWidth: 600)
        .background(.ultraThinMaterial)
        .clipShape(RoundedRectangle(cornerRadius: TVDesignTokens.CornerRadius.xl))
    }
}
