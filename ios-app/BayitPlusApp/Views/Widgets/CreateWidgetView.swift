#if os(iOS)
import BayitCore
import BayitDesignSystem
import SwiftUI

/// Form for creating a personal widget with content type selection.
struct CreateWidgetView: View {

    let viewModel: WidgetsViewModel
    let onDismiss: () -> Void

    @State private var title = ""
    @State private var description = ""
    @State private var selectedContentType: WidgetContentType = .liveChannel
    @State private var contentId = ""
    @State private var iframeUrl = ""
    @State private var iframeTitle = ""
    @State private var isSaving = false
    @State private var error: String?

    private let logger = BayitLogger(category: "CreateWidget")

    private let contentTypes: [WidgetContentType] = [
        .liveChannel, .vod, .podcast, .radio, .audiobook, .iframe
    ]

    var body: some View {
        NavigationStack {
            ScrollView(.vertical, showsIndicators: false) {
                VStack(alignment: .leading, spacing: DesignTokens.Spacing.lg) {
                    titleSection
                    contentTypeSection
                    contentIdSection
                    if let error { errorBanner(error) }
                }
                .padding(DesignTokens.Spacing.lg)
            }
            .background(DesignTokens.Background.primary)
            .navigationTitle("Create Widget")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") { onDismiss() }
                }
                ToolbarItem(placement: .confirmationAction) {
                    GlassButton("Save", variant: .primary, size: .small) {
                        Task { await save() }
                    }
                    .disabled(!isFormValid || isSaving)
                }
            }
        }
    }

    // MARK: - Title Section

    private var titleSection: some View {
        VStack(alignment: .leading, spacing: DesignTokens.Spacing.sm) {
            Text("Widget Title")
                .font(.system(size: DesignTokens.FontSize.sm, weight: .medium))
                .foregroundStyle(DesignTokens.Text.secondary)

            TextField("Enter widget title", text: $title)
                .font(.system(size: DesignTokens.FontSize.base))
                .foregroundStyle(DesignTokens.Text.primary)
                .padding(DesignTokens.Spacing.md)
                .background(DesignTokens.Glass.bgLight)
                .clipShape(RoundedRectangle(cornerRadius: DesignTokens.Radius.md))

            TextField("Description (optional)", text: $description)
                .font(.system(size: DesignTokens.FontSize.sm))
                .foregroundStyle(DesignTokens.Text.primary)
                .padding(DesignTokens.Spacing.md)
                .background(DesignTokens.Glass.bgLight)
                .clipShape(RoundedRectangle(cornerRadius: DesignTokens.Radius.md))
        }
    }

    // MARK: - Content Type

    private var contentTypeSection: some View {
        VStack(alignment: .leading, spacing: DesignTokens.Spacing.sm) {
            Text("Content Type")
                .font(.system(size: DesignTokens.FontSize.sm, weight: .medium))
                .foregroundStyle(DesignTokens.Text.secondary)

            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: DesignTokens.Spacing.sm) {
                    ForEach(contentTypes, id: \.self) { type in
                        GlassChip(
                            title: type.displayLabel,
                            isSelected: selectedContentType == type
                        ) {
                            selectedContentType = type
                            contentId = ""
                            iframeUrl = ""
                        }
                    }
                }
            }
        }
    }

    // MARK: - Content ID / URL

    private var contentIdSection: some View {
        VStack(alignment: .leading, spacing: DesignTokens.Spacing.sm) {
            if selectedContentType == .iframe {
                Text("iFrame URL")
                    .font(.system(size: DesignTokens.FontSize.sm, weight: .medium))
                    .foregroundStyle(DesignTokens.Text.secondary)

                TextField("https://example.com/embed", text: $iframeUrl)
                    .font(.system(size: DesignTokens.FontSize.base))
                    .foregroundStyle(DesignTokens.Text.primary)
                    .keyboardType(.URL)
                    .autocapitalization(.none)
                    .padding(DesignTokens.Spacing.md)
                    .background(DesignTokens.Glass.bgLight)
                    .clipShape(RoundedRectangle(cornerRadius: DesignTokens.Radius.md))

                TextField("iFrame Title (optional)", text: $iframeTitle)
                    .font(.system(size: DesignTokens.FontSize.sm))
                    .foregroundStyle(DesignTokens.Text.primary)
                    .padding(DesignTokens.Spacing.md)
                    .background(DesignTokens.Glass.bgLight)
                    .clipShape(RoundedRectangle(cornerRadius: DesignTokens.Radius.md))
            } else {
                Text("Content ID")
                    .font(.system(size: DesignTokens.FontSize.sm, weight: .medium))
                    .foregroundStyle(DesignTokens.Text.secondary)

                TextField(contentIdPlaceholder, text: $contentId)
                    .font(.system(size: DesignTokens.FontSize.base))
                    .foregroundStyle(DesignTokens.Text.primary)
                    .padding(DesignTokens.Spacing.md)
                    .background(DesignTokens.Glass.bgLight)
                    .clipShape(RoundedRectangle(cornerRadius: DesignTokens.Radius.md))
            }
        }
    }

    private var contentIdPlaceholder: String {
        switch selectedContentType {
        case .liveChannel, .live: return "Channel ID"
        case .podcast: return "Podcast ID"
        case .vod: return "Content ID"
        case .radio: return "Station ID"
        case .audiobook: return "Audiobook ID"
        case .iframe, .custom: return "Content ID"
        }
    }

    // MARK: - Validation

    private var isFormValid: Bool {
        let trimmedTitle = title.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !trimmedTitle.isEmpty else { return false }

        if selectedContentType == .iframe {
            let trimmedUrl = iframeUrl.trimmingCharacters(in: .whitespacesAndNewlines)
            return trimmedUrl.hasPrefix("http://") || trimmedUrl.hasPrefix("https://")
        } else {
            return !contentId.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty
        }
    }

    // MARK: - Save

    private func save() async {
        guard isFormValid else { return }
        isSaving = true
        error = nil

        let trimmedId = contentId.trimmingCharacters(in: .whitespacesAndNewlines)
        let content = WidgetContentPayload(
            contentType: selectedContentType.rawValue,
            liveChannelId: selectedContentType == .liveChannel ? trimmedId : nil,
            podcastId: selectedContentType == .podcast ? trimmedId : nil,
            contentId: selectedContentType == .vod ? trimmedId : nil,
            stationId: selectedContentType == .radio ? trimmedId : nil,
            iframeUrl: selectedContentType == .iframe ? iframeUrl.trimmingCharacters(in: .whitespacesAndNewlines) : nil,
            iframeTitle: selectedContentType == .iframe ? iframeTitle.trimmingCharacters(in: .whitespacesAndNewlines) : nil
        )

        let request = CreateWidgetRequest(
            title: title.trimmingCharacters(in: .whitespacesAndNewlines),
            description: description.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty ? nil : description.trimmingCharacters(in: .whitespacesAndNewlines),
            icon: nil,
            content: content
        )

        let success = await viewModel.createPersonalWidget(request)
        if success {
            onDismiss()
        } else {
            error = "Failed to create widget"
        }
        isSaving = false
    }

    private func errorBanner(_ message: String) -> some View {
        HStack(spacing: DesignTokens.Spacing.sm) {
            Image(systemName: "exclamationmark.triangle")
                .foregroundStyle(DesignTokens.ErrorColor.default)
            Text(message)
                .font(.system(size: DesignTokens.FontSize.sm))
                .foregroundStyle(DesignTokens.ErrorColor.default)
        }
        .padding(DesignTokens.Spacing.md)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(DesignTokens.ErrorColor.default.opacity(0.1))
        .clipShape(RoundedRectangle(cornerRadius: DesignTokens.Radius.md))
    }
}
#endif
