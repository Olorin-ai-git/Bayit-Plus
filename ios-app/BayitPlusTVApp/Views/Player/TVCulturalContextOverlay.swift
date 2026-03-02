import BayitAuth
import BayitCore
import BayitDesignSystem
import BayitNetworking
import SwiftUI

struct CulturalReference: Identifiable, Decodable {
    let id: String
    let canonicalName: String
    let canonicalNameEn: String
    let category: String
    let shortExplanation: String
    let shortExplanationEn: String
    let imageUrl: String?
}

struct CulturalDetectionResponse: Decodable {
    let references: [CulturalReferenceDTO]
}

struct CulturalReferenceDTO: Decodable {
    let referenceId: String
    let canonicalName: String
    let canonicalNameEn: String?
    let category: String
    let shortExplanation: String
    let shortExplanationEn: String?
    let imageUrl: String?

    enum CodingKeys: String, CodingKey {
        case referenceId = "reference_id"
        case canonicalName = "canonical_name"
        case canonicalNameEn = "canonical_name_en"
        case category
        case shortExplanation = "short_explanation"
        case shortExplanationEn = "short_explanation_en"
        case imageUrl = "image_url"
    }
}

@Observable
final class TVCulturalContextViewModel {
    var references: [CulturalReference] = []
    var selectedReference: CulturalReference?
    var isLoading: Bool = false
    private let client: APIClient

    init(client: APIClient) {
        self.client = client
    }

    /// Convenience initializer for standalone use
    convenience init() {
        let appConfig = AppConfiguration()
        let networkConfig = TVAppNetworkConfiguration(appConfig: appConfig)
        let apiLogger = TVAppAPILogger()
        let authConfig = AppAuthConfiguration()
        let authMgr = AuthManager(configuration: authConfig, logger: apiLogger)

        let client = APIClient(
            configuration: networkConfig,
            authTokenProvider: authMgr.authTokenProvider,
            locationProvider: TVLocationProvider(),
            logger: apiLogger
        )

        self.init(client: client)
    }

    func detectReferences(text: String) async {
        isLoading = true
        do {
            let result = try await client.post(
                "/cultural/detect",
                body: ["text": text],
                as: CulturalDetectionResponse.self
            )
            references = result.references.map { dto in
                CulturalReference(
                    id: dto.referenceId,
                    canonicalName: dto.canonicalName,
                    canonicalNameEn: dto.canonicalNameEn ?? dto.canonicalName,
                    category: dto.category,
                    shortExplanation: dto.shortExplanation,
                    shortExplanationEn: dto.shortExplanationEn ?? dto.shortExplanation,
                    imageUrl: dto.imageUrl
                )
            }
        } catch {
            references = []
        }
        isLoading = false
    }

    func selectReference(_ ref: CulturalReference) {
        selectedReference = ref
    }

    func dismiss() {
        selectedReference = nil
    }
}

struct TVCulturalContextOverlay: View {
    @State private var viewModel = TVCulturalContextViewModel()
    @FocusState private var focusedRefId: String?
    let subtitleText: String

    var body: some View {
        VStack(spacing: TVDesignTokens.Spacing.md) {
            if let selected = viewModel.selectedReference {
                explanationCard(selected)
            }

            if !viewModel.references.isEmpty {
                referenceBadges
            }
        }
        .padding(.horizontal, TVDesignTokens.Spacing.xl)
        .onChange(of: subtitleText) { _, newValue in
            viewModel.dismiss()
            Task { await viewModel.detectReferences(text: newValue) }
        }
    }

    private var referenceBadges: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: TVDesignTokens.Spacing.md) {
                ForEach(viewModel.references) { ref in
                    Button {
                        viewModel.selectReference(ref)
                    } label: {
                        HStack(spacing: TVDesignTokens.Spacing.sm) {
                            Image(systemName: "info.circle.fill")
                                .foregroundStyle(DesignTokens.Colors.Semantic.warning)
                                .font(.caption)
                            Text(ref.canonicalNameEn)
                                .font(.callout)
                                .foregroundStyle(DesignTokens.Colors.Text.primary)
                        }
                        .padding(.horizontal, TVDesignTokens.Spacing.lg)
                        .padding(.vertical, TVDesignTokens.Spacing.sm)
                    }
                    .tvCardStyle()
                    .focused($focusedRefId, equals: ref.id)
                }
            }
        }
    }

    private func explanationCard(_ ref: CulturalReference) -> some View {
        VStack(alignment: .leading, spacing: TVDesignTokens.Spacing.sm) {
            HStack {
                Text(ref.canonicalName)
                    .font(.title3)
                    .fontWeight(.bold)
                    .foregroundStyle(DesignTokens.Colors.Text.primary)
                Spacer()
                Text(ref.category.capitalized)
                    .font(.caption)
                    .foregroundStyle(DesignTokens.Primary.default)
                    .padding(.horizontal, TVDesignTokens.Spacing.sm)
                    .padding(.vertical, 2)
                    .background(DesignTokens.Primary.default.opacity(0.15))
                    .clipShape(Capsule())
            }

            Text(ref.canonicalNameEn)
                .font(.callout)
                .foregroundStyle(DesignTokens.Colors.Text.secondary)

            Divider().background(DesignTokens.Colors.Glass.border.opacity(0.3))

            Text(ref.shortExplanationEn)
                .font(.body)
                .foregroundStyle(DesignTokens.Colors.Text.secondary)
                .lineLimit(4)
        }
        .padding(TVDesignTokens.Spacing.lg)
        .frame(maxWidth: 700)
        .background(.ultraThinMaterial)
        .clipShape(RoundedRectangle(cornerRadius: TVDesignTokens.Radius.xl))
    }
}
