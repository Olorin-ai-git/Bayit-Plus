import BayitCore
import BayitDesignSystem
import BayitLocalization
import SwiftUI

struct DiscoverFeatureDetailView: View {
    let feature: DiscoverFeature
    @Bindable var viewModel: DiscoverViewModel
    @Environment(LocalizationManager.self) private var localization
    @Environment(\.dismiss) private var dismiss
    @State private var showAvatarPrerequisite = false

    private var availability: FeatureAvailabilityState {
        viewModel.availability(for: feature.id)
    }

    var body: some View {
        ScrollView(.vertical, showsIndicators: false) {
            VStack(alignment: .leading, spacing: DesignTokens.Spacing.lg) {
                headerSection
                DiscoverAvailabilityBadge(state: availability)
                descriptionSection
                prerequisitesSection
                demoThumbnailSection
                actionButtons
            }
            .padding(DesignTokens.Spacing.xl)
        }
        .background(DesignTokens.Glass.bgStrong)
        .overlay { walkthroughOverlay }
        .sheet(isPresented: $showAvatarPrerequisite) {
            DiscoverAvatarPrerequisiteView(
                onCreateAvatar: {
                    showAvatarPrerequisite = false
                    if let url = URL(string: "bayitplus://settings/avatar") {
                        UIApplication.shared.open(url)
                    }
                },
                onSkip: {
                    showAvatarPrerequisite = false
                    viewModel.activeWalkthrough?.resumeFromPrerequisite()
                }
            )
        }
        .onChange(of: viewModel.activeWalkthrough?.isAwaitingPrerequisite) { _, isAwaiting in
            if isAwaiting == true {
                showAvatarPrerequisite = true
            }
        }
        .presentationDetents([.medium, .large])
        .presentationDragIndicator(.visible)
    }

    private var headerSection: some View {
        HStack(spacing: DesignTokens.Spacing.md) {
            Image(systemName: feature.iconName)
                .font(DesignTokens.Typography.title)
                .foregroundStyle(DesignTokens.Primary.default)

            VStack(alignment: .leading, spacing: DesignTokens.Spacing.xs) {
                Text(localization.t(feature.nameKey))
                    .font(DesignTokens.Typography.title3)
                    .foregroundStyle(DesignTokens.Text.primary)

                Text(localization.t(feature.taglineKey))
                    .font(DesignTokens.Typography.callout)
                    .foregroundStyle(DesignTokens.Text.secondary)
            }
        }
        .accessibilityIdentifier("discover_detail_header")
    }

    private var descriptionSection: some View {
        Text(localization.t(feature.descriptionKey))
            .font(DesignTokens.Typography.body)
            .foregroundStyle(DesignTokens.Text.primary)
            .fixedSize(horizontal: false, vertical: true)
    }

    @ViewBuilder
    private var prerequisitesSection: some View {
        if !feature.prerequisites.isEmpty {
            VStack(alignment: .leading, spacing: DesignTokens.Spacing.sm) {
                Text(localization.t("discover.prerequisites.title"))
                    .font(DesignTokens.Typography.headline)
                    .foregroundStyle(DesignTokens.Text.primary)

                ForEach(feature.prerequisites) { prereq in
                    prerequisiteRow(prereq)
                }
            }
            .accessibilityIdentifier("discover_prerequisites")
        }
    }

    private func prerequisiteRow(_ prereq: FeaturePrerequisite) -> some View {
        HStack(spacing: DesignTokens.Spacing.sm) {
            Image(systemName: prerequisiteIcon(for: prereq))
                .foregroundStyle(prerequisiteColor(for: prereq))
                .font(DesignTokens.Typography.body)

            Text(localization.t(prereq.labelKey))
                .font(DesignTokens.Typography.callout)
                .foregroundStyle(DesignTokens.Text.secondary)
        }
        .accessibilityElement(children: .combine)
    }

    @ViewBuilder
    private var demoThumbnailSection: some View {
        if let thumbnailURL = viewModel.demoThumbnailURL(for: feature.id) {
            AsyncImage(url: thumbnailURL) { phase in
                if case let .success(image) = phase {
                    image.resizable().aspectRatio(16 / 9, contentMode: .fit)
                        .clipShape(RoundedRectangle(cornerRadius: DesignTokens.Radius.md))
                } else if case .empty = phase {
                    ProgressView().frame(maxWidth: .infinity).frame(height: 180)
                }
            }
        }
    }

    private var actionButtons: some View {
        VStack(spacing: DesignTokens.Spacing.md) {
            if !feature.walkthroughSteps.isEmpty {
                Button(action: { viewModel.startWalkthrough(for: feature) }) {
                    Text(localization.t("discover.action.tryIt"))
                        .font(DesignTokens.Typography.headline)
                        .foregroundStyle(.white)
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, DesignTokens.Spacing.md)
                        .background(DesignTokens.Primary.default)
                        .clipShape(
                            RoundedRectangle(cornerRadius: DesignTokens.Radius.md)
                        )
                }
                .accessibilityIdentifier("discover_action_tryIt")
                .accessibilityLabel(localization.t("discover.action.tryIt"))
            }

            if viewModel.demoVideoURL(for: feature.id) != nil {
                Button(action: { dismiss() }) {
                    Text(localization.t("discover.action.watchDemo"))
                        .font(DesignTokens.Typography.headline)
                        .foregroundStyle(DesignTokens.Primary.default)
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, DesignTokens.Spacing.md)
                        .background(DesignTokens.Glass.bg)
                        .clipShape(
                            RoundedRectangle(cornerRadius: DesignTokens.Radius.md)
                        )
                        .overlay(
                            RoundedRectangle(cornerRadius: DesignTokens.Radius.md)
                                .strokeBorder(DesignTokens.Glass.border, lineWidth: 1)
                        )
                }
                .accessibilityIdentifier("discover_action_watchDemo")
                .accessibilityLabel(localization.t("discover.action.watchDemo"))
            }
        }
    }

    @ViewBuilder
    private var walkthroughOverlay: some View {
        if let walkthrough = viewModel.activeWalkthrough,
           walkthrough.feature.id == feature.id,
           walkthrough.isActive
        {
            CoachMarkOverlay(
                steps: walkthrough.feature.walkthroughSteps.map { step in
                    CoachMarkOverlayStep(
                        instructionKey: step.instructionKey,
                        targetFrame: .zero,
                        targetCornerRadius: DesignTokens.Radius.md
                    )
                },
                currentStepIndex: walkthrough.currentStepIndex,
                onNext: { viewModel.advanceWalkthrough() },
                onSkip: { viewModel.skipWalkthrough() },
                onDone: { Task { await viewModel.completeWalkthrough() } }
            )
            .accessibilityIdentifier("discover_walkthrough_overlay")
        }
    }

    private func prerequisiteIcon(for prereq: FeaturePrerequisite) -> String {
        prerequisiteMet(prereq) ? "checkmark.circle.fill" : "exclamationmark.triangle.fill"
    }

    private func prerequisiteColor(for prereq: FeaturePrerequisite) -> Color {
        prerequisiteMet(prereq) ? DesignTokens.Success.default : DesignTokens.Warning.default
    }

    private func prerequisiteMet(_ prereq: FeaturePrerequisite) -> Bool {
        guard case let .setupNeeded(missing) = availability else { return true }
        return !missing.contains(where: { $0.id == prereq.id })
    }
}
