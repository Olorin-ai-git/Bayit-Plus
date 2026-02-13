import BayitAuth
import BayitCore
import BayitDesignSystem
import BayitNetworking
import SwiftUI

struct TVSubtitleWord: Identifiable {
    let id = UUID()
    let text: String
    let isHebrew: Bool
    let hasCulturalRef: Bool
}

struct TVTranslationResult: Decodable {
    let word: String
    let translation: String
    let transliteration: String
    let example: String
}

@Observable
final class TVInteractiveSubtitleViewModel {
    var words: [TVSubtitleWord] = []
    var selectedWord: TVSubtitleWord?
    var translationResult: TVTranslationResult?
    var isLoading: Bool = false
    private let client: APIClient

    init(client: APIClient) {
        self.client = client
    }

    // Convenience initializer for standalone use
    convenience init() {
        let appConfig = AppConfiguration()
        let networkConfig = TVAppNetworkConfiguration(appConfig: appConfig)
        let apiLogger = TVAppAPILogger()
        let authConfig = TVAppAuthConfiguration()
        let authMgr = AuthManager(configuration: authConfig, logger: apiLogger)

        let client = APIClient(
            configuration: networkConfig,
            authTokenProvider: authMgr.authTokenProvider,
            locationProvider: TVLocationProvider(),
            logger: apiLogger
        )

        self.init(client: client)
    }

    func parseSubtitleLine(_ text: String) {
        words = text.split(separator: " ").map { word in
            let str = String(word)
            let isHebrew = str.unicodeScalars.contains { $0.value >= 0x0590 && $0.value <= 0x05FF }
            return TVSubtitleWord(text: str, isHebrew: isHebrew, hasCulturalRef: false)
        }
    }

    func selectWord(_ word: TVSubtitleWord) async {
        selectedWord = word
        isLoading = true
        do {
            let result = try await client.post(
                "/subtitles/translate-word",
                body: ["word": word.text],
                as: TVTranslationResult.self
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
                                    ? DesignTokens.Primary.default
                                    : DesignTokens.Colors.Text.primary
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
                    .foregroundStyle(DesignTokens.Colors.Text.primary)
                Text(result.transliteration)
                    .font(.callout)
                    .foregroundStyle(DesignTokens.Primary.default)
                    .italic()
                Text(result.translation)
                    .font(.body)
                    .foregroundStyle(DesignTokens.Colors.Text.secondary)
                if !result.example.isEmpty {
                    Text(result.example)
                        .font(.caption)
                        .foregroundStyle(DesignTokens.Colors.Text.secondary)
                        .multilineTextAlignment(.center)
                }
            }
        }
        .padding(TVDesignTokens.Spacing.lg)
        .frame(maxWidth: 600)
        .background(.ultraThinMaterial)
        .clipShape(RoundedRectangle(cornerRadius: TVDesignTokens.Radius.xl))
    }
}
