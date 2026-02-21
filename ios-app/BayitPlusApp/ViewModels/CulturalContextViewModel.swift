import BayitCore
import BayitNetworking
import Foundation

struct CulturalExplanationData: Identifiable, Sendable {
    let id: String
    let referenceId: String
    let canonicalName: String
    let canonicalNameEn: String
    let category: String
    let subcategory: String
    let shortExplanation: String
    let shortExplanationEn: String
    let imageUrl: String?

    init(referenceId: String, canonicalName: String, canonicalNameEn: String, category: String, subcategory: String, shortExplanation: String, shortExplanationEn: String, imageUrl: String?) {
        id = referenceId
        self.referenceId = referenceId
        self.canonicalName = canonicalName
        self.canonicalNameEn = canonicalNameEn
        self.category = category
        self.subcategory = subcategory
        self.shortExplanation = shortExplanation
        self.shortExplanationEn = shortExplanationEn
        self.imageUrl = imageUrl
    }
}

@MainActor
@Observable
final class CulturalContextViewModel {
    var references: [CulturalExplanationData] = []
    var selectedReference: CulturalExplanationData?
    var isLoading: Bool = false
    var showExplanationSheet: Bool = false
    private let client: APIClient

    init(client: APIClient) {
        self.client = client
    }

    func detectReferences(text: String) async {
        guard !text.isEmpty else {
            references = []
            return
        }

        isLoading = true
        do {
            let response: DetectResponse = try await client.post(
                "/api/v1/cultural/detect",
                body: DetectRequest(text: text),
                as: DetectResponse.self
            )
            references = response.references.map { ref in
                CulturalExplanationData(
                    referenceId: ref.referenceId,
                    canonicalName: ref.canonicalName,
                    canonicalNameEn: ref.canonicalNameEn,
                    category: ref.category,
                    subcategory: ref.subcategory,
                    shortExplanation: ref.shortExplanation,
                    shortExplanationEn: ref.shortExplanationEn,
                    imageUrl: ref.imageUrl
                )
            }
        } catch {
            references = []
        }
        isLoading = false
    }

    func selectReference(_ ref: CulturalExplanationData) {
        selectedReference = ref
        showExplanationSheet = true
    }

    func dismissExplanation() {
        showExplanationSheet = false
        selectedReference = nil
    }
}

private struct DetectRequest: Codable {
    let text: String
}

private struct DetectResponse: Codable {
    let references: [RefItem]

    struct RefItem: Codable {
        let referenceId: String
        let canonicalName: String
        let canonicalNameEn: String
        let category: String
        let subcategory: String
        let shortExplanation: String
        let shortExplanationEn: String
        let imageUrl: String?

        enum CodingKeys: String, CodingKey {
            case referenceId = "reference_id"
            case canonicalName = "canonical_name"
            case canonicalNameEn = "canonical_name_en"
            case category, subcategory
            case shortExplanation = "short_explanation"
            case shortExplanationEn = "short_explanation_en"
            case imageUrl = "image_url"
        }
    }
}
