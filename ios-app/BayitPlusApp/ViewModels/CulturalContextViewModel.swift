import BayitCore
import Foundation

@Observable
final class CulturalContextViewModel {
    var references: [CulturalExplanationData] = []
    var selectedReference: CulturalExplanationData?
    var isLoading: Bool = false
    var showExplanationSheet: Bool = false

    func detectReferences(text: String) async {
        guard !text.isEmpty else {
            references = []
            return
        }

        isLoading = true
        do {
            let response: DetectResponse = try await APIClient.shared.post(
                "/cultural/detect",
                body: DetectRequest(text: text)
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
