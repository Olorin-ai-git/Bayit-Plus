#if os(tvOS)
    import BayitCore
    import BayitDesignSystem
    import BayitLocalization
    import SwiftUI

    /// tvOS full-screen widget creation form.
    /// Supports 4 content types (channels, podcasts, radio, audiobooks) via a content picker.
    /// No iframe support on tvOS.
    struct TVCreateWidgetView: View {
        @Environment(LocalizationManager.self) var localization

        let widgetsViewModel: WidgetsViewModel
        @Bindable var pickerViewModel: ContentPickerViewModel
        let onDismiss: () -> Void

        @State var title = ""
        @State var description = ""
        @State var selectedContentType: WidgetContentType = .liveChannel
        @State var selectedContent: ContentPickerItem?
        @State var showContentPicker = false
        @State var isSaving = false
        @State var error: String?

        let logger = BayitLogger(category: "TVCreateWidget")

        let contentTypes: [WidgetContentType] = [
            .liveChannel, .podcast, .radio, .audiobook,
        ]

        var body: some View {
            ZStack {
                DesignTokens.Background.primary.ignoresSafeArea()

                ScrollView(.vertical, showsIndicators: false) {
                    VStack(spacing: TVDesignTokens.Spacing.xl) {
                        header

                        VStack(alignment: .leading, spacing: TVDesignTokens.Spacing.xl) {
                            titleFields
                            contentTypeSection
                            contentSection
                            if let error { errorBanner(error) }
                        }
                        .padding(TVDesignTokens.Spacing.xl)
                        .background(DesignTokens.Glass.bgMedium)
                        .clipShape(RoundedRectangle(cornerRadius: TVDesignTokens.Radius.card))
                        .overlay(
                            RoundedRectangle(cornerRadius: TVDesignTokens.Radius.card)
                                .stroke(DesignTokens.Glass.border, lineWidth: 1)
                        )

                        actionButtons
                    }
                    .frame(maxWidth: 720)
                    .padding(.vertical, TVDesignTokens.Spacing.xl)
                }
                .frame(maxWidth: .infinity)
            }
            .fullScreenCover(isPresented: $showContentPicker) {
                TVContentPickerView(viewModel: pickerViewModel, onSelect: { item in
                    selectedContent = item
                    showContentPicker = false
                }, onDismiss: {
                    showContentPicker = false
                })
            }
        }

        // MARK: - Header

        private var header: some View {
            VStack(spacing: TVDesignTokens.Spacing.sm) {
                Image(systemName: "square.grid.2x2.fill")
                    .font(.system(size: 36, weight: .medium))
                    .foregroundStyle(DesignTokens.Primary.p400)

                Text(localization.t("widgets.createWidget"))
                    .font(.system(size: TVDesignTokens.FontSize.xxl, weight: .bold))
                    .foregroundStyle(DesignTokens.Text.primary)
            }
            .frame(maxWidth: .infinity)
        }

        // MARK: - Title Fields

        private var titleFields: some View {
            VStack(alignment: .leading, spacing: TVDesignTokens.Spacing.md) {
                Text(localization.t("widgets.widgetTitle"))
                    .font(.system(size: TVDesignTokens.FontSize.md, weight: .medium))
                    .foregroundStyle(DesignTokens.Text.secondary)

                GlassTextField(localization.t("widgets.enterTitle"), text: $title)

                GlassTextField(localization.t("widgets.descriptionOptional"), text: $description)
            }
        }

        // MARK: - Content Type

        private var contentTypeSection: some View {
            VStack(alignment: .leading, spacing: TVDesignTokens.Spacing.md) {
                Text(localization.t("widgets.contentType"))
                    .font(.system(size: TVDesignTokens.FontSize.md, weight: .medium))
                    .foregroundStyle(DesignTokens.Text.secondary)

                ScrollView(.horizontal, showsIndicators: false) {
                    HStack(spacing: TVDesignTokens.Spacing.md) {
                        ForEach(contentTypes, id: \.self) { type in
                            GlassChip(
                                title: type.displayLabel,
                                isSelected: selectedContentType == type
                            ) {
                                selectedContentType = type
                                selectedContent = nil
                                syncPickerTab(for: type)
                            }
                        }
                    }
                }
                .focusSection()
            }
        }

        // MARK: - Actions

        var actionButtons: some View {
            HStack(spacing: TVDesignTokens.Spacing.xl) {
                GlassButton(localization.t("common.cancel"), variant: .secondary, size: .large) {
                    onDismiss()
                }

                GlassButton(localization.t("common.save"), variant: .primary, size: .large) {
                    Task { await save() }
                }
                .disabled(!isFormValid || isSaving)
            }
            .frame(maxWidth: .infinity)
        }

        // MARK: - Validation

        var isFormValid: Bool {
            let trimmedTitle = title.trimmingCharacters(in: .whitespacesAndNewlines)
            return !trimmedTitle.isEmpty && selectedContent != nil
        }
    }
#endif
