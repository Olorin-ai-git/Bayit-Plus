import BayitDesignSystem
import SwiftUI

struct CulturalReference: Identifiable {
    let id: String
    let canonicalName: String
    let canonicalNameEn: String
    let category: String
    let shortExplanation: String
    let shortExplanationEn: String
    let imageUrl: String?
}

@Observable
final class TVCulturalContextViewModel {
    var references: [CulturalReference] = []
    var selectedReference: CulturalReference?
    var isLoading: Bool = false

    func detectReferences(text: String) async {
        isLoading = true
        do {
            let result: [String: Any] = try await APIClient.shared.post(
                "/cultural/detect",
                body: ["text": text]
            )
            if let refs = result["references"] as? [[String: Any]] {
                references = refs.compactMap { dict in
                    guard let id = dict["reference_id"] as? String,
                          let name = dict["canonical_name"] as? String else { return nil }
                    return CulturalReference(
                        id: id,
                        canonicalName: name,
                        canonicalNameEn: dict["canonical_name_en"] as? String ?? name,
                        category: dict["category"] as? String ?? "",
                        shortExplanation: dict["short_explanation"] as? String ?? "",
                        shortExplanationEn: dict["short_explanation_en"] as? String ?? "",
                        imageUrl: dict["image_url"] as? String
                    )
                }
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
                                .foregroundStyle(TVDesignTokens.Colors.warning)
                                .font(.caption)
                            Text(ref.canonicalNameEn)
                                .font(.callout)
                                .foregroundStyle(TVDesignTokens.Colors.textPrimary)
                        }
                        .padding(.horizontal, TVDesignTokens.Spacing.lg)
                        .padding(.vertical, TVDesignTokens.Spacing.sm)
                    }
                    .buttonStyle(.card)
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
                    .foregroundStyle(TVDesignTokens.Colors.textPrimary)
                Spacer()
                Text(ref.category.capitalized)
                    .font(.caption)
                    .foregroundStyle(TVDesignTokens.Colors.primaryAccent)
                    .padding(.horizontal, TVDesignTokens.Spacing.sm)
                    .padding(.vertical, 2)
                    .background(TVDesignTokens.Colors.primaryAccent.opacity(0.15))
                    .clipShape(Capsule())
            }

            Text(ref.canonicalNameEn)
                .font(.callout)
                .foregroundStyle(TVDesignTokens.Colors.textSecondary)

            Divider().background(TVDesignTokens.Colors.border.opacity(0.3))

            Text(ref.shortExplanationEn)
                .font(.body)
                .foregroundStyle(TVDesignTokens.Colors.textSecondary)
                .lineLimit(4)
        }
        .padding(TVDesignTokens.Spacing.lg)
        .frame(maxWidth: 700)
        .background(.ultraThinMaterial)
        .clipShape(RoundedRectangle(cornerRadius: TVDesignTokens.CornerRadius.xl))
    }
}
